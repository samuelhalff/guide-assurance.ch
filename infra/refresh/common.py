"""Socle commun des scripts de mise à jour des données de guide-assurance.ch.

Chaque script (taux3a.py, lamal.py, frontalier.py, impots.py, digest.py, actualites.py) tourne dans GitHub Actions
(.github/workflows/refresh-*.yml, groupe de concurrence partagé avec le déploiement) et :
  - journalise dans logs/<jeu>.log (gardé comme artefact du passage) ;
  - tient l'état de chaque jeu dans state/<jeu>.json (branche refresh-state, restaurée et réenregistrée par le workflow) ;
  - alerte Sam par e-mail (mailer.py, Microsoft Graph, identifiants en secrets GitHub Actions).

Publication (publish) : npm test -> npm run build -> données ouvertes (data/csv) -> mentions interdites
(scripts/check-forbidden.sh) -> commit sur main -> scripts/deploy-site.sh (rsync, contrôles, IndexNow) ->
vérification en ligne (HTTP 200, fichier en ligne identique au build, valeur modifiée présente).
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]                      # racine du dépôt guide-assurance.ch
SITE = ROOT / "site"
OUT = SITE / "out"
LOGS = HERE / "logs"
STATE = HERE / "state"
LOCK = STATE / "deploy.lock"
DEPLOY_STAMP = STATE / "last-deploy"        # hors CI seulement : repère du dernier déploiement manuel
CI = bool(os.environ.get("GITHUB_ACTIONS"))
RUN_URL = (f"{os.environ.get('GITHUB_SERVER_URL', 'https://github.com')}/{os.environ['GITHUB_REPOSITORY']}"
           f"/actions/runs/{os.environ['GITHUB_RUN_ID']}") if CI and os.environ.get("GITHUB_RUN_ID") else ""
MAIL_FAILED = False  # en CI, un e-mail d'alerte non parti fait échouer le passage (GitHub prévient alors Sam)
LIVE = "https://guide-assurance.ch"
ZH = ZoneInfo("Europe/Zurich")
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/141.0.0.0 Safari/537.36")

# Fichiers écrits par les scripts de mise à jour : ignorés par le contrôle « modifications non publiées ».
DATA_OUTPUTS = [
    "site/src/data/taux-3a.json",
    "site/src/data/taux-3a-historique.json",
    "site/src/data/primes-2027-resume.json",
    "site/public/data/primes-2027",
]

NAMES = {
    "taux3a": "taux 3a",
    "frais3a": "frais 3a",
    "lamal": "primes LAMal",
    "frontalier": "frontaliers",
    "impots": "barèmes d'impôt",
    "digest": "point mensuel",
    "actualites": "actualités",
    "chiffres": "chiffres des actualités",
}

DRY = False  # dry-run : l'état (state/*.json) n'est pas modifié

for d in (LOGS, STATE):
    d.mkdir(parents=True, exist_ok=True)


def now_zh() -> dt.datetime:
    return dt.datetime.now(ZH)


def fr_date(d: dt.datetime | dt.date | str | None) -> str:
    if not d:
        return "jamais"
    if isinstance(d, str):
        d = dt.datetime.fromisoformat(d)
    if isinstance(d, dt.datetime):
        return d.astimezone(ZH).strftime("%d.%m.%Y à %H:%M")
    return d.strftime("%d.%m.%Y")


# ------------------------------------------------------------------ journal
class Log:
    MAX = 1_000_000
    KEEP = 5

    def __init__(self, dataset: str):
        self.path = LOGS / f"{dataset}.log"
        self._rotate()
        self.f = self.path.open("a", encoding="utf-8")

    def _rotate(self):
        if not self.path.exists() or self.path.stat().st_size < self.MAX:
            return
        for i in range(self.KEEP - 1, 0, -1):
            src = self.path.with_suffix(f".log.{i}.gz")
            if src.exists():
                src.rename(self.path.with_suffix(f".log.{i + 1}.gz"))
        with self.path.open("rb") as fi, gzip.open(self.path.with_suffix(".log.1.gz"), "wb") as fo:
            shutil.copyfileobj(fi, fo)
        self.path.write_text("")

    def __call__(self, msg: str):
        line = f"{now_zh().isoformat(timespec='seconds')} {msg}"
        print(line, flush=True)
        self.f.write(line + "\n")
        self.f.flush()


# ------------------------------------------------------------------ verrou
class Lock:
    """Verrou flock local. En CI, c'est le groupe de concurrence GitHub Actions qui sérialise relevés et déploiements."""

    def __init__(self, wait_s: int = 7200):
        self.wait_s = wait_s
        self.fd = None

    def __enter__(self):
        self.fd = os.open(LOCK, os.O_CREAT | os.O_RDWR, 0o644)
        t0 = time.time()
        while True:
            try:
                fcntl.flock(self.fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                return self
            except BlockingIOError:
                if time.time() - t0 > self.wait_s:
                    raise TimeoutError("verrou de déploiement occupé depuis plus de 2 h")
                time.sleep(15)

    def __exit__(self, *a):
        if self.fd is not None:
            fcntl.flock(self.fd, fcntl.LOCK_UN)
            os.close(self.fd)


# ------------------------------------------------------------------ état
def load_state(dataset: str) -> dict:
    f = STATE / f"{dataset}.json"
    return json.loads(f.read_text()) if f.exists() else {}


def save_state(dataset: str, **kw):
    if DRY:
        return
    st = load_state(dataset)
    st.update(kw)
    (STATE / f"{dataset}.json").write_text(json.dumps(st, ensure_ascii=False, indent=1) + "\n")


def record_run(dataset: str, status: str, message: str, success: bool, published: bool = False, **extra):
    """status : ok | publie | ecrit_non_publie | alerte | echec | invalide."""
    ts = now_zh().isoformat(timespec="seconds")
    kw = {"dernier_releve": ts, "dernier_statut": status, "dernier_message": message, **extra}
    if success:
        kw["dernier_succes"] = ts
    if published:
        kw["derniere_publication"] = ts
    save_state(dataset, **kw)


# ------------------------------------------------------------------ alertes
def alert(log: Log, dataset: str, subject_kind: str, paragraphs: list[str], dry_run: bool,
          dedupe_days: int = 7) -> str:
    """Envoie l'alerte (ou l'affiche en dry-run). Même alerte déjà envoyée il y a moins de dedupe_days : ignorée.
    subject_kind : « données à vérifier » | « données mises à jour » | ..."""
    from mailer import send_mail  # import local : pas besoin des identifiants en dry-run sans envoi

    subject = f"Guide Assurance : {subject_kind} ({NAMES.get(dataset, dataset)})"
    html = "".join(f"<p>{p}</p>" for p in paragraphs) + (
        "<p style='color:#666;font-size:12px'>Message automatique des scripts de mise à jour "
        "(infra/refresh, journal logs/" + dataset + ".log"
        + (f", passage GitHub Actions <a href='{RUN_URL}'>{RUN_URL}</a>" if RUN_URL else "") + ").</p>")
    if dry_run:
        log(f"[dry-run] e-mail non envoyé : « {subject} »")
        for p in paragraphs:
            log("[dry-run]   " + re.sub(r"<[^>]+>", "", p))
        return "dry-run"
    key = hashlib.sha256((subject + "\n".join(paragraphs)).encode()).hexdigest()
    sent = json.loads((STATE / "alertes.json").read_text()) if (STATE / "alertes.json").exists() else {}
    last = sent.get(key)
    if last and dt.datetime.fromisoformat(last) > now_zh() - dt.timedelta(days=dedupe_days):
        log(f"alerte identique déjà envoyée le {fr_date(last)} : pas de nouvel envoi")
        return "dedupe"
    try:
        send_mail(subject, html)
    except Exception as e:  # noqa: BLE001
        global MAIL_FAILED
        MAIL_FAILED = True
        log(f"ÉCHEC envoi e-mail « {subject} » : {e}")
        return "erreur"
    sent[key] = now_zh().isoformat(timespec="seconds")
    (STATE / "alertes.json").write_text(json.dumps(sent, indent=1))
    log(f"e-mail envoyé : « {subject} »")
    return "envoye"


# ------------------------------------------------------------------ réseau
def http_get(url: str, timeout: int = 60, retries: int = 2, data: bytes | None = None,
             headers: dict | None = None) -> tuple[int, bytes]:
    last = None
    h = {"User-Agent": UA, "Accept-Language": "fr-CH,fr;q=0.9"} | (headers or {})
    for i in range(retries + 1):
        try:
            req = urllib.request.Request(url, data=data, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or i == retries:
                return e.code, b""
            last = e
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"{url} : {last}")


# ------------------------------------------------------------------ simulation (dry-run seulement)
def base_args(desc: str) -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=desc)
    ap.add_argument("--dry-run", action="store_true", help="relève et compare, n'écrit rien, ne publie rien, n'envoie pas d'e-mail")
    ap.add_argument("--scheduled", action="store_true", help="lancé par cron : ne s'exécute qu'à l'heure de Zurich --at")
    ap.add_argument("--at", type=int, help="heure de Zurich attendue (cron tourne en UTC, deux lignes par tâche)")
    ap.add_argument("--utc-hour", type=int, help="heure UTC prévue par la ligne cron (GitHub Actions) : le contrôle --at "
                    "porte sur l'heure prévue, pas sur l'heure réelle de départ (les tâches planifiées partent parfois en retard)")
    ap.add_argument("--simulate-change", action="store_true", help="dry-run : simule un changement de valeur")
    ap.add_argument("--simulate-parser-failure", action="store_true", help="dry-run : simule une page dont la structure a changé")
    return ap


