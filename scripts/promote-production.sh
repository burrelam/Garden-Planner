#!/usr/bin/env bash
set -euo pipefail

approved="${APPROVED_STAGING_SHA:-}"
if [[ -z "$approved" && -f .gardenbuddy-approved-sha ]]; then approved="$(tr -d '[:space:]' < .gardenbuddy-approved-sha)"; fi
if [[ -z "$approved" ]]; then
  echo "Set APPROVED_STAGING_SHA or place the approved full SHA in .gardenbuddy-approved-sha." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Production promotion requires a clean working tree." >&2
  exit 1
fi

git fetch origin main
current_branch="$(git branch --show-current)"
if [[ "$current_branch" == "main" ]]; then
  before="$(git rev-parse HEAD)"
  if [[ "$before" != "$(git rev-parse origin/main)" ]]; then
    echo "Refusing promotion: local main differs from origin/main." >&2
    exit 1
  fi
elif [[ "$(git rev-parse HEAD)" == "$approved" ]]; then
  # The first GardenBuddy release starts from the approved feature branch because this
  # guard script does not exist on the old main branch yet.
  before="$(git rev-parse origin/main)"
else
  echo "Run promotion from clean main or from the exact approved staging commit." >&2
  exit 1
fi
if [[ "$(curl --fail --silent https://gardenbuddy-jm-staging.fly.dev/api/meta | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).revision))')" != "$approved" ]]; then
  echo "Refusing promotion: staging is not running the approved SHA." >&2
  exit 1
fi
git merge-base --is-ancestor "$before" "$approved" || { echo "Approved SHA is not a fast-forward of main." >&2; exit 1; }
if [[ "$current_branch" != "main" ]]; then
  git switch main
  git merge --ff-only origin/main
fi
git merge --ff-only "$approved"
[[ "$(git rev-parse HEAD)" == "$approved" ]] || { echo "main did not reach the approved SHA." >&2; exit 1; }

npm run check
git push origin main
# Same builder fallback as deploy-staging.sh — see the note there.
flyctl deploy --config fly.production.toml --build-arg "APP_REVISION=$approved" \
  --depot=false --remote-only
echo "Production now reports approved staging SHA $approved: https://gardenbuddy-jm.fly.dev"
