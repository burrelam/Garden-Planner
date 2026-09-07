import { catalogById } from "./catalog";
import { addDays } from "./timing";
import type { GardenSettings, Phase, PlantRecord } from "./model";

/**
 * The gardener's calendar.
 *
 * These seasons are whole months, and they are deliberately NOT the
 * astronomical boundaries in theme.ts. Those decide which palette the app
 * paints and follow the equinoxes; these decide what a gardener would *call*
 * a planting. Under the astronomical rule a pea sown on 1 February files
 * under winter and garlic put in on 6 December files under fall — both
 * technically right, both read as wrong on a phone. Keep the two apart: a
 * change here must never change the theme, and a change there must never
 * change what season a sowing is filed under.
 */
export const PLANTING_SEASONS = ["winter", "spring", "summer", "fall"] as const;
export type PlantingSeason = (typeof PLANTING_SEASONS)[number];

export const PLANTING_SEASON_LABEL: Record<PlantingSeason, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

/** Short form for the season tag on a sowing button. */
export const PLANTING_SEASON_ABBR: Record<PlantingSeason, string> = {
  winter: "Win",
  spring: "Spr",
  summer: "Sum",
  fall: "Fall",
};

/** Month index (0-11) to season. December through February is one winter. */
export function plantingSeasonOfMonth(month: number): PlantingSeason {
  if (month === 11 || month <= 1) return "winter";
  if (month <= 4) return "spring";
  if (month <= 7) return "summer";
  return "fall";
}

export function plantingSeasonOf(date: Date): PlantingSeason {
  return plantingSeasonOfMonth(date.getUTCMonth());
}

/** The months a season covers, in calendar order within that season. */
export function monthsOfSeason(season: PlantingSeason): number[] {
  const months = [];
  for (let month = 0; month < 12; month += 1)
    if (plantingSeasonOfMonth(month) === season) months.push(month);
  // Winter runs Dec-Jan-Feb, so it reads better starting at December.
  return season === "winter" ? [11, 0, 1] : months;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface SowingWindow {
  /** Stable within a plant, so a wish list entry can point at one window. */
  index: number;
  /** Which catalog phases produced this window, for the action wording. */
  phases: Phase[];
  start: string;
  end: string;
  seasons: PlantingSeason[];
  /**
   * What this sowing gets you. The catalog carries one harvest rule per
   * plant, so every window of a plant shares it; if a plant ever gains a
   * second sowing with its own picking dates, this has to move onto the rule.
   */
  harvest: DateRange | null;
}

const iso = (date: Date) => date.toISOString().slice(0, 10);

/** Phases that actually put something in the ground. */
const GROUND_PHASES: Phase[] = ["transplant", "direct"];

function ruleRange(
  rule: PlantRecord["timing"][number],
  garden: GardenSettings,
) {
  return {
    start: iso(addDays(garden[rule.anchor], rule.startOffsetDays)),
    end: iso(addDays(garden[rule.anchor], rule.endOffsetDays)),
  };
}

/** Every month a range touches, as indices. Ranges never cross a year here. */
export function monthsOfRange(range: DateRange): number[] {
  const start = new Date(`${range.start}T12:00:00Z`);
  const end = new Date(`${range.end}T12:00:00Z`);
  const months: number[] = [];
  for (let month = start.getUTCMonth(); month <= end.getUTCMonth(); month += 1)
    months.push(month);
  return months;
}

export function seasonsOfRange(range: DateRange): PlantingSeason[] {
  const seasons: PlantingSeason[] = [];
  for (const month of monthsOfRange(range)) {
    const season = plantingSeasonOfMonth(month);
    if (!seasons.includes(season)) seasons.push(season);
  }
  return seasons;
}

/**
 * When this plant is picked, or for a flower when it blooms. Null when the
 * catalog records neither, rather than guessing a date.
 */
export function harvestWindowFor(
  plant: PlantRecord,
  garden: GardenSettings,
): DateRange | null {
  const rule =
    plant.timing.find((entry) => entry.phase === "harvest") ??
    plant.timing.find((entry) => entry.phase === "bloom");
  return rule ? ruleRange(rule, garden) : null;
}

/**
 * The windows in which this plant goes in the ground, merged so that a plant
 * whose transplant and direct-sow windows overlap reads as one stretch rather
 * than two buttons covering the same fortnight.
 */
export function sowingWindowsFor(
  plant: PlantRecord,
  garden: GardenSettings,
): SowingWindow[] {
  const harvest = harvestWindowFor(plant, garden);
  const ranges = plant.timing
    .filter((rule) => GROUND_PHASES.includes(rule.phase))
    .map((rule) => ({ phase: rule.phase, ...ruleRange(rule, garden) }))
    .sort((a, b) => a.start.localeCompare(b.start));

  const merged: Array<{ phases: Phase[]; start: string; end: string }> = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = range.end > last.end ? range.end : last.end;
      if (!last.phases.includes(range.phase)) last.phases.push(range.phase);
    } else
      merged.push({
        phases: [range.phase],
        start: range.start,
        end: range.end,
      });
  }

  return merged.map((window, index) => ({
    index,
    phases: window.phases,
    start: window.start,
    end: window.end,
    seasons: seasonsOfRange(window),
    harvest,
  }));
}

/** When to start this plant under cover, if the catalog says to. */
export function indoorWindowFor(
  plant: PlantRecord,
  garden: GardenSettings,
): DateRange | null {
  const rule = plant.timing.find((entry) => entry.phase === "indoor");
  return rule ? ruleRange(rule, garden) : null;
}

/** How the button describes the act, taken from the phases, never invented. */
export function sowingActionLabel(window: SowingWindow): string {
  const direct = window.phases.includes("direct");
  const transplant = window.phases.includes("transplant");
  if (direct && transplant) return "Sow or set out";
  if (direct) return "Direct sow";
  return "Set out";
}

/** The season a window is filed under: where it starts is when you do it. */
export function seasonOfWindow(window: SowingWindow): PlantingSeason {
  return window.seasons[0];
}

export function sowingWindowFor(
  plantId: string,
  windowIndex: number,
  garden: GardenSettings,
): SowingWindow | null {
  const plant = catalogById.get(plantId);
  if (!plant) return null;
  return sowingWindowsFor(plant, garden)[windowIndex] ?? null;
}
