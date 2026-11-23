#!/usr/bin/env python3
"""Taux des comptes 3a : relevé hebdomadaire, publication automatique si valide.

Relevé : data/scripts/taux_3a.py (pages et fiches PDF officielles des 17 banques).
Contrôles : toutes les banques lues (sinon : structure de page changée -> alerte, rien publié),
nombre de banques = nombre en base ±10 %, taux entre 0 et 3 %, écart ≤ 0,5 point par relevé,
date de validité plausible, second relevé de chaque banque modifiée (valeur stable),
textes rédigés à la main (affiche_*, conditions_*) qui citent une ancienne valeur -> alerte sans publication.

  python3 infra/refresh/taux3a.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import datetime as dt
import importlib.util
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

DS = "taux3a"
SCRIPT = C.ROOT / "data" / "scripts" / "taux_3a.py"
HIST_SCRIPT = C.ROOT / "data" / "scripts" / "taux_3a_historique.py"
MAX_JUMP = 0.5


def load_module(path: Path = SCRIPT, name: str = "taux_3a"):
    spec = importlib.util.spec_from_file_location(name, path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def archive(log: C.Log, T, stored: dict, results: list[dict], dry_run: bool) -> list[Path]:
    """Historique (data/taux-3a-historique.json) : chaque relevé valide des 17 banques y entre, avec les valeurs
    lues, qu'un taux ait changé ou non. Une semaine non archivée est perdue pour de bon."""
    H = load_module(HIST_SCRIPT, "taux_3a_historique")
    today = dt.date.today().isoformat()
    releve = H.releve_depuis(T.apply(stored, results, today), today, "relevé automatique (infra/refresh/taux3a.py)")
    if dry_run:
        log(f"[dry-run] archiverait le relevé du {today} ({len(releve['comptes'])} comptes) dans {H.HIST_FILE.name}")
        return []
    written = H.ecrire(H.ajouter(H.charger(), releve))
    moy, med, n = H.stats(releve)
    log(f"historique : relevé du {today} archivé ({n} comptes, moyenne {moy:.3f} %, médiane {med:.3f} %)")
    return written


def fr(x: float) -> str:
    return f"{x:.2f}".replace(".", ",") + " %"


