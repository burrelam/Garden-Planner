#!/usr/bin/env bash
set -euo pipefail

approved="${APPROVED_STAGING_SHA:-}"
if [[ -z "$approved" && -f .gardenbuddy-approved-sha ]]; then approved="$(tr -d '[:space:]' < .gardenbuddy-approved-sha)"; fi
if [[ -z "$approved" ]]; then
  echo "Set APPROVED_STAGING_SHA or place the approved full SHA in .gardenbuddy-approved-sha." >&2
  exit 1
fi
if [[ "$(git branch --show-current)" != "main" ]] || [[ -n "$(git status --porcelain)" ]]; then
  echo "Production promotion requires a clean main branch." >&2
  exit 1
fi

git fetch origin main
before="$(git rev-parse HEAD)"
if [[ "$before" != "$(git rev-parse origin/main)" ]]; then
  echo "Refusing promotion: local main differs from origin/main." >&2
  exit 1
fi
if [[ "$(curl --fail --silent https://gardenbuddy-jm-staging.fly.dev/api/meta | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).revision))')" != "$approved" ]]; then
  echo "Refusing promotion: staging is not running the approved SHA." >&2
  exit 1
fi
git merge-base --is-ancestor "$before" "$approved" || { echo "Approved SHA is not a fast-forward of main." >&2; exit 1; }
git merge --ff-only "$approved"
[[ "$(git rev-parse HEAD)" == "$approved" ]] || { echo "main did not reach the approved SHA." >&2; exit 1; }

npm run check
git push origin main
flyctl deploy --config fly.production.toml --build-arg "APP_REVISION=$approved"
echo "Production now reports approved staging SHA $approved: https://gardenbuddy-jm.fly.dev"
