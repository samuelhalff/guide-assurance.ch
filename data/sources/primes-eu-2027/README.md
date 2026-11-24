# Primes 2027 UE/AELE/UK (OFSP)

Fichier : `gesamtbericht_eu-2027.pdf`, « Aperçu des primes 2027, assurance de base UE/AELE/UK » de l'OFSP,
https://www.priminfo.admin.ch/downloads/gesamtbericht_eu-2027.pdf, lu le 24.11.2026 (70 pages, un tableau par pays :
page paire sans accident, page suivante avec accident).

Il publie les mêmes chiffres que le fichier ouvert `Prämien_EU.csv` du jeu « Prämien der obligatorischen Krankenpflegeversicherung »
(https://opendata.swiss/fr/dataset/health-insurance-premiums, ressource opendata.bagnet.ch), qui répondait HTTP 503 le 24.11.2026
(la Wayback Machine n'en a aucune copie). Contrôle : les 13 assureurs français du PDF ont les mêmes montants que
`site/src/data/primes-eu-fr-2027.json`.

Conditions d'utilisation annoncées par opendata.swiss pour ces ressources : `https://opendata.swiss/terms-of-use#terms_by`
(libre usage, mention de la source obligatoire).

Régénération : `python3 data/scripts/build_primes_eu.py` (pdfplumber) écrit `site/src/data/primes-eu-2027.json`.
Quand le CSV redevient joignable, comparer avec le PDF avant de remplacer la source.
