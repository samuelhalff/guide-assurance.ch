# Journal SEO

## 26.11.2026

Site lancé le 22.11 : peu de données, les décisions portent sur la découverte des pages et la fiabilité des publications.

| Changement | Commit | Motif |
|---|---|---|
| « Outils liés » des pages 3e pilier, assurance maladie et primes (FR/EN) : historique des taux 3a, économie d'impôt par commune, baromètre, primes par région, chiffres clés. Accueil : taux de libre passage et actualités. | `17a8d44` | Pages à données encore inconnues de Google : elles sont désormais liées depuis les piliers. Ce sont aussi les pages les plus citables. |
| Actualité « Versement 3a : montants maximaux et déduction fiscale 2026 » (FR/EN), produite par le pipeline (option `--mois`, sources OFAS et État de Genève), corrigée après vérification : plafond de 36 288 CHF réservé aux personnes sans caisse de pension, versement crédité au plus tard le 31.12, relevé de taux daté. | `331544e`, `a3a2b85`, `176bc69` | Échéance du 31 décembre ; le texte généré contenait des erreurs factuelles. |
| `_refresh.yml` : `DRY_RUN=false` remplacé par `REFRESH_DRY_RUN`. | `176bc69` | `deploy-site.sh` prenait toute valeur non vide pour un essai : depuis le 24.11, les publications automatiques étaient committées sans être déployées. |
| 36 pages vues en `noindex` par Google le 22.11 : aucun changement. | — | Vues avant le lancement ; toutes en `index, follow` aujourd'hui, sitemap resoumis. |

Mesure : aucune page du sitemap en noindex périmé, indexation des pages à données, pages d'entrée et canaux dans PostHog.
