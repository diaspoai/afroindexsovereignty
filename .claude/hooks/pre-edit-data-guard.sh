#!/usr/bin/env bash
# PreToolUse hook for Edit/Write targeting data/.
# Blocks any score/event JSON edit that lacks source_url or source_date,
# or any INTERP record lacking review_log_id.
#
# Wired in .claude/settings.json under hooks.PreToolUse.
# Reads the proposed tool input as JSON on stdin (Claude Code hook contract).

set -euo pipefail

INPUT="$(cat)"

TOOL=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || true)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || true)
CONTENT=$(printf '%s' "$INPUT" | jq -r '.tool_input.content // .tool_input.new_string // empty' 2>/dev/null || true)

case "$FILE_PATH" in
  */data/scores/*.json|*/data/events.json) ;;
  *) exit 0 ;;
esac

if [ -z "$CONTENT" ]; then
  exit 0
fi

errors=()

if printf '%s' "$CONTENT" | grep -Eq '"(interpolated|extrapolated|imputed|estimated_from|back_filled|backfilled|smoothed)"\s*:'; then
  errors+=("forbidden field detected (interpolated/extrapolated/imputed/...) — A8.2 forbids these.")
fi

if printf '%s' "$CONTENT" | grep -Eq '"raw_value"\s*:' && ! printf '%s' "$CONTENT" | grep -Eq '"source_url"\s*:'; then
  errors+=("record contains raw_value but no source_url — provenance is mandatory (CLAUDE.md non-negotiable 4).")
fi

if printf '%s' "$CONTENT" | grep -Eq '"raw_value"\s*:' && ! printf '%s' "$CONTENT" | grep -Eq '"source_date"\s*:'; then
  errors+=("record contains raw_value but no source_date — provenance is mandatory.")
fi

if printf '%s' "$CONTENT" | grep -Eq '"type"\s*:\s*"INTERP"' && ! printf '%s' "$CONTENT" | grep -Eq '"review_log_id"\s*:'; then
  errors+=("INTERP record missing review_log_id — interpretive scores require a transparent review log entry (A11).")
fi

if [ ${#errors[@]} -gt 0 ]; then
  printf 'pre-edit-data-guard blocked the write to %s:\n' "$FILE_PATH" >&2
  for e in "${errors[@]}"; do printf '  · %s\n' "$e" >&2; done
  exit 2
fi

exit 0
