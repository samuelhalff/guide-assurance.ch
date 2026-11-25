#!/usr/bin/env python3
"""Taux 3a et de libre passage selon la statistique de la BNS : relevé mensuel, publication automatique si valide.

Relevé : data/scripts/taux_prevoyance_snb.py (API du portail data.snb.ch, cube zikrepro, séries GVG_S3A et GVG_F2S :
moyenne, quartiles, médiane, fin de mois). Contrôles avant toute écriture :
  - format du CSV (date de publication, en-tête, lignes) et libellés des deux séries dans l'API identiques à ceux du
    fichier (une série renommée est peut-être redéfinie) ;
  - aucune série raccourcie : premier mois inchangé, dernier mois égal ou plus récent, aucun mois perdu ;
  - valeurs entre -1 et 5 %, premier quartile ≤ médiane ≤ troisième quartile ;
  - mois déjà publiés : une révision de la BNS est reprise, mais pas au-delà de 0,25 point ;
  - nouveau mois : écart de la moyenne de 0,5 point au plus avec le mois précédent ;
  - date de publication ni antérieure à celle du fichier, ni dans le futur.
Anomalie -> alerte « données à vérifier », rien n'est écrit. Valeurs inchangées -> rien à faire.

  python3 infra/refresh/tauxsnb.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import datetime as dt
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
from taux3a import load_module  # noqa: E402

DS = "tauxsnb"
SCRIPT = C.ROOT / "data" / "scripts" / "taux_prevoyance_snb.py"
MAX_REVISION = 0.25
MAX_JUMP = 0.5
NOMS = {"GVG_S3A": "pilier 3a", "GVG_F2S": "libre passage"}


def mois_fr(m: str) -> str:
    a, mm = m.split("-")
    return f"{mm}.{a}"


def valeur_page(x: float, sep: str) -> str:
    """Forme affichée sur les pages (decimalesSnb, site/src/lib/engines/taux-snb.ts) : deux décimales, trois si la
    troisième compte."""
    s = f"{x:.3f}"
    s = s[:-1] if s.endswith("0") else s
    return s.replace(".", sep)


def controler(old: dict, new: dict, today: dt.date) -> list[str]:
    problems: list[str] = []
    if old.get("publie_le") and new["publie_le"] < old["publie_le"]:
        problems.append(f"date de publication {new['publie_le']} antérieure à celle du site ({old['publie_le']})")
    if dt.date.fromisoformat(new["publie_le"]) > today + dt.timedelta(days=1):
        problems.append(f"date de publication dans le futur ({new['publie_le']})")
    for s, nom in NOMS.items():
        pts = new["series"].get(s, {}).get("points") or []
        if len(pts) < 12:
            problems.append(f"{nom} : {len(pts)} mois seulement")
            continue
        for p in pts:
            vals = [p["moyenne"], p["q25"], p["mediane"], p["q75"]]
            if not all(-1 <= v <= 5 for v in vals):
                problems.append(f"{nom} {mois_fr(p['mois'])} : valeur hors de la plage -1 à 5 % ({vals})")
            if not (p["q25"] <= p["mediane"] <= p["q75"]):
                problems.append(f"{nom} {mois_fr(p['mois'])} : quartiles incohérents ({p['q25']}, {p['mediane']}, {p['q75']})")
        anciens = {p["mois"]: p for p in (old.get("series", {}).get(s, {}).get("points") or [])}
        if not anciens:
            continue
        nouveaux = {p["mois"]: p for p in pts}
        perdus = sorted(set(anciens) - set(nouveaux))
        if perdus:
            problems.append(f"{nom} : {len(perdus)} mois absents du nouveau fichier ({', '.join(mois_fr(m) for m in perdus[:5])})")
        for m, a in anciens.items():
            b = nouveaux.get(m)
            if b and any(abs(b[k] - a[k]) > MAX_REVISION for k in ("moyenne", "q25", "mediane", "q75")):
                problems.append(f"{nom} {mois_fr(m)} : révision de plus de {MAX_REVISION} point ({a['moyenne']} -> {b['moyenne']} en moyenne)")
        dernier_ancien = max(anciens)
        suite = [p for p in pts if p["mois"] > dernier_ancien]
        prec = anciens[dernier_ancien]
        for p in suite:
            if abs(p["moyenne"] - prec["moyenne"]) > MAX_JUMP:
                problems.append(f"{nom} {mois_fr(p['mois'])} : la moyenne passe de {prec['moyenne']} à {p['moyenne']} % "
                                f"(écart de plus de {MAX_JUMP} point en un mois)")
            prec = p
    return problems


def decrire(old: dict, new: dict) -> list[str]:
    lignes = []
    for s, nom in NOMS.items():
        a = {p["mois"]: p for p in (old.get("series", {}).get(s, {}).get("points") or [])}
        pts = new["series"][s]["points"]
        ajoutes = [p for p in pts if p["mois"] not in a]
        revises = [p["mois"] for p in pts if p["mois"] in a and p != a[p["mois"]]]
        if ajoutes:
            lignes.append(f"{nom} : {len(ajoutes)} mois ajouté(s), dernier {mois_fr(ajoutes[-1]['mois'])} : moyenne "
                          f"{ajoutes[-1]['moyenne']} %, médiane {ajoutes[-1]['mediane']} %, quartiles {ajoutes[-1]['q25']}–{ajoutes[-1]['q75']} %")
        if revises:
            lignes.append(f"{nom} : {len(revises)} mois révisé(s) par la BNS ({', '.join(mois_fr(m) for m in revises[:6])}"
                          f"{'…' if len(revises) > 6 else ''})")
    return lignes


def run(log: C.Log, a) -> int:
    T = load_module(SCRIPT, "taux_prevoyance_snb")
    stored = T.load_data()
    if a.simulate_change:
        stored = json.loads(json.dumps(stored))
        p = stored["series"]["GVG_S3A"]["points"].pop()
        log(f"[simulation] copie en mémoire : dernier mois 3a ({p['mois']}) retiré, il paraît donc nouveau")
    try:
        text = T.fetch_csv()
        if a.simulate_parser_failure:
            text = text.replace("PublishingDate", "Publication")
            log("[simulation] CSV de la BNS au format modifié")
        new = T.build(text)
        libelles = T.fetch_libelles()
    except Exception as e:  # noqa: BLE001
        C.record_run(DS, "echec", f"lecture impossible : {e}"[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                [f"Relevé des taux 3a et de libre passage de la BNS : lecture impossible ({e}).",
                 f"Adresse : <a href='{T.API_DATA}'>{T.API_DATA}</a>", "Rien n'a été publié."], a.dry_run)
        return 1

    problems = controler(stored, new, dt.date.today())
    for s in T.SERIES:
        for k in ("libelle_fr", "libelle_en"):
            if libelles.get(s, {}).get(k) != T.LIBELLES[s][k]:
                problems.append(f"libellé de la série {s} changé dans l'API de la BNS : « {libelles.get(s, {}).get(k)} » "
                                f"au lieu de « {T.LIBELLES[s][k]} » (série peut-être redéfinie)")
    if problems:
        for p in problems:
            log("  anomalie " + p)
        C.record_run(DS, "invalide", "; ".join(problems)[:300], success=False)
        C.alert(log, DS, "données à vérifier",
                ["Relevé des taux 3a et de libre passage de la BNS : publication bloquée :<br>" + "<br>".join(problems),
                 "Rien n'a été publié."], a.dry_run)
        return 1

    if T.dumps(new) == T.dumps(stored):
        log(f"aucun changement (publication BNS du {new['publie_le']})")
        if (rc := C.retenter_publication_fin(log, DS, a.dry_run, "Statistique de la BNS (taux 3a et de libre passage)")) is not None:
            return rc
        C.record_run(DS, "ok", "aucun changement", success=True)
        return 0

    chg = decrire(stored, new) or [f"date de publication {stored.get('publie_le') or '—'} → {new['publie_le']}"]
    for c in chg:
        log("  changement " + c)
    chg_html = "<br>".join(chg)
    if a.dry_run:
        log(f"[dry-run] écrirait {T.DATA_FILE} et {T.SITE_FILE}, puis tests, build, déploiement et vérification en ligne")
        C.alert(log, DS, "données mises à jour", ["Statistique de la BNS mise à jour :<br>" + chg_html, "(dry-run : rien publié)"], True)
        return 0

    backup = C.Backup([T.DATA_FILE, T.SITE_FILE])
    written = T.write(new)
    log(f"écrit {T.DATA_FILE} et {T.SITE_FILE}")
    d3a = new["series"]["GVG_S3A"]["points"][-1]["moyenne"]
    dlp = new["series"]["GVG_F2S"]["points"][-1]["moyenne"]
    num = lambda x, sep: re.escape(valeur_page(x, sep)) + r"[\s \xa0]*%"  # noqa: E731
    checks = [
        {"url": "/3e-pilier/taux-3a/historique/", "out": "3e-pilier/taux-3a/historique/index.html", "values": [num(d3a, ",")]},
        {"url": "/en/pillar-3a/interest-rates/history/", "out": "en/pillar-3a/interest-rates/history/index.html", "values": [num(d3a, ".")]},
        {"url": "/libre-passage/taux/", "out": "libre-passage/taux/index.html", "values": [num(dlp, ",")]},
        {"url": "/en/vested-benefits/interest-rates/", "out": "en/vested-benefits/interest-rates/index.html", "values": [num(dlp, ".")]},
    ]
    published, why = C.publish(log, written, backup, checks)
    log(why)
    C.record_run(DS, "publie" if published else "ecrit_non_publie", why, success=True, published=published)
    C.alert(log, DS, "données mises à jour" if published else "données à vérifier",
            ["Statistique de la BNS (taux 3a et de libre passage) mise à jour :<br>" + chg_html, why], False)
    return 0 if published else 1


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
