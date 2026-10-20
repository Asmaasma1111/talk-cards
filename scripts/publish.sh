#!/bin/sh
# Publish Maria's apps: push main to GitHub, then ask Cloudflare to build the locked app (maria-apps.pages.dev).
# Cloudflare does not hear GitHub pushes for this project, so its deploy hook (a private link kept in
# .cloudflare-deploy-hook, never committed) starts the build.
set -eu
cd "$(dirname "$0")/.."
git push origin main
if [ -f .cloudflare-deploy-hook ]; then
  curl -s -X POST "$(cat .cloudflare-deploy-hook)" | grep -q '"success":true' && echo "Cloudflare build started" || echo "Cloudflare did not start a build" >&2
else
  echo "No .cloudflare-deploy-hook file: start the Cloudflare build from its dashboard" >&2
fi
