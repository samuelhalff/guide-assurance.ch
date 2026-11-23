# guide-assurance.ch

Code du site [guide-assurance.ch](https://guide-assurance.ch) : informations sur les assurances en Suisse romande, comparateur des primes LAMal 2027 (données OFSP), taux des comptes 3a, économie d'impôt 3a, simulateur frontalier et lettre de résiliation.

- `site/` : Next.js en export statique. Tous les calculs se font dans le navigateur.
- `data/` : données publiques et scripts qui les produisent (OFSP, barèmes fiscaux cantonaux, taux publiés par les banques).
- `shared/demande/` : schéma du formulaire de rappel.

```
cd shared/demande && npm ci && cd ../../site && npm ci && npm test && npm run build
```

## Données ouvertes

Le dossier `data/csv/` contient trois fichiers CSV sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), calculés avec les mêmes moteurs que les pages du site (`site/scripts/donnees-ouvertes.mts`) :

| Fichier | Contenu | Source d'origine |
|---|---|---|
| `primes-2027-regions.csv` | primes LAMal 2027 par région de prime et profil type : nombre d'offres, minimum, quartiles, médiane, maximum | OFSP (priminfo.admin.ch, régions de primes 2027) |
| `economie-impot-3a-communes-2026.csv` | économie d'impôt 2026 d'un versement 3a de 7 258 CHF, personne seule, 80 000 CHF de revenu imposable, pour chaque commune couverte | AFC et administrations fiscales cantonales |
| `taux-3a-historique.csv` | taux de base des comptes 3a, relevés chaque lundi depuis le 22.11.2026 | pages officielles des banques |

Pour les citer : « Guide Assurance (guide-assurance.ch), d'après » la source d'origine, avec la date des données. Voir `data/csv/LICENSE` et `CITATION.cff`. Pages correspondantes : [chiffres clés 2027](https://guide-assurance.ch/chiffres-cles-2027/), [primes par région](https://guide-assurance.ch/assurance-maladie/primes/regions/), [économie d'impôt 3a par commune](https://guide-assurance.ch/3e-pilier/economie-impot/communes/), [historique des taux 3a](https://guide-assurance.ch/3e-pilier/taux-3a/historique/).

Régénérer les fichiers : `cd site && node --no-warnings scripts/donnees-ouvertes.mts ../data/csv`
