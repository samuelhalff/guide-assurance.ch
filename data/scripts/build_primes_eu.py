#!/usr/bin/env python3
"""Primes LAMal 2027 des assurés résidant dans l'UE, l'AELE ou au Royaume-Uni -> site/src/data/primes-eu-2027.json.

Source : OFSP, « Aperçu des primes 2027, assurance de base UE/AELE/UK » (gesamtbericht_eu-2027.pdf, priminfo.admin.ch,
version du 22.10.2026), qui publie les mêmes chiffres que le fichier ouvert Prämien_EU (opendata.swiss) ; ce fichier
(opendata.bagnet.ch) ne répondait pas le 24.11.2026 (HTTP 503). Une page par pays pour « sans accident », la suivante
pour « avec accident ». Les montants sont repris tels quels (CHF par mois).

Usage : python3 data/scripts/build_primes_eu.py [chemin.pdf]   (dépendance : pdfplumber)
Les contrôles de cohérence (nombre de pages, pays, comparaison avec la France) sont dans site/tests/primes-ue.test.mts.
"""
import json, re, sys
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[2]
PDF = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "data" / "sources" / "primes-eu-2027" / "gesamtbericht_eu-2027.pdf"
OUT = ROOT / "site" / "src" / "data" / "primes-eu-2027.json"
LIGNE = re.compile(r"^(.+?) (\d{4}) (\d+\.\d{2}) (\d+\.\d{2}) (\d+\.\d{2})$")
TROIS = re.compile(r"^(\d+\.\d{2}) ab 3\. Kind")
NOMS = {"Swica": "Swica", "ÖKK": "ÖKK"}


def lire(page):
    lignes = page.extract_text().split("\n")
    code = next(l for l in lignes[:8] if re.fullmatch(r"[A-Z]{2}", l))
    cas = "sans" if "(ohne Unfall)" in lignes[0] else "avec" if "(mit Unfall)" in lignes[0] else None
    assert cas, lignes[0]
    rows, dernier = [], None
    for l in lignes[8:]:
        m = LIGNE.match(l)
        if m:
            dernier = {"nom": m[1], "no": int(m[2]), "adulte": float(m[3]), "jeune": float(m[4]), "enfant": float(m[5])}
            rows.append(dernier)
            continue
        t = TROIS.match(l)
        if t and dernier:
            dernier["enfant3"] = float(t[1])
    return code, cas, rows


def main():
    pdf = pdfplumber.open(PDF)
    pays = {}
    for i in range(8, 68):
        code, cas, rows = lire(pdf.pages[i])
        for r in rows:
            e = pays.setdefault(code, {}).setdefault(r["no"], {"nom": r["nom"], "no": r["no"]})
            for k in ("adulte", "jeune", "enfant"):
                e.setdefault(k, {})[cas] = r[k]
            if "enfant3" in r:
                e.setdefault("enfant3", {})[cas] = r["enfant3"]
    out = {
        "source": "OFSP, Aperçu des primes 2027, assurance de base UE/AELE/UK (fichier Prämien_EU, opendata.swiss), publié sur priminfo.admin.ch, lu le 24.11.2026",
        "annee": 2027,
        "franchise": "300 CHF (adultes et jeunes adultes), 0 CHF (enfants) : seule franchise possible, art. 101a et 103 OAMal",
        "pays": {c: sorted(v.values(), key=lambda x: x["nom"].lower()) for c, v in sorted(pays.items())},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"{len(out['pays'])} pays, {sum(len(v) for v in out['pays'].values())} lignes -> {OUT}")


if __name__ == "__main__":
    main()
