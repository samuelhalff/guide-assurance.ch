#!/usr/bin/env python3
"""Statistique de l'assurance-maladie obligatoire (OFSP, outil « Caisses maladie en chiffres ») : veille mensuelle, alerte seulement.

Aucune écriture de données : une nouvelle édition change les tableaux (numéros, colonnes) et passe par une reconstruction
vérifiée à la main (data/scripts/build_kvstat.py, tests/caisses-lamal.test.mts).

Contrôle : la page de l'OFSP (https://www.bag.admin.ch/de/statistik-der-obligatorischen-krankenversicherung) liste les éditions
(« Statistik der obligatorischen Krankenversicherung 2025 (Tabellen - XLSX (ZIP) - unvollständig: 91 T.) », avec la date de
publication). La page est rendue côté serveur : on lit la liste dans le HTML. Alerte quand une édition plus récente que celle du
site (site/src/data/caisses-lamal-AAAA.json) apparaît, puis une seconde fois quand elle est déclarée complète. Si la liste ne se
lit plus (page changée, accès refusé), une alerte part aussi : le script ne devine rien.

  python3 infra/refresh/kvstat.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402

DS = "kvstat"
URL = "https://www.bag.admin.ch/de/statistik-der-obligatorischen-krankenversicherung"
DONNEES = sorted((C.SITE / "src" / "data").glob("caisses-lamal-*.json"))
EDITION_SITE = max(json.loads(f.read_text())["meta"]["edition"] for f in DONNEES) if DONNEES else 0
LIGNE = re.compile(
    r"Statistik der obligatorischen Krankenversicherung\s+((?:19|20)\d\d)\s*\(Tabellen[^)]*\([^)]*\)\s*-\s*(unvollständig|vollständig)\s*:\s*([^)]*)\)"
    r"(?:(?!Statistik der obligatorischen).){0,200}?(\d{1,2}\.\s*[A-Za-zäöüé]+\s+(?:19|20)\d\d)", re.S)


def editions(page: str) -> dict[int, dict]:
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    t = re.sub(r"\s+", " ", t)
    out = {}
    for m in LIGNE.finditer(t):
        out[int(m.group(1))] = {"complet": m.group(2) == "vollständig", "tableaux": m.group(3).strip(), "publie": m.group(4)}
    return out


def run(log: C.Log, a) -> int:
    st = C.load_state(DS)
    try:
        code, body = C.http_get(URL, timeout=90)
        if code != 200:
            raise RuntimeError(f"page de l'OFSP : HTTP {code}")
        page = body.decode("utf-8", "replace")
        if a.simulate_parser_failure:
            page = page.replace("Statistik der obligatorischen Krankenversicherung", "Statistik")
        ed = editions(page)
        if not ed:
            raise RuntimeError("liste des éditions introuvable dans la page (structure modifiée ou page rendue par JavaScript)")
    except Exception as e:  # noqa: BLE001
        C.record_run(DS, "echec", str(e), success=False)
        C.alert(log, DS, "données à vérifier", [
            f"Veille de la statistique OFSP des caisses maladie : la liste des éditions ne peut plus être lue ({e}).",
            "Rien n'a été modifié sur le site. Il faut vérifier la page à la main : " + URL], a.dry_run)
        return 1
    ours = EDITION_SITE - 2 if a.simulate_change else EDITION_SITE
    if a.simulate_change:
        log(f"[simulation] édition du site ramenée à {ours}")
    log("éditions listées : " + ", ".join(f"{y} ({'complète' if v['complet'] else 'incomplète : ' + v['tableaux']}, publiée le {v['publie']})" for y, v in sorted(ed.items(), reverse=True)))
    log(f"édition utilisée par le site : {ours}")
    newer = {y: v for y, v in ed.items() if y > ours}
    if not newer:
        C.record_run(DS, "ok", f"aucune édition plus récente que {ours}", success=True)
        return 0
    y = max(newer)
    v = newer[y]
    sig = f"{y}:{'complete' if v['complet'] else 'incomplete'}"
    if st.get("derniere_alerte") == sig and not a.simulate_change:
        log(f"édition {y} déjà signalée ({sig}) : pas de nouvelle alerte")
        C.record_run(DS, "alerte", f"édition {y} déjà signalée", success=True)
        return 0
    etat = "complète" if v["complet"] else f"encore incomplète ({v['tableaux']})"
    paragraphs = [
        f"L'OFSP a publié le {v['publie']} l'édition {y} de la Statistique de l'assurance-maladie obligatoire, {etat}. "
        f"L'outil « Caisses maladie en chiffres » utilise l'édition {ours}.",
        "Rien n'a été modifié : la nouvelle édition change les tableaux et passe par une reconstruction vérifiée "
        "(data/scripts/build_kvstat.py, tests/caisses-lamal.test.mts). " + (
            "À reprendre quand les tableaux T 5.01, 5.03, 5.07 et 5.10 y figurent." if not v["complet"] else "Les tableaux T 5.01, 5.03, 5.07 et 5.10 peuvent être repris."),
        URL,
    ]
    if not a.dry_run:
        C.save_state(DS, derniere_alerte=sig)
    C.record_run(DS, "alerte", f"édition {y} {etat}", success=True)
    C.alert(log, DS, "données à vérifier", paragraphs, a.dry_run, dedupe_days=30)
    return 1


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
