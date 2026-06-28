#!/usr/bin/env bash
# No-composite invariant guard.
#
# Two modes:
#   --scan         : repo-wide grep across scripts/, src/, evals/, schemas/.
#                    Exits non-zero if any forbidden token is found.
#                    Wired into "npm run lint:composite" and the CI.
#   (no arg, stdin): PreToolUse hook for Edit/Write. Reads the proposed
#                    content and blocks if any forbidden token is being added.

set -euo pipefail

FORBIDDEN_RE='sovereignty_score|composite_score|combined_score|overall_score|total_score|fused_score'
FORBIDDEN_MATH_RE='axis_a\s*[\+\-\*\/]\s*axis_b|axisA\s*[\+\-\*\/]\s*axisB'

scan_repo() {
  local root
  root="$(cd "$(dirname "$0")/../.." && pwd)"
  local offenders
  offenders="$(grep -rEn \
      --include="*.ts" --include="*.tsx" --include="*.astro" \
      --include="*.mjs" --include="*.js" --include="*.json" \
      --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.astro \
      "$FORBIDDEN_RE|$FORBIDDEN_MATH_RE" \
      "$root/scripts" "$root/src" "$root/evals" "$root/schemas" 2>/dev/null \
      | grep -v 'scripts/lib/types.ts:' \
      | grep -v '.claude/hooks/forbid-composite.sh:' \
      | grep -v 'evals/07_no_composite.test.ts:' \
      || true)"

  if [ -n "$offenders" ]; then
    printf 'forbid-composite: forbidden tokens found:\n%s\n' "$offenders" >&2
    exit 1
  fi
  printf 'forbid-composite: clean\n'
}

scan_stdin() {
  local input content file
  input="$(cat)"
  file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
  content=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null || true)
  case "$file" in
    *node_modules*|*.git/*|*dist/*|*.astro/*) exit 0 ;;
  esac
  if printf '%s' "$content" | grep -Eq "$FORBIDDEN_RE|$FORBIDDEN_MATH_RE"; then
    printf 'forbid-composite blocked write to %s — composite tokens are forbidden (CLAUDE.md non-negotiable 1).\n' "$file" >&2
    exit 2
  fi
  exit 0
}

if [ "${1:-}" = "--scan" ]; then
  scan_repo
else
  scan_stdin
fi
