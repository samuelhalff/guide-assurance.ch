#!/usr/bin/env python3
"""Adresses à signaler à IndexNow : diff entre deux plans du site (spec SEO §4.4, rapport 09 G3).

    indexnow-urls.py <sitemap publié précédent> <nouveau sitemap>

Écrit sur la sortie standard une liste JSON : les adresses nouvelles, celles dont le <lastmod> a changé et celles
retirées du plan (IndexNow accepte aussi les adresses supprimées). Sans plan précédent lisible (premier
déploiement, fichier absent ou illisible), toutes les adresses du nouveau plan. Résumé sur la sortie d'erreur.
Plafond IndexNow : 10 000 adresses par appel ; au-delà, on s'arrête en erreur plutôt que de tronquer.
"""
import json
import sys
import xml.etree.ElementTree as ET

NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
HOTE = "https://guide-assurance.ch/"


def lire(chemin: str) -> dict[str, str] | None:
    try:
        racine = ET.parse(chemin).getroot()
    except (OSError, ET.ParseError):
        return None
    plan = {}
    for url in racine.iter(f"{NS}url"):
        loc = (url.findtext(f"{NS}loc") or "").strip()
        if loc.startswith(HOTE):
            plan[loc] = (url.findtext(f"{NS}lastmod") or "").strip()
    return plan


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    avant, apres = lire(sys.argv[1]), lire(sys.argv[2])
    if apres is None:
        print(f"IndexNow : nouveau plan illisible ({sys.argv[2]})", file=sys.stderr)
        return 1
    if avant is None:
        urls = sorted(apres)
        print(f"IndexNow : pas de plan précédent, {len(urls)} adresses", file=sys.stderr)
    else:
        nouvelles = [u for u in apres if u not in avant]
        changees = [u for u in apres if u in avant and apres[u] != avant[u]]
        retirees = [u for u in avant if u not in apres]
        urls = sorted(nouvelles + changees + retirees)
        print(f"IndexNow : {len(nouvelles)} nouvelles, {len(changees)} modifiées, {len(retirees)} retirées", file=sys.stderr)
    if len(urls) > 10000:
        print("IndexNow : plus de 10 000 adresses, découpage nécessaire", file=sys.stderr)
        return 1
    print(json.dumps(urls))
    return 0


if __name__ == "__main__":
    sys.exit(main())
