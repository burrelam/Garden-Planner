#!/usr/bin/env bash
set -euo pipefail

# Tigris credentials are installed only in production. When they exist, restore a missing
# database first and keep Litestream running as the parent process for continuous replication.
if [[ -n "${BUCKET_NAME:-}" ]]; then
  ./node_modules/.bin/litestream restore -if-db-not-exists -config ./litestream.yml /data/gardenbuddy.db
  exec ./node_modules/.bin/litestream replicate -config ./litestream.yml -exec "npm start"
fi

exec npm start
