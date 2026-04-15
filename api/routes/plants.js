import { Router } from 'express';
import db, { isSeeded } from '../db/database.js';

const router = Router();

// Guard: return 503 if the database hasn't been seeded yet
function seedGuard(req, res, next) {
  if (!isSeeded()) {
    return res.status(503).json({ error: 'Database not seeded. Run: npm run seed' });
  }
  next();
}

router.use(seedGuard);

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a 24-element months array from timing rows. */
function buildMonths(timingRows) {
  const arr = Array(24).fill(null);
  timingRows.forEach(r => { arr[r.month_index] = r.phase; });
  return arr;
}

/** Fetch timing rows for a plant's default (variety_id IS NULL). */
const stmtDefaultTiming = db.prepare(`
  SELECT month_index, phase FROM timing
  WHERE plant_id = ? AND variety_id IS NULL
  ORDER BY month_index
`);

/** Fetch timing rows for a specific variety. */
const stmtVarietyTiming = db.prepare(`
  SELECT month_index, phase FROM timing
  WHERE plant_id = ? AND variety_id = ?
  ORDER BY month_index
`);

/** Fetch all varieties for a plant. */
const stmtVarieties = db.prepare(`
  SELECT id, name, dtm FROM varieties WHERE plant_id = ? ORDER BY name
`);

/** Fetch companions for a plant. */
const stmtCompanions = db.prepare(`
  SELECT companion_plant_id, companion_name, relationship, tip
  FROM companions WHERE plant_id = ?
  ORDER BY relationship, companion_name
`);

// ── GET /api/plants ───────────────────────────────────────────────────────────
// Returns the full plant database in PLANT_DATABASE-compatible shape.
// The frontend uses this on load to replace the hardcoded PLANT_DATABASE.

router.get('/', (req, res) => {
  const plants = db.prepare('SELECT * FROM plants ORDER BY name').all();
  const result = {};

  for (const plant of plants) {
    const defaultTimingRows = stmtDefaultTiming.all(plant.id);
    const defaultMonths     = buildMonths(defaultTimingRows);

    const varRows  = stmtVarieties.all(plant.id);
    const varieties = {};

    for (const v of varRows) {
      const varTimingRows = stmtVarietyTiming.all(plant.id, v.id);
      // Fall back to plant default timing if variety has no distinct timing
      const varMonths = varTimingRows.length ? buildMonths(varTimingRows) : defaultMonths;
      varieties[v.name] = { dtm: v.dtm, months: varMonths };
    }

    // Determine default dtm: use first variety's dtm or a generic fallback
    const defaultDtm = varRows[0]?.dtm ?? plant.category === 'flower'
      ? '50–70 days to bloom' : '—';

    result[plant.name] = {
      id:          plant.id,
      name:        plant.name,
      category:    plant.category,
      spacing_in:  plant.spacing_in,
      water_needs: plant.water_needs,
      sun_needs:   plant.sun_needs,
      soil_pref:   plant.soil_pref,
      pest_notes:  plant.pest_notes,
      care_notes:  plant.care_notes,
      default:     { dtm: defaultDtm, months: defaultMonths },
      varieties,
    };
  }

  res.json(result);
});

// ── GET /api/plants/search ────────────────────────────────────────────────────
// Quick name search for the Add Plant modal.

router.get('/search', (req, res) => {
  const q = (req.query.q ?? '').trim();
  if (!q) return res.json([]);

  const rows = db.prepare(`
    SELECT id, name, category FROM plants
    WHERE name LIKE ? ORDER BY name LIMIT 20
  `).all(`%${q}%`);

  res.json(rows);
});

// ── GET /api/plants/companions/active ────────────────────────────────────────
// Returns companion tips relevant to the plants currently in the garden.
// Must be registered BEFORE /:id to avoid being swallowed by that route.
// Query param: ids=tomato,basil,garlic  (comma-separated slugs)

router.get('/companions/active', (req, res) => {
  const ids = (req.query.ids ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (!ids.length) return res.json([]);

  const placeholders = ids.map(() => '?').join(',');
  const rows = db.prepare(`
    SELECT c.plant_id, p.name as plant_name,
           c.companion_plant_id, c.companion_name,
           c.relationship, c.tip
    FROM companions c
    JOIN plants p ON p.id = c.plant_id
    WHERE c.plant_id           IN (${placeholders})
      AND c.companion_plant_id IN (${placeholders})
    ORDER BY c.relationship DESC, c.plant_id
  `).all(...ids, ...ids);

  const seen = new Set();
  const tips = [];
  for (const r of rows) {
    const key = [r.relationship, [r.plant_id, r.companion_plant_id].sort().join('-')].join(':');
    if (seen.has(key)) continue;
    seen.add(key);
    tips.push({
      type:   r.relationship === 'good' ? 'good' : 'warning',
      plants: [r.plant_name, r.companion_name],
      tip:    r.tip,
    });
  }

  res.json(tips);
});

// ── GET /api/plants/:id ───────────────────────────────────────────────────────
// Full plant detail including companions. Used by the detail panel.

router.get('/:id', (req, res) => {
  const plant = db.prepare('SELECT * FROM plants WHERE id = ?').get(req.params.id);
  if (!plant) return res.status(404).json({ error: 'Plant not found' });

  const defaultTimingRows = stmtDefaultTiming.all(plant.id);
  const defaultMonths     = buildMonths(defaultTimingRows);

  const varRows   = stmtVarieties.all(plant.id);
  const varieties = {};
  for (const v of varRows) {
    const varTimingRows = stmtVarietyTiming.all(plant.id, v.id);
    varieties[v.name] = {
      dtm:    v.dtm,
      months: varTimingRows.length ? buildMonths(varTimingRows) : defaultMonths,
    };
  }

  const companionRows = stmtCompanions.all(plant.id);
  const companions = {
    good: companionRows.filter(c => c.relationship === 'good').map(c => ({
      id:   c.companion_plant_id,
      name: c.companion_name,
      tip:  c.tip,
    })),
    bad: companionRows.filter(c => c.relationship === 'bad').map(c => ({
      id:   c.companion_plant_id,
      name: c.companion_name,
      tip:  c.tip,
    })),
  };

  res.json({
    id:             plant.id,
    name:           plant.name,
    scientific_name:plant.scientific_name,
    category:       plant.category,
    spacing_in:     plant.spacing_in,
    water_needs:    plant.water_needs,
    sun_needs:      plant.sun_needs,
    soil_pref:      plant.soil_pref,
    pest_notes:     plant.pest_notes,
    care_notes:     plant.care_notes,
    default:        { dtm: varRows[0]?.dtm ?? '—', months: defaultMonths },
    varieties,
    companions,
  });
});

export default router;
