#!/usr/bin/env python3
"""Primes LAMal (comparateur) : contrôle quotidien du 25 septembre au 31 décembre, mensuel le reste de l'année.

1. Année servie par priminfo.admin.ch (titre « Calculateur des primes AAAA »). Nouvelle année -> alerte seulement :
   les scripts, chemins (primes-2027) et pages sont propres à l'année, la bascule se fait à la main.
2. Date de modification des fichiers de l'OFSP sur opendata.swiss (CKAN, Prämien_CH) : signal de correction.
3. Sondage : 2 profils par région de prime (adulte franchise 300 avec accident, enfant franchise 0 avec accident)
   comparés aux réponses gardées dans data/sources/priminfo-2027/.
4. Différence (ou fichier OFSP modifié) -> relevé complet dans un dossier de travail (fetch_priminfo_2027.py),
   construction (build_comparateur_2027.py) hors du site, contrôles, puis écriture, publication et vérification.

Contrôles : schéma, mêmes cantons et régions, produits et assureurs ±10 %, cellules remplies ±10 %, NPA ±10 %,
primes mensuelles dans des plages plausibles, aucune prime qui varie de plus de 25 % (une correction est petite).

  python3 infra/refresh/lamal.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import base64
import gzip
import importlib.util
import json
import re
import shutil
import subprocess
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
from annees import ANNEE_PRIMES  # noqa: E402

DS = "lamal"
YEAR = ANNEE_PRIMES
SCRIPTS = C.ROOT / "data" / "scripts"
SRC = C.ROOT / "data" / "sources"
PI = SRC / f"priminfo-{YEAR}"
XLSX = SRC / f"praemienregionen-{YEAR}.xlsx"
PUB = C.SITE / "public" / "data" / f"primes-{YEAR}"
RESUME = C.SITE / "src" / "data" / f"primes-{YEAR}-resume.json"
WORK = C.STATE / "lamal-work"
CKAN = "https://ckan.opendata.swiss/api/3/action/package_show?id=health-insurance-premiums"
PRIMINFO = "https://www.priminfo.admin.ch/fr/praemien"
RANGES = {"enfant": (3_000, 60_000), "jeune": (8_000, 200_000), "adulte": (8_000, 200_000)}  # centimes / mois
MAX_REL = 0.25


def mod(name: str):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def chf(c: int | None) -> str:
    return "—" if c is None else f"{c / 100:.2f}"


def lire_bytes(B, raw: bytes, tmp: Path):
    """Lit un tableau priminfo ; une page sans tableau lève RuntimeError (structure changée)."""
    tmp.write_bytes(gzip.compress(raw))
    try:
        return B.lire(tmp)
    except SystemExit as e:
        raise RuntimeError(str(e).replace(f" dans {tmp}", "")) from None


def ckan_dates(log) -> dict:
    try:
        code, body = C.http_get(CKAN, timeout=40)
        res = json.loads(body)["result"]["resources"]
    except Exception as e:  # noqa: BLE001
        raise RuntimeError(f"opendata.swiss illisible : {e}") from e
    out = {}
    for r in res:
        q = urllib.parse.parse_qs(urllib.parse.urlparse(r.get("download_url") or r.get("url") or "").query)
        if "path" in q:
            try:
                name = base64.b64decode(q["path"][0]).decode("utf-8").rsplit("/", 1)[-1]
            except Exception:  # noqa: BLE001
                continue
            out[name] = r.get("modified") or r.get("last_modified")
    return out


def validate(new_dir: Path, new_resume: Path) -> tuple[list[str], list[str], list[str]]:
    """-> (problèmes, résumé des changements, cantons modifiés)."""
    problems, summary, changed = [], [], []
    keys = {"canton", "annee", "source", "regions", "assureurs", "produits", "redistribution", "primes"}
    old_files = sorted(p.name for p in PUB.glob("*.json"))
    new_files = sorted(p.name for p in new_dir.glob("*.json"))
    if old_files != new_files:
        problems.append(f"fichiers différents : {old_files} / {new_files}")
        return problems, summary, changed
    for name in new_files:
        if name == "npa.json":
            o, n = json.loads((PUB / name).read_text()), json.loads((new_dir / name).read_text())
            if abs(len(n) - len(o)) > 0.1 * len(o):
                problems.append(f"npa.json : {len(n)} NPA contre {len(o)}")
            if o != n:
                changed.append("npa")
                summary.append(f"index des NPA modifié ({len(o)} → {len(n)} NPA)")
            continue
        ct = name[:-5]
        o, n = json.loads((PUB / name).read_text()), json.loads((new_dir / name).read_text())
        if set(n) != keys or n["annee"] != YEAR or n["canton"] != ct:
            problems.append(f"{ct} : schéma inattendu")
            continue
        if set(n["regions"]) != set(o["regions"]):
            problems.append(f"{ct} : régions {sorted(n['regions'])} au lieu de {sorted(o['regions'])}")
        for k in ("produits", "assureurs"):
            if abs(len(n[k]) - len(o[k])) > 0.1 * len(o[k]):
                problems.append(f"{ct} : {len(n[k])} {k} contre {len(o[k])} (écart de plus de 10 %)")

        def cells(d):
            prod = [(d["assureurs"][p[0]], p[1]) for p in d["produits"]]
            out = {}
            for reg, a in d["primes"].items():
                for cl, b in a.items():
                    for fr, c in b.items():
                        for acc, v in c.items():
                            if len(v) != len(prod):
                                raise ValueError(f"{ct} : longueur de ligne incohérente")
                            for k, x in zip(prod, v):
                                if x is not None:
                                    out[(reg, cl, fr, acc) + k] = x
            return out
        try:
            co, cn = cells(o), cells(n)
        except ValueError as e:
            problems.append(str(e))
            continue
        if abs(len(cn) - len(co)) > 0.1 * len(co):
            problems.append(f"{ct} : {len(cn)} primes contre {len(co)} (écart de plus de 10 %)")
        bad = [(k, x) for k, x in cn.items() if not RANGES[k[1]][0] <= x <= RANGES[k[1]][1]]
        if bad:
            k, x = bad[0]
            problems.append(f"{ct} : {len(bad)} prime(s) hors plage, ex. {k[4]} {k[5]} {k[1]} {chf(x)} CHF")
        diffs = [(k, co[k], cn[k]) for k in cn.keys() & co.keys() if co[k] != cn[k]]
        big = [d for d in diffs if abs(d[2] - d[1]) > MAX_REL * d[1]]
        if big:
            k, a_, b_ = big[0]
            problems.append(f"{ct} : {len(big)} prime(s) varient de plus de 25 %, ex. {k[4]} {k[5]} {chf(a_)} → {chf(b_)}")
        added, removed = len(cn.keys() - co.keys()), len(co.keys() - cn.keys())
        if o["redistribution"] != n["redistribution"]:
            summary.append(f"{ct} : redistribution modifiée {o['redistribution']} → {n['redistribution']} (centimes)")
        if diffs or added or removed or o != n:
            changed.append(ct)
            ex = ""
            if diffs:
                k, a_, b_ = sorted(diffs)[0]
                ex = f", ex. {k[4]} « {k[5]} », région {k[0]}, {k[1]}, franchise {k[2]} : {chf(a_)} → {chf(b_)} CHF"
            summary.append(f"{ct} : {len(diffs)} prime(s) modifiée(s), {added} ajoutée(s), {removed} retirée(s){ex}")
    try:
        r = json.loads(new_resume.read_text())
        if not {"source", "profil", "cantons"} <= set(r) or len(r["cantons"]) != len(json.loads(RESUME.read_text())["cantons"]):
            problems.append("résumé statique : schéma inattendu")
    except Exception as e:  # noqa: BLE001
        problems.append(f"résumé statique illisible ({e})")
    return problems, summary, changed


def build_tree(log, simulate: bool, fetch: bool) -> Path:
    """Arborescence de travail data/{scripts,sources} + site/... pour relever et construire hors du site."""
    if WORK.exists():
        shutil.rmtree(WORK)
    (WORK / "data" / "scripts").mkdir(parents=True)
    (WORK / "data" / "sources").mkdir()
    (WORK / "site" / "src" / "data").mkdir(parents=True)
    for s in (f"fetch_priminfo_{YEAR}.py", f"build_comparateur_{YEAR}.py"):
        shutil.copy2(SCRIPTS / s, WORK / "data" / "scripts" / s)
    (WORK / "data" / "sources" / XLSX.name).symlink_to(XLSX)
    wpi = WORK / "data" / "sources" / PI.name
    if fetch:
        code, out = C.sh(log, [sys.executable, str(WORK / "data" / "scripts" / f"fetch_priminfo_{YEAR}.py")], WORK, timeout=4 * 3600)
        if code:
            raise RuntimeError("relevé complet priminfo en échec : " + (out.splitlines()[-1] if out else ""))
    else:
        shutil.copytree(PI, wpi)
    if simulate:
        f = wpi / "GE0" / "adulte_300_avec.html.gz"
        html = gzip.decompress(f.read_bytes()).decode()
        m = re.search(r'<td class="monthlyCell">([^<]*)</td>', html[html.find('id="savingsTable"'):])
        old = m.group(1)
        new = f"{float(old.replace(chr(39), '')) + 1.0:.2f}"
        html = html.replace(f'<td class="monthlyCell">{old}</td>', f'<td class="monthlyCell">{new}</td>', 1)
        f.write_bytes(gzip.compress(html.encode()))
        log(f"[simulation] GE région 0, adulte franchise 300 avec accident : première prime {old} -> {new} (copie de travail)")
    code, out = C.sh(log, [sys.executable, str(WORK / "data" / "scripts" / f"build_comparateur_{YEAR}.py")], WORK, timeout=1800)
    if code:
        raise RuntimeError("construction du comparateur en échec : " + (out.splitlines()[-1] if out else ""))
    return WORK


def run(log: C.Log, a) -> int:
    st = C.load_state(DS)
    # 1. année servie par priminfo
    code, body = C.http_get(PRIMINFO)
    m = re.search(r"<title>\s*Calculateur des primes (\d{4})", body.decode("utf-8", "replace")) if code == 200 else None
    if not m:
        C.record_run(DS, "echec", f"priminfo : titre illisible (HTTP {code})", success=False)
        C.alert(log, DS, "données à vérifier", [f"priminfo.admin.ch : impossible de lire l'année des primes (HTTP {code}, page modifiée ?).", "Rien n'a été publié."], a.dry_run)
        return 1
    year = int(m.group(1))
    log(f"priminfo sert les primes {year}")
    if year > YEAR:
        C.record_run(DS, "alerte", f"primes {year} publiées", success=True)
        C.alert(log, DS, "données à vérifier",
                [f"L'OFSP publie les primes LAMal {year} sur priminfo.admin.ch. Le comparateur affiche encore {YEAR}.",
                 f"La bascule vers {year} se fait à la main (scripts et pages propres à l'année) : rien n'a été publié automatiquement."],
                a.dry_run, dedupe_days=30)
        return 1

    # 2. fichiers OFSP sur opendata.swiss
    ckan_err = ""
    try:
        dates = ckan_dates(log)
    except RuntimeError as e:  # le sondage priminfo (signal principal) se poursuit, mais le passage ne finira pas en vert
        dates, ckan_err = {}, str(e)
        log(ckan_err)
    ckan_msg = ""
    prev = st.get("ckan", {})
    if dates:
        for f in ("Prämien_CH.csv", "Prämien_CH.xlsx"):
            if prev.get(f) and dates.get(f) and dates[f] != prev[f]:
                ckan_msg = f"L'OFSP a modifié le fichier {f} sur opendata.swiss ({prev[f][:10]} → {dates[f][:10]})."
        if not a.dry_run:
            C.save_state(DS, ckan=dates)
        log("opendata.swiss : " + ", ".join(f"{k} {v[:10]}" for k, v in sorted(dates.items()) if k.startswith("Prämien")))

    # 3. sondage
    F, B = mod(f"fetch_priminfo_{YEAR}"), mod(f"build_comparateur_{YEAR}")
    plan = json.loads((PI / "plan.json").read_text())
    tmp = C.STATE / "sonde.html.gz"
    diffs, failures = [], []
    for i, p in enumerate(plan):
        for cl, fr in (("adulte", 300), ("enfant", 0)):
            name = f"{cl}_{fr}_avec.html.gz"
            try:
                code, raw = C.http_get(F.requete(p["location_id"], F.YOB[cl], fr, 1, F.MODELES), timeout=60)
                if code != 200:
                    raise RuntimeError(f"HTTP {code}")
                if a.simulate_parser_failure and i == 0:
                    raw = raw.replace(b'id="savingsTable"', b'id="nouveauTableau"')
                    log(f"[simulation] {p['canton']}{p['region']} {name} : tableau renommé (structure changée)")
                new = lire_bytes(B, raw, tmp)
            except Exception as e:  # noqa: BLE001
                failures.append(f"{p['canton']} région {p['region']} ({p['commune']}), {cl} : {e}")
                continue
            old = B.lire(PI / f"{p['canton']}{p['region']}" / name)
            if set(new) != set(old):
                diffs.append(f"{p['canton']} région {p['region']}, {cl} : {len(set(new) ^ set(old))} ligne(s) différente(s)")
    tmp.unlink(missing_ok=True)
    log(f"sondage : {len(plan) * 2} profils, {len(diffs)} différence(s), {len(failures)} échec(s)")
    if failures:
        C.record_run(DS, "echec", f"{len(failures)} profil(s) illisible(s)", success=False)
        C.alert(log, DS, "données à vérifier",
                ["Contrôle des primes LAMal : priminfo.admin.ch ne se lit plus comme prévu (page modifiée ou indisponible) :<br>"
                 + "<br>".join(failures[:6]), "Rien n'a été publié."], a.dry_run)
        return 1
    if a.simulate_change:
        diffs.append("[simulation] GE région 0, adulte : 1 ligne différente")
    if ckan_err and not diffs:
        # opendata.swiss n'est qu'un signal d'appoint : priminfo (signal principal) n'a rien changé, donc pas d'alerte,
        # mais la panne reste visible dans le journal et le récapitulatif.
        C.record_run(DS, "ok", f"primes {YEAR} inchangées (opendata.swiss illisible : {ckan_err[:200]})", success=True)
        return 0
    if not diffs and not ckan_msg:
        C.record_run(DS, "ok", f"primes {YEAR} inchangées", success=True)
        return 0

    # 4. relevé complet + construction hors du site
    log("différence détectée : " + "; ".join(diffs + ([ckan_msg] if ckan_msg else [])))
    fetch = not a.dry_run
    if a.dry_run:
        log("[dry-run] relevé complet non lancé ; construction à partir des sources gardées" + (" modifiées" if a.simulate_change else ""))
    tree = build_tree(log, simulate=a.simulate_change, fetch=fetch)
    new_pub = tree / "site" / "public" / "data" / f"primes-{YEAR}"
    new_res = tree / "site" / "src" / "data" / RESUME.name
    problems, summary, changed = validate(new_pub, new_res)
    for s in summary:
        log("  " + s)
    if problems:
        for p in problems:
            log("  anomalie " + p)
        C.record_run(DS, "invalide", "; ".join(problems)[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                ["Primes LAMal : nouveau relevé invraisemblable, publication bloquée :<br>" + "<br>".join(problems[:8]),
                 ("Changements lus :<br>" + "<br>".join(summary[:10])) if summary else "", "Rien n'a été publié."], a.dry_run)
        return 1
    if not changed:
        log("relevé complet identique aux données publiées")
        C.record_run(DS, "ok", "relevé complet identique", success=True)
        return 0
    intro = ([ckan_msg] if ckan_msg else []) + ["Primes LAMal " + str(YEAR) + " corrigées sur priminfo.admin.ch :<br>" + "<br>".join(summary[:12])]
    if a.dry_run:
        log("[dry-run] écrirait " + ", ".join(changed) + f" dans {PUB}, {RESUME.name} et les sources, puis publierait")
        C.alert(log, DS, "données mises à jour", intro + ["(dry-run : rien publié)"], True)
        return 0

    backup = C.Backup([PUB, RESUME, PI])
    try:
        C.swap_dir(new_pub, PUB)
        C.replace_file(new_res, RESUME)
        C.swap_dir(tree / "data" / "sources" / PI.name, PI)
    except BaseException:
        backup.restore()  # état d'avant remis si une étape de l'écriture échoue
        raise
    log(f"écrit {PUB}, {RESUME} et {PI}")
    checks = [{"url": "/assurance-maladie/comparateur/", "out": "assurance-maladie/comparateur/index.html"}]
    checks += [{"url": f"/data/primes-{YEAR}/{ct}.json", "out": f"data/primes-{YEAR}/{ct}.json"} for ct in changed]
    published, why = C.publish(log, [PUB, RESUME], backup, checks)
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why, success=True, published=published)
    C.alert(log, DS, "données mises à jour" if published else "données à vérifier", intro + [why], False)
    return 0 if published else 1


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
