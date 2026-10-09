#!/usr/bin/env bash
# Outil du mainteneur : vérifie les sept branches du workshop.
# Usage : scripts/verify-branches.sh [--no-agent] [branche ...]
# Prérequis : un .env valide et node_modules/ installés à la racine du repo.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

RUN_AGENT=1
if [[ "${1:-}" == "--no-agent" ]]; then RUN_AGENT=0; shift; fi
BRANCHES=("$@")
if [[ ${#BRANCHES[@]} -eq 0 ]]; then
  BRANCHES=(etape-1 etape-1-solution etape-2 etape-2-solution etape-3 etape-3-solution main)
fi

QUESTION="Quels fichiers contient ce projet et que fait sa fonction principale ?"
TMP="$(mktemp -d)"
FAILED=0
trap 'git worktree prune; rm -rf "$TMP"' EXIT

fail() { echo "  KO  $1"; FAILED=1; }
ok()   { echo "  OK  $1"; }

for branch in "${BRANCHES[@]}"; do
  echo "== $branch"
  dir="$TMP/$branch"
  if ! git worktree add --quiet --detach "$dir" "$branch" 2>/dev/null; then
    fail "branche introuvable"; continue
  fi
  ln -s "$ROOT/node_modules" "$dir/node_modules"
  [[ -f "$ROOT/.env" ]] && cp "$ROOT/.env" "$dir/.env"

  # 1. dépendances identiques à main
  if git diff --quiet main "$branch" -- package.json package-lock.json; then
    ok "package.json et package-lock.json identiques à main"
  else
    fail "package.json ou package-lock.json diffère de main"
  fi

  # 2. typecheck
  if (cd "$dir" && npx tsc --noEmit >/dev/null 2>&1); then
    ok "tsc --noEmit"
  else
    fail "tsc --noEmit"
  fi

  # 3. sur les branches de solution, l'agent répond à la question de test
  #    (les agents sortent avec un code non nul sur toute erreur)
  step=""
  case "$branch" in
    etape-1-solution) step=1 ;;
    etape-2-solution) step=2 ;;
    etape-3-solution|main) step=3 ;;
  esac
  if [[ $RUN_AGENT -eq 1 && -n "$step" ]]; then
    if out="$(cd "$dir" && npm run --silent "step$step" -- "$QUESTION" 2>&1)" && [[ -n "$out" ]]; then
      ok "step$step répond à la question de test"
    else
      fail "step$step n'a pas répondu proprement"; echo "$out" | tail -5 | sed 's/^/      /'
    fi
  fi

  git worktree remove --force "$dir"
done

echo
if [[ $FAILED -eq 0 ]]; then echo "Toutes les vérifications passent."; else echo "Des vérifications ont échoué."; exit 1; fi
