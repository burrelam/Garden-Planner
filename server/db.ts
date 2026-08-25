import Database from "better-sqlite3";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { GardenStateSchema, type GardenState } from "../src/shared/model";
import { createAmandaGarden } from "./state";
import { gardens, sessions, snapshots } from "./schema";

// Database behavior lives together here so transactions and SQLite safety settings are not
// scattered across HTTP routes.

export function openDatabase(
  path = process.env.DATABASE_PATH ?? "./data/gardenbuddy.db",
) {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  const db = drizzle(sqlite);
  migrate(db, { migrationsFolder: "./drizzle" });
  const existing = db.select().from(gardens).where(eq(gardens.id, 1)).get();
  if (!existing) {
    // Every fresh environment starts from Amanda's real committed garden. There
    // is no separate demo garden that can accidentally reach staging or production.
    const state = createAmandaGarden();
    db.insert(gardens)
      .values({
        id: 1,
        revision: 0,
        state: JSON.stringify(state),
        updatedAt: new Date().toISOString(),
      })
      .run();
  }
  return { sqlite, db };
}

export type GardenDb = ReturnType<typeof openDatabase>;

export function readGarden(database: GardenDb): GardenState {
  const row = database.db.select().from(gardens).where(eq(gardens.id, 1)).get();
  if (!row) throw new Error("Garden state is missing");
  return GardenStateSchema.parse({
    ...JSON.parse(row.state),
    revision: row.revision,
  });
}

export function writeGarden(
  database: GardenDb,
  expectedRevision: number,
  next: GardenState,
  reason: string,
) {
  // The prior snapshot and the next revision commit as one unit, or both roll back.
  return database.sqlite.transaction(() => {
    const current = readGarden(database);
    if (current.revision !== expectedRevision) return null;
    const now = new Date().toISOString();
    database.db
      .insert(snapshots)
      .values({
        id: crypto.randomUUID(),
        revision: current.revision,
        state: JSON.stringify(current),
        reason,
        createdAt: now,
      })
      .run();
    const nextRevision = current.revision + 1;
    const normalized = GardenStateSchema.parse({
      ...next,
      revision: nextRevision,
    });
    const changed = database.db
      .update(gardens)
      .set({
        revision: nextRevision,
        state: JSON.stringify(normalized),
        updatedAt: now,
      })
      .where(
        sql`${gardens.id} = 1 and ${gardens.revision} = ${expectedRevision}`,
      )
      .run();
    if (changed.changes !== 1) throw new Error("Concurrent garden update");
    const old = database.db
      .select({ id: snapshots.id })
      .from(snapshots)
      .orderBy(sql`${snapshots.createdAt} desc`)
      .all()
      .slice(5);
    for (const item of old)
      database.db.delete(snapshots).where(eq(snapshots.id, item.id)).run();
    return normalized;
  })();
}

export function replaceGarden(
  database: GardenDb,
  next: GardenState,
  reason: string,
) {
  const current = readGarden(database);
  return writeGarden(database, current.revision, next, reason);
}

/** Imports replace the entire garden atomically and intentionally begin a new history. */
export function importGardenFresh(database: GardenDb, next: GardenState) {
  return database.sqlite.transaction(() => {
    const revision = readGarden(database).revision + 1;
    const normalized = GardenStateSchema.parse({ ...next, revision });
    database.db.delete(snapshots).run();
    database.db
      .update(gardens)
      .set({
        revision,
        state: JSON.stringify(normalized),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(gardens.id, 1))
      .run();
    return normalized;
  })();
}

export { gardens, sessions, snapshots };