def check_args(a) -> bool:
    """False : hors de l'heure prévue (cron UTC, heure d'été / d'hiver), on sort sans rien faire."""
    if (a.simulate_change or a.simulate_parser_failure) and not a.dry_run:
        sys.exit("--simulate-* n'est permis qu'avec --dry-run")
    if a.scheduled and a.at is not None:
        if a.utc_hour is not None:
            prevu = dt.datetime.now(dt.timezone.utc).replace(hour=a.utc_hour, minute=0, second=0, microsecond=0)
            if prevu.astimezone(ZH).hour != a.at:
                return False
        elif now_zh().hour != a.at:
            return False
    return True


# ------------------------------------------------------------------ publication
def sh(log: Log, cmd: list[str], cwd: Path, timeout: int = 1800, env: dict | None = None) -> tuple[int, str]:
    log("$ " + " ".join(cmd))
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout,
                       env={**os.environ, **(env or {})})
    out = (r.stdout + r.stderr).strip()
    for ln in out.splitlines()[-25:]:
        log("  | " + ln)
    return r.returncode, out


def pending_site_changes(written: list[Path]) -> list[str] | None:
    """Fichiers du site modifiés depuis le dernier déploiement (hors données écrites par ces scripts).
    None : aucun déploiement enregistré (state/last-deploy absent), on ne sait pas ce qui est en ligne."""
    if not DEPLOY_STAMP.exists():
        return None
    t = DEPLOY_STAMP.stat().st_mtime
    ignore = [ROOT / p for p in DATA_OUTPUTS] + [Path(p) for p in written]
    found = []
    for base in ("src", "content", "public"):
        for p in (SITE / base).rglob("*"):
            if p.is_file() and p.stat().st_mtime > t and not any(p == i or i in p.parents for i in ignore):
                found.append(str(p.relative_to(ROOT)))
    for p in SITE.glob("*"):
        if p.is_file() and p.suffix in (".ts", ".mjs", ".js", ".json") and p.stat().st_mtime > t:
            found.append(str(p.relative_to(ROOT)))
    return found


