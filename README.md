# Garden Planner

A calendar-based garden planning tool for tracking what to plant, when to plant it, and when to harvest -- tuned for **Zone 8b (Willamette Valley / Portland area)**.

Built as a single-file web app with no backend required. All data lives in your browser's localStorage.

---

## What It Does

The core view is a 24-column calendar grid (two half-months per month, Jan through Dec) where each plant row shows three color-coded phases:

- **Green** -- Indoor seed start window
- **Yellow** -- Transplant / direct sow window
- **Red** -- Harvest window

Plants are organized into **beds** (A–D by default, plus a Companions group). Each plant can be assigned a status (Planted, Will Plant, Undecided), and the bars render differently based on status -- dashed for undecided, muted for will-plant.

---

## Features

- **Plant calendar** -- visualize seed start, transplant, and harvest windows across the full year
- **Bed management** -- assign plants to named beds, rename beds, add/remove beds with custom colors
- **Plant database** -- 20+ vegetables, herbs, and companion plants with variety-level timing data
- **Custom varieties** -- add your own varieties; saved to localStorage and persisted across sessions
- **Snapshot history** -- up to 5 labeled undo checkpoints (one per action: add plant, remove plant, change bed, etc.)
- **Export / Import** -- download your full garden as JSON; restore from a backup file
- **Detail panel** -- expand any plant row to change its bed, status, or remove it

---

## Getting Started

No build step, no server. Just open the file:

```
open index.html
```

Or serve it locally if you need to avoid CORS issues:

```bash
npx serve .
# then visit http://localhost:3000
```

---

## Tech Stack

| Layer | What's used |
|---|---|
| UI | Vanilla HTML + CSS + JavaScript (no frameworks) |
| Fonts | Google Fonts -- Playfair Display (headings), DM Sans (body) |
| Layout | CSS Grid + Flexbox + sticky table headers |
| Storage | `localStorage` (browser-native, no backend) |
| Build | None -- single `index.html` file |

---

## Plant Database

All timing data lives in `PLANT_DATABASE` inside `index.html`. It's structured as:

```js
PLANT_DATABASE = {
  'Tomato': {
    varieties: {
      'Roma':   { dtm: '75–80 days', months: [...] },
      'Cherry': { dtm: '60–70 days', months: [...] },
    },
    default: { dtm: '70–90 days', months: [...] }
  },
  ...
}
```

### The `months` Array

Each plant has a 24-element `months` array representing the two half-months of each calendar month:

| Index | Period |
|---|---|
| 0 | January (Early) |
| 1 | January (Late) |
| 2 | February (Early) |
| ... | ... |
| 22 | December (Early) |
| 23 | December (Late) |

Each entry is one of: `'indoor'`, `'transplant'`, `'harvest'`, or `null`.

The `makeMonths(segments)` helper builds these arrays from `[startIndex, endIndex, phase]` tuples:

```js
makeMonths([[0, 6, 'indoor'], [7, 9, 'transplant'], [14, 19, 'harvest']])
// --> Jan-E through Apr-E: indoor seed start
// --> Apr-L through May-E: transplant
// --> Aug-E through Oct-E: harvest
```

### Current Plant Coverage

Vegetables: Tomato, Pepper, Peas, Lettuce, Carrots, Beans, Cucumbers, Onions, Garlic, Shallots, Kale, Zucchini, Squash, Radishes, Beets, Green Onions, Spinach, Cabbage, Cauliflower, Strawberries

Herbs / Companions: Basil, Cilantro, Marigolds

> **Note:** Timing sourced from the Portland Nursery Veggie Calendar (Willamette Valley). Needs a verified Zone 8b data source before any commercial use.

---

## Data Model

### Plant object

```js
{
  id: 'tomato-roma',         // unique string ID
  name: 'Tomato',            // plant name (must match PLANT_DATABASE key)
  variety: 'Roma',           // variety name, or null for default
  dtm: '75–80 days',         // days-to-maturity label
  bed: 'b',                  // bed ID ('a' | 'b' | 'c' | 'd' | 'companion' | 'unassigned' | custom)
  status: 'willplant',       // 'planted' | 'willplant' | 'undecided'
  maybe: false,              // true renders bars as dashed
  months: [null, null, ...]  // 24-element array of phases
}
```

### Bed object

```js
{
  id: 'a',           // unique string ID
  label: 'Bed A',    // display name (user-editable)
  color: '#4a7a9b'   // hex color for the bed header + left border accent
}
```

---

## localStorage Keys

| Key | Contents |
|---|---|
| `garden_plants` | Array of plant objects (current state) |
| `garden_beds` | Array of bed objects |
| `garden_custom_varieties` | `{ "PlantName": ["Variety 1", "Variety 2"] }` |
| `garden_snapshots` | Array of up to 5 snapshot objects `{ label, timestamp, plants, beds }` |

---

## Roadmap

### Phase 1 -- Plant Notes & Detail Panel (in progress)
The detail panel currently shows a placeholder. Planned: per-plant notes field, spacing, watering needs, companion warnings.

### Phase 2 -- API + Plant Database Backend

The hardcoded `PLANT_DATABASE` in the HTML will be replaced with a real backend:

**Planned stack:**
- API: Node.js + Express (or FastAPI)
- Database: SQLite (local dev) --> PostgreSQL (production)
- Frontend: fetches plant data via `GET /api/plants` on load

**Planned schema (draft):**

```sql
plants          -- id, name, variety, dtm, spacing_in, water_needs, sun_needs, notes, zone
plant_timing    -- plant_id, month_index (0-23), phase ('indoor'|'transplant'|'harvest')
companions      -- plant_id, companion_plant_id, relationship ('good'|'bad'), notes
```

**Planned endpoints:**
```
GET  /api/plants                  -- list all plants (with default timing)
GET  /api/plants/:id              -- full plant detail + timing + companions
GET  /api/plants/search?q=        -- search by name or variety
GET  /api/plants/:id/companions   -- companion planting relationships
```

### Phase 3 -- Multi-garden / User Accounts
- Move localStorage state to a user-scoped database
- Allow multiple saved gardens per user
- Shareable garden links

---

## Project Structure

```
Garden-Planner/
  index.html    -- entire app (HTML + CSS + JS, single file)
  README.md     -- this file
```

As the API and database are built out, the structure will expand to something like:

```
Garden-Planner/
  index.html          -- frontend (will fetch from API)
  api/
    server.js         -- Express API
    db/
      schema.sql      -- database schema
      seed.js         -- seed script for plant data
    routes/
      plants.js
  README.md
```
