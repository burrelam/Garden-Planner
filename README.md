# GardenBuddy

GardenBuddy is a private, phone-friendly garden planner for a shared Western Oregon garden. It turns the original single HTML file into a React application backed by a Fastify API and persistent SQLite database.

## Amanda's original planner is preserved

The exact pre-modernization `index.html`, `care-data.json`, and `README.md` live in [original-planner](original-planner/). They remain a standalone, runnable historical snapshot and are deliberately excluded from hosted builds and automatic formatting. See [the archive note](original-planner/ABOUT.md) for the boundary and integrity checks.

The hosted GardenBuddy application lives at the repository root. Its reviewed catalog does not import unsupported claims from the archived care data.

## Run it locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and use the development-only passphrase `gardenbuddy`. Vite forwards `/api` calls to the API on port 3000. Local data lives in `data/gardenbuddy.db` and is ignored by Git.

To test the production build:

```bash
npm run build
npm start
```

Then open `http://localhost:3000`.

## The useful map

Start with [docs/code-tour.md](docs/code-tour.md). It explains which files own the interface, data, security, migrations, plant facts, and deployments in plain language. Source comments explain the important boundaries and the reasons behind security or data choices.

For a new development machine, Claude Code, Fly access, staging releases, production promotion, and backup drills, follow [Amanda’s onboarding guide](docs/amanda-onboarding.md).

## Commands

| Command                         | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `npm run dev`                   | Run the API and website with live reload                       |
| `npm run check`                 | Type-check, build, and run the automated tests                 |
| `npm run test:e2e`              | Test desktop, iPhone/WebKit, and Android/Chromium layouts      |
| `npm run auth:hash -- "phrase"` | Create an Argon2id hash for a Fly secret                       |
| `npm run seed:staging`          | Reset staging to Amanda's committed original garden            |
| `npm run seed:amanda`           | Explicitly seed Amanda's garden; production needs confirmation |
| `npm run deploy:staging`        | Validate and deploy one clean committed SHA                    |
| `npm run promote:production`    | Guard and promote the phone-approved staging SHA               |

## Architecture

- React, TypeScript, React Router, and CSS Modules render Planner, Plant Library, plant detail, Settings, and Sources pages.
- Fastify owns authentication and the same-origin API.
- Zod rejects malformed input at the boundary.
- Drizzle migrations create SQLite tables. SQLite uses WAL mode and foreign keys.
- `If-Match` revision checks prevent one device from silently overwriting another.
- Server-side sessions use a random cookie token; only an HMAC of it is stored.
- Production Litestream replication writes continuously to a private Tigris bucket.
- The reviewed plant catalog is version-controlled. Upstream sources are citations, not runtime dependencies.

## Private hosted environments

Staging and production are separate Fly apps, secrets, Machines, volumes, and databases:

- `https://gardenbuddy-jm-staging.fly.dev` — resettable copy of Amanda's committed garden for phone approval
- `https://gardenbuddy-jm.fly.dev` — Amanda's production garden

Fly no longer lists its Portland region, so both configs use San Jose (`sjc`), the nearest currently available region.

See [CLAUDE.md](CLAUDE.md) for the guarded release flow. Pushing code never deploys production by itself.
