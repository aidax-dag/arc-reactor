#!/bin/bash
# sandbox-perms.sh - 서브에이전트용 동적 권한 관리 (핵심 로직)
set -euo pipefail

ACTION="${1:-status}"
TARGET_DIR="${2:-$(pwd)}"
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd || echo "$TARGET_DIR")"

CLAUDE_DIR=".claude"
SETTINGS_FILE="${CLAUDE_DIR}/settings.local.json"
SANDBOX_STATE="${CLAUDE_DIR}/.sandbox-state.json"

ensure_settings_file() {
  [ -d "$CLAUDE_DIR" ] || mkdir -p "$CLAUDE_DIR"
  if [ ! -f "$SETTINGS_FILE" ]; then
    echo '{"permissions":{"allow":[]}}' | jq . > "$SETTINGS_FILE"
  fi
}

grant_permissions() {
  local target="$1"
  ensure_settings_file

  local perms=(
    "Read(${target}/**)"
    "Edit(${target}/**)"
    "Write(${target}/**)"
    "Glob(${target}/**)"
    "Grep(${target}/**)"
  )

  local current
  current=$(cat "$SETTINGS_FILE")
  current=$(echo "$current" | jq 'if .permissions == null then .permissions = {"allow":[]} elif .permissions.allow == null then .permissions.allow = [] else . end')

  for perm in "${perms[@]}"; do
    current=$(echo "$current" | jq --arg p "$perm" '
      if (.permissions.allow | index($p)) == null
      then .permissions.allow += [$p]
      else . end
    ')
  done

  echo "$current" | jq . > "$SETTINGS_FILE"

  local state='{"granted_paths":[],"granted_at":""}'
  [ -f "$SANDBOX_STATE" ] && state=$(cat "$SANDBOX_STATE")

  state=$(echo "$state" | jq --arg p "$target" --arg t "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
    if (.granted_paths | index($p)) == null
    then .granted_paths += [$p] | .granted_at = $t
    else . end
  ')
  echo "$state" | jq . > "$SANDBOX_STATE"

  echo "[sandbox] Granted: ${target}"
}

revoke_permissions() {
  if [ ! -f "$SANDBOX_STATE" ]; then
    echo "[sandbox] No active sandbox permissions"
    return 0
  fi

  local paths
  paths=$(jq -r '.granted_paths[]' "$SANDBOX_STATE" 2>/dev/null)
  [ -z "$paths" ] && { rm -f "$SANDBOX_STATE"; return 0; }

  if [ -f "$SETTINGS_FILE" ]; then
    local current
    current=$(cat "$SETTINGS_FILE")

    while IFS= read -r path; do
      for suffix in "Read" "Edit" "Write" "Glob" "Grep"; do
        local perm="${suffix}(${path}/**)"
        current=$(echo "$current" | jq --arg p "$perm" '
          .permissions.allow = [.permissions.allow[] | select(. != $p)]
        ')
      done
    done <<< "$paths"

    echo "$current" | jq . > "$SETTINGS_FILE"

    local remaining
    remaining=$(jq '.permissions.allow | length' "$SETTINGS_FILE")
    if [ "$remaining" = "0" ]; then
      local other_keys
      other_keys=$(jq 'del(.permissions) | keys | length' "$SETTINGS_FILE")
      [ "$other_keys" = "0" ] && rm -f "$SETTINGS_FILE"
    fi
  fi

  rm -f "$SANDBOX_STATE"
  echo "[sandbox] Revoked all sandbox permissions"
}

show_status() {
  if [ ! -f "$SANDBOX_STATE" ]; then
    echo "[sandbox] No active sandbox permissions"
    return 0
  fi
  echo "[sandbox] Active:"
  jq -r '.granted_paths[] | "  - " + .' "$SANDBOX_STATE" 2>/dev/null
}

case "$ACTION" in
  grant|add)     grant_permissions "$TARGET_DIR" ;;
  revoke|remove) revoke_permissions ;;
  status|show)   show_status ;;
  *)             echo "Usage: sandbox-perms.sh {grant|revoke|status} [path]"; exit 1 ;;
esac
