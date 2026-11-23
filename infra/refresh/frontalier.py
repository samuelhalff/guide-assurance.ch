#!/usr/bin/env python3
"""Frontaliers (simulateur LAMal contre assurance maladie française) : veille, alerte seulement.

Quotidien du 1er au 31 janvier, mensuel (le 1er) le reste de l'année.

1. PASS (plafond annuel de la sécurité sociale) : page « Plafonds de la Sécurité sociale » de l'Urssaf, comparée à
   la table PASS et aux mentions « provisoire » du moteur (site/src/lib/engines/frontaliers.ts, lu, jamais modifié).
   Le PASS est une constante du code du simulateur : un changement passe par une mise à jour vérifiée du code.
2. Primes UE/AELE de l'OFSP (fichier Prämien_EU, opendata.swiss) : date de modification du fichier comparée à
   celle des données du site (site/src/data/primes-eu-fr-2027.json, « mise à jour du JJ.MM.AAAA »).
   Le téléchargement opendata.bagnet.ch répond HTTP 500 depuis novembre 2026 et le schéma exact du fichier n'a
   jamais été lu par ces scripts : pas de publication automatique, alerte seulement.

  python3 infra/refresh/frontalier.py [--dry-run] [--simulate-change] [--simulate-parser-failure]
"""
from __future__ import annotations

import datetime as dt
import html as H
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common as C  # noqa: E402
from lamal import ckan_dates  # noqa: E402

DS = "frontalier"
URSSAF = "https://www.urssaf.fr/accueil/outils-documentation/taux-baremes/plafonds-securite-sociale.html"
ENGINE = C.SITE / "src" / "lib" / "engines" / "frontaliers.ts"
EU_JSON = C.SITE / "src" / "data" / "primes-eu-fr-2027.json"


def text(raw: bytes) -> str:
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw.decode("utf-8", "replace"), flags=re.S)
    return re.sub(r"\s+", " ", H.unescape(re.sub(r"<[^>]+>", " ", t))).replace(" ", " ").replace("\xa0", " ")


def eur(n: int) -> str:
    return f"{n:,}".replace(",", " ") + " €"


def run(log: C.Log, a) -> int:
    notes, alerts, failures = [], [], []

    # --- 1. PASS
    src = ENGINE.read_text()
    m = re.search(r"export const PASS[^=]*=\s*\{([^}]*)\}", src)
    site_pass = {int(k): int(v) for k, v in re.findall(r"(\d{4})\s*:\s*(\d+)", m.group(1))} if m else {}
    prov = re.search(r"const PROVISOIRE[^=]*=\s*\{(.*?)\};", src, re.S)
    provisoire = prov.group(1) if prov else ""
    if not site_pass:
        failures.append("table PASS introuvable dans le moteur du simulateur (frontaliers.ts)")
    code, raw = C.http_get(URSSAF)
    t = text(raw) if code == 200 else ""
    if a.simulate_parser_failure:
        t = t.replace("Année", "Annuel")
        log("[simulation] page Urssaf : libellé « Année » remplacé (structure changée)")
    found = {int(y): int(v.replace(" ", "")) for y, v in
             re.findall(r"hors Mayotte\) (\d{4}) Année (\d{2} ?\d{3}) €", t)}
    if not found:
        failures.append(f"page Urssaf des plafonds illisible (HTTP {code}, structure modifiée ?)")
    else:
        y = max(found)
        v = found[y]
        if a.simulate_change:
            y, v = y + 1, v + 900
            log(f"[simulation] Urssaf publie un PASS {y} de {eur(v)}")
        log(f"Urssaf : PASS {y} = {eur(v)} ; simulateur : {', '.join(f'{k} {eur(x)}' for k, x in sorted(site_pass.items()))}")
        if y not in site_pass:
            alerts.append(f"L'Urssaf publie le PASS {y} : {eur(v)}. Le simulateur frontaliers ne connaît pas encore cette année.")
        elif site_pass[y] != v:
            alerts.append(f"L'Urssaf publie le PASS {y} : {eur(v)}. Le simulateur frontaliers utilise {eur(site_pass[y])}.")
        elif re.search(rf"{y}\s*:\s*\[[^\]]*PASS", provisoire):
            alerts.append(f"L'Urssaf confirme le PASS {y} : {eur(v)}, comme dans le simulateur. "
                          f"Le simulateur l'affiche encore comme « annoncé, arrêté à paraître ».")
        else:
            notes.append(f"PASS {y} confirmé ({eur(v)}), identique au simulateur")

    # --- 2. primes UE/AELE (OFSP)
    eu = json.loads(EU_JSON.read_text())
    mm = re.search(r"mise à jour du (\d{2})\.(\d{2})\.(\d{4})", eu.get("source", ""))
    site_date = dt.date(int(mm.group(3)), int(mm.group(2)), int(mm.group(1))) if mm else None
    dates = ckan_dates(log)
    ofsp = max((v for k, v in dates.items() if k.startswith("Prämien_EU")), default=None)
    if a.simulate_change and ofsp:
        ofsp = "2027-01-15T00:00:00"
        log("[simulation] fichier Prämien_EU modifié le 15.01.2027")
    if not dates:
        notes.append("opendata.swiss injoignable, primes UE non contrôlées")
    elif not ofsp:
        failures.append("fichier Prämien_EU absent du jeu de données de l'OFSP sur opendata.swiss")
    elif site_date and dt.date.fromisoformat(ofsp[:10]) > site_date:
        code, _ = C.http_get("https://opendata.bagnet.ch/?r=/download&path=L1ByYWVtaWVuL1Byw6RtaWVuX0VVLmNzdg%3D%3D", timeout=60, retries=0)
        alerts.append(f"L'OFSP a modifié le fichier des primes UE/AELE (Prämien_EU) le {ofsp[8:10]}.{ofsp[5:7]}.{ofsp[:4]} ; "
                      f"les primes frontaliers du site datent du {site_date:%d.%m.%Y}. "
                      + ("Le fichier se télécharge à nouveau." if code == 200 else f"Le téléchargement répond encore HTTP {code}."))
    else:
        notes.append(f"primes UE : fichier OFSP du {ofsp[:10]}, identique aux données du site")
    for n in notes:
        log("  " + n)

    if failures:
        C.record_run(DS, "echec", "; ".join(failures)[:300], success=False)
        C.alert(log, DS, "données à vérifier", ["Veille frontaliers : " + "<br>".join(failures)] + alerts + ["Rien n'a été modifié sur le site."], a.dry_run)
        return 1
    if alerts:
        C.record_run(DS, "alerte", " ".join(alerts)[:300], success=True)
        C.alert(log, DS, "données à vérifier", alerts + ["Rien n'a été modifié sur le site : le PASS et les primes UE passent par une mise à jour vérifiée du simulateur."],
                a.dry_run, dedupe_days=30)
        return 1
    C.record_run(DS, "ok", "; ".join(notes), success=True)
    return 0


if __name__ == "__main__":
    sys.exit(C.run_main(DS, run, C.base_args(__doc__).parse_args()))
