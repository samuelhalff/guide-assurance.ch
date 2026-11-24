#!/usr/bin/env python3
"""Relevé des taux des comptes de libre passage (2e pilier) sur les pages officielles des institutions.

Usage:
  python3 data/scripts/taux_libre_passage.py fetch [--write] [--only id1,id2]
  python3 data/scripts/taux_libre_passage.py check [--only id1,id2]

Mêmes commandes et mêmes conventions que data/scripts/taux_3a.py, dont les lecteurs (HTTP, PDF, navigateur sans
tête en secours) sont réutilisés par import sans être modifiés.

fetch : télécharge chaque page configurée, enregistre un instantané dans data/sources/libre-passage-taux/
        (<id>.txt + <id>.html.gz ou <id>.pdf), extrait le taux et affiche un tableau. --write met à jour
        data/taux-libre-passage.json et sa copie site/src/data/taux-libre-passage.json (les notes rédigées
        à la main sont conservées).
check : refait le relevé et compare à data/taux-libre-passage.json. Code de sortie 1 si un taux change
        ou si une lecture échoue, 0 si tout est identique.

Sources : uniquement la page ou la fiche de taux PDF de l'institution (ou de sa fondation). Aucun comparateur.
Les solutions de libre passage en titres (fonds, dépôt) ne sont pas relevées.
"""
from __future__ import annotations

import argparse
import datetime as dt
import difflib
import importlib.util
import json
import sys
from pathlib import Path

_HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("taux_3a", _HERE / "taux_3a.py")
T3 = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(T3)

ROOT = _HERE.parent                                   # .../data
SOURCES = ROOT / "sources" / "libre-passage-taux"
DATA_FILE = ROOT / "taux-libre-passage.json"
SITE_FILE = ROOT.parent / "site" / "src" / "data" / "taux-libre-passage.json"

N = T3.NUM[1:-1]
VALID_FR = r"(?P<d>\d{1,2} ?(?:er|e)? \w+ \d{4})"

