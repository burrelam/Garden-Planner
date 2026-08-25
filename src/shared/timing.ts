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

export function timelineForEntry(entry: GardenEntry, garden: GardenSettings) {
  const rules =
    entry.timingOverride ??
    (entry.plantId ? catalogById.get(entry.plantId)?.timing : undefined) ??
    [];
  return rulesToTimeline(rules, garden);
}

export function frostSlot(
  garden: GardenSettings,
  kind: "lastFrost" | "firstFrost",
) {
  return dateToSlot(new Date(`${garden[kind]}T12:00:00Z`));
}
