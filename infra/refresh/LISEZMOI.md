# Relevés automatiques des données (guide-assurance.ch)

Les données chiffrées du site sont relevées à la source selon un calendrier fixe, dans GitHub Actions (`.github/workflows/refresh-*.yml`, modèle commun `_refresh.yml`). Les taux 3a et les corrections des primes LAMal sont publiés automatiquement quand ils sont valides. Tout le reste ne fait qu'envoyer une alerte. Les e-mails partent de assurance@houle.ai vers sh@houle.ai (Microsoft Graph `sendMail`, identifiants en secrets du dépôt).

## Calendrier (heure de Zurich)

| Jeu | Quand | Source | En cas de changement valide |
|---|---|---|---|
| Taux 3a (`taux3a.py`) | lundi 06:30 | pages et fiches PDF des 17 banques (`data/scripts/taux_3a.py`) | **publication automatique** ; le relevé de la semaine entre dans l'historique même sans changement |
| Taux de libre passage (`tauxlp.py`) | lundi 06:40 | pages et fiches PDF de 23 institutions (`data/scripts/taux_libre_passage.py`, lecteurs de `taux_3a.py`) | **publication automatique** (pas d'historique) ; une institution illisible garde son dernier taux vérifié et est signalée |
| Primes LAMal (`lamal.py`) | 06:15, chaque jour du 25.9 au 31.12, sinon le 1er du mois | priminfo.admin.ch, date des fichiers OFSP sur opendata.swiss | **publication automatique** des corrections de l'année en cours ; nouvelle année : alerte seulement |
| Frontaliers (`frontalier.py`) | 06:45, chaque jour en janvier, sinon le 1er du mois | Urssaf (PASS), opendata.swiss (Prämien_EU) | alerte seulement |
| Barèmes d'impôt (`impots.py`) | le 1er du mois, 07:00 | calculateur de l'AFC (GE/VD, 2026 et 2027) | alerte seulement |
| Statistique OFSP des caisses (`kvstat.py`) | le 1er du mois, 07:10 | page de l'OFSP listant les éditions de la Statistique de l'assurance-maladie obligatoire (HTML rendu côté serveur) | alerte seulement : édition plus récente que celle du site (puis édition complète) ; liste illisible : alerte aussi |
| Subsides d'assurance maladie (`subsides.py`) | le 1er du mois, 07:20 | textes officiels des cantons (arrêtés, mémento, tableaux ; `data/sources/subsides-2027/`) : empreinte de chaque source et chiffres témoins du barème 2027 ; apparition de l'échelle 2027 du Valais | alerte seulement « données à vérifier » ; rien n'est écrit |
| Point mensuel (`digest.py`) | le 1er du mois, 08:00 | `state/*.json` | e-mail « tout va bien » ou « données à vérifier » |
| Chiffres des actualités (`chiffres.py`) | lundi 08:15 | manifeste `site/content/actualites-chiffres.json`, données de `site/src/data` | **mise à jour automatique** de l'article (chiffre, `dateModified`, ligne « Mis à jour le … »), vérificateur relancé, publication ; alerte seulement en cas d'échec |
| Actualités (`actualites.py`) | 07:30 et 10:15 | données du site, flux RSS de la BNS, pages officielles | article FR + EN vérifié automatiquement puis **publié directement** ; contrôle en échec : article jeté, alerte |

GitHub planifie en UTC : chaque tâche a deux lignes cron (heure d'hiver, heure d'été). `_refresh.yml` calcule l'heure de Zurich de la ligne qui a déclenché le passage et passe `--scheduled --at H --utc-hour h` : seule la ligne qui tombe à l'heure H s'exécute, même si GitHub la lance en retard.

## Déroulé d'un relevé

1. **Relevé**, puis **contrôles** : schéma ; nombre de lignes à ±10 % du relevé précédent ; plages plausibles ; écart maximal par valeur (0,5 point pour un taux 3a, 25 % pour une prime) ; second relevé des banques modifiées ; texte rédigé à la main (`affiche_*`, `conditions_*`) qui cite une ancienne valeur.
2. Si une page ne se lit plus ou si une valeur est invraisemblable : **rien n'est écrit ni publié**, une alerte part. Exception pour les taux 3a : une banque illisible (même avec le navigateur sans tête) garde son dernier taux vérifié et sa date de relevé ; elle est marquée « non relevée cette semaine » dans le résumé du passage et dans l'e-mail, les autres banques sont publiées. Au-delà de la moitié des banques illisibles, rien n'est publié.
3. Si tout est valide et qu'il y a un changement : sauvegarde, écriture des données, `npm test`, `npm run build`, données ouvertes (`data/csv`), mentions interdites dans `site/out` (`scripts/check-forbidden.sh`). Puis commit sur `main` (auteur `guide-assurance-bot`), déploiement depuis le runner (`scripts/deploy-site.sh`) et vérification en ligne : HTTP 200, fichier en ligne identique au build, nouvelle valeur présente. Si les tests ou le build échouent, les données sont remises à l'état précédent et rien n'est committé.
4. État de chaque jeu dans `state/<jeu>.json`, alertes déjà envoyées dans `state/alertes.json` (pas de renvoi d'une alerte identique avant 7 jours, 30 pour les alertes de veille). Ce dossier est restauré depuis la branche `refresh-state` au début du passage et y est réenregistré à la fin. Le journal (`logs/<jeu>.log`) est gardé 90 jours comme artefact du passage.
5. Relevés et déploiements partagent le groupe de concurrence `guide-assurance-prod`. Un e-mail d'alerte qui ne part pas fait échouer le passage (GitHub prévient alors par e-mail).

## Pourquoi certains jeux restent en alerte seulement

- **Nouvelle année LAMal :** les scripts, les chemins (`primes-2027`) et les pages portent l'année, donc la bascule se fait à la main.
- **PASS :** c'est une constante du code du simulateur (`site/src/lib/engines/frontaliers.ts`), lue mais jamais modifiée par ces scripts.
- **Primes UE (Prämien_EU) :** l'alerte part quand l'OFSP date le fichier après les données du site.
- **Impôts :** un barème change la logique fiscale. Il faut une reconstruction vérifiée sur les calculettes officielles (`tests/impot3a.test.mts`).

## Commandes (en local, ou dans le workflow avec `dry_run` et `args`)

```
python3 infra/refresh/taux3a.py --dry-run                            # relève, compare, n'écrit rien, n'envoie rien
python3 infra/refresh/taux3a.py --dry-run --simulate-change          # simule un taux modifié (copie en mémoire)
python3 infra/refresh/taux3a.py --dry-run --simulate-parser-failure  # simule une page dont la structure a changé
python3 infra/refresh/tauxlp.py --dry-run                            # idem pour les taux de libre passage (mêmes options --simulate-*)
python3 infra/refresh/lamal.py --dry-run [--simulate-change|--simulate-parser-failure]   # idem frontalier.py, impots.py
python3 infra/refresh/subsides.py --dry-run                          # idem pour les subsides (mêmes options --simulate-*)
python3 infra/refresh/digest.py --dry-run
python3 infra/refresh/mailer.py --test                               # e-mail d'essai (identifiants dans l'environnement)
```

Modules Python : `pymupdf`, `openpyxl` (installés par `.github/actions/setup-site`).
