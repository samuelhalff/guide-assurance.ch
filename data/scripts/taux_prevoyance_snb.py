#!/usr/bin/env python3
"""Taux d'intérêt des comptes de prévoyance liée (pilier 3a) et de libre passage (2e pilier) selon la statistique de la
Banque nationale suisse (BNS) : un point par mois depuis juin 2017, repris tel quel du portail de données de la BNS.

Source : cube « zikrepro » du portail data.snb.ch (« Taux d'intérêt publiés pour nouvelles opérations », moyenne non
pondérée des taux publiés par les banques déclarantes), séries D1 = GVG_S3A (prévoyance liée, pilier 3a) et
D1 = GVG_F2S (comptes de libre passage, 2e pilier), D0 = M (moyenne), 025Q (premier quartile), 05Q (médiane),
075Q (troisième quartile). En pour-cent, fin de mois.

Fichier : data/snb-taux-prevoyance.json, copié à l'identique dans site/src/data/ (pages /3e-pilier/taux-3a/historique/,
/libre-passage/taux/ et leurs versions anglaises). La série brute n'est pas republiée en CSV : conditions d'utilisation
de la BNS (réutilisation « à des fins non commerciales »), les pages renvoient au portail de la BNS.

  source   : organisme, cube, titres FR/EN, pages du portail, adresse de l'API, unité, fréquence, note, conditions
  publie_le: date de publication du cube par la BNS (ligne « PublishingDate » du CSV)
  series   : {GVG_S3A|GVG_F2S: {libelle_fr, libelle_en, points: [{mois, moyenne, q25, mediane, q75}]}}

Règles : valeurs arrondies à 4 décimales (la BNS publie jusqu'à 8 décimales ; les quartiles tombent sur des taux
publiés, souvent au dixième ou au quart de dixième), jamais complétées ni interpolées ; un mois n'est gardé que si la
BNS donne les quatre valeurs (les mois vides, avant juin 2017, sont omis). Aucune date de lecture dans le fichier : il
ne change que si la BNS publie de nouvelles valeurs.

Mise à jour mensuelle : infra/refresh/tauxsnb.py (contrôles, publication automatique si valide).

  python3 data/scripts/taux_prevoyance_snb.py show
  python3 data/scripts/taux_prevoyance_snb.py fetch [--write] [--from FICHIER.csv]
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]          # .../guide-assurance.ch/data
DATA_FILE = ROOT / "snb-taux-prevoyance.json"
SITE_FILE = ROOT.parent / "site" / "src" / "data" / "snb-taux-prevoyance.json"

CUBE = "zikrepro"
SERIES = ("GVG_S3A", "GVG_F2S")
VALEURS = {"M": "moyenne", "025Q": "q25", "05Q": "mediane", "075Q": "q75"}
DEBUT = "2017-01"
API_DATA = (f"https://data.snb.ch/api/cube/{CUBE}/data/csv/en?fromDate={DEBUT}"
            f"&dimSel=D0({','.join(VALEURS)}),D1({','.join(SERIES)})")
API_DIMENSIONS = f"https://data.snb.ch/api/cube/{CUBE}/dimensions/{{lang}}"
DECIMALES = 4

# Libellés officiels (portail data.snb.ch, cube zikrepro, lus le 25.11.2026). Le relevé mensuel compare les libellés
# des séries à ceux de l'API (dimensions) : un libellé changé signale une série redéfinie, rien n'est publié.
SOURCE = {
    "organisme_fr": "Banque nationale suisse (BNS)",
    "organisme_en": "Swiss National Bank (SNB)",
    "cube": CUBE,
    "titre_fr": "Taux d’intérêt publiés pour nouvelles opérations",
    "titre_en": "Published interest rates for new transactions",
    "page_fr": f"https://data.snb.ch/fr/topics/ziredev/cube/{CUBE}",
    "page_en": f"https://data.snb.ch/en/topics/ziredev/cube/{CUBE}",
    "api": API_DATA,
    "unite_fr": "En pour-cent",
    "unite_en": "In percent",
    "frequence_fr": "Fin de mois",
    "frequence_en": "End of month",
    "note_fr": "Moyenne non pondérée.",
    "note_en": "Unweighted average.",
    "valeurs_fr": {"moyenne": "Moyenne", "q25": "Premier quartile", "mediane": "Médiane", "q75": "Troisième quartile"},
    "valeurs_en": {"moyenne": "Mean value", "q25": "0.25 quantile", "mediane": "Median", "q75": "0.75 quantile"},
    "conditions_fr": "https://www.snb.ch/fr/srv/disclaimer_copyright",
    "conditions_en": "https://www.snb.ch/en/srv/disclaimer_copyright",
}
LIBELLES = {
    "GVG_S3A": {"libelle_fr": "Prévoyance liée (pilier 3a)", "libelle_en": "Tied pension provision (pillar 3a)"},
    "GVG_F2S": {"libelle_fr": "Comptes de libre passage (2e pilier)", "libelle_en": "Vested benefits accounts (pillar 2)"},
}
UA = "guide-assurance.ch data refresh (+https://guide-assurance.ch)"


def http_get(url: str, timeout: int = 60, retries: int = 2) -> bytes:
    last: Exception | None = None
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500 or i == retries:
                raise RuntimeError(f"{url} : HTTP {e.code}") from e
            last = e
        except Exception as e:  # noqa: BLE001
            last = e
        time.sleep(3 * (i + 1))
    raise RuntimeError(f"{url} : {last}")


def fetch_csv() -> str:
    return http_get(API_DATA).decode("utf-8-sig")


def fetch_libelles() -> dict[str, dict[str, str]]:
    """Libellés des séries dans l'API (FR et EN) : {GVG_S3A: {libelle_fr, libelle_en}, ...}."""
    out: dict[str, dict[str, str]] = {s: {} for s in SERIES}

    def walk(items, lang):
        for it in items:
            if it.get("id") in out:
                out[it["id"]][f"libelle_{lang}"] = it.get("name", "")
            walk(it.get("dimensionItems") or [], lang)

    for lang in ("fr", "en"):
        d = json.loads(http_get(API_DIMENSIONS.format(lang=lang)))
        walk(d.get("dimensions") or [], lang)
    return out


