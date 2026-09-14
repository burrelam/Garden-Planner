import { eq } from "drizzle-orm";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "./app";
import type { FrostNormals } from "./frost";
import { openDatabase, sessions } from "./db";

const cleanups: Array<() => Promise<void> | void> = [];
afterEach(async () => {
  while (cleanups.length) await cleanups.pop()!();
});

// A two-station stand-in for the 2 MB snapshot, so the suite stays fast and the
// expected dates are visible in the test rather than buried in committed data.
const testNormals = {
  _source: { dataset: "test" },
  stations: {
    USC00356749: {
      name: "PORTLAND KGW-TV, OR US",
      years: 24,
      spring: "02-25",
      fall: "12-01",
      springCautious: "03-21",
      fallCautious: "11-10",
      spring36: "03-29",
      fall36: "11-12",
    },
  },
  zips: { "97201": ["USC00356749", 0.7] },
} satisfies FrostNormals;

async function testApp(
  options: {
    hardinessZoneLookup?: (zip: string) => Promise<string | null>;
  } = {},
) {
  const directory = mkdtempSync(join(tmpdir(), "gardenbuddy-test-"));
  const database = openDatabase(join(directory, "garden.db"));
  const app = await buildApp({
    database,
    environment: "development",
    revision: "test-sha",
    hardinessZoneLookup: options.hardinessZoneLookup,
    frostNormals: testNormals,
  });
  cleanups.push(async () => {
    await app.close();
    rmSync(directory, { recursive: true });
  });
  return { app, database };
}

async function login(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await app.inject({
    method: "POST",
    url: "/api/session",
    payload: { passphrase: "gardenbuddy" },
  });
  expect(response.statusCode).toBe(200);
  return response.cookies.find(
    (cookie) => cookie.name === "gardenbuddy_session",
  )!.value;
}

