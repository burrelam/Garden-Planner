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

// The actual timeline a gardener's own planting date implies, as opposed to
// the generic guideline computed from frost dates. Rather than recomputing
// each phase from scratch, every rule shifts by one flat day offset: the
// gap between the recorded date and wherever the guideline itself would
// have put the "in the ground" phase, so the whole sequence — indoor start
// through harvest — moves together and keeps its own internal spacing.
export function actualTimelineForEntry(
  entry: GardenEntry,
  garden: GardenSettings,
): TimelineSlot[] | null {
  if (!entry.plantedDate) return null;
  const rules = rulesForEntry(entry);
  const plantingRule =
    rules.find((rule) => rule.phase === "transplant") ??
    rules.find((rule) => rule.phase === "direct") ??
    rules.find((rule) => rule.phase === "indoor") ??
    rules[0];
  if (!plantingRule) return null;

  const guidelinePlantDate = addDays(
    garden[plantingRule.anchor],
    plantingRule.startOffsetDays,
  );
  const actualPlantDate = new Date(`${entry.plantedDate}T12:00:00Z`);
  const shiftDays = Math.round(
    (actualPlantDate.getTime() - guidelinePlantDate.getTime()) /
      (24 * 60 * 60 * 1000),
  );

  const shiftedRules = rules.map((rule) => ({
    ...rule,
    startOffsetDays: rule.startOffsetDays + shiftDays,
    endOffsetDays: rule.endOffsetDays + shiftDays,
  }));
  return rulesToTimeline(shiftedRules, garden);
}

// Position within the half-month slot, so a frost date renders where it actually
// falls (e.g. Mar 15 sits at the boundary of Mar-Early/Mar-Late) instead of always
// pinning to the slot's left edge.
export function frostPosition(
  garden: GardenSettings,
  kind: "lastFrost" | "firstFrost",
) {
  const date = new Date(`${garden[kind]}T12:00:00Z`);
  const day = date.getUTCDate();
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const fraction =
    day > 15 ? (day - 15.5) / (daysInMonth - 15) : (day - 0.5) / 15;
  return { slot: dateToSlot(date), fraction };
}
