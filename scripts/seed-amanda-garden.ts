import { importGardenFresh, openDatabase } from "../server/db";
import { createAmandaGarden } from "../server/state";

const environment = process.env.APP_ENV;
if (environment !== "staging" && environment !== "production")
  throw new Error("Refusing to seed outside staging or production");
if (environment === "production" && process.env.CONFIRM_AMANDA_SEED !== "yes")
  throw new Error("Production seeding requires CONFIRM_AMANDA_SEED=yes");

// This is an explicit, atomic replacement used only for the first hosted seed.
// It deliberately clears server-side history because the local browser history
// was never part of the hosted migration contract.
const database = openDatabase();
const garden = importGardenFresh(database, createAmandaGarden());
database.sqlite.close();
console.log(
  `Seeded ${environment} with ${garden.entries.length} plants and ${garden.beds.length} beds.`,
);
