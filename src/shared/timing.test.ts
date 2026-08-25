import { describe, expect, it } from "vitest";
import type { GardenSettings, TimingRule } from "./model";
import { dateToSlot, rulesToTimeline } from "./timing";

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