def forbidden_hits() -> list[str]:
    """Fichiers du build qui contiennent une mention interdite (scripts/check-forbidden.sh, motifs en secret CI)."""
    r = subprocess.run(["bash", str(ROOT / "scripts" / "check-forbidden.sh"), str(OUT)], capture_output=True, text=True)
    if r.returncode not in (0, 1):
        return [f"contrôle impossible : {(r.stderr or r.stdout).strip()[-200:]}"]
    return [ln for ln in r.stdout.splitlines() if ln]


def commit_push(log: Log, paths: list[Path], message: str) -> tuple[bool, str]:
    """CI : commit des données sur main et push (trois essais, rebase entre deux). Rien à committer : (True, "")."""
    rel = [str(Path(p).resolve().relative_to(ROOT)) for p in paths if Path(p).exists()]
    sh(log, ["git", "add", "-A", "--", *rel, "data"], ROOT)
    if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=ROOT).returncode == 0:
        return True, ""
    code, out = sh(log, ["git", "-c", "user.name=guide-assurance-bot",
                         "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
                         "commit", "-m", message], ROOT)
    if code:
        return False, "commit impossible"
    for i in range(3):
        code, _ = sh(log, ["git", "push", "origin", "HEAD:main"], ROOT, timeout=300)
        if code == 0:
            r = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True)
            return True, r.stdout.strip()
        sh(log, ["git", "pull", "--rebase", "origin", "main"], ROOT, timeout=300)
    return False, "push refusé trois fois"


