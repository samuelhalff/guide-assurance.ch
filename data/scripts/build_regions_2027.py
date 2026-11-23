#!/usr/bin/env python3
"""Régions de primes 2027 des cantons couverts : communes, population et prime moyenne estimée par l'OFSP.

Source unique : data/sources/praemienregionen-2027.xlsx (OFSP, « Régions de primes valables du 01.01.2027 au
31.12.2027 », release-2026-10-22, priminfo.admin.ch/downloads/praemienregionen-2027.xlsx), feuilles :
  A_COM  : commune (n° OFS) -> canton, région ;
  C_POP  : population résidante permanente au 31.12.2024 par commune (total, 0-18, 19-25, > 25) ;
  D_PRIM : prime mensuelle moyenne AOS estimée par l'OFSP pour la région (enfant, jeune adulte, adulte).
Berne : seules les communes du Jura bernois (celles du comparateur, site/public/data/primes-2027/npa.json) sont
listées ; la prime moyenne de l'OFSP porte sur toute la région bernoise 2.

Sortie : site/src/data/regions-primes-2027.json. Aucun chiffre n'est recalculé ici, sauf les sommes de population.
  python3 data/scripts/build_regions_2027.py
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sources" / "praemienregionen-2027.xlsx"
NPA = ROOT.parent / "site" / "public" / "data" / "primes-2027" / "npa.json"
OUT = ROOT.parent / "site" / "src" / "data" / "regions-primes-2027.json"
CANTONS = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"]


def rows(ws):
    for r in ws.iter_rows(values_only=True):
        if isinstance(r[0], int) and r[1] in CANTONS:
            yield r


def main() -> int:
    wb = openpyxl.load_workbook(SRC, read_only=True, data_only=True)
    # Communes du comparateur (région connue par NPA) : sert à limiter Berne au Jura bernois.
    npa = json.loads(NPA.read_text(encoding="utf-8"))
    couvertes: set[tuple[str, int]] = {(c, r) for v in npa.values() for c, r, _ in v}
    noms_couverts: dict[str, set[str]] = defaultdict(set)
    for v in npa.values():
        for c, _, communes in v:
            noms_couverts[c].update(x.strip() for x in communes.split(" · "))

    communes: dict[tuple[str, int], dict[int, str]] = defaultdict(dict)
    for bfs, canton, nom, region, *_ in rows(wb["A_COM"]):
        communes[(canton, region)][bfs] = nom
    pop: dict[int, tuple[int, int, int, int]] = {}
    for r in rows(wb["C_POP"]):
        pop[r[0]] = (r[10], r[13], r[14], r[15])  # total 2024, 0-18, 19-25, > 25
    prime: dict[tuple[str, int], tuple[float, float, float]] = {}
    for bfs, canton, nom, region, enfant, jeune, adulte in rows(wb["D_PRIM"]):
        prime[(canton, region)] = (enfant, jeune, adulte)

    regions = []
    for canton in CANTONS:
        for (c, region) in sorted(k for k in communes if k[0] == canton):
            if (c, region) not in couvertes:
                continue
            liste = communes[(c, region)]
            region_entiere = len(liste)
            if c == "BE":  # Jura bernois seulement
                liste = {b: n for b, n in liste.items() if n in noms_couverts["BE"]}
            p = [pop.get(b, (0, 0, 0, 0)) for b in liste]
            e, j, a = prime[(c, region)]
            regions.append({
                "canton": c,
                "region": region,
                "communes": sorted(([n, b] for b, n in liste.items()), key=lambda x: x[0]),
                "communes_region_entiere": region_entiere,
                "population_2024": sum(x[0] for x in p),
                "population_2024_classes": {"enfant": sum(x[1] for x in p), "jeune": sum(x[2] for x in p), "adulte": sum(x[3] for x in p)},
                "prime_moyenne_ofsp": {"enfant": e, "jeune": j, "adulte": a},
            })
    out = {
        "source": "OFSP, régions de primes 2027 (praemienregionen-2027.xlsx, release-2026-10-22) : feuilles A_COM, C_POP (population au 31.12.2024) et D_PRIM (prime mensuelle moyenne AOS estimée par l'OFSP pour la région, en CHF)",
        "url": "https://www.priminfo.admin.ch/downloads/praemienregionen-2027.xlsx",
        "regions": regions,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for r in regions:
        print(r["canton"], r["region"], len(r["communes"]), "/", r["communes_region_entiere"], r["population_2024"], r["prime_moyenne_ofsp"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
