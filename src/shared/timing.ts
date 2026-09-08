import { catalogById } from "./catalog";
import type { GardenEntry, GardenSettings, Phase, TimingRule } from "./model";

// The calendar is derived from explicit frost dates. USDA hardiness is intentionally not an input.

export interface TimelineSlot {
  phase: Phase | null;
  month: number;
  half: "early" | "late";
}

export function addDays(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export function dateToSlot(date: Date) {
  return date.getUTCMonth() * 2 + (date.getUTCDate() > 15 ? 1 : 0);
}

// Personal timing overrides do not need catalog provenance, so sourceIds is optional here.
export function rulesToTimeline(
  rules: Array<Omit<TimingRule, "sourceIds"> & { sourceIds?: string[] }>,
  garden: GardenSettings,
): TimelineSlot[] {
  const slots: TimelineSlot[] = Array.from({ length: 24 }, (_, index) => ({
    phase: null,
    month: Math.floor(index / 2),
    half: index % 2 === 0 ? "early" : "late",
  }));

  for (const rule of rules) {
    const anchor = garden[rule.anchor];
    const start = Math.max(
      0,
      Math.min(23, dateToSlot(addDays(anchor, rule.startOffsetDays))),
    );
    const end = Math.max(
      0,
      Math.min(23, dateToSlot(addDays(anchor, rule.endOffsetDays))),
    );
    for (
      let index = Math.min(start, end);
      index <= Math.max(start, end);
      index += 1
    ) {
      slots[index].phase = rule.phase;
    }
  }

  return slots;
}

function rulesForEntry(entry: GardenEntry) {
  return (
    entry.timingOverride ??
    (entry.plantId ? catalogById.get(entry.plantId)?.timing : undefined) ??
    []
  );
}

export function timelineForEntry(entry: GardenEntry, garden: GardenSettings) {
  return rulesToTimeline(rulesForEntry(entry), garden);
}

/** One lane of a planner row: a sowing, and where it falls across the year. */
export interface SowingLane {
  /** The catalog's name for this sowing, absent when the plant has only one. */
  sowing?: string;
  slots: TimelineSlot[];
}

/**
 * A row's lanes, one per sowing the plant is sown in.
 *
 * A plant sown once gives a single lane holding exactly the timeline it has
 * always drawn. A plant whose rules name their sowings gives a lane each, so
 * a spring crop still being picked and a late-summer crop going in the ground
 * sit above and below one another in the same cells instead of one painting
 * over the other.
 *
 * Rules that name no sowing belong to the plant as a whole and are painted
 * into every lane.
 */
export function sowingLanesForEntry(
  entry: GardenEntry,
  garden: GardenSettings,
): SowingLane[] {
  const rules = rulesForEntry(entry);
  const names = [...new Set(rules.map((rule) => rule.sowing))].filter(
    (name): name is string => name !== undefined,
  );
  if (names.length === 0)
    return [{ sowing: undefined, slots: rulesToTimeline(rules, garden) }];

  const shared = rules.filter((rule) => rule.sowing === undefined);
  const lanes = names.map((sowing) => {
    const own = rules.filter((rule) => rule.sowing === sowing);
    return {
      sowing,
      slots: rulesToTimeline([...shared, ...own], garden),
      // Ordered by when this sowing goes in the ground, so the lane a gardener
      // reaches first in the year is the one on top. Measured as a date, not
      // as an offset: a sowing counted back from the first frost and one
      // counted forward from the last are not comparable as raw numbers.
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
  });
  lanes.sort((a, b) => a.startsAt - b.startsAt);
  return lanes.map(({ sowing, slots }) => ({ sowing, slots }));
}

// The rule whose start date a recorded planting date is measured against —
// whichever phase actually puts something in the ground.
function plantingRuleForEntry(rules: ReturnType<typeof rulesForEntry>) {
  return (
    rules.find((rule) => rule.phase === "transplant") ??
    rules.find((rule) => rule.phase === "direct") ??
    rules.find((rule) => rule.phase === "indoor") ??
    rules[0]
  );
}

// How far a recorded planting date sits from where the guideline itself
// would have put the "in the ground" phase. Every other phase shifts by this
// same flat number of days, so the whole sequence — indoor start through
// harvest — moves together and keeps its own internal spacing.
function actualShiftDays(
  entry: GardenEntry,
  garden: GardenSettings,
): number | null {
  if (!entry.plantedDate) return null;
  const rules = rulesForEntry(entry);
  const plantingRule = plantingRuleForEntry(rules);
  if (!plantingRule) return null;

  const guidelinePlantDate = addDays(
    garden[plantingRule.anchor],
    plantingRule.startOffsetDays,
  );
  const actualPlantDate = new Date(`${entry.plantedDate}T12:00:00Z`);
  return Math.round(
    (actualPlantDate.getTime() - guidelinePlantDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );
}

// The actual timeline a gardener's own planting date implies, as opposed to
// the generic guideline computed from frost dates.
export function actualTimelineForEntry(
  entry: GardenEntry,
  garden: GardenSettings,
): TimelineSlot[] | null {
  const shiftDays = actualShiftDays(entry, garden);
  if (shiftDays === null) return null;
  const shiftedRules = rulesForEntry(entry).map((rule) => ({
    ...rule,
    startOffsetDays: rule.startOffsetDays + shiftDays,
    endOffsetDays: rule.endOffsetDays + shiftDays,
  }));
  return rulesToTimeline(shiftedRules, garden);
}

// Position within the half-month slot, so a date renders where it actually
// falls (e.g. Mar 15 sits at the boundary of Mar-Early/Mar-Late) instead of
// always pinning to the slot's left edge.
function datePosition(date: Date) {
  const day = date.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const fraction =
    day > 15 ? (day - 15.5) / (daysInMonth - 15) : (day - 0.5) / 15;
  return { slot: dateToSlot(date), fraction };
}

export function frostPosition(
  garden: GardenSettings,
  kind: "lastFrost" | "firstFrost",
) {
  return datePosition(new Date(`${garden[kind]}T12:00:00Z`));
}

// Where a logged planting date itself falls, for the "pin" marker — the
// date the gardener actually recorded, not wherever the shifted timeline
// puts the surrounding phase.
export function plantedDatePosition(entry: GardenEntry) {
  if (!entry.plantedDate) return null;
  return datePosition(new Date(`${entry.plantedDate}T12:00:00Z`));
}

// Where the actual (shifted) timeline's harvest phase begins, for a "finish
// flag" marker. This can land away from the logged planting date itself,
// since it carries the same shift as every other phase.
export function actualHarvestPosition(
  entry: GardenEntry,
  garden: GardenSettings,
): { slot: number; fraction: number; date: string } | null {
  const shiftDays = actualShiftDays(entry, garden);
  if (shiftDays === null) return null;
  const harvestRule = rulesForEntry(entry).find(
    (rule) => rule.phase === "harvest",
  );
  if (!harvestRule) return null;
  const harvestStart = addDays(
    garden[harvestRule.anchor],
    harvestRule.startOffsetDays + shiftDays,
  );
  return {
    ...datePosition(harvestStart),
    date: harvestStart.toISOString().slice(0, 10),
  };
}