def values_of(c: dict) -> dict:
    v = {"taux": c.get("taux")}
    v.update({f"variante {k}": x for k, x in (c.get("taux_variantes") or {}).items()})
    return v


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
        problems.append(f"{len(results)} banques relevées contre {n_old} en base (écart de plus de 10 %)")
    today = dt.date.today()
    for r in ok:
        for k, v in [("taux", r["taux"])] + list((r.get("taux_variantes") or {}).items()):
            if not (0 <= v <= 3):
                problems.append(f"{names.get(r['id'], r['id'])} : {k} {v} % hors de la plage 0–3 %")
            old = values_of(by_id.get(r["id"], {})).get("taux" if k == "taux" else f"variante {k}")
            if old is not None and abs(v - old) > MAX_JUMP:
                problems.append(f"{names.get(r['id'], r['id'])} : {k} passe de {fr(old)} à {fr(v)} (écart de plus de {MAX_JUMP} point)")
        d = r.get("taux_valable_des")
        if d and not (dt.date(2015, 1, 1) <= dt.date.fromisoformat(d) <= today + dt.timedelta(days=180)):
            problems.append(f"{names.get(r['id'], r['id'])} : date de validité invraisemblable {d}")

    # --- changements
    changes, human = [], []
    for r in ok:
        old_c = by_id.get(r["id"], {})
        new_c = {**old_c, "taux": r["taux"]}
        if r.get("taux_variantes") or "taux_variantes" in old_c:
            new_c["taux_variantes"] = r.get("taux_variantes")
        if "taux_valable_des" in r:
            new_c["taux_valable_des"] = r["taux_valable_des"]
        if T.comparable(old_c) == T.comparable(new_c):
            continue
        nom = names.get(r["id"], r["id"])
        ov, nv = values_of(old_c), values_of(new_c)
        parts = []
        for k in sorted(set(ov) | set(nv)):
            if ov.get(k) != nv.get(k):
                parts.append(f"{k} {fr(ov[k]) if ov.get(k) is not None else '—'} → {fr(nv[k]) if nv.get(k) is not None else '—'}")
                # un texte rédigé à la main qui cite l'ancienne valeur devient faux
                if ov.get(k) is not None:
                    pat = re.compile(r"(?<![\d.,])" + f"{ov[k]:.2f}".replace(".", "[.,]") + r"(?!\d)")
                    for champ in ("affiche_fr", "affiche_en", "conditions_fr", "conditions_en"):
                        if pat.search(old_c.get(champ) or ""):
                            human.append(f"{nom} : le texte « {champ} » cite encore {fr(ov[k])}")
        if old_c.get("taux_valable_des") != new_c.get("taux_valable_des"):
            parts.append(f"valable dès {new_c.get('taux_valable_des') or '—'} (avant : {old_c.get('taux_valable_des') or '—'})")
        changes.append((r["id"], nom, "; ".join(parts), r))

    # --- second relevé des banques modifiées (valeur stable ?)
    if changes and not failures and not problems and not a.simulate_change:
        for bid, nom, _, r in changes:
            cfg = next(b for b in T.BANKS if b["id"] == bid)
            r2 = T.fetch_bank(cfg, save=False)
            if r2.get("taux") != r["taux"] or r2.get("taux_variantes") != r.get("taux_variantes"):
                problems.append(f"{nom} : second relevé différent ({r2.get('taux', r2.get('erreur'))}), valeur instable")

    log(f"{len(ok)}/{len(results)} banques lues, {len(changes)} changement(s), {len(failures)} échec(s), {len(problems)} anomalie(s)")
    for _, nom, txt, _ in changes:
        log(f"  changement {nom} : {txt}")
    chg_html = "<br>".join(f"{nom} : {txt}" for _, nom, txt, _ in changes)

    if failures:
        lst = "<br>".join(f"{names.get(f['id'], f['id'])} : {f['erreur']}" for f in failures)
        for f in failures:
            log(f"  échec {f['id']} : {f['erreur']}")
        C.record_run(DS, "echec", f"{len(failures)} page(s) illisible(s)", success=False)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux 3a : la lecture a échoué pour " + ("une banque" if len(failures) == 1 else f"{len(failures)} banques")
                 + " (page modifiée ou indisponible) :<br>" + lst,
                 ("Changements lus chez les autres banques :<br>" + chg_html) if changes else "Aucun changement chez les autres banques.",
                 "Rien n'a été publié."], a.dry_run)
        return 1
    if problems:
        for p in problems:
            log("  anomalie " + p)
        C.record_run(DS, "invalide", "; ".join(problems)[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux 3a : valeurs invraisemblables, publication bloquée :<br>" + "<br>".join(problems),
                 ("Changements lus :<br>" + chg_html) if changes else "", "Rien n'a été publié."], a.dry_run)
        return 1
    if not a.simulate_change and not a.simulate_parser_failure:
        hist = archive(log, T, stored, results, a.dry_run)
    else:
        hist = []
    if not changes:
        if not hist or a.dry_run:
            log("aucun changement" + (" ; [dry-run] l'historique serait publié" if hist else ""))
            C.record_run(DS, "ok", "aucun changement", success=True)
            return 0
        # Taux inchangés, mais le relevé de la semaine est un point réel de l'historique : il part en ligne tout de suite.
        published, why = C.publish(log, hist, C.Backup([]), [])
        log("aucun changement de taux ; historique : " + why)
        C.record_run(DS, "publie" if published else "ecrit_non_publie", "historique seul : " + why[:250],
                     success=True, published=published)
        if not published:
            C.alert(log, DS, "données à vérifier",
                    ["Relevé des taux 3a : aucun taux modifié, mais le relevé hebdomadaire n'a pas pu être publié dans l'historique.", why], False)
        return 0 if published else 1
    if human:
        C.record_run(DS, "alerte", "texte rédigé à relire", success=True)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux 3a : changement(s) lu(s) sur les sites des banques :<br>" + chg_html,
                 "Un texte rédigé à la main cite encore l'ancienne valeur :<br>" + "<br>".join(sorted(set(human))),
                 "Rien n'a été publié : il faut d'abord adapter ce texte (data/taux-3a.json)."], a.dry_run)
        return 1
    if a.dry_run:
        log(f"[dry-run] écrirait {T.DATA_FILE} et {T.SITE_FILE}, puis tests, build, déploiement et vérification en ligne")
        C.alert(log, DS, "données mises à jour", ["Taux 3a modifiés :<br>" + chg_html, "(dry-run : rien publié)"], True)
        return 0

    today = dt.date.today().isoformat()
    backup = C.Backup([T.DATA_FILE, T.SITE_FILE])  # l'historique reste écrit : c'est un relevé réel
    new = T.apply(stored, results, today)
    T.DATA_FILE.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    T.SITE_FILE.write_text(T.DATA_FILE.read_text(encoding="utf-8"), encoding="utf-8")
    log(f"écrit {T.DATA_FILE} et {T.SITE_FILE}")
    num = lambda x, sep: re.escape(f"{x:.2f}".replace(".", sep)) + r"[\s \xa0]*%"  # noqa: E731
    checks = [
        {"url": "/3e-pilier/taux-3a/", "out": "3e-pilier/taux-3a/index.html", "values": [num(r["taux"], ",") for *_, r in changes]},
        {"url": "/en/pillar-3a/interest-rates/", "out": "en/pillar-3a/interest-rates/index.html", "values": [num(r["taux"], ".") for *_, r in changes]},
    ]
    published, why = C.publish(log, [T.DATA_FILE, T.SITE_FILE, *hist], backup, checks)
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why, success=True, published=published)
    C.alert(log, DS, "données mises à jour" if published else "données à vérifier",
            ["Taux 3a modifiés sur les sites des banques :<br>" + chg_html, why], False)
    return 0 if published else 1


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
