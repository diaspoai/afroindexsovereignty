#!/usr/bin/env bash
# Local pre-commit eval guard. Install with:
#   ln -s ../../.claude/hooks/pre-commit-evals.sh .git/hooks/pre-commit
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

echo "==> validate"
npm run --silent validate

echo "==> normalize (verify)"
npm run --silent normalize

echo "==> evals + unit"
npm run --silent test

echo "==> forbid-composite (scan)"
npm run --silent lint:composite

echo "pre-commit-evals: PASS"
