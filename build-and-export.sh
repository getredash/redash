#!/usr/bin/env bash
# Run this on a machine WITH internet access. Builds the production images and
# packages everything needed to run them on an OFFLINE server into ./dist/.
#
# Usage:
#   ./build-and-export.sh
#
# Output: dist/skynet-portal-offline-package.tar containing:
#   - images/*.tar        (docker save of each image, load with `docker load -i`)
#   - docker-compose.production.yml
#   - nginx.production.conf
#   - .env.production.example
#   - load-and-run.sh
#   - README.txt

set -euo pipefail
cd "$(dirname "$0")"

DIST=dist
IMAGES_DIR="$DIST/images"
rm -rf "$DIST"
mkdir -p "$IMAGES_DIR"

echo "== Pulling nginx base image =="
docker pull nginx:1.27-alpine

echo "== Building Redash production image (skynet-redash:10.1.0) =="
docker compose -f docker-compose.production.yml build server

echo "== Building drill-api image (skynet-drill-api:1.0.0) =="
docker compose -f docker-compose.production.yml build drill-api

echo "== Saving images to $IMAGES_DIR =="
docker save skynet-redash:10.1.0   -o "$IMAGES_DIR/skynet-redash.tar"
docker save skynet-drill-api:1.0.0 -o "$IMAGES_DIR/skynet-drill-api.tar"
docker save nginx:1.27-alpine      -o "$IMAGES_DIR/nginx.tar"

echo "== Copying deploy files =="
cp docker-compose.production.yml "$DIST/"
cp nginx.production.conf "$DIST/"
cp .env.production.example "$DIST/"
cp load-and-run.sh "$DIST/"
chmod +x "$DIST/load-and-run.sh"

cat > "$DIST/README.txt" <<'EOF'
SkyNet Portal (Redash 10.1.0) — offline deployment package
============================================================

1. Copy this whole folder (or the .tar bundle) to the offline production server.

2. On the offline server, fill in real values:
     cp .env.production.example .env.production
     # edit .env.production: REDASH_DATABASE_URL, REDASH_REDIS_URL,
     # REDASH_COOKIE_SECRET, REDASH_SECRET_KEY, REDASH_HOST, DRILL_API_CLICKHOUSE_IP

3. Run:
     ./load-and-run.sh

   This loads the 3 image tarballs (images/*.tar) into the local Docker engine
   and starts the stack with `docker compose up -d` — no build, no internet
   needed at any point.

4. First-time only — initialize the database (point at your COPY of the
   production DB, not the live one, per the earlier decision to test against
   a separate database):
     docker compose -f docker-compose.production.yml --env-file .env.production \
       run --rm server manage.py db upgrade

   Use `db upgrade` (not `database create_tables`) here because this is an
   EXISTING v9 database schema being migrated forward to v10.1, not a fresh
   empty database. Back up that database copy before running this.

5. The stack listens on $EXPOSED_HTTP_PORT (default 8090) via nginx. Point a
   test hostname/port at the offline server's IP on that port. It does not
   touch the existing v9 stack's ports.

6. To ship an update later: rerun build-and-export.sh, transfer the new
   dist/ folder, run load-and-run.sh again — it overwrites the same
   image names/tags, then `docker compose up -d` picks up the new images
   for containers whose image changed.
EOF

echo "== Bundling into a single tar =="
tar -cf "$DIST/skynet-portal-offline-package.tar" -C "$DIST" images docker-compose.production.yml nginx.production.conf .env.production.example load-and-run.sh README.txt

echo ""
echo "Done. Transfer this file to the offline server:"
echo "  $DIST/skynet-portal-offline-package.tar"
