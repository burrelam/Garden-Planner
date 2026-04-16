/**
 * Garden Planner seed script
 *
 * Reads all plant data from plants-care.json and seeds the SQLite database.
 * Safe to re-run — uses INSERT OR REPLACE throughout.
 *
 * Usage:
 *   node seed/seed.js
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import db from '../db/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLANTS_JSON = JSON.parse(
  readFileSync(path.join(__dirname, 'plants-care.json'), 'utf8')
);

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Build a 24-element months array from segment tuples [[start, end, phase], ...] */
function makeMonths(segments) {
  const arr = Array(24).fill(null);
  segments.forEach(([s, e, p]) => {
    for (let i = s; i <= e; i++) arr[i] = p;
  });
  return arr;
}

function insertPlant(plant) {
  db.prepare(`
    INSERT OR REPLACE INTO plants
      (id, name, scientific_name, category,
       spacing_in, water_needs, sun_needs, soil_pref,
       pest_notes, care_notes, tips, safe, zone_min, zone_max)
    VALUES
      (@id, @name, @scientific_name, @category,
       @spacing_in, @water_needs, @sun_needs, @soil_pref,
       @pest_notes, @care_notes, @tips, @safe, @zone_min, @zone_max)
  `).run(plant);
}

function insertVariety(v) {
  db.prepare(`
    INSERT OR REPLACE INTO varieties (id, plant_id, name, dtm)
    VALUES (@id, @plant_id, @name, @dtm)
  `).run(v);
}

