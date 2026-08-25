import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import argon2 from "argon2";
import { and, desc, eq, gt } from "drizzle-orm";
import Fastify from "fastify";
import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import { catalog, sources } from "../src/shared/catalog";
import { GardenStateSchema } from "../src/shared/model";
import {
  importGardenFresh,
  openDatabase,
  readGarden,
  replaceGarden,
  sessions,
  snapshots,
  writeGarden,
  type GardenDb,
} from "./db";
import { mapLegacyExport, previewLegacyExport } from "./state";

// Fastify owns the trust boundary: authentication, origin checks, validation, and all mutations
// happen here before data reaches SQLite.

const LoginSchema = z.object({ passphrase: z.string().min(1).max(256) });
const ImportSchema = z.object({
  data: z.unknown(),
  settings: z.object({
    zip: z
      .string()
      .regex(/^\d{5}$/)
      .or(z.literal("")),
    hardinessZone: z.string().max(4),
    lastFrost: z.string().date(),
    firstFrost: z.string().date(),
  }),
});
const cookieName = "gardenbuddy_session";

export interface AppOptions {
  database?: GardenDb;
  environment?: string;
  revision?: string;
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: process.env.NODE_ENV !== "test",
    trustProxy: true,
  });
  const database = options.database ?? openDatabase();
  const environment =
    options.environment ?? process.env.APP_ENV ?? "development";
  const revision = options.revision ?? process.env.APP_REVISION ?? "local";
  const sessionSecret =
    process.env.SESSION_SECRET ??
    (environment === "development" || process.env.NODE_ENV === "test"
      ? "development-only-session-secret"
      : "");
  if (!sessionSecret) throw new Error("SESSION_SECRET must be configured");

  await app.register(cookie);
  await app.register(rateLimit, { global: false });

  // The browser holds the random token; SQLite keeps only a keyed digest of it.
  const hashToken = (token: string) =>
    createHmac("sha256", sessionSecret).update(token).digest("hex");
  const secure =
    environment !== "development" && process.env.NODE_ENV !== "test";
  const requireOrigin = async (
    request: Parameters<typeof app.addHook>[1] extends (
      request: infer R,
      ...args: never[]
    ) => unknown
      ? R
      : never,
    reply: any,
  ) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
    const origin = request.headers.origin;
    if (
      !origin &&
      (environment === "development" || process.env.NODE_ENV === "test")
    )
      return;
    // The Origin includes the port in local development, so compare it to the original Host header.
    const expected = `${request.protocol}://${request.headers.host}`;
    if (!origin || origin !== expected)
      return reply.code(403).send({ error: "Origin check failed" });
  };
  app.addHook("preHandler", requireOrigin as never);

  async function authenticated(request: any, reply: any) {
    const token = request.cookies[cookieName];
    if (!token) {
      reply.code(401).send({ error: "Sign in required" });
      return false;
    }
    const row = database.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date().toISOString()),
        ),
      )
      .get();
    if (!row) {
      reply.clearCookie(cookieName, { path: "/" });
      reply.code(401).send({ error: "Session expired" });
      return false;
    }
    return true;
  }

  app.get("/api/health", async () => ({ ok: true, environment, revision }));
  app.get("/api/meta", async () => ({ environment, revision }));
  app.get("/api/session", async (request, reply) => {
    if (!(await authenticated(request, reply))) return;
    return { authenticated: true };
  });
  app.post(
    "/api/session",
    {
      config: {
        // Browser tests exercise login repeatedly from one loopback address.
        // Hosted environments keep the strict default; only the explicit test
        // process raises it so the suite does not test its own traffic pattern.
        rateLimit: {
          max: Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 10),
          timeWindow: "15 minutes",
        },
      },
    },
    async (request, reply) => {
      const { passphrase } = LoginSchema.parse(request.body);
      const hash = process.env.APP_PASSPHRASE_HASH;
      const valid = hash
        ? await argon2.verify(hash, passphrase)
        : environment === "development" && passphrase === "gardenbuddy";
      if (!valid)
        return reply
          .code(401)
          .send({ error: "That passphrase did not match." });
      const token = randomBytes(32).toString("base64url");
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      database.db
        .insert(sessions)
        .values({
          id: randomUUID(),
          tokenHash: hashToken(token),
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
        })
        .run();
      reply.setCookie(cookieName, token, {
        path: "/",
        httpOnly: true,
        secure,
        sameSite: "strict",
        expires: expiresAt,
      });
      return { authenticated: true };
    },
  );
  app.delete("/api/session", async (request, reply) => {
    const token = request.cookies[cookieName];
    if (token)
      database.db
        .delete(sessions)
        .where(eq(sessions.tokenHash, hashToken(token)))
        .run();
    reply.clearCookie(cookieName, { path: "/" });
    return { authenticated: false };
  });

  const protectedRoutes = async (request: any, reply: any) => {
    if (!(await authenticated(request, reply))) return reply;
  };
  app.get("/api/garden", { preHandler: protectedRoutes }, async () =>
    readGarden(database),
  );
  // If-Match makes saving a compare-and-swap operation instead of "last request silently wins."
  app.put(
    "/api/garden",
    { preHandler: protectedRoutes },
    async (request, reply) => {
      const match = request.headers["if-match"];
      const expected =
        typeof match === "string"
          ? Number(match.replaceAll('"', ""))
          : Number.NaN;
      if (!Number.isInteger(expected))
        return reply.code(428).send({ error: "If-Match revision required" });
      const next = GardenStateSchema.parse(request.body);
      const saved = writeGarden(database, expected, next, "Garden updated");
      if (!saved)
        return reply.code(409).send({
          error: "Garden changed on another device",
          current: readGarden(database),
        });
      reply.header("ETag", `"${saved.revision}"`);
      return saved;
    },
  );
  app.get("/api/history", { preHandler: protectedRoutes }, async () =>
    database.db
      .select({
        id: snapshots.id,
        revision: snapshots.revision,
        reason: snapshots.reason,
        createdAt: snapshots.createdAt,
      })
      .from(snapshots)
      .orderBy(desc(snapshots.createdAt))
      .limit(5),
  );
  app.post(
    "/api/history/:id/restore",
    { preHandler: protectedRoutes },
    async (request: any, reply) => {
      const row = database.db
        .select()
        .from(snapshots)
        .where(eq(snapshots.id, request.params.id))
        .get();
      if (!row) return reply.code(404).send({ error: "Snapshot not found" });
      const restored = replaceGarden(
        database,
        GardenStateSchema.parse(JSON.parse(row.state)),
        `Restored revision ${row.revision}`,
      );
      return restored;
    },
  );
  app.post(
    "/api/import/preview",
    { preHandler: protectedRoutes },
    async (request) => previewLegacyExport(request.body),
  );
  app.post("/api/import", { preHandler: protectedRoutes }, async (request) => {
    const input = ImportSchema.parse(request.body);
    const imported = mapLegacyExport(input.data, input.settings);
    return importGardenFresh(database, imported);
  });
  app.get(
    "/api/export",
    { preHandler: protectedRoutes },
    async (_request, reply) => {
      reply.header(
        "Content-Disposition",
        `attachment; filename="gardenbuddy-${new Date().toISOString().slice(0, 10)}.json"`,
      );
      return readGarden(database);
    },
  );
  app.get("/api/catalog", { preHandler: protectedRoutes }, async () =>
    catalog.map(
      ({ growingTips: _tips, companions: _companions, ...plant }) => plant,
    ),
  );
  app.get(
    "/api/catalog/:id",
    { preHandler: protectedRoutes },
    async (request: any, reply) => {
      const plant = catalog.find(
        (candidate) => candidate.id === request.params.id,
      );
      return plant ?? reply.code(404).send({ error: "Plant not found" });
    },
  );
  app.get("/api/sources", { preHandler: protectedRoutes }, async () => sources);

  const webRoot = resolve("dist");
  if (existsSync(webRoot)) {
    await app.register(fastifyStatic, { root: webRoot, wildcard: false });
    app.get("/*", async (_request, reply) => reply.sendFile("index.html"));
  }
  app.addHook("onClose", async () => database.sqlite.close());
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ error: "Invalid request", details: error.issues });
    app.log.error(error);
    return reply
      .code((error as any).statusCode ?? 500)
      .send({ error: (error as Error).message });
  });
  return app;
}
