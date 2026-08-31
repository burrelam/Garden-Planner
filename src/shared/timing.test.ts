import { describe, expect, it } from "vitest";
import type { GardenSettings, TimingRule } from "./model";
import { dateToSlot, frostPosition, rulesToTimeline } from "./timing";

const garden: GardenSettings = {
  id: "primary",
  name: "Our Garden",
  zip: "97201",
  hardinessZone: "8b",
  timezone: "America/Los_Angeles",
  lastFrost: "2026-03-15",
  firstFrost: "2026-11-15",
};

describe("garden timing", () => {
  it("maps dates to early and late half-month slots", () => {
    expect(dateToSlot(new Date("2026-03-15T12:00:00Z"))).toBe(4);
    expect(dateToSlot(new Date("2026-03-16T12:00:00Z"))).toBe(5);
  });

  it("derives timing from explicit frost dates", () => {
    const rules: TimingRule[] = [
      {
        phase: "transplant",
        anchor: "lastFrost",
        startOffsetDays: 14,
        endOffsetDays: 35,
        sourceIds: ["test"],
      },
    ];
    const timeline = rulesToTimeline(rules, garden);
    expect(timeline[5].phase).toBe("transplant");
    expect(timeline[6].phase).toBe("transplant");
  });

  it("positions a frost date within its half-month slot instead of always at the edge", () => {
    // Mar 15 is the last day of the early half, so it should sit near the
    // right edge of Mar-Early (slot 4), not the left edge next to February.
    expect(frostPosition(garden, "lastFrost")).toEqual({
      slot: 4,
      fraction: (15 - 0.5) / 15,
    });
    // Nov 15 -> same shape, later slot.
    expect(frostPosition(garden, "firstFrost")).toEqual({
      slot: 20,
      fraction: (15 - 0.5) / 15,
    });
    // A late-half date (e.g. the 20th of a 30-day month) should fall partway
    // across the late column, proportional to its distance from day 16.
    const lateHalf = frostPosition({ ...garden, lastFrost: "2026-04-20" }, "lastFrost");
    expect(lateHalf.slot).toBe(7);
    expect(lateHalf.fraction).toBeCloseTo((20 - 15.5) / (30 - 15));
  });

  it("does not use hardiness zone to move frost-relative timing", () => {
    const rules: TimingRule[] = [
      {
        phase: "direct",
        anchor: "lastFrost",
        startOffsetDays: 0,
        endOffsetDays: 0,
        sourceIds: ["test"],
      },
    ];
    const a = rulesToTimeline(rules, garden);
    const b = rulesToTimeline(rules, { ...garden, hardinessZone: "5a" });
    expect(a).toEqual(b);
  });
});
