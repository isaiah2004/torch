#!/bin/sh
# Optionally apply DB migrations before starting the server. Set RUN_MIGRATIONS=true
# on exactly ONE service (e.g. the web container) so migrations run once per deploy.
set -e

if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "[entrypoint] Running database migrations…"
  node scripts/db-migrate.mjs
fi

exec "$@"
