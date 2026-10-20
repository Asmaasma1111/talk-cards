#!/bin/sh
# Cloudflare Pages build (Build command: sh scripts/build_site.sh   Output directory: _site).
# Copies the app into _site without the tooling, so scripts, notes and the sign-in code are never served as files.
# The sign-in itself (functions/_middleware.js) is picked up by Cloudflare from the repository root.
set -eu
rm -rf _site
mkdir _site
tar --exclude='./_site' --exclude='./.git' --exclude='./scripts' --exclude='./functions' \
    --exclude='./README.md' --exclude='./.gitignore' --exclude='./.nojekyll' --exclude='./*.md' -cf - . | (cd _site && tar -xf -)
echo "Built _site: $(find _site -type f | wc -l | tr -d ' ') files"
