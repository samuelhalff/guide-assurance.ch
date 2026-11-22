#!/usr/bin/env python3
"""Construit les données du comparateur de primes LAMal 2027 à partir des sources gardées dans data/sources/.

Entrées :
  data/sources/praemienregionen-2027.xlsx  (OFSP, régions de primes 2027, feuille B_NPA : NPA -> commune -> région)
  data/sources/priminfo-2027/              (réponses de priminfo.admin.ch, voir fetch_priminfo_2027.py)
Sorties :
  site/public/data/primes-2027/<CANTON>.json  une par canton, chargée par le navigateur à la demande
  site/public/data/primes-2027/npa.json       NPA -> [canton, région, communes]
  site/src/data/primes-2027-resume.json       tableau statique de la page (adulte, franchise 300, accident)

Format d'un canton (montants mensuels en centimes, entiers, alignés sur `produits`; null = offre absente) :
  { canton, annee, source, regions: {"0": {commune}}, assureurs: [nom], produits: [[i_assureur, nom, type]],
    redistribution: {classe: centimes}, primes: {region: {classe: {franchise: {"a": [...], "s": [...]}}}} }

Usage : python3 data/scripts/build_comparateur_2027.py
"""
import gzip, json, re
from html import unescape
from pathlib import Path
import openpyxl

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "data" / "sources"
PI = SRC / "priminfo-2027"
OUT = ROOT / "site" / "public" / "data" / "primes-2027"
RESUME = ROOT / "site" / "src" / "data" / "primes-2027-resume.json"
CANTONS = ["GE", "VD", "VS", "FR", "NE", "JU", "BE"]
CLASSES = ["enfant", "jeune", "adulte"]
TYPES = ["BASE", "FLEX", "PRAXIS", "TEL_DIG", "PHARM"]
SOURCE = "OFSP, primes LAMal 2027 approuvées (priminfo.admin.ch), relevées le 22.11.2026"

ROW = re.compile(r"<tr>\s*<th[^>]*>(.*?)</th>\s*<th[^>]*>(.*?)</th>(.*?)</tr>", re.S)
TD = re.compile(r'<td class="monthlyCell">([^<]*)</td>')


def txt(s: str) -> str:
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def lire(f: Path):
    """Lignes du tableau priminfo : (assureur, produit, prime mensuelle, redistribution mensuelle), en centimes."""
    html = gzip.decompress(f.read_bytes()).decode("utf-8")
    i = html.find('id="savingsTable"')
    if i < 0:
        raise SystemExit(f"pas de tableau dans {f}")
    corps = html[i: html.find("</table>", i)]
    out = []
    for m in ROW.finditer(corps):
        cells = TD.findall(m.group(3))
        if len(cells) < 3 or cells[0].strip() in ("—", "-", ""):
            continue  # « — » : offre non proposée pour ce profil (franchise ou âge)
        cent = lambda v: round(float(v.replace("'", "").replace("’", "")) * 100)
        out.append((txt(m.group(1)), txt(m.group(2)), cent(cells[0]), cent(cells[1])))
    if not out:
        raise SystemExit(f"tableau vide dans {f}")
    return out


