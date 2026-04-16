-- Garden Planner Database Schema
-- months array: 24 half-month slots, index 0 = Jan-Early ... 23 = Dec-Late

-- ── PLANTS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plants (
  id              TEXT PRIMARY KEY,       -- slug: 'tomato', 'basil'
  name            TEXT NOT NULL UNIQUE,   -- 'Tomato'
  scientific_name TEXT,
  category        TEXT,                   -- 'vegetable' | 'herb' | 'flower' | 'fruit'
  description     TEXT,
  spacing_in      TEXT,                   -- '18–24 inches'
  water_needs     TEXT,
  sun_needs       TEXT,
  soil_pref       TEXT,
  pest_notes      TEXT,
  care_notes      TEXT,
  tips            TEXT,                   -- JSON array of growing tip strings
  safe            TEXT,                   -- ASPCA pet safety note
  zone_min        INTEGER,
  zone_max        INTEGER,
  seeded_at       TEXT DEFAULT (datetime('now'))
);

-- ── VARIETIES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS varieties (
  id          TEXT PRIMARY KEY,           -- slug: 'tomato-roma'
  plant_id    TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,              -- 'Roma'
  dtm         TEXT,                       -- '75–80 days'
  UNIQUE(plant_id, name)
);

-- ── TIMING ───────────────────────────────────────────────────────────────────
-- variety_id IS NULL  → default timing for the plant
-- variety_id NOT NULL → timing specific to that variety
CREATE TABLE IF NOT EXISTS timing (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id    TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  variety_id  TEXT REFERENCES varieties(id) ON DELETE CASCADE,
  month_index INTEGER NOT NULL CHECK(month_index BETWEEN 0 AND 23),
  phase       TEXT NOT NULL CHECK(phase IN ('indoor','transplant','harvest','marigold')),
  UNIQUE(plant_id, variety_id, month_index)
);

-- ── COMPANIONS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companions (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  plant_id            TEXT NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
  companion_plant_id  TEXT NOT NULL,      -- slug; may not exist in our DB
  companion_name      TEXT NOT NULL,      -- display name
  relationship        TEXT NOT NULL CHECK(relationship IN ('good','bad')),
  tip                 TEXT,
  UNIQUE(plant_id, companion_plant_id, relationship)
);

-- ── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_varieties_plant_id   ON varieties(plant_id);
CREATE INDEX IF NOT EXISTS idx_timing_plant_id      ON timing(plant_id);
CREATE INDEX IF NOT EXISTS idx_timing_variety_id    ON timing(variety_id);
CREATE INDEX IF NOT EXISTS idx_companions_plant_id  ON companions(plant_id);