class Backup:
    """Copie de sauvegarde des fichiers de données avant écriture, pour revenir en arrière."""

    def __init__(self, paths: list[Path]):
        self.dir = STATE / "backup"
        if self.dir.exists():
            shutil.rmtree(self.dir)
        self.dir.mkdir()
        self.items = []
        for i, p in enumerate(paths):
            dst = self.dir / str(i)
            if p.is_dir():
                shutil.copytree(p, dst)
            elif p.exists():
                shutil.copy2(p, dst)
            self.items.append((p, dst))

    def restore(self):
        for p, dst in self.items:
            if dst.is_dir():
                shutil.rmtree(p, ignore_errors=True)
                shutil.copytree(dst, p)
            elif dst.exists():
                shutil.copy2(dst, p)


def swap_dir(src: Path, dst: Path):
    """Remplace dst par une copie de src sans jamais laisser dst absent ou à moitié copié : copie dans un dossier
    voisin, ancien dossier mis de côté, nouveau renommé en place, ancien supprimé ; ancien remis si une étape échoue."""
    new, old = dst.with_name(dst.name + ".new"), dst.with_name(dst.name + ".old")
    for t in (new, old):
        shutil.rmtree(t, ignore_errors=True)
    shutil.copytree(src, new)
    moved = False
    try:
        if dst.exists():
            os.replace(dst, old)
            moved = True
        os.replace(new, dst)
    except BaseException:
        if moved and not dst.exists():
            os.replace(old, dst)
        raise
    finally:
        shutil.rmtree(new, ignore_errors=True)
    shutil.rmtree(old, ignore_errors=True)


def replace_file(src: Path, dst: Path):
    """Copie src vers dst de façon atomique (fichier temporaire voisin puis os.replace)."""
    tmp = dst.with_name(dst.name + ".new")
    shutil.copy2(src, tmp)
    os.replace(tmp, dst)


def verify_live(log: Log, checks: list[dict]) -> list[str]:
    """checks : {url, out: chemin relatif à site/out, values: [regex]} -> liste des problèmes (vide = OK)."""
    problems = []
    for c in checks:
        url = LIVE + c["url"]
        try:
            code, body = http_get(url, timeout=30, headers={"Cache-Control": "no-cache"})
        except Exception as e:  # noqa: BLE001
            problems.append(f"{url} injoignable ({e})")
            continue
        if code != 200:
            problems.append(f"{url} répond HTTP {code}")
            continue
        n = len(problems)
        if c.get("out"):
            local = (OUT / c["out"]).read_bytes()
            if hashlib.sha256(local).digest() != hashlib.sha256(body).digest():
                problems.append(f"{url} : la page en ligne diffère du build local")
        text = body.decode("utf-8", "replace")
        for v in c.get("values", []):
            if not re.search(v, text):
                problems.append(f"{url} : valeur attendue absente ({v})")
        log(f"en ligne : {url} 200, " + ("conforme" if len(problems) == n else "NON conforme : " + " ; ".join(problems[n:])))
    return problems


