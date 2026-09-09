import { catalogById } from "./catalog";
import {
  addDays,
  dateToSlot,
  rulesForEntry,
  rulesToTimeline,
  type TimelineSlot,
} from "./timing";
import type { GardenEntry, GardenSettings, Phase, PlantRecord } from "./model";

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
  /**
   * When to start this sowing under cover. Derived the same way as the
   * harvest: the catalog's indoor rule sits a fixed lead ahead of the whole
   * plant-out stretch, so each piece of that stretch keeps the same lead.
   * Null when the catalog gives the plant no indoor start.
   */
  indoor: DateRange | null;
  /**
   * Whether this sowing sits in the ground over the winter — put in during the
   * autumn and lifted the following year, rather than sown and picked within
   * the one season. Told by the dates themselves: a sowing whose picking falls
   * earlier in the drawn year than its planting can only be picked the year
   * after.
   *
   * A crop offering both ways of growing it, like garlic, gets a lane for each
   * — they are two different plantings on two different timelines, even where
   * they end up lifted in the same summer.
   */
  overwinters: boolean;
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

/** The first and last day of a month, as ISO dates. */
function monthEdges(year: number, month: number) {
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    start: `${year}-${pad(month + 1)}-01`,
    end: `${year}-${pad(month + 1)}-${pad(last)}`,
  };
}

/**
 * A stretch in the ground, cut at the planting seasons it crosses.
 *
 * Sowing carrots in March and sowing them in July are two growing seasons, not
 * one long one: the first is picked through the summer and the second in the
 * fall. A window that runs across seasons is therefore split at the season
 * boundaries, and each piece becomes a sowing a gardener can actually plan.
 * A window that sits inside one season is left whole.
 */
export function splitRangeBySeason(range: DateRange): DateRange[] {
  const start = new Date(`${range.start}T12:00:00Z`);
  const end = new Date(`${range.end}T12:00:00Z`);
  const year = start.getUTCFullYear();
  const pieces: DateRange[] = [];

  for (
    let month = start.getUTCMonth();
    month <= end.getUTCMonth();
    month += 1
  ) {
    const season = plantingSeasonOfMonth(month);
    const edges = monthEdges(year, month);
    const from = edges.start < range.start ? range.start : edges.start;
    const to = edges.end > range.end ? range.end : edges.end;
    const last = pieces[pieces.length - 1];
    // Months of the same season join up; a new season starts a new piece.
    if (last && plantingSeasonOfMonth(month - 1) === season) last.end = to;
    else pieces.push({ start: from, end: to });
  }

  return pieces.length > 0 ? pieces : [range];
}

/**
 * How long this plant takes, read back out of the dates the catalog already
 * carries rather than parsed out of its prose. The harvest rule was written as
 * "the earliest sowing plus the shortest maturity through the latest sowing
 * plus the longest maturity", so the two ends give the two maturities — and a
 * piece of that sowing window can then carry the harvest it alone produces.
 */
function maturityDays(
  ground: DateRange,
  harvest: DateRange | null,
): { shortest: number; longest: number } | null {
  if (!harvest) return null;
  const days = (from: string, to: string) =>
    Math.round(
      (new Date(`${to}T12:00:00Z`).getTime() -
        new Date(`${from}T12:00:00Z`).getTime()) /
        86400000,
    );
  return {
    shortest: days(ground.start, harvest.start),
    longest: days(ground.end, harvest.end),
  };
}

/** Shift an ISO date by whole days. */
function shift(date: string, days: number) {
  return iso(addDays(date, days));
}

function spanDays(range: DateRange) {
  return Math.round(
    (new Date(`${range.end}T12:00:00Z`).getTime() -
      new Date(`${range.start}T12:00:00Z`).getTime()) /
      86400000,
  );
}

/**
 * How long a stretch in the ground has to be before it is worth cutting into
 * separate growing seasons. Ten weeks: long enough that the near end and the
 * far end really are different plantings with different pickings, short enough
 * that carrots (March to mid-July) and lettuce (April to August) are caught.
 */
