# Amanda’s GardenBuddy setup guide

This guide gets Amanda—and Claude Code on Amanda’s computer—ready to develop, test, deploy, and operate GardenBuddy safely.

The short version is:

1. Jesse grants Amanda GitHub and Fly.io access.
2. Amanda installs Git, Node.js, GitHub CLI, Fly CLI, and Claude Code.
3. Amanda clones the repository and proves the app works locally.
4. Every change goes to permanent staging first.
5. Production moves only after Amanda approves the exact staging revision on her phone.

Never put a Fly token, passphrase, Argon2 hash, session secret, cookie, database, or `.env` file in Git, a Claude prompt, or a screenshot.

## What already exists

| Purpose                  | Fly resource                                                             |
| ------------------------ | ------------------------------------------------------------------------ |
| Staging site             | `https://gardenbuddy-jm-staging.fly.dev`                                 |
| Staging app              | `gardenbuddy-jm-staging`                                                 |
| Staging SQLite volume    | `gardenbuddy_staging_data`                                               |
| Production site          | `https://gardenbuddy-jm.fly.dev`                                         |
| Production app           | `gardenbuddy-jm`                                                         |
| Production SQLite volume | `gardenbuddy_production_data`                                            |
| Production backup bucket | `gardenbuddy-jm-backups` (private Tigris)                                |
| Fly organization         | `personal` / “Jesse Miller”                                              |
| Fly region               | `sjc` (San Jose, the closest currently available Fly region to Portland) |

Staging contains resettable sample data. Production is reserved for Amanda’s real garden and must never be copied into staging.

### Where Amanda's original version lives

The original standalone planner is preserved in `original-planner/`. Its `index.html`, `care-data.json`, and `README.md` match the last pre-modernization `main` commit byte-for-byte. You can still open that `index.html` locally, but normal Claude sessions should treat the directory as read-only. The hosted GardenBuddy app is the code at the repository root, and deployment tooling excludes the archive.

## 1. Owner setup Jesse performs once

Amanda should use her own GitHub and Fly.io accounts. Do not share Jesse’s account, browser session, access token, or SSH keys.

### GitHub access

Jesse grants Amanda access to `burrelam/Garden-Planner`. Amanda should be able to clone the repository and push a feature branch. Protect `main` from force-pushes in GitHub if that is not already configured.

### Fly.io access

1. Amanda creates or signs into her own Fly.io account.
2. Jesse opens the Fly dashboard, selects the “Jesse Miller” organization, and invites Amanda as a **Member**, not Admin.
3. Jesse shares the GardenBuddy site passphrase through a password manager or another private channel—not through Git or Claude.

