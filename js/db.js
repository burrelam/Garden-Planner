// Thin promise wrapper over native IndexedDB. No external dependency — this is a no-build project.
import { todayPDT } from "./state.js";

const DB_NAME = "panda-fittracker";
const DB_VERSION = 1;
const SETTINGS_KEY = "main";

// Deliberately blank/neutral — this file is public source code. Real profile data is entered
// once via the Settings screen and lives only in the browser's local IndexedDB from then on.
export const DEFAULT_SETTINGS = {
  id: SETTINGS_KEY,
  name: "",
  heightCm: null,
  startWeight: null,
  goalWeight: null,
  targetPaceLbsPerWeek: 1,
  trackingStartDate: todayPDT(),
  restingTDEEBaseline: 1800,
  lastRecalculatedDate: null,
  thresholds: {
    grossCaloriesWorkout: { min: 1700, ideal: 1825, max: 1950 },
    grossCaloriesRest: { min: 1350, ideal: 1475, max: 1600 },
    deficitDaily: { ideal: -375, max: -500 },
    deficitWeekly: { ideal: -2625, max: -3500 },
    protein: { min: 80, ideal: 120, max: 150 },
    carbs: { min: 100, ideal: 160, max: 200 },
    fat: { min: 35, ideal: 50, max: 65 },
    fiber: { min: 20, ideal: 25, max: 35 },
    water: { min: 80, ideal: 90, max: 120 },
    netCalorieBand: { min: 1400, max: 1550 },
  },
};

const STORES = {
  dailyLogs: { keyPath: "date" },
  mealEntries: { keyPath: "id", autoIncrement: true, indexes: [["date", "date"]] },
  foodLibrary: { keyPath: "id", autoIncrement: true, indexes: [["name", "name"]] },
  workouts: { keyPath: "id", autoIncrement: true, indexes: [["date", "date"]] },
  weighIns: { keyPath: "date" },
  cycleReadings: { keyPath: "date" },
  settings: { keyPath: "id" },
};

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const [storeName, config] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(storeName)) continue;
        const store = db.createObjectStore(storeName, {
          keyPath: config.keyPath,
          autoIncrement: !!config.autoIncrement,
        });
        for (const [indexName, keyPath] of config.indexes || []) {
          store.createIndex(indexName, keyPath);
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function tx(db, storeName, mode) {
  return db.transaction(storeName, mode).objectStore(storeName);
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbPut(storeName, value) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readwrite").put(value));
}

export async function dbGet(storeName, key) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readonly").get(key));
}

export async function dbGetAll(storeName) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readonly").getAll());
}

export async function dbGetAllByIndex(storeName, indexName, query) {
  const db = await openDB();
  const index = db.transaction(storeName, "readonly").objectStore(storeName).index(indexName);
  return wrap(index.getAll(query));
}

// Range query on a store's primary key (e.g. dailyLogs, weighIns, cycleReadings — all keyed by date).
export async function dbGetAllInRange(storeName, lowerBound, upperBound) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readonly").getAll(IDBKeyRange.bound(lowerBound, upperBound)));
}

export async function dbDelete(storeName, key) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readwrite").delete(key));
}

export async function dbClear(storeName) {
  const db = await openDB();
  return wrap(tx(db, storeName, "readwrite").clear());
}

export async function getSettings() {
  const existing = await dbGet("settings", SETTINGS_KEY);
  if (existing) return existing;
  await dbPut("settings", DEFAULT_SETTINGS);
  return DEFAULT_SETTINGS;
}

export async function saveSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial, id: SETTINGS_KEY };
  await dbPut("settings", updated);
  return updated;
}

// --- Backup / restore (the real data-safety net, since storage is local-only) ---

export async function exportAllData() {
  const dump = { schemaVersion: DB_VERSION, exportedAt: new Date().toISOString() };
  for (const storeName of Object.keys(STORES)) {
    dump[storeName] = await dbGetAll(storeName);
  }
  return dump;
}

export async function importAllData(dump) {
  const db = await openDB();
  const storeNames = Object.keys(STORES).filter((name) => Array.isArray(dump[name]));
  const transaction = db.transaction(storeNames, "readwrite");
  for (const storeName of storeNames) {
    const store = transaction.objectStore(storeName);
    store.clear();
    for (const record of dump[storeName]) {
      store.put(record);
    }
  }
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
