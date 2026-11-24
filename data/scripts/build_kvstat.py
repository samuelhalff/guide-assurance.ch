#!/usr/bin/env python3
"""Construit site/src/data/caisses-lamal-2024.json à partir de la Statistique de l'assurance-maladie obligatoire 2024 (OFSP).

Entrées (data/sources/kvstat-2024/, feuilles françaises) :
  KV501N  T 5.01  données de surveillance par assureur (effectif moyen, frais administratifs, réserves, résultat)
  KV503N  T 5.03  test de solvabilité LAMal 2025 (réserves au 1.1.2025, taux de solvabilité)
  KV507N  T 5.07  assurés au 31.12.2024 par assureur et par canton
  KV510N  T 5.10  part de marché par assureur et par canton (effectif moyen, source T 5.06)
Les lignes de total et de notes sont écartées : une ligne d'assureur a un numéro OFSP entier et un effectif > 0.

Usage : python3 data/scripts/build_kvstat.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path.home() / ".local/lib/python3.11/site-packages"))
import openpyxl  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
ANNEE = 2024
SRC = ROOT / "data" / "sources" / f"kvstat-{ANNEE}"
OUT = ROOT / "site" / "src" / "data" / f"caisses-lamal-{ANNEE}.json"
CANTONS = ["ZH", "BE", "LU", "UR", "SZ", "OW", "NW", "GL", "ZG", "FR", "SO", "BS", "BL", "SH", "AR", "AI", "SG", "GR", "AG", "TG", "TI", "VD", "VS", "NE", "GE", "JU"]

# Nom court : seulement un début du nom officiel, sans la forme juridique ni la description.
COURTS = {
    8: "CSS", 290: "CONCORDIA", 312: "Atupri", 376: "KPT", 509: "Vivao Sympany", 1384: "SWICA", 1509: "Sanitas",
    1542: "Assura-Basis", 1555: "Visana", 1560: "Agrisano", 1562: "Helsana", 1568: "sana24", 1570: "vivacare",
    32: "Aquilana", 62: "SUPRA-1846", 1479: "Mutuel Assurance Maladie",
}


def feuille(nom: str, f: str):
    return openpyxl.load_workbook(SRC / f"{nom}_KVSTAT{ANNEE}.xlsx", data_only=True)[f]


def est_assureur(a, b) -> bool:
    return isinstance(a, int) and a > 0 and isinstance(b, str) and bool(b.strip())


def par_canton(ws, ligne_en_tete: int, premiere: int, derniere: int, entier: bool):
    cols = {}
    for c in range(3, ws.max_column + 1):
        v = ws.cell(ligne_en_tete, c).value
        if v in CANTONS + ["CH"]:
            cols[v] = c
    assert set(cols) == set(CANTONS + ["CH"]), f"cantons manquants : {set(CANTONS + ['CH']) - set(cols)}"
    out = {}
    for r in range(premiere, derniere + 1):
        a, b = ws.cell(r, 1).value, ws.cell(r, 2).value
        if not est_assureur(a, b):
            continue
        d = {}
        for k, c in cols.items():
            v = ws.cell(r, c).value
            if isinstance(v, (int, float)) and v > 0:
                d[k] = int(round(v)) if entier else round(v * 100, 2)
        out[a] = d
    return out


def main():
    w1 = feuille("KV501N", "501f")
    ins = []
    for r in range(11, 50):
        a, b = w1.cell(r, 1).value, w1.cell(r, 2).value
        if not est_assureur(a, b) or not (w1.cell(r, 3).value or 0) > 0:
            continue
        ins.append({
            "no": a, "nom": " ".join(b.split()),
            "effectifMoyen": int(round(w1.cell(r, 3).value)),
            "fraisAdminParAssure": int(round(w1.cell(r, 9).value)),
            "fraisAdminPctDepenses": round(w1.cell(r, 15).value * 100, 1),
            "reservesParAssure": int(round(w1.cell(r, 12).value)),
            "resultatParAssure": int(round(w1.cell(r, 10).value)),
        })
    nb_total = w1.cell(75, 2).value
    assert len(ins) == 39 == nb_total, (len(ins), nb_total)
    # Le total de la feuille est en B75 ; la colonne A porte « Total / Moyenne ».
    for i in ins:
        if i["no"] in COURTS:
            assert i["nom"].lower().startswith(COURTS[i["no"]].lower()), (i["nom"], COURTS[i["no"]])
            if COURTS[i["no"]] != i["nom"]:
                i["court"] = COURTS[i["no"]]

    w3 = feuille("KV503N", "503f")
    sol, hors = {}, 0
    for r in range(10, 77):
        a, b = w3.cell(r, 1).value, w3.cell(r, 2).value
        if not est_assureur(a, b):
            continue
        sol[a] = {"pct": int(round(w3.cell(r, 7).value * 100)), "reservesMio": round(w3.cell(r, 3).value, 1), "minimumMio": round(w3.cell(r, 5).value, 1),
                  "annote": isinstance(w3.cell(r, 8).value, (int, float))}
    assert len(sol) == 42, len(sol)
    nos = {i["no"] for i in ins}
    hors = len(set(sol) - nos)

    n507 = par_canton(feuille("KV507N", "507f"), 5, 9, 72, True)
    n510 = par_canton(feuille("KV510N", "510f"), 5, 9, 70, False)
    assert set(n507) == nos == set(n510), "listes d'assureurs différentes (5.01, 5.07, 5.10)"
    # Nombre d'assureurs par canton selon T 5.10 (ligne « Nombre d'assureurs ») : contrôle croisé avec T 5.07.
    w510 = feuille("KV510N", "510f")
    for c in range(3, w510.max_column + 1):
        k = w510.cell(5, c).value
        if k in CANTONS:
            att = w510.cell(73, c).value
            mien = sum(1 for d in n510.values() if k in d)
            if att != mien:
                print(f"écart T 5.10 {k} : officiel {att}, compté {mien}")
    for i in ins:
        s = sol.get(i["no"])
        if s:
            i["solvabilitePct"] = s["pct"]
            if s["annote"]:
                i["solvabiliteNote"] = "Taux transmis par l'assureur à l'OFSP (note 5 du tableau 5.03)."
        i["assures"] = n507[i["no"]]
        i["part"] = n510[i["no"]]
    assert str(w1.cell(75, 1).value).startswith("Total")
    moyenne = {  # ligne « Total / Moyenne » de T 5.01
        "effectifMoyen": int(round(w1.cell(75, 3).value)),
        "primesParAssure": int(round(w1.cell(75, 4).value)),
        "fraisAdminParAssure": int(round(w1.cell(75, 9).value)),
        "fraisAdminPctDepenses": round(w1.cell(75, 15).value * 100, 1),
    }
    ins.sort(key=lambda x: x["nom"].casefold())
    out = {
        "meta": {
            "source": f"OFSP, Statistique de l'assurance-maladie obligatoire {ANNEE}",
            "edition": ANNEE,
            "tableaux": {"indicateurs": "T 5.01", "explications": "T 5.02", "solvabilite": "T 5.03", "assures": "T 5.07", "partsDeMarche": "T 5.10"},
            "urlSource": "https://www.bag.admin.ch/de/statistik-der-obligatorischen-krankenversicherung",
            "relevele": "2026-11-24",
            "etatDonnees": {"T5.01": "2025-05-22", "T5.03": "2025-09-23", "T5.07": "2025-05-22", "T5.10": "2025-05-22"},
            "dateAssures": "2024-12-31",
            "dateSolvabilite": "2025-01-01",
            "solvabiliteHorsTableau501": hors,
            "reutilisation": "opendata.swiss, Open use (terms_open) : source recommandée ; licence Creative Commons non déclarée",
        },
        "moyenneCH": moyenne,
        "cantons": CANTONS,
        "assureurs": ins,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"{OUT.relative_to(ROOT)} : {len(ins)} assureurs, {OUT.stat().st_size} octets")


if __name__ == "__main__":
    main()
