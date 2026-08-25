# A friendly tour of the GardenBuddy code

You do not need to understand every file at once. Follow one feature from what the gardener sees, through the API, into the database.

## 1. Where the screen comes from

`src/main.tsx` is the tiny front door. It places `<App />` into the empty `root` element in `index.html`.

`src/App.tsx` contains the visible pages and small page-specific components:

- `Login` asks for the private passphrase.
- `Shell` owns the navigation shared by every signed-in page.
- `Planner` turns plants and timing rules into the 24 half-month calendar.
- `PlantLibrary` and `PlantDetail` present reviewed plant knowledge.
- `Settings` edits frost dates, imports/exports data, restores history, and shows the deployed Git revision.
- `Sources` explains where facts came from and what they can support.

`src/App.module.css` is the visual system. CSS Modules make class names local to this application, so a name such as `panel` cannot accidentally style unrelated HTML elsewhere.

## 2. How a page talks to the server

`src/api.ts` is the only fetch wrapper. It translates an HTTP failure into one consistent `ApiError`.

`src/GardenContext.tsx` loads the garden once and gives pages three main operations: `save`, `replace`, and `reload`. Before a save, it sends the revision that was originally loaded. If another phone saved first, the server returns `409`; the context loads that newer version and explains that nothing was overwritten.

## 3. What the data means

`src/shared/model.ts` is the application's vocabulary. Zod schemas both describe TypeScript types and validate untrusted JSON at runtime. The main `GardenState` includes settings, beds, entries, custom varieties, and a revision.

`src/shared/timing.ts` converts rules like “start 56 days before last frost” into the 24 visible half-month cells. Hardiness is deliberately absent from this calculation: it describes perennial winter survival, not spring sowing dates.

`src/shared/catalog.ts` is the reviewed plant catalog. A fact records its source, geographic scope, evidence level, and review date. Species, cultivars, timing, and companion relationships remain separate so the app does not turn an approximate claim into a universal one.

## 4. What protects and stores the garden

`server/app.ts` defines the HTTP API. The important security layers are:

1. Argon2id verifies the passphrase without storing the passphrase itself.
2. A successful login creates a cryptographically random token.
3. Only an HMAC of that token is stored in SQLite.
4. The raw token stays in a Secure, HttpOnly, SameSite cookie, unavailable to page JavaScript.
5. Origin checks protect every write, and rate limits slow repeated login guesses.

`server/schema.ts` declares three tables: the current garden, sessions, and the five newest snapshots.

`server/db.ts` opens SQLite in WAL mode, runs Drizzle migrations, and owns transactions. A garden update and its history snapshot happen together: either both succeed or neither does. Its compare-and-swap revision check is what stops stale devices from winning.

`server/state.ts` creates realistic staging data and translates the old v1 export. It preserves personal plants, varieties, quantities, bed choices, and DTM overrides while ignoring old computed calendar cells.

`drizzle/` contains ordered SQL migrations. These files are committed so a fresh database and an existing production database reach the same schema predictably.

## 5. How hosting and releases work

`Dockerfile` builds the React site and packages the API. `scripts/start-container.sh` restores a missing production database from Tigris and then starts continuous Litestream replication.

`fly.staging.toml` and `fly.production.toml` deliberately name different apps and volumes. Production stays on one San Jose Machine—the nearest currently available Fly region to Portland—because SQLite has one writer.

`scripts/deploy-staging.sh` refuses uncommitted code, validates it, deploys it, and checks the SHA reported by the live URL. `scripts/promote-production.sh` verifies that exact phone-approved SHA, clean `main`, and `origin/main` before it can deploy production.

## A good first experiment

Change the sentence under `Plant Library` in `src/App.tsx`, run `npm run dev`, and reload the browser. Then change the `.plantCard` border radius in `src/App.module.css`. Those edits are safe, visible, and introduce the separation between content and styling without touching garden data.
