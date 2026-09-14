import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Frost normals for every US ZIP, joined to the nearest usable NOAA station.
 *
 * Committed as a pinned snapshot rather than fetched: docs/plant-data-sources.md
 * rules out depending on someone else's website while a garden is being planned,
 * and a climate normal only moves when NOAA publishes a new edition.
 *
 * Source: NOAA/NCEI 1991-2020 U.S. Climate Normals, annual/seasonal, v1.0.1
 * (created 2023-04-04), joined to U.S. Census 2024 Gazetteer ZCTA interior
 * points. `_source` inside the JSON carries the full provenance the licence
 * note requires us to keep.
 */

export interface FrostStation {
  name: string;
  years: number;
  /** Median (FP50) dates, MM-DD. Half of all years beat these. */
  spring: string;
  fall: string;
  /** The 10% dates, MM-DD — late in spring, early in autumn. What we plan on. */
  springCautious: string;
  fallCautious: string;
  /** The same pair at a 36F frost threshold rather than a 32F freeze. */
  spring36: string;
  fall36: string;
}

export interface FrostNormals {
  _source: Record<string, unknown>;
  stations: Record<string, FrostStation>;
  zips: Record<string, [station: string, miles: number]>;
}

/**
 * What a ZIP's climate says about its season. Dates are MM-DD: a frost normal is
 * a day of the year, not a day in 2026, so the caller puts it in whichever year
 * the garden is planning.
 */
export interface FrostAnswer {
  station: string;
  stationName: string;
  miles: number;
  years: number;
  /**
   * The dates the calendar is drawn from. Deliberately the cautious pair, not
   * the median: a median last frost is beaten by a later one in half of all
   * years, and nobody sets tender plants out on a coin flip.
   */
  lastFrost: string;
  firstFrost: string;
  /** The median pair, for saying what an ordinary year looks like beside them. */
  lastFrostAverage: string;
  firstFrostAverage: string;
}

const here = dirname(fileURLToPath(import.meta.url));

let cache: FrostNormals | null = null;

export function loadFrostNormals(): FrostNormals {
  if (!cache)
    cache = JSON.parse(
      readFileSync(resolve(here, "frost-normals.json"), "utf8"),
    ) as FrostNormals;
  return cache;
}

export function frostForZip(
  zip: string,
  normals: FrostNormals = loadFrostNormals(),
): FrostAnswer | null {
  const entry = normals.zips[zip];
  if (!entry) return null;
  const [id, miles] = entry;
  const station = normals.stations[id];
  if (!station) return null;
  return {
    station: id,
    stationName: station.name,
    miles,
    years: station.years,
    lastFrost: station.springCautious,
    firstFrost: station.fallCautious,
    lastFrostAverage: station.spring,
    firstFrostAverage: station.fall,
  };
}

/**
 * "03-21" in the same year the garden is already planning, so looking up a ZIP
 * moves the month and day without quietly moving the season to a different year.
 */
export function withYearOf(reference: string, monthDay: string) {
  return `${reference.slice(0, 4)}-${monthDay}`;
}
