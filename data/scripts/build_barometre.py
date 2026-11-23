#!/usr/bin/env python3
"""Baromètre des primes LAMal par canton romand : agrégats écrits dans site/src/data/barometre.json.

Entrées (aucune requête réseau) :
  - site/public/data/primes-{A}/{CANTON}.json : primes approuvées de l'année A par région, classe d'âge, franchise,
    avec et sans accident, une valeur par produit (écrit par build_comparateur_{A}.py depuis priminfo.admin.ch) ;
  - site/public/data/primes-{A-1}/{CANTON}.json s'il existe : même chose pour l'année précédente, ce qui donne la
    variation par région et par profil (première année où c'est possible : 2028, avec les fichiers 2027 gardés) ;
  - data/primes-{A}-romandie.json : primes moyennes cantonales officielles de l'OFSP (A et A-1, variation en %).

Sortie : pour chaque canton (GE, VD, VS, FR, NE, JU ; le canton de Berne n'est pas repris, seul le Jura bernois est
relevé), les moyennes officielles et, pour chaque région de prime et chaque profil type, le nombre d'offres, la plus
basse, le premier quartile, la médiane, le troisième quartile et la plus haute. Aucun assureur n'est nommé : seules
les valeurs sortent du script. Statistiques non pondérées (une offre = une observation), quartiles « inclusive »
(interpolation linéaire, module statistics).

Usage :
  python3 data/scripts/build_barometre.py            # année la plus récente présente dans site/public/data
  python3 data/scripts/build_barometre.py --annee 2028
Le jour de l'annonce OFSP (fin septembre), une fois les primes de la nouvelle année relevées et le fichier
data/primes-{A}-romandie.json rempli, relancer ce script puis le build : les pages du baromètre suivent.
"""
import argparse, json, re, statistics, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / "site/public/data"
OUT = ROOT / "site/src/data/barometre.json"
CANTONS = ["GE", "VD", "VS", "FR", "NE", "JU"]
# Profils types : (clé, classe, franchise, accident). Accident inclus = personne sans employeur qui couvre les accidents (LAA).
PROFILS = [
    ("adulte_300", "adulte", 300, True),
    ("adulte_2500", "adulte", 2500, True),
    ("jeune_300", "jeune", 300, True),
    ("enfant_0", "enfant", 0, True),
]


def annee_recente() -> int:
    ans = sorted(int(m.group(1)) for p in PUBLIC.glob("primes-*") if (m := re.fullmatch(r"primes-(\d{4})", p.name)))
    if not ans:
        sys.exit("aucun dossier site/public/data/primes-AAAA")
    return ans[-1]


def stats(vals):
    v = sorted(x / 100 for x in vals if x is not None)
    if len(v) < 4:
        return None
    q1, med, q3 = statistics.quantiles(v, n=4, method="inclusive")
    r = lambda x: round(x, 2)
    return {"n": len(v), "min": r(v[0]), "q1": r(q1), "med": r(med), "q3": r(q3), "max": r(v[-1])}


def lire(annee: int, canton: str):
    f = PUBLIC / f"primes-{annee}" / f"{canton}.json"
    return json.loads(f.read_text()) if f.exists() else None


def valeurs(d, region: str, classe: str, franchise: int, accident: bool, standard: bool):
    ligne = d["primes"].get(region, {}).get(classe, {}).get(str(franchise))
    if not ligne:
        return []
    v = ligne["a" if accident else "s"]
    return [x for x, p in zip(v, d["produits"]) if x is not None and (not standard or p[2] == "BASE")]


def date_releve(d) -> str:
    m = re.search(r"(\d{2})\.(\d{2})\.(\d{4})", d.get("source", ""))
    return f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else ""


def variation(a, b):
    return round((a / b - 1) * 100, 1) if a and b else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--annee", type=int)
    A = ap.parse_args().annee or annee_recente()
    off_f = ROOT / f"data/primes-{A}-romandie.json"
    if not off_f.exists():
        sys.exit(f"{off_f} manquant : copier d'abord les primes moyennes cantonales de l'OFSP (voir docs/decisions.md)")
    officiel = json.loads(off_f.read_text())
    ka, kp = f"adult_{A}", f"adult_{A - 1}"
    out = {
        "annee": A,
        "annee_precedente": A - 1,
        "genere_le": date.today().isoformat(),
        "source": {
            "primes": f"OFSP, primes LAMal {A} approuvées (priminfo.admin.ch)",
            "moyennes": officiel["source"],
            "precedente": None,
        },
        "national": {"adulte": officiel["national"][ka], "adulte_prec": officiel["national"][kp], "variation_pct": officiel["national"]["change_pct"]},
        "cantons": [],
    }
    dates = []
    for c in CANTONS:
        d = lire(A, c)
        if not d:
            sys.exit(f"primes {A} manquantes pour {c}")
        prec = lire(A - 1, c)
        if prec:
            out["source"]["precedente"] = f"OFSP, primes LAMal {A - 1} approuvées (priminfo.admin.ch), {date_releve(prec)}"
        dates.append(date_releve(d))
        o = officiel["cantons"][c]
        regions = []
        for reg in sorted(d["primes"], key=int):
            profils = []
            for cle, cl, fr, acc in PROFILS:
                std = stats(valeurs(d, reg, cl, fr, acc, True))
                tous = stats(valeurs(d, reg, cl, fr, acc, False))
                if not std or not tous:
                    continue
                p = {"cle": cle, "classe": cl, "franchise": fr, "accident": acc, "standard": std, "tous": tous, "prec": None}
                if prec and reg in prec["primes"]:
                    sp = stats(valeurs(prec, reg, cl, fr, acc, True))
                    tp = stats(valeurs(prec, reg, cl, fr, acc, False))
                    if sp and tp:
                        p["prec"] = {
                            "standard_med": sp["med"],
                            "tous_med": tp["med"],
                            "tous_min": tp["min"],
                            "variation_standard_pct": variation(std["med"], sp["med"]),
                            "variation_tous_pct": variation(tous["med"], tp["med"]),
                        }
                profils.append(p)
            regions.append({"region": int(reg), "commune": d["regions"][reg]["commune"], "assureurs": len(valeurs(d, reg, "adulte", 300, True, True)), "profils": profils})
        out["cantons"].append({
            "code": c,
            "officiel": {"adulte": o[ka], "adulte_prec": o[kp], "variation_pct": o["change_pct"], "jeune": o.get(f"young_{A}"), "enfant": o.get(f"child_{A}")},
            "regions": regions,
        })
    out["date_donnees"] = max(dates)
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    print(f"{OUT.relative_to(ROOT)} : {A}, {len(out['cantons'])} cantons, variation par région : {'oui' if out['source']['precedente'] else 'non (primes ' + str(A - 1) + ' absentes)'}")


if __name__ == "__main__":
    main()