# id, nom, fondation (seulement si la source la nomme), url, method, rule, valid, note
BANKS: list[dict] = [
    {"id": "ubs", "banque": "UBS", "fondation": None,
     "url": "https://www.ubs.com/ch/fr/services/accounts-and-cards/interest-rates-privates.html", "method": "playwright",
     "rule": r"Compte de libre passage UBS CHF (?P<taux>" + N + r") ?%",
     "valid": r"Valable à partir du " + VALID_FR},
    {"id": "raiffeisen", "banque": "Raiffeisen", "fondation": "Fondation Raiffeisen de libre passage",
     "url": "https://www.raiffeisen.ch/content/dam/www/rch/pdf/privatkunden/vorsorgen-und-absichern/konditionenuebersicht/vorsorge-konditionenuebersicht-fr.pdf",
     "method": "pdf",
     "rule": r"Prévoyance 3a et libre passage Rémunération du compte " + N + r" ?% (?P<taux>" + N + r") ?%",
     "valid": r"Valable à partir du " + VALID_FR},
    {"id": "postfinance", "banque": "PostFinance", "fondation": None,
     "url": "https://www.postfinance.ch/fr/particuliers/prevoyance/compte-libre-passage.html", "method": "http",
     "rule": r"Taux d'intérêt actuel pour la solution de compte: (?P<taux>" + N + r") ?%"},
    {"id": "migros", "banque": "Banque Migros", "fondation": None,
     "url": "https://www.migrosbank.ch/fr/personnes-privees/prevoyance/compte-libre-passage.html", "method": "http",
     "rule": r"Compte de libre passage: (?P<taux>" + N + r") ?%"},
    {"id": "bcge", "banque": "BCGE", "fondation": None,
     "url": "https://www.bcge.ch/fr/taux-des-comptes", "method": "pdf",
     "pdf_link": r'href="([^"]*BCGE_brochure_taux_comptes\.pdf[^"]*)"',
     "rule": r"Libre Passage \(2 ?e? ?pilier\) (?P<taux>" + N + r") ?%",
     "valid": r"en vigueur (?P<d>\d{2}\.\d{2}\.\d{4})"},
    {"id": "bcv", "banque": "BCV", "fondation": None,
     "url": "https://www.bcv.ch/fr/home/informations-financieres/taux-et-tarifs/taux-et-tarifs-clientele-privee.html",
     "method": "http",
     "rule": r"Epargne 3 Jeunes " + N + r" ?% Libre passage (?P<taux>" + N + r") ?%"},
    {"id": "bcvs", "banque": "BCVs", "fondation": "Fondation Libre Passage de la BCVS",
     "url": "https://www.bcvs.ch/prives/prevoyance-assurances/comptes-de-prevoyance/compte-libre-passage", "method": "http",
     "rule": r"Taux & conditions Monnaie CHF Taux d'intérêt (?P<taux>" + N + r") ?%"},
    {"id": "bcf", "banque": "BCF", "fondation": None,
     "url": "https://www.bcf.ch/fr/prives/prevoyance-et-assurances/comptes-de-prevoyance/compte-libre-passage", "method": "http",
     "rule": r"Tarifs et conditions Monnaie CHF Taux d'intérêt (?P<taux>" + N + r") ?%"},
    {"id": "bcn", "banque": "BCN", "fondation": "Swisscanto Fondation de libre passage",
     "url": "https://www.bcn.ch/prives/prevoyance/comptes-de-prevoyance/libre-passage-swisscanto", "method": "http",
     "rule": r"Taux d'intérêt créditeur (?P<taux>" + N + r") ?%"},
    {"id": "bcj", "banque": "BCJ", "fondation": None,
     "url": "https://www.bcj.ch/fr/La-BCJ/Tarif-des-prestations/Tarif-des-prestations.html", "method": "pdf",
     "pdf_link": r'href="([^"]*/Taux_\d+\.pdf)"',
     "rule": r"Epargne 3a Epargne Libre-Passage Taux d'intérêt " + N + r" ?% (?P<taux>" + N + r") ?%",
     "valid": r"Valables dès le " + VALID_FR},
    {"id": "valiant", "banque": "Valiant", "fondation": None,
     "url": "https://www.valiant.ch/fr/clients-prives/prevoyance-produits-de-prevoyance-compte-de-libre-passage", "method": "http",
     "rule": r"Taux d'intérêt de (?P<taux>" + N + r") ?%",
     "valid": r"Dernier ajustement des taux: le " + VALID_FR},
    {"id": "bas", "banque": "BAS", "fondation": None,
     "url": "https://www.bas.ch/fr/conditions-pour-personnes-privees", "method": "http",
     "rule": r"Compte de libre passage BAS 2 Taux d'intérêt (?P<taux>" + N + r") ?%"},
    {"id": "cic", "banque": "CIC (Suisse)", "fondation": None,
     "url": "https://www.cic.ch/fr/solutions/tarifs/taux-d-interet.html", "method": "http",
     "rule": r"Compte de libre passage\* CHF (?P<taux>" + N + r") ?%",
     "valid": r"valable dès le " + VALID_FR,
     "note_fr": "La banque indique que ce compte ne peut être ouvert qu'avec d'autres prestations de CIC (Suisse).",
     "note_en": "The bank states that this account can only be opened together with other CIC (Suisse) services."},
    {"id": "zkb", "banque": "Zürcher Kantonalbank", "fondation": None,
     "url": "https://www.zkb.ch/de/private/vorsorge/3saeule-freizuegigkeit/freizuegigkeitskonto.html", "method": "http",
     "rule": r"Der Zinssatz beträgt (?P<taux>" + N + r") ?% unbeschränkt"},
    {"id": "akb", "banque": "Aargauische Kantonalbank", "fondation": None,
     "url": "https://www.akb.ch/private/vorsorge/vorsorgeprodukte/freizuegigkeitskonto", "method": "http",
     "rule": r"Konditionen Zinssatz (?P<taux>" + N + r") ?%"},
    {"id": "bkb", "banque": "Basler Kantonalbank", "fondation": "Freizügigkeitsstiftung der Basler Kantonalbank",
     "url": "https://www.bkb.ch/de/privatkunden/vorsorge/vorsorgekonten/freizuegigkeitskonto", "method": "http",
     "rule": r"Zinsen Zinsen (?P<taux>" + N + r") ?%, keine Verzinsungslimite"},
    {"id": "blkb", "banque": "Basellandschaftliche Kantonalbank", "fondation": None,
     "url": "https://www.blkb.ch/privatpersonen/konten/konten/vorsorge/freizuegigkeitskonto", "method": "http",
     "rule": r"Das Freizügigkeitskonto zum Deponieren von Pensionskassen-Guthaben\. Zinssatz (?P<taux>" + N + r") ?%"},
    {"id": "sgkb", "banque": "St. Galler Kantonalbank", "fondation": None,
     "url": "https://www.sgkb.ch/de/privatkunden/konten-karten-zahlen/konten-zum-sparen/freizuegigkeitskonto", "method": "http",
     "rule": r"Zinssatz Freizügigkeitskonto (?P<taux>" + N + r") ?%"},
    {"id": "lukb", "banque": "Luzerner Kantonalbank", "fondation": None,
     "url": "https://www.lukb.ch/private/vorsorgen/produkte/freizuegigkeitskonto-saeule-2", "method": "http",
     "rule": r"Konditionen Zinssatz (?P<taux>" + N + r") ?%"},
    {"id": "szkb", "banque": "Schwyzer Kantonalbank", "fondation": None,
     "url": "https://www.szkb.ch/private/vorsorgen/sparen-3-freizuegigkeit/freizuegigkeitskonto", "method": "http",
     "rule": r"Konditionen & Voraussetzungen Zinssatz (?P<taux>" + N + r") ?%"},
    {"id": "gkb", "banque": "Graubündner Kantonalbank", "fondation": None,
     "url": "https://www.gkb.ch/de/private/vorsorgen-planen/produkte/freizuegigkeitskonto", "method": "playwright",
     "rule": r"Kontoführung Zinssatz (?P<taux>" + N + r") ?%"},
    {"id": "bekb", "banque": "Berner Kantonalbank", "fondation": None,
     "url": "https://www.bekb.ch/services/zinsen-und-boerseninformationen/zinssaetze", "method": "http",
     "rule": r"Freizügigkeitskonto Freizügigkeitskonto Zinssatz Gültig bis (?P<taux>" + N + r") ?% Unbeschränkt"},
    {"id": "aeis", "banque": "Fondation institution supplétive LPP", "fondation": "Stiftung Auffangeinrichtung BVG",
     "url": "https://aeis.ch/ueber-uns/aktuelles/zins-und-rentenanpassungen-2025", "method": "http",
     "rule": r"Verzinsung \d{4} Freizügigkeitskonten werden mit (?P<taux>" + N + r") ?% verzinst",
     "note_fr": "La fondation indique que son conseil revoit ce taux chaque trimestre et peut l'adapter.",
     "note_en": "The foundation states that its board reviews this rate every quarter and may change it."},
]
CFG = {b["id"]: b for b in BANKS}

