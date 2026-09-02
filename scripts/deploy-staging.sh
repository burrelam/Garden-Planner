#!/usr/bin/env bash
set -euo pipefail

# Staging must represent an exact commit, otherwise phone approval cannot identify what was tested.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Refusing staging deploy: commit or stash every change first." >&2
  exit 1
fi

revision="$(git rev-parse HEAD)"
npm run check
# Depot's builder times out in this org ("error releasing builder:
# deadline_exceeded"), so build on a Fly builder machine instead. Still remote,
# so no local Docker is needed, and natively amd64 like the machines it runs on.
# Drop these two flags to go back to Depot once it is reliable again.
flyctl deploy --config fly.staging.toml --build-arg "APP_REVISION=$revision" \
  --depot=false --remote-only

reported="$(curl --fail --silent https://gardenbuddy-jm-staging.fly.dev/api/meta | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).revision))')"
if [[ "$reported" != "$revision" ]]; then
  echo "Staging reports $reported, expected $revision" >&2
  exit 1
fi

echo "Staging is ready for phone approval: https://gardenbuddy-jm-staging.fly.dev"
echo "Approved candidate SHA: $revision"