def parse(text: str) -> tuple[str, dict[str, list[dict]]]:
    """CSV de l'API (point-virgule ; trois lignes d'en-tête puis "Date";"D0";"D1";"Value") -> (date de publication
    AAAA-MM-JJ, {série: points triés par mois}). Lève ValueError si le format a changé."""
    text = text.lstrip("﻿")
    m = re.search(r'^"?PublishingDate"?;"?(\d{4}-\d{2}-\d{2})', text, re.M)
    if not m:
        raise ValueError("ligne PublishingDate introuvable")
    publie = m.group(1)
    lignes = text.splitlines()
    try:
        i = next(k for k, l in enumerate(lignes) if l.replace('"', "").strip() == "Date;D0;D1;Value")
    except StopIteration as e:
        raise ValueError('en-tête "Date";"D0";"D1";"Value" introuvable') from e
    brut: dict[str, dict[str, dict[str, float]]] = {s: {} for s in SERIES}
    for row in csv.reader(io.StringIO("\n".join(lignes[i + 1:])), delimiter=";"):
        if not row or not any(row):
            continue
        if len(row) != 4:
            raise ValueError(f"ligne inattendue : {row}")
        mois, d0, d1, val = (x.strip() for x in row)
        if not re.fullmatch(r"\d{4}-\d{2}", mois):
            raise ValueError(f"mois inattendu : {mois}")
        if d1 not in brut or d0 not in VALEURS or val == "":
            continue
        brut[d1].setdefault(mois, {})[VALEURS[d0]] = float(val)
    series: dict[str, list[dict]] = {}
    for s in SERIES:
        pts = []
        for mois in sorted(brut[s]):
            v = brut[s][mois]
            if len(v) != len(VALEURS):
                continue  # mois incomplet : omis, jamais complété
            pts.append({"mois": mois, **{k: arrondi(v[k]) for k in VALEURS.values()}})
        series[s] = pts
    return publie, series


def arrondi(x: float) -> float:
    r = round(x, DECIMALES)
    return 0.0 if r == 0 else r


def build(text: str) -> dict:
    publie, series = parse(text)
    return {
        "description": (
            "Taux d'intérêt des comptes de prévoyance liée (pilier 3a) et de libre passage (2e pilier) selon la "
            "statistique de la Banque nationale suisse : moyenne non pondérée, premier quartile, médiane et troisième "
            "quartile des taux publiés par les banques déclarantes, en % par an, fin de mois. Valeurs reprises telles "
            "quelles (arrondies à 4 décimales) ; un mois sans les quatre valeurs est omis. "
            "Mise à jour mensuelle (infra/refresh/tauxsnb.py, data/scripts/taux_prevoyance_snb.py)."
        ),
        "source": SOURCE,
        "publie_le": publie,
        "series": {s: {**LIBELLES[s], "points": series[s]} for s in SERIES},
    }


def dumps(d: dict) -> str:
    return json.dumps(d, ensure_ascii=False, indent=1) + "\n"


def load_data() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else {}


def write(d: dict) -> list[Path]:
    txt = dumps(d)
    DATA_FILE.write_text(txt, encoding="utf-8")
    SITE_FILE.write_text(txt, encoding="utf-8")
    return [DATA_FILE, SITE_FILE]


def show(d: dict | None = None) -> None:
    d = d or load_data()
    print(f"publié par la BNS le {d.get('publie_le')}")
    for s, v in d.get("series", {}).items():
        p = v["points"]
        if not p:
            print(f"{s} : aucun point")
            continue
        print(f"{s} ({v['libelle_fr']}) : {len(p)} mois, {p[0]['mois']} à {p[-1]['mois']}, dernier : moyenne "
              f"{p[-1]['moyenne']} %, quartiles {p[-1]['q25']}–{p[-1]['q75']} %, médiane {p[-1]['mediane']} %")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["show", "fetch"], nargs="?", default="show")
    ap.add_argument("--write", action="store_true", help="écrit data/ et site/src/data/")
    ap.add_argument("--from", dest="src", help="CSV déjà téléchargé au lieu de l'API")
    a = ap.parse_args()
    if a.cmd == "show":
        show()
        return 0
    text = Path(a.src).read_text(encoding="utf-8-sig") if a.src else fetch_csv()
    d = build(text)
    show(d)
    if a.write:
        for p in write(d):
            print(f"écrit {p}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