SOURCE_NOTE = ("Taux relevés uniquement sur la page officielle de l'institution ou de sa fondation de libre passage, ou sur sa "
               "fiche de taux PDF (jamais sur un comparateur). « taux » est le taux de l'avoir en compte, en % par an. Les "
               "solutions de libre passage en titres ne sont pas comparées. Les taux sont variables et peuvent changer à tout "
               "moment. Instantanés des pages dans data/sources/libre-passage-taux/, mise à jour par "
               "data/scripts/taux_libre_passage.py.")


def fetch_bank(cfg: dict, save: bool = True) -> dict:
    """Relevé d'une institution avec les lecteurs de taux_3a.py ; instantanés dans SOURCES."""
    old = T3.SOURCES
    T3.SOURCES = SOURCES
    try:
        return T3.fetch_bank(cfg, save=save)
    finally:
        T3.SOURCES = old


def run_all(only: set[str] | None, save: bool) -> list[dict]:
    out = []
    for cfg in BANKS:
        if only and cfg["id"] not in only:
            continue
        r = fetch_bank(cfg, save=save)
        out.append(r)
        status = f"{r['taux']:.3f} %" if "taux" in r else f"ERREUR: {r['erreur']}"
        print(f"  {cfg['id']:<14} {status}", file=sys.stderr)
    return out


