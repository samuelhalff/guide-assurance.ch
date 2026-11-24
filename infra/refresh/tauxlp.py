#!/usr/bin/env python3
"""Taux des comptes de libre passage : relevé hebdomadaire, publication automatique si valide.

Relevé : data/scripts/taux_libre_passage.py (pages et fiches PDF officielles des institutions ; lecteurs HTTP, PDF et
navigateur sans tête de data/scripts/taux_3a.py, réutilisés par import).
Même déroulé que taux3a.py : une institution illisible garde son dernier taux vérifié et sa date de relevé et est
signalée « non relevée cette semaine » (résumé du passage et e-mail) ; plus de la moitié illisibles -> alerte, rien
publié ; nombre d'institutions = nombre en base ±10 % ; taux entre 0 et 3 % ; écart ≤ 0,5 point par relevé ; date de
validité plausible ; second relevé de chaque institution modifiée (valeur stable) ; texte rédigé à la main
(note_fr, note_en) qui cite une ancienne valeur -> alerte sans publication. Pas d'historique pour ce jeu.

  python3 infra/refresh/tauxlp.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import datetime as dt
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

DS = "tauxlp"
SCRIPT = C.ROOT / "data" / "scripts" / "taux_libre_passage.py"
MAX_JUMP = 0.5


def load_module(path: Path = SCRIPT, name: str = "taux_libre_passage"):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def fr(x: float) -> str:
    return valeur_page(x, ",") + " %"


def valeur_page(x: float, sep: str) -> str:
    """Forme affichée sur la page (lib/engines/libre-passage.ts) : deux décimales, trois si la troisième compte."""
    s = f"{x:.3f}"
    s = s[:-1] if s.endswith("0") else s
    return s.replace(".", sep)


def resume_ci(lignes: list[str]) -> None:
    f = os.environ.get("GITHUB_STEP_SUMMARY")
    if f:
        with open(f, "a", encoding="utf-8") as fh:
            fh.write("\n".join(lignes) + "\n")


def run(log: C.Log, a) -> int:
    T = load_module()
    stored = T.load_data()
    if a.simulate_change:
        stored = json.loads(json.dumps(stored))
        c0 = stored["comptes"][0]
        log(f"[simulation] copie en mémoire : taux stocké de {c0['id']} {c0['taux']} -> {round(c0['taux'] + 0.05, 3)}")
        c0["taux"] = round(c0["taux"] + 0.05, 3)
    if a.simulate_parser_failure:
        T.BANKS = [dict(b) for b in T.BANKS]
        T.BANKS[1]["rule"] = r"STRUCTURE INTROUVABLE (?P<taux>\d+,\d+)"
        log(f"[simulation] règle d'extraction de {T.BANKS[1]['id']} cassée (page dont la structure a changé)")

    results = T.run_all(None, save=not a.dry_run)
    by_id = {c["id"]: c for c in stored.get("comptes", [])}
    names = {c["id"]: c.get("banque", c["id"]) for c in stored.get("comptes", [])}
    ok = [r for r in results if "taux" in r]
    failures = [r for r in results if "taux" not in r]
    problems: list[str] = []

    # --- validation
    n_old = len(by_id)
    if n_old and abs(len(results) - n_old) > 0.1 * n_old:
        problems.append(f"{len(results)} institutions relevées contre {n_old} en base (écart de plus de 10 %)")
    today = dt.date.today()
    for r in ok:
        nom = names.get(r["id"], r["id"])
        v = r["taux"]
        if not (0 <= v <= 3):
            problems.append(f"{nom} : taux {v} % hors de la plage 0–3 %")
        old = by_id.get(r["id"], {}).get("taux")
        if old is not None and abs(v - old) > MAX_JUMP:
            problems.append(f"{nom} : le taux passe de {fr(old)} à {fr(v)} (écart de plus de {MAX_JUMP} point)")
        d = r.get("taux_valable_des")
        if d and not (dt.date(2015, 1, 1) <= dt.date.fromisoformat(d) <= today + dt.timedelta(days=180)):
            problems.append(f"{nom} : date de validité invraisemblable {d}")

    # --- changements
    changes, human = [], []
    for r in ok:
        old_c = by_id.get(r["id"], {})
        new_c = {**old_c, "taux": r["taux"]}
        if "taux_valable_des" in r:
            new_c["taux_valable_des"] = r["taux_valable_des"]
        if T.comparable(old_c) == T.comparable(new_c):
            continue
        nom = names.get(r["id"], r["id"])
        parts = []
        if old_c.get("taux") != new_c.get("taux"):
            parts.append(f"taux {fr(old_c['taux']) if old_c.get('taux') is not None else '—'} → {fr(new_c['taux'])}")
            if old_c.get("taux") is not None:
                pat = re.compile(r"(?<![\d.,])" + f"{old_c['taux']:.2f}".replace(".", "[.,]") + r"(?!\d)")
                for champ in ("note_fr", "note_en"):
                    if pat.search(old_c.get(champ) or ""):
                        human.append(f"{nom} : le texte « {champ} » cite encore {fr(old_c['taux'])}")
        if old_c.get("taux_valable_des") != new_c.get("taux_valable_des"):
            parts.append(f"valable dès {new_c.get('taux_valable_des') or '—'} (avant : {old_c.get('taux_valable_des') or '—'})")
        changes.append((r["id"], nom, "; ".join(parts), r))

    # --- second relevé des institutions modifiées (valeur stable ?)
    if changes and not problems and not a.simulate_change:
        for bid, nom, _, r in changes:
            cfg = next(b for b in T.BANKS if b["id"] == bid)
            r2 = T.fetch_bank(cfg, save=False)
            if r2.get("taux") != r["taux"]:
                problems.append(f"{nom} : second relevé différent ({r2.get('taux', r2.get('erreur'))}), valeur instable")

    log(f"{len(ok)}/{len(results)} institutions lues, {len(changes)} changement(s), {len(failures)} échec(s), {len(problems)} anomalie(s)")
    for _, nom, txt, _ in changes:
        log(f"  changement {nom} : {txt}")
    chg_html = "<br>".join(f"{nom} : {txt}" for _, nom, txt, _ in changes)

    # Institutions non relevées cette semaine : dernier taux vérifié et date de relevé conservés.
    stale = []
    for f in failures:
        old = by_id.get(f["id"], {})
        stale.append(f"{names.get(f['id'], f['id'])} : {f['erreur'][:160]} ; dernier taux vérifié "
                     f"{fr(old['taux']) if old.get('taux') is not None else '—'}, relevé le {old.get('lu_le') or '—'}")
    resume_ci(["### Taux de libre passage", "", "| Institution | Taux | Statut |", "|---|---|---|"]
              + [f"| {names.get(r['id'], r['id'])} | {fr(r['taux'])} | relevé |" for r in ok]
              + [f"| {names.get(f['id'], f['id'])} | {fr(by_id[f['id']]['taux']) if by_id.get(f['id'], {}).get('taux') is not None else '—'} "
                 f"| **non relevé cette semaine** (dernier relevé le {by_id.get(f['id'], {}).get('lu_le') or '—'}) |" for f in failures])
    stale_html = ("Institutions non relevées cette semaine (dernier taux vérifié conservé) :<br>" + "<br>".join(stale)) if stale else ""
    if failures and len(failures) > len(results) / 2:
        lst = "<br>".join(f"{names.get(f['id'], f['id'])} : {f['erreur']}" for f in failures)
        for f in failures:
            log(f"  échec {f['id']} : {f['erreur']}")
        C.record_run(DS, "echec", f"{len(failures)} page(s) illisible(s)", success=False)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux de libre passage : la lecture a échoué pour " + ("une institution" if len(failures) == 1 else f"{len(failures)} institutions")
                 + " (page modifiée ou indisponible) :<br>" + lst,
                 ("Changements lus chez les autres institutions :<br>" + chg_html) if changes else "Aucun changement chez les autres institutions.",
                 "Rien n'a été publié."], a.dry_run)
        return 1
    if problems:
        for p in problems:
            log("  anomalie " + p)
        C.record_run(DS, "invalide", "; ".join(problems)[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux de libre passage : valeurs invraisemblables, publication bloquée :<br>" + "<br>".join(problems),
                 ("Changements lus :<br>" + chg_html) if changes else "", stale_html, "Rien n'a été publié."], a.dry_run)
        return 1
    for f in failures:
        log(f"  non relevée cette semaine {f['id']} : {f['erreur']} (dernier taux vérifié conservé)")
    if not changes:
        log("aucun changement")
        C.record_run(DS, "ok", "aucun changement", success=True)
        if stale:
            C.alert(log, DS, "données à vérifier", ["Relevé des taux de libre passage : aucun taux modifié chez les institutions lues.", stale_html], a.dry_run)
        return 0
    if human:
        C.record_run(DS, "alerte", "texte rédigé à relire", success=True)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux de libre passage : changement(s) lu(s) sur les sites des institutions :<br>" + chg_html,
                 "Un texte rédigé à la main cite encore l'ancienne valeur :<br>" + "<br>".join(sorted(set(human))),
                 "Rien n'a été publié : il faut d'abord adapter ce texte (data/taux-libre-passage.json).", stale_html], a.dry_run)
        return 1
    if a.dry_run:
        log(f"[dry-run] écrirait {T.DATA_FILE} et {T.SITE_FILE}, puis tests, build, déploiement et vérification en ligne")
        C.alert(log, DS, "données mises à jour", ["Taux de libre passage modifiés :<br>" + chg_html, stale_html, "(dry-run : rien publié)"], True)
        return 0

    today = dt.date.today().isoformat()
    backup = C.Backup([T.DATA_FILE, T.SITE_FILE])
    new = T.apply(stored, results, today)
    T.DATA_FILE.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    T.SITE_FILE.write_text(T.DATA_FILE.read_text(encoding="utf-8"), encoding="utf-8")
    log(f"écrit {T.DATA_FILE} et {T.SITE_FILE}")
    changed_rates = [r for *_, r in changes if r["taux"] != by_id.get(r["id"], {}).get("taux")]
    num = lambda x, sep: re.escape(valeur_page(x, sep)) + r"[\s \xa0]*%"  # noqa: E731
    checks = [
        {"url": "/libre-passage/taux/", "out": "libre-passage/taux/index.html", "values": [num(r["taux"], ",") for r in changed_rates]},
        {"url": "/en/vested-benefits/interest-rates/", "out": "en/vested-benefits/interest-rates/index.html", "values": [num(r["taux"], ".") for r in changed_rates]},
    ]
    published, why = C.publish(log, [T.DATA_FILE, T.SITE_FILE], backup, checks)
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why, success=True, published=published)
    C.alert(log, DS, "données mises à jour" if published else "données à vérifier",
            ["Taux de libre passage modifiés sur les sites des institutions :<br>" + chg_html, why, stale_html], False)
    return 0 if published else 1


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
