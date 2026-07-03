#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Pushes apps/web/.dev.vars → Cloudflare Worker secrets (staging / production).
# Run from anywhere:  ./scripts/push-secrets.sh
# ─────────────────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEV_VARS="$REPO_ROOT/apps/web/.dev.vars"
TMP_JSON=$(mktemp /tmp/cf-secrets-XXXXXX.json)

STAGING_WORKER="feeduro-staging"
PRODUCTION_WORKER="feeduro-production"

trap 'rm -f "$TMP_JSON"' EXIT

# ── parse .dev.vars → JSON ───────────────────────────────────────────────────
if [[ ! -f "$DEV_VARS" ]]; then
  echo "Error: .dev.vars not found at $DEV_VARS" >&2
  exit 1
fi

node -e "
const fs = require('fs');
const lines = fs.readFileSync('$DEV_VARS', 'utf8').trim().split('\n');
const obj = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  obj[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}
fs.writeFileSync('$TMP_JSON', JSON.stringify(obj, null, 2));
console.log('Parsed', Object.keys(obj).length, 'secrets.');
"

echo ""
echo "Target workers:"
echo "  [1] Staging    → $STAGING_WORKER"
echo "  [2] Production → $PRODUCTION_WORKER"
echo "  [3] Both"
echo ""
read -r -p "Push to [1/2/3]: " choice

push() {
  local worker="$1"
  echo ""
  echo "→ Pushing secrets to $worker ..."
  # Use versions secret API — required when Worker Versions (gradual rollouts) is enabled
  if npx wrangler versions secret bulk "$TMP_JSON" --name "$worker" --env="" 2>&1; then
    echo "✓ Done: $worker (versions secret bulk)"
  else
    echo "  Falling back to standard secret bulk..."
    npx wrangler secret bulk "$TMP_JSON" --name "$worker" --env=""
    echo "✓ Done: $worker"
  fi
}

case "$choice" in
  1) push "$STAGING_WORKER" ;;
  2) push "$PRODUCTION_WORKER" ;;
  3) push "$STAGING_WORKER"; push "$PRODUCTION_WORKER" ;;
  *) echo "Invalid choice. Exiting." >&2; exit 1 ;;
esac

echo ""
echo "All done. Temp file cleaned up automatically."