def publish(log: Log, written: list[Path], backup: Backup, checks: list[dict]) -> tuple[bool, str]:
    """Teste, construit, déploie et vérifie. Retourne (publié, explication en français pour l'e-mail)."""
    pending = pending_site_changes(written)
    code, _ = sh(log, ["npm", "test"], SITE, timeout=900)
    if code:
        backup.restore()
        return False, "Les tests du site échouent avec les nouvelles données : données remises à l'état précédent, rien n'a été publié."
    code, _ = sh(log, ["npm", "run", "build"], SITE, timeout=1800)
    if code:
        backup.restore()
        return False, "La construction du site échoue : données remises à l'état précédent, rien n'a été publié."
    hits = forbidden_hits()
    if hits:
        backup.restore()
        return False, (f"Le build contient une mention interdite ({len(hits)} fichier(s), ex. {hits[0]}) : "
                       "publication bloquée, données remises à l'état précédent.")
    if CI:
        return publish_ci(log, written, checks)
    if pending is None:
        return False, ("Aucun déploiement enregistré (infra/refresh/state/last-deploy absent) : impossible de savoir si "
                       "d'autres modifications du site attendent. Les nouvelles données sont écrites dans le dépôt et "
                       "partiront avec le prochain déploiement manuel.")
    if pending:
        ex = ", ".join(pending[:3]) + (f" et {len(pending) - 3} autres" if len(pending) > 3 else "")
        return False, ("D'autres modifications du site ne sont pas encore publiées (" + ex + ") : pour ne pas les "
                       "mettre en ligne à l'insu de personne, rien n'a été déployé. Les nouvelles données sont écrites "
                       "dans le dépôt et partiront avec le prochain déploiement manuel.")
    code, _ = sh(log, [str(ROOT / "infra" / "deploy.sh")], ROOT, timeout=3600, env={"REFRESH_LOCK_HELD": "1"})
    if code:
        return False, "Le déploiement (infra/deploy.sh) a échoué : le site en ligne n'est peut-être pas à jour."
    problems = verify_live(log, checks)
    if problems:
        return False, "Déployé, mais la vérification en ligne a échoué : " + " ; ".join(problems)
    return True, "Publié sur guide-assurance.ch le " + fr_date(now_zh()) + ", valeurs vérifiées en ligne."


def publish_ci(log: Log, written: list[Path], checks: list[dict]) -> tuple[bool, str]:
    """GitHub Actions : données ouvertes à jour, commit sur main, déploiement depuis ce runner, vérification en ligne.
    Le push fait avec GITHUB_TOKEN ne relance pas ci-deploy.yml : le déploiement se fait ici, dans le même groupe."""
    code, _ = sh(log, ["node", "--no-warnings", "scripts/donnees-ouvertes.mts", "../data/csv"], SITE, timeout=600)
    if code:
        return False, "La régénération des données ouvertes (data/csv) a échoué : rien n'a été publié."
    ds = os.environ.get("REFRESH_DATASET", "données")
    ok, ref = commit_push(log, written, f"Données : mise à jour automatique ({NAMES.get(ds, ds)})")
    if not ok:
        return False, f"Les nouvelles données n'ont pas pu être enregistrées sur main ({ref}) : rien n'a été publié."
    code, _ = sh(log, ["bash", str(ROOT / "scripts" / "deploy-site.sh")], ROOT, timeout=3600)
    if code:
        return False, (f"Données enregistrées sur main ({ref or 'déjà à jour'}), mais le déploiement a échoué : "
                       "le site en ligne n'est peut-être pas à jour.")
    problems = verify_live(log, checks)
    if problems:
        return False, "Déployé, mais la vérification en ligne a échoué : " + " ; ".join(problems)
    return True, "Publié sur guide-assurance.ch le " + fr_date(now_zh()) + ", valeurs vérifiées en ligne."


def run_main(dataset: str, fn, a):
    """Enveloppe : verrou, journal, capture des erreurs imprévues (alerte « échec »)."""
    global DRY
    if not check_args(a):
        return 0
    DRY = a.dry_run
    log = Log(dataset)
    log(f"=== {dataset} {'(dry-run) ' if a.dry_run else ''}début")
    try:
        with Lock():
            rc = fn(log, a) or 0
        if CI and MAIL_FAILED:
            log("un e-mail d'alerte n'est pas parti : passage marqué en échec")
            return rc or 3
        return rc
    except Exception as e:  # noqa: BLE001
        import traceback
        log("ERREUR imprévue : " + "".join(traceback.format_exception(e))[-1500:])
        record_run(dataset, "echec", f"erreur imprévue : {e}", success=False)
        alert(log, dataset, "données à vérifier",
              [f"Le script de mise à jour s'est arrêté sur une erreur imprévue : {e}.", "Rien n'a été publié."],
              a.dry_run)
        return 2
    finally:
        log(f"=== {dataset} fin")
