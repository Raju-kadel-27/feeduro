#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Sets the GitHub Actions repo secrets used by .github/workflows/deploy.yml
# Run from anywhere:  ./scripts/set-gh-secrets.sh
#
#   ⚠️  DO NOT COMMIT THIS FILE WITH REAL VALUES. It is git-ignored.
#   Fill in the values, run it, then blank them out again.
# ─────────────────────────────────────────────────────────────────────────────

# Neon DIRECT (non-pooled) connection strings — host must NOT contain "-pooler".
STAGING_DATABASE_URL=""
PRODUCTION_DATABASE_URL=""

# Cloudflare — API token with "Edit Workers" scope + your account id.
CLOUDFLARE_API_TOKEN=""
CLOUDFLARE_ACCOUNT_ID="eaf872daa611531b2c95caf488b832c9"

# ─────────────────────────────────────────────────────────────────────────────

# Require gh + auth before doing anything.
command -v gh >/dev/null || { echo "Error: gh CLI not installed." >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Error: run 'gh auth login' first." >&2; exit 1; }

set_secret() {
  local name="$1" value="$2"
  if [[ -z "$value" ]]; then
    echo "  ⏭  $name is empty — skipping."
    return
  fi
  printf '%s' "$value" | gh secret set "$name"
  echo "  ✓ $name set."
}

echo "Setting GitHub Actions secrets on $(gh repo view --json nameWithOwner -q .nameWithOwner)..."
set_secret STAGING_DATABASE_URL     "$STAGING_DATABASE_URL"
set_secret PRODUCTION_DATABASE_URL  "$PRODUCTION_DATABASE_URL"
set_secret CLOUDFLARE_API_TOKEN     "$CLOUDFLARE_API_TOKEN"
set_secret CLOUDFLARE_ACCOUNT_ID    "$CLOUDFLARE_ACCOUNT_ID"

echo ""
echo "Done. Verify with: gh secret list"
echo "Now blank out the secret values in this file."
