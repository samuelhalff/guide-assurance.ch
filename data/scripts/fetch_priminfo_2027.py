#!/usr/bin/env python3
"""Télécharge les primes LAMal 2027 depuis priminfo.admin.ch (calculateur officiel de l'OFSP).

Pourquoi priminfo : le fichier ouvert de l'OFSP (Prämien_CH.csv, opendata.bagnet.ch) renvoyait une erreur 500
le 22.11.2026. Priminfo publie les mêmes primes approuvées, par commune, âge, franchise, accident et modèle.

Pour chaque région de prime des cantons retenus, une commune représentative (la plus peuplée de la région,
fichier praemienregionen-2027.xlsx) est interrogée pour chaque classe d'âge, franchise et couverture accident,
tous modèles cochés. Puis une requête par catégorie de modèle (BASE, FLEX, PRAXIS, TEL_DIG, PHARM) donne le
type de chaque produit. Les réponses brutes sont gardées, compressées, dans data/sources/priminfo-2027/.

Usage : python3 data/scripts/fetch_priminfo_2027.py   (reprend là où il s'est arrêté)
"""
import gzip, json, re, sys, time, urllib.parse, urllib.request
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "sources"
OUT = SRC / "priminfo-2027"
CANTONS = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"]
# Berne : seul le Jura bernois (district francophone, région de prime 2) est couvert. Dans le reste du canton, l'offre
# varie trop d'une commune à l'autre (caisses locales) pour qu'une commune représente la région (contrôle du 22.11.2026).
BE_DISTRICT = "Jura bernois"
BE_COMMUNE = "Saint-Imier"
YOB = {"enfant": 2015, "jeune": 2005, "adulte": 1990}
FRANCHISES = {"enfant": [0, 100, 200, 300, 400, 500, 600], "jeune": [300, 500, 1000, 1500, 2000, 2500], "adulte": [300, 500, 1000, 1500, 2000, 2500]}
MODELES = ["BASE", "FLEX", "PRAXIS", "TEL_DIG", "PHARM"]
BASE = "https://www.priminfo.admin.ch/fr/praemien"
UA = {"User-Agent": "Mozilla/5.0 (compatible; open-data-check)"}


def get(url: str) -> bytes:
    for essai in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                return r.read()
        except Exception as e:  # réseau : on réessaie
            print("  erreur", e, file=sys.stderr)
            time.sleep(5 * (essai + 1))
    raise SystemExit(f"échec : {url}")


def communes_representatives():
    wb = openpyxl.load_workbook(SRC / "praemienregionen-2027.xlsx", read_only=True, data_only=True)
    best = {}
    for r in wb["C_POP"].iter_rows(min_row=6, values_only=True):
        if r[1] in CANTONS and isinstance(r[10], (int, float)):
            if r[1] == "BE" and r[2] != BE_COMMUNE:
                continue
            k = (r[1], int(r[3]))
            if k not in best or r[10] > best[k][1]:
                best[k] = (r[2], r[10], r[0])
    return best


def location_id(index, names, commune, canton_npa):
    """Identifiant priminfo d'une localité de la commune (nom « NPA Localité (Commune X) » ou « NPA Commune »)."""
    for lid, nom in names.items():
        m = re.match(r"(\d{4}) (.+?)(?: \(Commune (.+)\))?$", nom)
        if not m:
            continue
        com = m.group(3) or m.group(2)
        if com == commune and m.group(1) in canton_npa:
            return lid, nom
    return None, None


def requete(lid, yob, fr, acc, modeles):
    q = [("location_id", lid), ("yob[0]", yob), ("franchise[0]", fr), ("coverage[0]", acc), ("insurer", "")]
    q += [("models[]", m) for m in modeles] + [("display", "savings")]
    return BASE + "?" + urllib.parse.urlencode(q)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    loc = get(BASE + "/locations").decode()
    j = json.loads(loc[loc.index("{"): loc.rindex("}") + 1])
    (OUT / "locations.json.gz").write_bytes(gzip.compress(json.dumps(j, ensure_ascii=False).encode()))
    wb = openpyxl.load_workbook(SRC / "praemienregionen-2027.xlsx", read_only=True)
    npa_par_commune = {}
    for r in wb["B_NPA"].iter_rows(min_row=8, values_only=True):
        if r[3] in CANTONS:
            npa_par_commune.setdefault((r[3], r[6]), set()).add(str(r[1]))
    plan = []
    for (ct, reg), (commune, pop, ofs) in sorted(communes_representatives().items()):
        lid, nom = location_id(j["index"], j["names"], commune, npa_par_commune.get((ct, commune), set()))
        if not lid:
            raise SystemExit(f"localité introuvable pour {ct}{reg} {commune}")
        plan.append({"canton": ct, "region": reg, "commune": commune, "ofs": ofs, "location_id": lid, "localite": nom})
    (OUT / "plan.json").write_text(json.dumps(plan, ensure_ascii=False, indent=1))
    n = 0
    for p in plan:
        d = OUT / f"{p['canton']}{p['region']}"
        d.mkdir(exist_ok=True)
        taches = [(f"{cl}_{fr}_{'avec' if acc else 'sans'}", requete(p["location_id"], YOB[cl], fr, acc, MODELES))
                  for cl in YOB for fr in FRANCHISES[cl] for acc in (1, 0)]
        # PHARM seul ne renvoie aucun tableau sur priminfo (constaté le 22.11.2026) : on demande BASE + PHARM,
        # et le script de construction en retire les produits BASE.
        groupes = {m: [m] for m in MODELES if m != "PHARM"} | {"BASE_PHARM": ["BASE", "PHARM"]}
        taches += [(f"modele_{g}", requete(p["location_id"], YOB["adulte"], 300, 1, ms)) for g, ms in groupes.items()]
        taches += [(f"modele_{g}_enfant", requete(p["location_id"], YOB["enfant"], 0, 1, ms)) for g, ms in groupes.items()]
        for nom, url in taches:
            f = d / f"{nom}.html.gz"
            if f.exists():
                continue
            f.write_bytes(gzip.compress(get(url)))
            n += 1
            time.sleep(0.4)
        print(p["canton"], p["region"], p["localite"], flush=True)
    print("requêtes :", n)


if __name__ == "__main__":
    main()