const LONG_SOWING_DAYS = 70;

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
    const merged: typeof groups = [];
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
    // Then cut each stretch at the seasons it crosses. Sowing in spring for a
    // summer picking and sowing in summer for a fall one are two growing
    // seasons, and a single stretch from March to July hides that.
    //
    // Only a genuinely long stretch is worth cutting. Beans go in through May
    // and June, which crosses from spring into summer on the calendar without
    // being two growing seasons by any gardener's reckoning; carrots run March
    // to mid-July, which is. Ten weeks is the line.
    for (const stretch of merged) {
      const pieces =
        spanDays(stretch) > LONG_SOWING_DAYS
          ? splitRangeBySeason(stretch)
          : [stretch];
      for (const piece of pieces)
        groups.push({ phases: stretch.phases, ...piece });
    }
  }

  // Earliest first, so window 0 is the year's first sowing whether the windows
  // were named or derived — a wish already saved against an index keeps meaning
  // what it meant.
  groups.sort((a, b) => a.start.localeCompare(b.start));

  // A window cut out of a longer stretch carries the picking dates that piece
  // alone produces, worked out from the maturities the whole stretch implies.
  // Left whole, it keeps the plant's own harvest rule untouched.
  const wholeGround =
    groups.length > 0
      ? {
          start: groups[0].start,
          end: groups.reduce(
            (last, group) => (group.end > last ? group.end : last),
            groups[0].end,
          ),
        }
      : null;
  const plantHarvest = harvestWindowFor(plant, garden);
  const measured =
    groups.length > 1 && wholeGround
      ? maturityDays(wholeGround, plantHarvest)
      : null;
  /* Only where the crop is picked after it is sown, within the one year the
     calendar draws. Garlic goes in during autumn and is lifted the following
     summer, so measuring its harvest against its sowing gives a negative
     maturity and dates running backwards. An overwintering crop keeps the
     single harvest rule the catalog states for it. */
  const maturity =
    measured && measured.shortest >= 0 && measured.longest >= 0
      ? measured
      : null;

  /* The indoor rule runs a fixed lead ahead of the whole plant-out stretch —
     "start transplants five weeks earlier" — so each piece of that stretch
     keeps the same lead rather than sharing one long indoor bar. */
  const plantIndoor = indoorWindowFor(plant, garden);
  const lead =
    groups.length > 1 && wholeGround && plantIndoor
      ? maturityDays(plantIndoor, wholeGround)
      : null;

  return groups.map((window, index) => {
    const harvest = window.sowing
      ? harvestWindowFor(plant, garden, window.sowing)
      : maturity
        ? {
            start: shift(window.start, maturity.shortest),
            end: shift(window.end, maturity.longest),
          }
        : plantHarvest;
    return {
      index,
      sowing: window.sowing,
      phases: window.phases,
      start: window.start,
      end: window.end,
      seasons: seasonsOfRange(window),
      harvest,
      indoor: window.sowing
        ? indoorWindowFor(plant, garden, window.sowing)
        : lead
          ? {
              start: shift(window.start, -lead.shortest),
              end: shift(window.end, -lead.longest),
            }
          : plantIndoor,
      // Picked earlier in the year than it is sown, so the picking belongs to
      // the year after: this one sits in the ground over the winter.
      overwinters: harvest ? harvest.start < window.start : false,
    };
  });
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

/**
 * A sowing's name as a gardener would read it, so the catalog can key its
 * rules on something short and the screen can still say "Late summer".
 */
