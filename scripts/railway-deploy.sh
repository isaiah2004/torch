#!/usr/bin/env bash
# Deploy Torch to Railway: Postgres + web (APP_ROLE=web) + admin (APP_ROLE=admin).
#
# Prereqs:
#   1) railway login            # interactive; required for write operations
#   2) railway link             # link this dir to the `torch` project (already created)
#   3) cp .env.example .env.local and fill it in (this script reads runtime keys from it)
#
# Run from the repo root:  bash scripts/railway-deploy.sh
set -euo pipefail

ENVFILE=".env.local"
[ -f "$ENVFILE" ] || { echo "Missing $ENVFILE"; exit 1; }

# Collect runtime variables from .env.local, EXCEPT ones we set explicitly below.
VARS=()
while IFS='=' read -r key val; do
  case "$key" in
    ''|\#*) continue ;;
    DATABASE_URL|APP_ROLE|RUN_MIGRATIONS) continue ;;  # set per-service below
  esac
  # strip surrounding quotes / CR
  val="${val%$'\r'}"; val="${val%\"}"; val="${val#\"}"; val="${val%\'}"; val="${val#\'}"
  [ -n "$val" ] && VARS+=(--variables "$key=$val")
done < "$ENVFILE"

echo "==> Provisioning Postgres (pgvector enabled by the first migration)…"
railway add --database postgres || echo "(Postgres may already exist)"

echo "==> Creating + deploying web service (runs migrations on boot)…"
railway add --service torch-web \
  "${VARS[@]}" \
  --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --variables "APP_ROLE=web" \
  --variables "RUN_MIGRATIONS=true"
railway up --service torch-web --detach

echo "==> Creating + deploying admin service…"
railway add --service torch-admin \
  "${VARS[@]}" \
  --variables 'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  --variables "APP_ROLE=admin" \
  --variables "RUN_MIGRATIONS=false"
railway up --service torch-admin --detach

cat <<'NOTE'

==> Deploy kicked off. Next:
  - In the Railway dashboard, generate a domain for `torch-web` (and `torch-admin`).
  - Load reference data once (from this checkout, pointed at the Railway DB):
      DATABASE_URL="<Postgres public URL>" pnpm seed:sources
      DATABASE_URL="<Postgres public URL>" pnpm bibles:public
      DATABASE_URL="<Postgres public URL>" pnpm embed:bible
  - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is read at build time from the service vars
    (already set). For a public domain, switch Clerk to a PRODUCTION instance and
    set its keys to avoid dev-instance device-trust friction.
NOTE
