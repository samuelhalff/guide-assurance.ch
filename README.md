# guide-assurance.ch

Code du site [guide-assurance.ch](https://guide-assurance.ch) : informations sur les assurances en Suisse romande, comparateur des primes LAMal 2027 (données OFSP), taux des comptes 3a, économie d'impôt 3a, simulateur frontalier et lettre de résiliation.

- `site/` : Next.js en export statique. Tous les calculs se font dans le navigateur.
- `data/` : données publiques et scripts qui les produisent (OFSP, barèmes fiscaux cantonaux, taux publiés par les banques).
- `shared/demande/` : schéma du formulaire de rappel.

```
cd shared/demande && npm ci && cd ../../site && npm ci && npm test && npm run build
```
