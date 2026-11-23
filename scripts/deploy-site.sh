#!/usr/bin/env bash
# Déploie site/out (déjà construit) sur le proxy partagé, contrôle les pages clés, signale les changements à IndexNow.
# Lancé par GitHub Actions (ci-deploy.yml et les relevés de données refresh-*.yml), jamais depuis un poste.
#
# Environnement :
#   DEPLOY_SSH_HOST   hôte du proxy (secret)
#   DEPLOY_SSH_USER   défaut ga-deploy (clé restreinte par rrsync au dossier du site)
#   SSH_KEY_FILE      défaut ~/.ssh/ga_deploy        KNOWN_HOSTS_FILE  défaut ~/.ssh/known_hosts_deploy
#   INDEXNOW_KEY      clé IndexNow (publiée aussi dans site/public/<clé>.txt)
#   DRY_RUN=1         rsync --dry-run, pas d'IndexNow (liste affichée seulement)
#
# Le dossier des maquettes sur le serveur (/maquettes-*/) n'est jamais touché.
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/site/out"
HOST="${DEPLOY_SSH_HOST:?DEPLOY_SSH_HOST manquant}"
USER_="${DEPLOY_SSH_USER:-ga-deploy}"
KEY="${SSH_KEY_FILE:-$HOME/.ssh/ga_deploy}"
KH="${KNOWN_HOSTS_FILE:-$HOME/.ssh/known_hosts_deploy}"
SSH="ssh -i $KEY -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=$KH -o ConnectTimeout=20 -o ServerAliveInterval=10"
DRY=()
[[ -n "${DRY_RUN:-}" ]] && DRY=(--dry-run)

test -f "$OUT/index.html" || { echo "site/out absent : construire le site d'abord" >&2; exit 1; }
test -f "$OUT/sitemap.xml" || { echo "site/out/sitemap.xml absent" >&2; exit 1; }

# Plan du site en ligne avant la mise à jour : IndexNow ne reçoit que les adresses nouvelles, retirées ou dont le
# lastmod a changé (spec SEO §4.4). Plan en ligne illisible : tout le nouveau plan part.
BEFORE=$(mktemp)
curl -fsS --connect-timeout 10 --max-time 30 https://guide-assurance.ch/sitemap.xml -o "$BEFORE" || : > "$BEFORE"

for attempt in 1 2 3; do
  if rsync -rlptz --delete --chmod=Da+rx,Fa+r --timeout=120 --exclude '/maquettes-*/' "${DRY[@]}" --stats \
       -e "$SSH" "$OUT/" "$USER_@$HOST:/" | grep -E '^Number of (files|regular files transferred|deleted files)'; then
    break
  fi
  echo "rsync : essai $attempt échoué" >&2
  [[ $attempt -lt 3 ]] && sleep $((attempt * 15)) || exit 1
done

if [[ -n "${DRY_RUN:-}" ]]; then
  echo "DRY_RUN : rien n'a été copié"
fi

# Contrôles en ligne (les adresses que vérifiait infra/deploy.sh) : un code autre que 200 fait échouer le passage.
fail=0
for u in / /simulateur-frontalier/ /lettre-resiliation/ /assurance-maladie/comparateur/ /en/health-insurance/compare/ \
         /3e-pilier/taux-3a/ /3e-pilier/economie-impot/ /en/pillar-3a/interest-rates/ /en/pillar-3a/tax-savings/ \
         /data/primes-2027/GE.json /data/primes-2027/npa.json; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "https://guide-assurance.ch$u" || echo 000)
  printf '%s https://guide-assurance.ch%s\n' "$code" "$u"
  [[ "$code" == "200" ]] || fail=1
done
[[ $fail -eq 0 ]] || { echo "contrôle en ligne : au moins une page ne répond pas 200" >&2; exit 1; }

# IndexNow (Bing, et par lui Copilot, DuckDuckGo, Yahoo, Ecosia ; aussi Yandex, Seznam, Naver).
if [[ -z "${INDEXNOW_KEY:-}" ]]; then
  echo "IndexNow : INDEXNOW_KEY absent, rien envoyé"
  exit 0
fi
URLS=$(python3 "$ROOT/scripts/indexnow-urls.py" "$BEFORE" "$OUT/sitemap.xml")
if [[ "$URLS" == "[]" ]]; then
  echo "IndexNow : aucune adresse modifiée, rien à envoyer"
elif [[ -n "${DRY_RUN:-}" ]]; then
  echo "IndexNow (simulation) : $URLS"
else
  CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST https://api.indexnow.org/indexnow \
    -H 'Content-Type: application/json; charset=utf-8' \
    -d "{\"host\":\"guide-assurance.ch\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"https://guide-assurance.ch/$INDEXNOW_KEY.txt\",\"urlList\":$URLS}" || true)
  echo "IndexNow $CODE"
  [[ "$CODE" == "200" || "$CODE" == "202" ]] || echo "::warning::IndexNow a répondu $CODE (adresses non signalées)"
fi
