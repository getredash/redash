#!/bin/sh
# Runs the visual tests inside the official Playwright Docker image, so screenshots are rendered exactly like
# the committed baselines (and like in CI). Extra arguments are passed to `playwright test`, e.g.:
#   pnpm visual-tests:docker --update-snapshots
set -e
cd "$(dirname "$0")/../.."

VERSION=$(pnpm exec playwright --version | awk '{print $2}')
BASE_URL="${VISUAL_TESTS_BASE_URL:-http://localhost:5001}"

if [ "$(uname)" = "Linux" ]; then
  NETWORK="--network=host"
  # Write results and baselines as the current user rather than root
  USER_ARGS="--user $(id -u):$(id -g) -e HOME=/tmp"
else
  # Docker Desktop: reach the host's Redash through host.docker.internal. Files written to the mounted
  # repository already belong to the host user (and --user causes EACCES errors on its file sharing).
  NETWORK=""
  USER_ARGS=""
  BASE_URL=$(echo "$BASE_URL" | sed -E 's#//(localhost|127\.0\.0\.1)#//host.docker.internal#')
fi

exec docker run --rm --init --ipc=host $NETWORK $USER_ARGS \
  -v "$PWD":/work -w /work \
  -e VISUAL_TESTS_BASE_URL="$BASE_URL" \
  -e VISUAL_TESTS_API_KEY -e VISUAL_TESTS_EMAIL -e VISUAL_TESTS_PASSWORD -e VISUAL_TESTS_DB_PATH -e CI \
  "mcr.microsoft.com/playwright:v$VERSION-noble" \
  node_modules/.bin/playwright test --config client/visual-tests/playwright.config.ts "$@"
