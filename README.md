# guide-assurance.ch

Code du site [guide-assurance.ch](https://guide-assurance.ch) : informations sur les assurances en Suisse romande, comparateur des primes LAMal 2027 (données OFSP), taux des comptes 3a, économie d'impôt 3a, simulateur frontalier et lettre de résiliation.

- `site/` : Next.js en export statique. Tous les calculs se font dans le navigateur.
- `data/` : données publiques et scripts qui les produisent (OFSP, barèmes fiscaux cantonaux, taux publiés par les banques).
- `shared/demande/` : schéma du formulaire de rappel (copie publique, voir `shared/demande/LISEZMOI.md`).
- `infra/refresh/` : relevés automatiques des données (taux 3a, primes LAMal, frontaliers, barèmes d'impôt, point mensuel, actualités).
- `scripts/` : déploiement (`deploy-site.sh`), mentions interdites (`check-forbidden.sh`), liens internes (`check-links.mjs`), IndexNow (`indexnow-urls.py`).

```
cd shared/demande && npm ci && cd ../../site && npm ci && npm test && npm run build
```

## Travailler sur le site

Ce dépôt est la seule source du site. On y travaille directement (`~/dev/guide-assurance.ch`), on committe sur `main` (ou une branche avec pull request) et **le push sur `main` déploie** : aucun poste ne sert de serveur.

Avant de pousser : `cd site && npx tsc --noEmit && npm run lint && npm test && npm run build && npm run test:html`, puis `scripts/check-forbidden.sh` (avec `FORBIDDEN_PATTERNS` dans l'environnement si on l'a). Règles du dépôt public : aucun nom de courtier ni de collaborateur, aucun secret ; seule West Bay SA est nommée (pied de page, pages légales, JSON-LD Organization). La CI bloque sinon.

## GitHub Actions

| Workflow | Quand | Ce qu'il fait |
|---|---|---|
| `ci-deploy.yml` | chaque push et pull request ; à la main (`dry_run`) | mentions interdites, gitleaks (tout l'historique), tsc, lint, tests, données ouvertes à jour, build, contrôles SEO du HTML, mentions interdites dans `site/out`, liens internes. Sur `main` : rsync de `site/out` vers le proxy, contrôle HTTP 200 des pages clés, IndexNow (adresses nouvelles, retirées ou au `lastmod` changé, par rapport au plan du site en ligne avant la mise à jour) |
| `refresh-taux3a.yml` | lundi 06:30 (Zurich) | taux 3a des 17 banques (HTTP, PDF, navigateur sans tête Playwright en secours) : contrôles, publication automatique si valide, historique hebdomadaire ; une banque illisible garde son dernier taux vérifié et sa date, signalée dans le résumé et par e-mail |
| `refresh-tauxsnb.yml` | le 5 du mois, 07:40 (Zurich) | taux 3a et de libre passage selon la statistique mensuelle de la BNS (data.snb.ch, cube `zikrepro`) : contrôles (format, libellés des séries, révisions, écarts), publication automatique si valide |
| `refresh-lamal.yml` | 06:15 chaque jour du 25.9 au 31.12, sinon le 1er du mois | corrections des primes LAMal de l'année en cours publiées automatiquement ; nouvelle année : alerte |
| `refresh-frontalier.yml` | 06:45 chaque jour en janvier, sinon le 1er du mois | PASS et primes UE : alerte seulement |
| `refresh-impots.yml` | le 1er du mois, 07:00 | barèmes d'impôt GE/VD : alerte seulement |
| `refresh-digest.yml` | le 1er du mois, 08:00 | e-mail « tout va bien » ou « données à vérifier » |
| `actualites.yml` | 07:30 et 10:15 (Zurich) ; à la main | déclencheur (primes OFSP, taux 3a, BNS, rendez-vous mensuel) : article FR + EN rédigé par LLM (même fournisseur que l'assistant des demandes), vérifié automatiquement (noms interdits, pas de recommandation, chiffres présents dans les sources, au moins 3 sources, typographie, longueur), puis publié directement sur `main`. Contrôle en échec : article jeté, alerte. Aucune relecture |
| `chiffres-actualites.yml` | lundi 08:15 (après le relevé 3a) | chiffres cités dans les actualités publiées (manifeste `site/content/actualites-chiffres.json`) comparés aux données du site ; écart : article mis à jour automatiquement (chiffre, `dateModified`, ligne « Mis à jour le … »), vérificateur relancé, publication sur `main`. E-mail seulement en cas d'échec |
| `monthly-quality.yml` | le 2 du mois, 05:23 (Zurich, hiver) | Lighthouse (budgets de `site/lighthouserc.mobile.json`) et liens internes : rapport en artefact, issue et e-mail si régression |

Les lignes cron sont en UTC, deux par tâche (hiver, été) : `_refresh.yml` ne garde que celle qui tombe à l'heure de Zurich prévue, même si GitHub la lance en retard. Déploiements et relevés partagent le groupe de concurrence `guide-assurance-prod` : jamais deux à la fois. Un relevé valide committe les données sur `main` (auteur `guide-assurance-bot`) et déploie depuis le même runner ; l'état des relevés (dernier passage, alertes déjà envoyées) vit sur la branche `refresh-state`, le journal dans l'artefact du passage. Les alertes partent de assurance@houle.ai vers sh@houle.ai (Microsoft Graph) ; un e-mail qui ne part pas fait échouer le passage. Chaque relevé se lance aussi à la main, `dry_run` coché par défaut (`--simulate-change`, `--simulate-parser-failure` dans `args`). Détails : `infra/refresh/LISEZMOI.md`.

Secrets du dépôt (valeurs jamais affichées) : `DEPLOY_SSH_KEY` (clé ed25519 dédiée, limitée par `rrsync` au dossier du site sur le proxy), `DEPLOY_SSH_KNOWN_HOSTS` (empreintes épinglées de l'hôte), `DEPLOY_SSH_HOST`, `INDEXNOW_KEY`, `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` (envoi des alertes), `FORBIDDEN_PATTERNS` (mentions interdites), `ACTUALITES_APERCU_CLE`, `ANTHROPIC_API_KEY` (ou `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT`) pour les actualités. Variables (valeurs publiques, présentes dans le HTML) : `NEXT_PUBLIC_GTM_ID`, `NEXT_PUBLIC_POSTHOG_TOKEN`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_BING_VERIFICATION`.

## Données ouvertes

Le dossier `data/csv/` contient quatre fichiers CSV sous licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), calculés avec les mêmes moteurs que les pages du site (`site/scripts/donnees-ouvertes.mts`) :

| Fichier | Contenu | Source d'origine |
|---|---|---|
| `primes-2027-regions.csv` | primes LAMal 2027 par région de prime et profil type : nombre d'offres, minimum, quartiles, médiane, maximum | OFSP (priminfo.admin.ch, régions de primes 2027) |
| `economie-impot-3a-communes-2026.csv` | économie d'impôt 2026 d'un versement 3a de 7 258 CHF, personne seule, 80 000 CHF de revenu imposable, pour chaque commune couverte | AFC et administrations fiscales cantonales |
| `taux-3a-historique.csv` | taux de base des comptes 3a, relevés chaque lundi depuis le 22.11.2026 | pages officielles des banques |
| `taux-3a-archives.csv` | taux de base des comptes 3a par banque avant le relevé hebdomadaire, une ligne par copie archivée (date de la copie, taux, date d'entrée en vigueur si indiquée, adresses de la copie et de la page) ; source : `data/sources/taux-3a-archives.json` | copies archivées (Internet Archive) des pages officielles des banques |

Pour les citer : « Guide Assurance (guide-assurance.ch), d'après » la source d'origine, avec la date des données. Voir `data/csv/LICENSE` et `CITATION.cff`. Pages correspondantes : [chiffres clés 2027](https://guide-assurance.ch/chiffres-cles-2027/), [primes par région](https://guide-assurance.ch/assurance-maladie/primes/regions/), [économie d'impôt 3a par commune](https://guide-assurance.ch/3e-pilier/economie-impot/communes/), [historique des taux 3a](https://guide-assurance.ch/3e-pilier/taux-3a/historique/).

La série mensuelle de la BNS (taux 3a et de libre passage, cube `zikrepro`) est affichée sur les pages de taux avec sa source et suit les conditions d'utilisation de la BNS ; elle n'est pas republiée ici (téléchargement sur [data.snb.ch](https://data.snb.ch/fr/topics/ziredev/cube/zikrepro)).

Régénérer les fichiers : `cd site && node --no-warnings scripts/donnees-ouvertes.mts ../data/csv`
