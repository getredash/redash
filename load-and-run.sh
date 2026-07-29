#!/usr/bin/env bash
# Run this on the OFFLINE production server, after transferring the package
# built by build-and-export.sh. Requires Docker + Docker Compose already
# installed on this server (that install itself is out of scope here — if
# Docker isn't installed yet, it needs its own offline install package).
#
# Usage (from the extracted package directory):
#   cp .env.production.example .env.production   # fill in real values first
#   ./load-and-run.sh

set -euo pipefail
cd "$(dirname "$0")"

if [ ! -f .env.production ]; then
  echo "ERROR: .env.production not found."
  echo "Run: cp .env.production.example .env.production, fill in real values, then rerun."
  exit 1
fi

echo "== Loading images =="
docker load -i images/skynet-redash.tar
docker load -i images/skynet-drill-api.tar
docker load -i images/nginx.tar

echo "== Starting stack (no build, no pull) =="
docker compose -f docker-compose.production.yml --env-file .env.production up -d

echo ""
echo "Stack is up. Check status with:"
echo "  docker compose -f docker-compose.production.yml ps"
echo ""
echo "First-time only, initialize/migrate the database (see README.txt)."