def main():
    plan = json.loads((PI / "plan.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    resume = {"source": SOURCE, "profil": "adulte (26 ans et plus), franchise 300 CHF, avec accident", "cantons": []}
    par_canton = {}
    for p in plan:
        par_canton.setdefault(p["canton"], []).append(p)

    for ct in CANTONS:
        regions = sorted(par_canton[ct], key=lambda p: p["region"])
        assureurs, produits, idx_prod = [], [], {}
        types = {}
        redis = {}
        brut = {}  # (region, classe, franchise, acc) -> {(assureur, produit): centimes}
        for p in regions:
            d = PI / f"{ct}{p['region']}"
            for suffixe in ("", "_enfant"):
                for t in ("BASE", "FLEX", "PRAXIS", "TEL_DIG"):
                    for a, prod, _, _ in lire(d / f"modele_{t}{suffixe}.html.gz"):
                        types.setdefault((a, prod), t)
                # PHARM : la requête BASE + PHARM, moins les produits BASE (PHARM seul ne renvoie rien sur priminfo)
                for a, prod, _, _ in lire(d / f"modele_BASE_PHARM{suffixe}.html.gz"):
                    types.setdefault((a, prod), "PHARM")
            for f in sorted(d.glob("*_*_*.html.gz")):
                if f.name.startswith("modele"):
                    continue
                cl, fr, acc = f.name.removesuffix(".html.gz").split("_")
                lignes = lire(f)
                vu = {}
                for a, prod, prime, rd in lignes:
                    if (a, prod) in vu and vu[(a, prod)] != prime:
                        raise SystemExit(f"doublon incohérent {a} {prod} dans {f}")
                    vu[(a, prod)] = prime
                    redis.setdefault(cl, set()).add(rd)
                brut[(str(p["region"]), cl, fr, "a" if acc == "avec" else "s")] = vu
                for k in vu:
                    if k not in idx_prod:
                        if k[0] not in assureurs:
                            assureurs.append(k[0])
                        idx_prod[k] = None
        # ordre stable : assureur puis produit
        assureurs.sort(key=str.casefold)
        cles = sorted(idx_prod, key=lambda k: (k[0].casefold(), k[1].casefold()))
        manquants = [k for k in cles if k not in types]
        if manquants:
            raise SystemExit(f"{ct} : produits sans type {manquants[:5]}")
        for i, k in enumerate(cles):
            idx_prod[k] = i
            produits.append([assureurs.index(k[0]), k[1], types[k]])
        primes = {}
        for (reg, cl, fr, acc), vu in brut.items():
            v = [None] * len(cles)
            for k, c in vu.items():
                v[idx_prod[k]] = c
            primes.setdefault(reg, {}).setdefault(cl, {}).setdefault(fr, {})[acc] = v
        for cl, s in redis.items():
            if len(s) != 1:
                raise SystemExit(f"{ct} {cl} : redistribution variable {s}")
        donnees = {
            "canton": ct,
            "annee": 2027,
            "source": SOURCE,
            "regions": {str(p["region"]): {"commune": p["commune"]} for p in regions},
            "assureurs": assureurs,
            "produits": produits,
            "redistribution": {cl: next(iter(s)) for cl, s in redis.items()},
            "primes": primes,
        }
        (OUT / f"{ct}.json").write_text(json.dumps(donnees, ensure_ascii=False, separators=(",", ":")))

        # tableau statique : région principale = la plus peuplée (première du plan triée par population)
        reg0 = str(principale(ct))
        v = primes[reg0]["adulte"]["300"]["a"]
        offres = sorted((c, i) for i, c in enumerate(v) if c is not None)
        moyenne = sum(c for c, _ in offres) / len(offres)
        profils = []
        for frz in ("300", "2500"):
            for acc in ("a", "s"):
                vv = [c for c in primes[reg0]["adulte"][frz][acc] if c is not None]
                profils.append({"franchise": int(frz), "accident": acc == "a", "premiere": min(vv), "moyenne": round(sum(vv) / len(vv)), "nombre": len(vv)})
        resume["cantons"].append({
            "profils": profils,
            "canton": ct,
            "region": int(reg0),
            "commune": donnees["regions"][reg0]["commune"],
            "nombre": len(offres),
            "moyenne": round(moyenne),
            "offres": [{"assureur": assureurs[produits[i][0]], "produit": produits[i][1], "type": produits[i][2], "mensuel": c} for c, i in offres[:5]],
        })
        print(ct, "régions", list(donnees["regions"]), "produits", len(produits), "assureurs", len(assureurs))

    npa_index()
    RESUME.write_text(json.dumps(resume, ensure_ascii=False, indent=1))


def principale(ct: str) -> int:
    """Région de prime la plus peuplée du canton (feuille C_POP, population 2024)."""
    wb = openpyxl.load_workbook(SRC / "praemienregionen-2027.xlsx", read_only=True, data_only=True)
    pop = {}
    for r in wb["C_POP"].iter_rows(min_row=6, values_only=True):
        if r[1] == ct and isinstance(r[10], (int, float)):
            pop[int(r[3])] = pop.get(int(r[3]), 0) + r[10]
    return max(pop, key=pop.get)


def npa_index():
    """NPA -> liste de [canton, région, communes]. Un NPA peut couvrir plusieurs communes, régions ou cantons."""
    wb = openpyxl.load_workbook(SRC / "praemienregionen-2027.xlsx", read_only=True)
    idx = {}
    for r in wb["B_NPA"].iter_rows(min_row=8, values_only=True):
        if r[3] not in CANTONS or not isinstance(r[1], int):
            continue
        if r[3] == "BE" and r[7] != "Jura bernois":
            continue  # Berne : Jura bernois seulement (voir fetch_priminfo_2027.py)
        cle = (r[3], int(r[4]))
        e = idx.setdefault(str(r[1]), {})
        e.setdefault(cle, [])
        if r[6] not in e[cle]:
            e[cle].append(r[6])
    out = {npa: [[ct, reg, " · ".join(sorted(coms))] for (ct, reg), coms in sorted(v.items())] for npa, v in sorted(idx.items())}
    (OUT / "npa.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))
    print("NPA", len(out), "dont ambigus", sum(1 for v in out.values() if len(v) > 1))


if __name__ == "__main__":
    main()
