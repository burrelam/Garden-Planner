import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Drizzle turns these TypeScript table declarations into reviewable SQL files under drizzle/.

export const gardens = sqliteTable("gardens", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull(),
  state: text("state").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

export const snapshots = sqliteTable("snapshots", {
  id: text("id").primaryKey(),
  revision: integer("revision").notNull(),
  state: text("state").notNull(),
  reason: text("reason").notNull(),
  createdAt: text("created_at").notNull(),
});
