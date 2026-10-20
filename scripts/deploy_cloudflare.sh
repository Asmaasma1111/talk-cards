#!/bin/zsh
# Maria's apps on Cloudflare Pages, behind the password sign-in (functions/_middleware.js).
# Publishes only what is committed on the current branch, minus the tooling, so nothing private goes up.
#   scripts/deploy_cloudflare.sh            (first time: npx wrangler login, and the APP_PASSWORD secret set by Mama)
set -euo pipefail
cd "$(dirname "$0")/.."
PROJECT=${PROJECT:-maria-apps}
WRANGLER=${WRANGLER:-wrangler@4}
if [[ -n "$(git status --porcelain -- . ':!CHANGES_NEEDED.md' ':!COVERAGE_MAP.md' | grep -v '^??' || true)" ]]; then
  echo "Commit your changes first: only committed files are published." >&2; exit 1
fi
OUT=$(mktemp -d)/site
mkdir -p "$OUT"
git ls-files -z | grep -zv -E '^(scripts/|functions/|README\.md$|\.gitignore$|\.nojekyll$)' | xargs -0 -I{} rsync -R "{}" "$OUT/"
echo "Publishing $(find "$OUT" -type f | wc -l | tr -d ' ') files from $(git rev-parse --short HEAD) to $PROJECT"
npx --yes "$WRANGLER" pages deploy "$OUT" --project-name "$PROJECT" --branch main --commit-dirty=true