export function sowingLabel(sowing: string): string {
  const words = sowing.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** One lane of a planner row: a sowing, and where it falls across the year. */
export interface SowingLane {
  /** What to call this sowing on screen — its catalog name, or its season. */
  sowing?: string;
  slots: TimelineSlot[];
}

/** Paint a date range across the half-month slots, later phases winning. */
function paintRange(
  slots: TimelineSlot[],
  range: DateRange | null,
  phase: Phase,
) {
  if (!range) return;
  const from = dateToSlot(new Date(`${range.start}T12:00:00Z`));
  const to = dateToSlot(new Date(`${range.end}T12:00:00Z`));
  for (
    let index = Math.max(0, Math.min(from, to));
    index <= Math.min(23, Math.max(from, to));
    index += 1
  )
    slots[index].phase = phase;
}

function emptySlots(): TimelineSlot[] {
  return Array.from({ length: 24 }, (_, index) => ({
    phase: null,
    month: Math.floor(index / 2),
    half: index % 2 === 0 ? "early" : "late",
  }));
}

function slotsForWindows(windows: SowingWindow[]): TimelineSlot[] {
  const slots = emptySlots();
  // Same order the timing rules are painted in, so the later phase wins the
  // cells the earlier one also wants.
  for (const window of windows) paintRange(slots, window.indoor, "indoor");
  for (const window of windows)
    paintRange(slots, window, window.phases[window.phases.length - 1]);
  for (const window of windows) paintRange(slots, window.harvest, "harvest");
  return slots;
}

/**
 * A row's lanes, one per sowing.
 *
 * A plant sown once gives a single lane holding exactly the timeline it has
 * always drawn. A plant sown across more than one growing season gives a lane
 * each, so a spring crop still being picked and a summer sowing going in the
 * ground sit above and below one another in the same cells instead of one
 * painting over the other.
 *
 * A row carrying the gardener's own dates is drawn from those and nothing
 * else — their override says what they meant, and second-guessing it by
 * season would take their garden off them.
 */
export function sowingLanesForEntry(
  entry: GardenEntry,
  garden: GardenSettings,
): SowingLane[] {
  const plant =
    !entry.timingOverride && entry.plantId
      ? catalogById.get(entry.plantId)
      : undefined;
  if (!plant) {
    const rules = rulesForEntry(entry);
    const names = [...new Set(rules.map((rule) => rule.sowing))].filter(
      (name): name is string => name !== undefined,
    );
    // Their own dates, drawn as they wrote them. Named sowings still get a
    // lane each; unnamed ones are left alone rather than cut up by season,
    // because an override says what they meant.
    if (names.length === 0)
      return [{ sowing: undefined, slots: rulesToTimeline(rules, garden) }];
    const shared = rules.filter((rule) => rule.sowing === undefined);
    return names
      .map((sowing) => {
        const own = rules.filter((rule) => rule.sowing === sowing);
        return {
          sowing,
          slots: rulesToTimeline([...shared, ...own], garden),
          startsAt: own
            .filter(
              (rule) => rule.phase === "transplant" || rule.phase === "direct",
            )
            .reduce(
              (first, rule) =>
                Math.min(
                  first,
                  addDays(garden[rule.anchor], rule.startOffsetDays).getTime(),
                ),
              Number.POSITIVE_INFINITY,
            ),
        };
      })
      .sort((a, b) => a.startsAt - b.startsAt)
      .map(({ sowing, slots }) => ({ sowing, slots }));
  }

  /* Two windows that end in the same picking are one growing season with more
     than one chance to plant it, not two seasons. Garlic goes in during the
     autumn or in late winter and is lifted the same summer either way; a
     shallot has two sowing months and one crop. Only a sowing that produces a
     different harvest is a different growing season, and only that earns a
     lane of its own — otherwise every plant with two sowing months would have
     its row split and its pills halved for nothing. */
  const bySeason = new Map<string, SowingWindow[]>();
  for (const window of sowingWindowsFor(plant, garden)) {
    /* Overwintering is its own way of growing a crop, so it gets its own lane
       even where it ends in the same picking. Garlic put in during the autumn
       sits through the winter; the same garlic put in during late winter does
       not. Two plantings, two timelines, and a gardener choosing between them
       wants to see both. Everything else groups by the picking it produces. */
    const key = window.overwinters
      ? "overwintering"
      : window.harvest
        ? `${window.harvest.start}..${window.harvest.end}`
        : "no picking dates";
    const together = bySeason.get(key);
    if (together) together.push(window);
    else bySeason.set(key, [window]);
  }

  if (bySeason.size <= 1)
    return [
      { sowing: undefined, slots: rulesToTimeline(plant.timing, garden) },
    ];

  return [...bySeason.values()].map((group) => ({
    sowing:
      group[0].sowing ??
      (group[0].overwinters
        ? "Overwintering"
        : PLANTING_SEASON_LABEL[seasonOfWindow(group[0])]),
    slots: slotsForWindows(group),
  }));
}
