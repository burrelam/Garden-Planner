import { importGardenFresh, openDatabase } from "../server/db";
import { createSampleGarden } from "../server/state";

if (process.env.APP_ENV !== "staging")
  throw new Error("Refusing to reset data outside APP_ENV=staging");
const database = openDatabase();
// A reset should feel like a truly fresh rehearsal, including an empty snapshot history.
importGardenFresh(database, createSampleGarden());
database.sqlite.close();
console.log("Staging sample garden reset.");
