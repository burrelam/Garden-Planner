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
  /**
   * The name the catalog gives this sowing, for a crop sown more than once a
   * year. Undefined for a plant with a single unnamed sowing, which is most
   * of them.
   */
  sowing?: string;
  /** Which catalog phases produced this window, for the action wording. */
  phases: Phase[];
  start: string;
  end: string;
  seasons: PlantingSeason[];
  /**
   * What this sowing gets you. A plant whose rules name their sowings carries
   * a harvest rule per sowing, so each window gets the picking dates its own
   * planting actually produces; a plant whose rules are unnamed has one
   * harvest rule that every window shares.
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
 * The rule for a phase, belonging to one named sowing. A plant that does not
 * name its sowings answers every ask with its single rule, which is how every
 * one-sowing plant keeps behaving exactly as it did.
 */
function ruleFor(plant: PlantRecord, phase: Phase, sowing?: string) {
  const unnamed = plant.timing.find(
    (rule) => rule.phase === phase && rule.sowing === undefined,
  );
  if (sowing === undefined)
    return (
      unnamed ??
      // Every rule for this phase is named and no sowing was asked for, so
      // there is no single honest answer. Give the first, for a caller that
      // only wants a rough idea of the plant.
      plant.timing.find((rule) => rule.phase === phase)
    );
  // A named sowing takes its own rule, or one the plant states for all of its
  // sowings — but never another sowing's. A crop set out under cover in spring
  // and sown straight in the ground in August has no indoor date in August, and
  // saying so is the whole point of naming them.
  return (
    plant.timing.find(
      (rule) => rule.phase === phase && rule.sowing === sowing,
    ) ?? unnamed
  );
}

/**
 * When this plant is picked, or for a flower when it blooms. Null when the
 * catalog records neither, rather than guessing a date.
 *
 * Pass the sowing to get the picking dates that one planting produces. Asked
 * about the plant as a whole, a crop sown twice answers with its first sowing,
 * because there is no honest single answer.
 */
export function harvestWindowFor(
  plant: PlantRecord,
  garden: GardenSettings,
  sowing?: string,
): DateRange | null {
  const rule =
    ruleFor(plant, "harvest", sowing) ?? ruleFor(plant, "bloom", sowing);
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
  const ground = plant.timing.filter((rule) =>
    GROUND_PHASES.includes(rule.phase),
  );

  // A crop sown more than once names its sowings, and each name is one window
  // however its dates fall. Merging by overlap cannot separate those: lettuce
  // goes in the ground continuously from April to August, so the spring and
  // the late-summer sowing touch and would collapse back into one stretch.
  const named = [...new Set(ground.map((rule) => rule.sowing))].filter(
    (name): name is string => name !== undefined,
  );

  const groups: Array<{
    sowing?: string;
    phases: Phase[];
    start: string;
    end: string;
  }> = [];

  if (named.length > 0) {
    for (const sowing of named) {
      const rules = ground
        .filter((rule) => rule.sowing === sowing)
        .map((rule) => ({ phase: rule.phase, ...ruleRange(rule, garden) }));
      const phases: Phase[] = [];
      for (const rule of rules)
        if (!phases.includes(rule.phase)) phases.push(rule.phase);
      groups.push({
        sowing,
        phases,
        start: rules.reduce(
          (first, rule) => (rule.start < first ? rule.start : first),
          rules[0].start,
        ),
        end: rules.reduce(
          (last, rule) => (rule.end > last ? rule.end : last),
          rules[0].end,
        ),
      });
    }
  } else {
    // Unnamed, as every single-sowing plant is: a transplant and a direct-sow
    // window that overlap read as one stretch rather than two buttons covering
    // the same fortnight.
    const ranges = ground
      .map((rule) => ({ phase: rule.phase, ...ruleRange(rule, garden) }))
      .sort((a, b) => a.start.localeCompare(b.start));
    for (const range of ranges) {
      const last = groups[groups.length - 1];
      if (last && range.start <= last.end) {
        last.end = range.end > last.end ? range.end : last.end;
        if (!last.phases.includes(range.phase)) last.phases.push(range.phase);
      } else
        groups.push({
          phases: [range.phase],
          start: range.start,
          end: range.end,
        });
    }
  }

  // Earliest first, so window 0 is the year's first sowing whether the windows
  // were named or derived — a wish already saved against an index keeps meaning
  // what it meant.
  groups.sort((a, b) => a.start.localeCompare(b.start));

  return groups.map((window, index) => ({
    index,
    sowing: window.sowing,
    phases: window.phases,
    start: window.start,
    end: window.end,
    seasons: seasonsOfRange(window),
    harvest: harvestWindowFor(plant, garden, window.sowing),
  }));
}

/**
 * When to start this plant under cover, if the catalog says to. A sowing that
 * goes straight in the ground has no indoor rule of its own and says nothing,
 * rather than borrowing the other sowing's.
 */
export function indoorWindowFor(
  plant: PlantRecord,
  garden: GardenSettings,
  sowing?: string,
): DateRange | null {
  const rule = ruleFor(plant, "indoor", sowing);
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