describe("authenticated garden API", () => {
  it("requires sign-in and supports logout", async () => {
    const { app } = await testApp();
    expect((await app.inject("/api/garden")).statusCode).toBe(401);
    const token = await login(app);
    expect(
      (
        await app.inject({
          url: "/api/garden",
          cookies: { gardenbuddy_session: token },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "DELETE",
          url: "/api/session",
          cookies: { gardenbuddy_session: token },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          url: "/api/garden",
          cookies: { gardenbuddy_session: token },
        })
      ).statusCode,
    ).toBe(401);
  });

  it("allows same-origin writes and rejects cross-origin writes", async () => {
    const { app } = await testApp();
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/session",
          headers: { host: "garden.test", origin: "http://garden.test" },
          payload: { passphrase: "gardenbuddy" },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/session",
          headers: { host: "garden.test", origin: "http://attacker.test" },
          payload: { passphrase: "gardenbuddy" },
        })
      ).statusCode,
    ).toBe(403);
  });

  it("expires server-side sessions", async () => {
    const { app, database } = await testApp();
    const token = await login(app);
    const row = database.db.select().from(sessions).get()!;
    database.db
      .update(sessions)
      .set({ expiresAt: "2000-01-01T00:00:00.000Z" })
      .where(eq(sessions.id, row.id))
      .run();
    expect(
      (
        await app.inject({
          url: "/api/garden",
          cookies: { gardenbuddy_session: token },
        })
      ).statusCode,
    ).toBe(401);
  });

  it("never overwrites a newer revision", async () => {
    const { app } = await testApp();
    const token = await login(app);
    const first = (
      await app.inject({
        url: "/api/garden",
        cookies: { gardenbuddy_session: token },
      })
    ).json();
    const save = await app.inject({
      method: "PUT",
      url: "/api/garden",
      cookies: { gardenbuddy_session: token },
      headers: { "if-match": "0" },
      payload: { ...first, garden: { ...first.garden, name: "Phone edit" } },
    });
    expect(save.statusCode).toBe(200);
    expect(save.json().revision).toBe(1);
    const stale = await app.inject({
      method: "PUT",
      url: "/api/garden",
      cookies: { gardenbuddy_session: token },
      headers: { "if-match": "0" },
      payload: {
        ...first,
        garden: { ...first.garden, name: "Old tablet edit" },
      },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().current.garden.name).toBe("Phone edit");
  });

  it("imports v1 data atomically and begins a fresh history", async () => {
    const { app } = await testApp();
    const token = await login(app);
    const original = (
      await app.inject({
        url: "/api/garden",
        cookies: { gardenbuddy_session: token },
      })
    ).json();
    await app.inject({
      method: "PUT",
      url: "/api/garden",
      cookies: { gardenbuddy_session: token },
      headers: { "if-match": "0" },
      payload: { ...original, garden: { ...original.garden, name: "Changed" } },
    });
    expect(
      (
        await app.inject({
          url: "/api/history",
          cookies: { gardenbuddy_session: token },
        })
      ).json(),
    ).toHaveLength(1);

    const imported = await app.inject({
      method: "POST",
      url: "/api/import",
      cookies: { gardenbuddy_session: token },
      payload: {
        data: {
          version: 1,
          plants: [{ name: "Tomato", qty: 7, months: ["stale"] }],
          beds: [],
        },
        settings: {
          zip: "97330",
          hardinessZone: "8b",
          lastFrost: "2026-04-15",
          firstFrost: "2026-10-25",
        },
      },
    });
    expect(imported.statusCode).toBe(200);
    expect(imported.json().entries[0]).toMatchObject({
      plantId: "tomato",
      qty: 7,
    });
    expect(
      (
        await app.inject({
          url: "/api/history",
          cookies: { gardenbuddy_session: token },
        })
      ).json(),
    ).toEqual([]);
  });

  it("gives a ZIP its zone and its frost dates", async () => {
    const { app } = await testApp({
      hardinessZoneLookup: async (zip) => (zip === "97201" ? "8b" : null),
    });
    const token = await login(app);
    const response = await app.inject({
      url: "/api/location/97201",
      cookies: { gardenbuddy_session: token },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      zone: "8b",
      frost: {
        station: "USC00356749",
        stationName: "PORTLAND KGW-TV, OR US",
        miles: 0.7,
        years: 24,
        // The cautious pair, not the median — a median last frost is beaten
        // by a later one in half of all years.
        lastFrost: "03-21",
        firstFrost: "11-10",
        lastFrostAverage: "02-25",
        firstFrostAverage: "12-01",
      },
    });
  });

  it("still gives the frost dates when the zone lookup is down", async () => {
    const { app } = await testApp({
      hardinessZoneLookup: async () => {
        throw new Error("phzmapi is unreachable");
      },
    });
    const token = await login(app);
    const response = await app.inject({
      url: "/api/location/97201",
      cookies: { gardenbuddy_session: token },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json().zone).toBeNull();
    expect(response.json().frost.lastFrost).toBe("03-21");
  });

  it("still gives the zone when the ZIP has no nearby station", async () => {
    const { app } = await testApp({ hardinessZoneLookup: async () => "9a" });
    const token = await login(app);
    const response = await app.inject({
      url: "/api/location/99999",
      cookies: { gardenbuddy_session: token },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ zone: "9a", frost: null });
  });

  it("rejects a malformed ZIP", async () => {
    const { app } = await testApp();
    const token = await login(app);
    const response = await app.inject({
      url: "/api/location/abc",
      cookies: { gardenbuddy_session: token },
    });
    expect(response.statusCode).toBe(400);
  });

  it("404s when a ZIP has neither a zone nor a station", async () => {
    const { app } = await testApp({ hardinessZoneLookup: async () => null });
    const token = await login(app);
    const response = await app.inject({
      url: "/api/location/00000",
      cookies: { gardenbuddy_session: token },
    });
    expect(response.statusCode).toBe(404);
  });

  it("requires sign-in for the location lookup", async () => {
    const { app } = await testApp();
    const response = await app.inject({ url: "/api/location/97201" });
    expect(response.statusCode).toBe(401);
  });
});
