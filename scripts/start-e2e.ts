import { buildApp } from "../server/app";
import { importGardenFresh, openDatabase, sessions } from "../server/db";
import { createAmandaGarden } from "../server/state";

if (process.env.APP_ENV !== "development")
  throw new Error("The Playwright server may only run in development");

// Every browser run starts from Amanda's real committed garden. Resetting here
// prevents one viewport's add/edit test from becoming another viewport's fixture.
const database = openDatabase();
importGardenFresh(database, createAmandaGarden());
database.db.delete(sessions).run();
const app = await buildApp({ database, environment: "development" });
await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? 3000) });
