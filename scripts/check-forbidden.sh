#!/usr/bin/env bash
# Mentions interdites dans le dépôt public et le site généré : nom du courtier, collaborateurs, adresses.
#   scripts/check-forbidden.sh [chemin…]      (défaut : tout le dépôt)
# Affiche les fichiers fautifs (jamais le contenu), code 1 s'il y en a, 2 si le contrôle est impossible.
# Motifs : un motif de base (écrit en deux morceaux pour ne pas se trouver lui-même) plus FORBIDDEN_PATTERNS
# (expression régulière étendue, secret GitHub Actions : noms et adresses qui ne doivent pas figurer ici en clair).
# En CI, FORBIDDEN_PATTERNS est obligatoire.
set -uo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
BASE="leman""is"
if [[ -z "${FORBIDDEN_PATTERNS:-}" && -n "${GITHUB_ACTIONS:-}" ]]; then
  echo "FORBIDDEN_PATTERNS absent (secret GitHub Actions)" >&2; exit 2
fi
PAT="$BASE${FORBIDDEN_PATTERNS:+|$FORBIDDEN_PATTERNS}"
[[ $# -gt 0 ]] || set -- "$ROOT"
hits=$(grep -rIilE --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=.next -e "$PAT" "$@" 2>/dev/null)
rc=$?
if [[ $rc -eq 0 ]]; then printf '%s\n' "$hits"; exit 1; fi
[[ $rc -eq 1 ]] && exit 0
echo "grep a échoué (code $rc)" >&2; exit 2