A Fly Member can deploy code, manage secrets, volumes, and Machines, read logs, and access the private network. That is powerful access; Admin is unnecessary because it also permits organization and billing changes. See [Fly organization roles](https://fly.io/docs/security/org-roles-permissions/).

## 2. Install the local tools

These instructions assume macOS. Fly and Claude also publish Linux and Windows instructions in their linked setup pages.

### Apple command-line tools and Homebrew

Check first:

```bash
git --version
brew --version
```

If Git is missing, macOS normally offers to install Apple’s command-line tools when this runs:

```bash
xcode-select --install
```

Install [Homebrew](https://brew.sh/) only if it is not already present.

### Node.js and npm

GardenBuddy requires Node 22 or newer and is hosted on Node 24. Node 24 is the least-surprising local choice.

```bash
brew install node@24
node --version
npm --version
```

The Node version should begin with `v24` or be a newer supported version.

### GitHub CLI

```bash
brew install gh
gh auth login
gh auth setup-git
gh auth status
```

Choose GitHub.com, Amanda’s GitHub account, and SSH or HTTPS according to her preference. `gh auth status` must show the account that has access to `burrelam/Garden-Planner`.

### Fly CLI

Fly’s official macOS installation is:

```bash
brew install flyctl
fly version
fly auth login
fly auth whoami
```

The login opens a browser. Amanda signs into her own Fly account. Do not generate or paste a `FLY_API_TOKEN` for normal interactive development; Fly recommends scoped tokens for automation, while `fly auth login` manages Amanda’s interactive session. See [installing flyctl](https://fly.io/docs/flyctl/install/) and [Fly access tokens](https://fly.io/docs/security/tokens/).

Confirm Amanda can see the two apps:

```bash
fly orgs list
fly apps list
fly status --app gardenbuddy-jm-staging
fly status --app gardenbuddy-jm
```

If either app is missing or returns “not authorized,” stop. Jesse needs to fix organization membership; do not create replacement apps.

### Claude Code

Follow [Anthropic’s current Claude Code setup](https://docs.anthropic.com/en/docs/claude-code/getting-started). The npm installation is:

```bash
npm install -g @anthropic-ai/claude-code
claude doctor
claude
```

Do not use `sudo npm install -g`. Sign into Amanda’s own Anthropic/Claude account when prompted.

## 3. Clone GardenBuddy

Choose a normal development folder and run:

```bash
gh repo clone burrelam/Garden-Planner
cd Garden-Planner
git fetch origin
git status
npm install
npx playwright install chromium webkit
npm run check
```

At the initial handoff, the hosted work is on `codex/hosted-foundation`. If it has not reached `main` yet:

```bash
git switch --track origin/codex/hosted-foundation
npm install
npm run check
```

After the first production promotion, start normal work from current `main`:

```bash
git switch main
git pull --ff-only origin main
```

`npm run check` must finish with a successful TypeScript/Vite build and all unit/integration tests passing.

Docker Desktop is optional. Local development runs directly on Node, and Fly uses a remote image builder for hosted deployments.

## 4. Run it locally

Start both the API and website:

```bash
npm run dev
```

Open `http://localhost:5173`. The local-only development passphrase is:

```text
gardenbuddy
```

That is not the hosted passphrase. Local data stays in `data/gardenbuddy.db`, which Git ignores.

No `.env` file is required for ordinary local development; the server supplies development-only fallbacks. `.env.example` documents the available server variables for advanced local overrides. Never reuse those fallback values on Fly.

Useful commands:

```bash
npm run check
npm run test:e2e
npm run brand:icons
```

- `npm run check` builds and runs unit/integration tests.
- `npm run test:e2e` checks desktop Chrome, iPhone/WebKit, and Android/Chromium layouts.
- `npm run brand:icons` regenerates PNG and Apple icons from the production SVG.

Read [the friendly code tour](code-tour.md) before making a first change.

Do not ask formatters or Claude to “clean up everything” inside `original-planner/`. Its checksum test intentionally fails if one of Amanda's three original files changes.

## 5. Start Claude Code correctly

Always start Claude from the repository root so it sees `CLAUDE.md`, the release scripts, and the entire application:

```bash
cd /path/to/Garden-Planner
claude
```

Good first message for a new Claude session:

```text
Read CLAUDE.md, README.md, docs/code-tour.md, and docs/amanda-onboarding.md.
Before editing, show me the current branch and git status. Work on a new feature
branch from current main. Keep explanatory “why” comments around non-obvious
security, data, timing, and deployment behavior. Run the proportional tests.
Never deploy production until I approve the exact staging SHA after phone testing.
```

Claude may use Amanda’s already-authenticated `gh` and `fly` commands. Never paste credentials into its prompt.

Safe commands to approve routinely include:

```text
git status
git diff
npm run check
npm run test:e2e
fly status
fly logs
fly releases
fly secrets list
fly volumes list
fly storage status
```

Do not create a blanket approval for destructive commands such as:

```text
fly apps destroy
fly machine destroy
fly volumes destroy
fly storage destroy
fly secrets unset
git reset --hard
git clean
git push --force
```

## 6. The everyday change workflow

Begin with current, clean `main`:

```bash
git switch main
git pull --ff-only origin main
git status
git switch -c codex/short-description
```

Then:

1. Ask Claude to implement one focused change.
2. Review the local change in the browser.
3. Run `npm run check` and, for interface changes, `npm run test:e2e`.
4. Review `git diff` and confirm it contains only GardenBuddy work.
5. Commit and push the feature branch.
6. Deploy the exact clean commit to staging.

Never develop directly on `main`, merge `origin/dev`, or mix an unrelated change into the same branch.

## 7. Fly.io orientation

GardenBuddy always names the target explicitly. This avoids deploying to the wrong app.

### Read-only checks

```bash
fly status --app gardenbuddy-jm-staging
fly logs --app gardenbuddy-jm-staging
fly releases --app gardenbuddy-jm-staging
fly machines list --app gardenbuddy-jm-staging
fly volumes list --app gardenbuddy-jm-staging
fly secrets list --app gardenbuddy-jm-staging
```

Repeat with `gardenbuddy-jm` only when inspecting production.

`fly secrets list` shows names, digests, and deployment status—not secret values. Never try to print secrets from the Machine environment. Fly notes that anyone with deployment access can deploy code that reads runtime secrets, which is why repository review matters. See [Fly secrets](https://fly.io/docs/apps/secrets/).

### Configuration ownership

- `fly.staging.toml` names the staging app and staging volume.
- `fly.production.toml` names the production app and production volume.
- `Dockerfile` creates the deployable image.
- `scripts/start-container.sh` starts the API and enables Litestream when production Tigris secrets exist.
- `litestream.yml` points the production SQLite database at the private Tigris replica.

Do not run `fly launch`. Both apps, volumes, addresses, and the production Tigris bucket already exist.

## 8. Deploy staging

Staging deployment is the normal end of a change. It is authorized only from a clean, committed tree:

```bash
git status
npm run deploy:staging
```

The script:

1. Refuses uncommitted changes.
2. Runs the build and tests.
3. Deploys with `fly.staging.toml`.
4. Embeds the exact Git SHA in the image.
5. Reads the live `/api/meta` endpoint and refuses a mismatched SHA.

Record the complete SHA printed by the script. Amanda then opens the permanent staging URL on her phone and signs in with the hosted passphrase from the password manager.

### Phone acceptance checklist

- Confirm Settings says `staging` and displays the candidate SHA.
- Add a plant and change its variety, quantity, status, and bed.
- Reorder plants and horizontally scroll the year.
- Reload and confirm the changes remain.
- Open the same garden on a second device and confirm synchronized data.
- Open Plant Library, one plant detail, citations, and Sources.
- Check import preview without completing an unwanted import.
- Sign out and sign back in.

Approval means: “I approve staging SHA `<full SHA>` for production.” A URL or “looks good” without the SHA is not sufficient.

### Reset staging sample data

This intentionally deletes all current staging changes and staging history, then restores the sample garden:

```bash
fly ssh console \
  --app gardenbuddy-jm-staging \
  --command "npm run seed:staging"
```

Check the app name before pressing Enter. Never run a reset command against `gardenbuddy-jm`.

## 9. Promote the approved SHA to production

Pushing a branch or `main` does not deploy production. Production uses the guarded promotion script only.

From clean `main` or the exact clean approved candidate branch:

```bash
APPROVED_STAGING_SHA=<full-approved-sha> npm run promote:production
```

Do not type angle brackets. Example shape only:

```bash
APPROVED_STAGING_SHA=0123456789abcdef0123456789abcdef01234567 npm run promote:production
```

The script refuses to proceed unless:

- the tree is clean;
- staging currently reports that exact SHA;
- the approved commit is a fast-forward from `origin/main`;
- local `main` matches `origin/main` before promotion;
- validation succeeds.

For the first release, the script may begin on the approved foundation branch because the old `main` does not contain the script yet. It safely switches to `main`, fast-forwards it, pushes it, and deploys the same SHA.

After deployment, check:

```bash
curl --fail --silent https://gardenbuddy-jm.fly.dev/api/meta
fly status --app gardenbuddy-jm
fly logs --app gardenbuddy-jm
```

The production revision must equal the approved staging SHA.

## 10. First production garden import

Before importing:

1. Export the original local planner JSON from the old planner.
2. Keep a second untouched copy somewhere safe.
3. Open production—not staging—and confirm Settings says `production` with the approved SHA.
4. Open Settings → Import or export and choose the v1 JSON.
5. Review the preview counts and custom plant list.
6. Enter/confirm ZIP, hardiness zone, last spring frost, and first fall frost.
7. Complete the atomic import.
8. Reload and verify beds, plants, varieties, quantities, statuses, custom plants, and DTM overrides.

Computed old month arrays are intentionally ignored. GardenBuddy derives new timing from reviewed rules and explicit frost dates. Import starts a fresh server-side history.

## 11. Passphrase and session rotation

The hosted passphrase itself is never stored. Fly stores only an Argon2id hash. Each app has its own salted hash and its own session secret.

To rotate a passphrase without placing it in shell history:

```bash
read -s "GB_NEW_PASSPHRASE?New GardenBuddy passphrase: "
echo
GB_STAGING_HASH="$(npm run --silent auth:hash -- "$GB_NEW_PASSPHRASE")"
fly secrets set \
  --app gardenbuddy-jm-staging \
  APP_PASSPHRASE_HASH="$GB_STAGING_HASH" \
  SESSION_SECRET="$(openssl rand -hex 32)"
unset GB_STAGING_HASH

GB_PRODUCTION_HASH="$(npm run --silent auth:hash -- "$GB_NEW_PASSPHRASE")"
fly secrets set \
  --app gardenbuddy-jm \
  APP_PASSPHRASE_HASH="$GB_PRODUCTION_HASH" \
  SESSION_SECRET="$(openssl rand -hex 32)"
unset GB_PRODUCTION_HASH GB_NEW_PASSPHRASE
```

Rotating `SESSION_SECRET` logs out every existing device. `fly secrets set` restarts the affected deployed Machine, so perform this deliberately and verify both sites afterward.

## 12. Production backups and restore drill

Production uses SQLite on one encrypted Fly Volume. Litestream continuously replicates it to the private Tigris bucket. This follows Fly’s [SQLite/Litestream backup pattern](https://fly.io/docs/js/prisma/sqlite/).

Check the infrastructure:

```bash
fly volumes list --app gardenbuddy-jm
fly storage status --app gardenbuddy-jm
fly secrets list --app gardenbuddy-jm
fly logs --app gardenbuddy-jm | rg -i "litestream|replica|error"
```

The secret-name list should include `AWS_ACCESS_KEY_ID`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_SECRET_ACCESS_KEY`, and `BUCKET_NAME`.

### Safe restore verification

This drill restores into `/tmp`; it must never overwrite `/data/gardenbuddy.db`.

```bash
fly ssh console --app gardenbuddy-jm
```

Inside the production Machine:

```bash
./node_modules/.bin/litestream restore \
  -config ./litestream.yml \
  -o /tmp/gardenbuddy-restore-check.db \
  /data/gardenbuddy.db

node --input-type=module -e '
  import Database from "better-sqlite3";
  const db = new Database("/tmp/gardenbuddy-restore-check.db", { readonly: true });
  console.log("integrity:", db.prepare("PRAGMA integrity_check").pluck().get());
  console.log("garden:", db.prepare("SELECT revision, updated_at FROM gardens WHERE id = 1").get());
  db.close();
'

rm /tmp/gardenbuddy-restore-check.db
exit
```

Success means `integrity: ok` and a garden revision/date are printed. The `/tmp` copy is disposable; the live volume and database are untouched.

Run this drill before the first real import, after meaningful backup configuration changes, and periodically thereafter.

## 13. If something looks wrong

Start read-only:

```bash
git status
fly status --app <exact-app-name>
fly releases --app <exact-app-name>
fly logs --app <exact-app-name>
fly volumes list --app <exact-app-name>
```

Common cases:

- **Staging takes a few seconds to open:** its Machine auto-stops while idle and wakes on demand.
- **“Not authorized”:** Amanda is missing Fly organization membership or is logged into the wrong Fly account. Run `fly auth whoami`.
- **Deploy script refuses a dirty tree:** review, test, and commit the intended changes. Do not bypass the guard.
- **Production promotion says staging SHA differs:** staging has changed since approval. Test and approve the newly reported SHA.
- **`main` differs from `origin/main`:** stop and inspect `git log --oneline --decorate --graph --all`. Do not reset or force-push.
- **`pdx` region not found:** Portland is no longer offered; GardenBuddy intentionally uses `sjc`.
- **Database or volume concern:** do not create another production Machine, delete a volume, or redeploy blindly. Capture status and logs first.
- **A native package will not load after `npm install`:** run `npm approve-scripts`, approve only the expected locked packages (`argon2`, `better-sqlite3`, `esbuild`, `sharp`, and macOS-only `fsevents`), then run `npm rebuild` and `npm run check`.

If production data may be at risk, stop mutating it. Preserve the Machine and volume, collect the read-only evidence above, and ask Jesse/Claude to diagnose before any restore or deletion.

## Final onboarding checklist

- [ ] Amanda has her own GitHub access.
- [ ] Amanda is a Fly organization Member.
- [ ] `gh auth status` shows the correct GitHub account.
- [ ] `fly auth whoami` shows Amanda’s Fly account.
- [ ] Amanda can see both GardenBuddy Fly apps.
- [ ] `npm install` and `npm run check` pass locally.
- [ ] Local login and local save/reload work.
- [ ] Claude Code starts in the repository root and reads `CLAUDE.md`.
- [ ] Amanda can read staging status, logs, volume, and secret names.
- [ ] Amanda can deploy a clean candidate to staging.
- [ ] Amanda can approve an exact SHA from her phone.
- [ ] Amanda understands that production promotion is manual and guarded.
- [ ] Amanda knows where the original v1 export and production backup procedure live.