function insertTimingRows(plantId, varietyId, months) {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO timing (plant_id, variety_id, month_index, phase)
    VALUES (?, ?, ?, ?)
  `);
  months.forEach((phase, i) => {
    if (phase) stmt.run(plantId, varietyId, i, phase);
  });
}

function insertCompanion(c) {
  db.prepare(`
    INSERT OR REPLACE INTO companions
      (plant_id, companion_plant_id, companion_name, relationship, tip)
    VALUES (@plant_id, @companion_plant_id, @companion_name, @relationship, @tip)
  `).run(c);
}

// ── Hand-curated companion relationships ──────────────────────────────────────

const COMPANION_DATA = [
  // Tomato good neighbors
  { plant: 'tomato',     companion: 'basil',         name: 'Basil',          rel: 'good', tip: 'Plant within 18" — repels aphids and whiteflies.' },
  { plant: 'tomato',     companion: 'marigolds',      name: 'Marigolds',      rel: 'good', tip: 'Border planting deters nematodes and whiteflies.' },
  { plant: 'tomato',     companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Carrots loosen soil around tomato roots.' },
  { plant: 'tomato',     companion: 'parsley',        name: 'Parsley',        rel: 'good', tip: 'Attracts beneficial insects.' },
  // Tomato bad neighbors
  { plant: 'tomato',     companion: 'fennel',         name: 'Fennel',         rel: 'bad',  tip: 'Stunts tomato growth — keep at least 3ft apart.' },
  { plant: 'tomato',     companion: 'cabbage',        name: 'Cabbage',        rel: 'bad',  tip: 'Both are heavy feeders and compete for nutrients.' },
  // Pepper
  { plant: 'pepper',     companion: 'basil',          name: 'Basil',          rel: 'good', tip: 'Repels aphids; may improve flavor.' },
  { plant: 'pepper',     companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Good space-sharing companions.' },
  { plant: 'pepper',     companion: 'fennel',         name: 'Fennel',         rel: 'bad',  tip: 'Allelopathic — keep away from peppers.' },
  // Peas
  { plant: 'peas',       companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Classic pairing — carrots loosen soil, peas fix nitrogen.' },
  { plant: 'peas',       companion: 'spinach',        name: 'Spinach',        rel: 'good', tip: 'Spinach benefits from the nitrogen peas fix.' },
  { plant: 'peas',       companion: 'onions',         name: 'Onions',         rel: 'bad',  tip: 'Onions inhibit pea growth — keep them in separate beds.' },
  { plant: 'peas',       companion: 'garlic',         name: 'Garlic',         rel: 'bad',  tip: 'Garlic stunts pea growth.' },
  // Beans
  { plant: 'beans',      companion: 'cucumbers',      name: 'Cucumbers',      rel: 'good', tip: 'Both like warmth; beans fix nitrogen cucumbers can use.' },
  { plant: 'beans',      companion: 'squash',         name: 'Squash',         rel: 'good', tip: 'The classic Three Sisters pairing with corn.' },
  { plant: 'beans',      companion: 'onions',         name: 'Onions',         rel: 'bad',  tip: 'Onions and garlic inhibit bean growth.' },
  // Lettuce
  { plant: 'lettuce',    companion: 'radishes',       name: 'Radishes',       rel: 'good', tip: 'Radishes repel leaf miners that attack lettuce.' },
  { plant: 'lettuce',    companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Good space-sharing; different root depths.' },
  { plant: 'lettuce',    companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Tomatoes provide light shade lettuce prefers in summer.' },
  // Carrots
  { plant: 'carrots',    companion: 'onions',         name: 'Onions',         rel: 'good', tip: 'Onions repel carrot fly; carrots repel onion fly.' },
  { plant: 'carrots',    companion: 'rosemary',       name: 'Rosemary',       rel: 'good', tip: 'Rosemary deters carrot fly.' },
  { plant: 'carrots',    companion: 'dill',           name: 'Dill',           rel: 'bad',  tip: 'Mature dill stunts carrot growth.' },
  // Cucumber
  { plant: 'cucumbers',  companion: 'dill',           name: 'Dill',           rel: 'good', tip: 'Dill attracts beneficial insects to cucumber flowers.' },
  { plant: 'cucumbers',  companion: 'marigolds',      name: 'Marigolds',      rel: 'good', tip: 'Deters cucumber beetles.' },
  { plant: 'cucumbers',  companion: 'sage',           name: 'Sage',           rel: 'bad',  tip: 'Sage inhibits cucumber growth.' },
  // Kale / Brassicas
  { plant: 'kale',       companion: 'marigolds',      name: 'Marigolds',      rel: 'good', tip: 'Deters cabbage worms and aphids.' },
  { plant: 'kale',       companion: 'dill',           name: 'Dill',           rel: 'good', tip: 'Attracts wasps that prey on cabbage worms.' },
  { plant: 'kale',       companion: 'tomato',         name: 'Tomato',         rel: 'bad',  tip: 'Both are heavy feeders competing for nutrients.' },
  // Broccoli
  { plant: 'broccoli',   companion: 'marigolds',      name: 'Marigolds',      rel: 'good', tip: 'Deters aphids and cabbage worms.' },
  { plant: 'broccoli',   companion: 'dill',           name: 'Dill',           rel: 'good', tip: 'Attracts beneficial wasps that control cabbageworm.' },
  { plant: 'broccoli',   companion: 'tomato',         name: 'Tomato',         rel: 'bad',  tip: 'Tomatoes inhibit broccoli growth.' },
  // Basil
  { plant: 'basil',      companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Plant within 18" — mutually beneficial.' },
  { plant: 'basil',      companion: 'pepper',         name: 'Pepper',         rel: 'good', tip: 'Repels aphids around peppers.' },
  // Marigolds (universal companion)
  { plant: 'marigolds',  companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Border planting — deters nematodes systemically.' },
  { plant: 'marigolds',  companion: 'beans',          name: 'Beans',          rel: 'good', tip: 'Deters Mexican bean beetle.' },
  // Spinach
  { plant: 'spinach',    companion: 'strawberries',   name: 'Strawberries',   rel: 'good', tip: 'Ground-cover pairing — strawberries shade spinach roots.' },
  { plant: 'spinach',    companion: 'peas',           name: 'Peas',           rel: 'good', tip: 'Peas fix nitrogen spinach uses heavily.' },
  // Garlic (great deterrent)
  { plant: 'garlic',     companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Deters spider mites and aphids from tomatoes.' },
  { plant: 'garlic',     companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Mutual pest deterrence — classic pairing.' },
  { plant: 'garlic',     companion: 'peas',           name: 'Peas',           rel: 'bad',  tip: 'Inhibits pea growth — keep separated.' },
  { plant: 'garlic',     companion: 'beans',          name: 'Beans',          rel: 'bad',  tip: 'Inhibits bean growth.' },
  // Dill
  { plant: 'dill',       companion: 'cucumbers',      name: 'Cucumbers',      rel: 'good', tip: 'Mature dill attracts beneficial insects to cucumber flowers.' },
  { plant: 'dill',       companion: 'lettuce',        name: 'Lettuce',        rel: 'good', tip: 'Improves lettuce growth and flavor.' },
  { plant: 'dill',       companion: 'carrots',        name: 'Carrots',        rel: 'bad',  tip: 'Mature dill stunts carrot development.' },
  { plant: 'dill',       companion: 'tomato',         name: 'Tomato',         rel: 'bad',  tip: 'Mature dill inhibits tomato growth.' },
  // Parsley
  { plant: 'parsley',    companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Attracts beneficial insects; deters asparagus beetles.' },
  { plant: 'parsley',    companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Both umbellifers — attract the same beneficial insects.' },
  // Rosemary
  { plant: 'rosemary',   companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Deters carrot fly with strong scent.' },
  { plant: 'rosemary',   companion: 'beans',          name: 'Beans',          rel: 'good', tip: 'Repels bean beetles.' },
  // Mint
  { plant: 'mint',       companion: 'cabbage',        name: 'Cabbage',        rel: 'good', tip: 'Repels cabbage moth and aphids.' },
  { plant: 'mint',       companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Deters aphids and spider mites.' },
  // Chives
  { plant: 'chives',     companion: 'carrots',        name: 'Carrots',        rel: 'good', tip: 'Improves carrot flavor and deters aphids.' },
  { plant: 'chives',     companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Deters aphids.' },
  // Lavender
  { plant: 'lavender',   companion: 'lettuce',        name: 'Lettuce',        rel: 'good', tip: 'Repels aphids and attracts pollinators.' },
  { plant: 'lavender',   companion: 'tomato',         name: 'Tomato',         rel: 'good', tip: 'Attracts pollinators; deters aphids and whiteflies.' },
  // Pumpkin
  { plant: 'pumpkin',    companion: 'beans',          name: 'Beans',          rel: 'good', tip: 'Three Sisters: bean nitrogen feeds pumpkin vines.' },
  { plant: 'pumpkin',    companion: 'marigolds',      name: 'Marigolds',      rel: 'good', tip: 'Deters cucumber beetles and squash bugs.' },
  // Swiss Chard
  { plant: 'swiss-chard',companion: 'onions',         name: 'Onions',         rel: 'good', tip: 'Good space-sharing; onions deter leafminers.' },
  { plant: 'swiss-chard',companion: 'beans',          name: 'Beans',          rel: 'good', tip: 'Beans fix nitrogen chard uses.' },
  // Fennel (mostly bad -- plant away from garden)
  { plant: 'fennel',     companion: 'dill',           name: 'Dill',           rel: 'bad',  tip: 'Will cross-pollinate with dill; keep separated.' },
  { plant: 'fennel',     companion: 'tomato',         name: 'Tomato',         rel: 'bad',  tip: 'Allelopathic — stunts most vegetables nearby.' },
  { plant: 'fennel',     companion: 'pepper',         name: 'Pepper',         rel: 'bad',  tip: 'Inhibits pepper growth.' },
];

// ── Seed all plants from JSON ─────────────────────────────────────────────────

function seedAllPlants() {
  console.log(`\n── Seeding ${PLANTS_JSON.length} plants from plants-care.json…`);
  db.exec('BEGIN');
  try {
    for (const entry of PLANTS_JSON) {
      insertPlant({
        id:              entry.id,
        name:            entry.name,
        scientific_name: entry.scientific_name ?? null,
        category:        entry.category,
        spacing_in:      entry.spacing_in ?? null,
        water_needs:     entry.water_needs ?? null,
        sun_needs:       entry.sun_needs ?? null,
        soil_pref:       entry.soil_pref ?? null,
        pest_notes:      entry.pest_notes ?? null,
        care_notes:      entry.care_notes ?? null,
        tips:            entry.tips ? JSON.stringify(entry.tips) : null,
        safe:            entry.safe ?? null,
        zone_min:        entry.zone_min ?? 8,
        zone_max:        entry.zone_max ?? 10,
      });

      // Default timing
      const defaultMonths = makeMonths(entry.default.timing);
      insertTimingRows(entry.id, null, defaultMonths);

      // Varieties (inherit default timing -- no per-variety timing in JSON)
      for (const v of (entry.varieties ?? [])) {
        const varId = `${entry.id}-${slugify(v.name)}`;
        insertVariety({ id: varId, plant_id: entry.id, name: v.name, dtm: v.dtm ?? null });
        // Only insert variety timing rows if the variety has its own timing segments
        if (v.timing) {
          insertTimingRows(entry.id, varId, makeMonths(v.timing));
        }
        // Otherwise the route falls back to the plant's default timing automatically
      }
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  console.log(`   ✓ ${PLANTS_JSON.length} plants seeded`);
}

function seedCompanions() {
  console.log('\n── Seeding companion relationships…');
  const existsStmt = db.prepare('SELECT 1 FROM plants WHERE id = ?');
  db.exec('BEGIN');
  try {
    let inserted = 0;
    for (const c of COMPANION_DATA) {
      if (!existsStmt.get(c.plant)) {
        console.log(`   (skipping companion for unknown plant: ${c.plant})`);
        continue;
      }
      insertCompanion({
        plant_id:           c.plant,
        companion_plant_id: c.companion,
        companion_name:     c.name,
        relationship:       c.rel,
        tip:                c.tip,
      });
      inserted++;
    }
    db.exec('COMMIT');
    console.log(`   ✓ ${inserted} companion relationships seeded`);
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  seedAllPlants();
  seedCompanions();

  const summary = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM plants)     as plants,
      (SELECT COUNT(*) FROM varieties)  as varieties,
      (SELECT COUNT(*) FROM timing)     as timing_rows,
      (SELECT COUNT(*) FROM companions) as companions
  `).get();

  console.log('\n── Database summary:');
  console.log(`   Plants:      ${summary.plants}`);
  console.log(`   Varieties:   ${summary.varieties}`);
  console.log(`   Timing rows: ${summary.timing_rows}`);
  console.log(`   Companions:  ${summary.companions}`);
  console.log('\n✓ Seed complete.\n');
}

main();
