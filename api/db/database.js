import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH   = path.join(__dirname, 'garden.db');

const db = new DatabaseSync(DB_PATH);

// WAL mode and foreign keys via exec (node:sqlite uses exec for pragmas)
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Run schema on every startup (CREATE TABLE IF NOT EXISTS is idempotent)
const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
db.exec(schema);

export default db;

/** Returns true if the plants table has at least one row. */
export function isSeeded() {
  const row = db.prepare('SELECT COUNT(*) as n FROM plants').get();
  return row.n > 0;
}