def load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text(encoding="utf-8"))
    return {"releve_le": None, "source_note": SOURCE_NOTE, "comptes": [], "non_retenus": []}


def comparable(entry: dict) -> dict:
    return {k: entry.get(k) for k in ("taux", "taux_valable_des")}


def methode_publique(m: str) -> str:
    return "pdf" if m == "pdf" else "http" if m == "http" else "headless"


def apply(data: dict, results: list[dict], today: str) -> dict:
    data = json.loads(json.dumps(data))
    by_id = {c["id"]: c for c in data["comptes"]}
    for r in results:
        if "taux" not in r:
            continue
        cfg = CFG[r["id"]]
        c = by_id.get(r["id"])
        if c is None:
            c = {"id": r["id"], "banque": cfg["banque"], "fondation": cfg.get("fondation"), "taux": None,
                 "taux_valable_des": None, "url": cfg["url"], "source_type": "pdf" if cfg["method"] == "pdf" else "page",
                 "lu_le": today, "extrait": "", "methode": "", "note_fr": cfg.get("note_fr"), "note_en": cfg.get("note_en")}
            data["comptes"].append(c)
        c["taux"] = r["taux"]
        if "taux_valable_des" in r:
            c["taux_valable_des"] = r["taux_valable_des"]
        c["extrait"] = r["extrait"]
        c["lu_le"] = today
        c["methode"] = methode_publique(r.get("methode", cfg["method"]))
        c["url"] = r["url_lue"] if cfg["method"] == "pdf" and r.get("url_lue") else cfg["url"]
    data["releve_le"] = today
    data["source_note"] = SOURCE_NOTE
    return data


def print_table(results: list[dict]) -> None:
    print(f"{'id':<12} {'taux %':>7}  {'valable dès':<11}  méthode / erreur")
    for r in results:
        if "taux" in r:
            print(f"{r['id']:<12} {r['taux']:>7.3f}  {r.get('taux_valable_des') or '-':<11}  {r.get('methode')}")
        else:
            print(f"{r['id']:<12} {'-':>7}  {'-':<11}  ERREUR: {r['erreur']}")


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["fetch", "check"])
    ap.add_argument("--write", action="store_true", help="fetch : met à jour data/taux-libre-passage.json")
    ap.add_argument("--only", help="liste d'id séparés par des virgules")
    a = ap.parse_args(argv)
    only = set(a.only.split(",")) if a.only else None
    today = dt.date.today().isoformat()

    results = run_all(only, save=True)
    print_table(results)
    data = load_data()

    if a.cmd == "fetch":
        if a.write:
            new = apply(data, results, today)
            DATA_FILE.write_text(json.dumps(new, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"\n{DATA_FILE} mis à jour.")
            SITE_FILE.write_text(DATA_FILE.read_text(encoding="utf-8"), encoding="utf-8")
            print(f"{SITE_FILE} copié (reconstruire et déployer le site).")
        return 0 if all("taux" in r for r in results) else 1

    stored = {c["id"]: c for c in data.get("comptes", [])}
    failures = [r for r in results if "taux" not in r]
    old_lines, new_lines = [], []
    for r in results:
        if "taux" not in r:
            continue
        old = comparable(stored.get(r["id"], {}))
        new = comparable({**stored.get(r["id"], {}), "taux": r["taux"],
                          **({"taux_valable_des": r["taux_valable_des"]} if "taux_valable_des" in r else {})})
        old_lines.append(f"{r['id']}: {json.dumps(old, ensure_ascii=False, sort_keys=True)}\n")
        new_lines.append(f"{r['id']}: {json.dumps(new, ensure_ascii=False, sort_keys=True)}\n")
    diff = list(difflib.unified_diff(old_lines, new_lines, "taux-libre-passage.json", "relevé du " + today))
    if diff:
        print("\nChangements détectés:")
        sys.stdout.writelines(diff)
    for f in failures:
        print(f"\nÉCHEC {f['id']}: {f['erreur']}")
    if diff or failures:
        return 1
    print("\nAucun changement: tous les taux sont identiques.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
