import { openDatabase, replaceGarden } from "../server/db";
import { createSampleGarden } from "../server/state";

if (process.env.APP_ENV !== "staging")
  throw new Error("Refusing to reset data outside APP_ENV=staging");
const database = openDatabase();
replaceGarden(database, createSampleGarden(), "Reset staging sample garden");
database.sqlite.close();
console.log("Staging sample garden reset.");
