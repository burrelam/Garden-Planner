import { describe, expect, it } from "vitest";
import type { GardenEntry, GardenSettings, TimingRule } from "./model";
import { dateToSlot, frostPosition, rulesToTimeline } from "./timing";
import { sowingLanesForEntry } from "./seasons";

const garden: GardenSettings = {
  id: "primary",
  name: "Our Garden",
  zip: "97201",
  hardinessZone: "8b",
  timezone: "America/Los_Angeles",
  lastFrost: "2026-03-15",
  firstFrost: "2026-11-15",
  showFrostMarks: true,
  showPillPredictions: false,
  showPlantedMarkers: false,
  wishlistDefaultStatus: "undecided",
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
    const lateHalf = frostPosition(
      { ...garden, lastFrost: "2026-04-20" },
      "lastFrost",
    );
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

describe("a row's sowing lanes", () => {
  const entry = (
    timingOverride: GardenEntry["timingOverride"],
  ): GardenEntry => ({
    id: "e1",
    plantId: null,
    name: "Test Crop",
    variety: null,
    dtm: null,
    qty: 1,
    bedId: null,
    status: "willplant",
    sortOrder: 0,
    timingOverride,
  });

  it("gives a plant sown once the single timeline it always drew", () => {
    const lanes = sowingLanesForEntry(
      entry([
        {
          phase: "direct",
          anchor: "lastFrost",
          startOffsetDays: 14,
          endOffsetDays: 35,
        },
      ]),
      garden,
    );
    expect(lanes).toHaveLength(1);
    expect(lanes[0].sowing).toBeUndefined();
    expect(lanes[0].slots[5].phase).toBe("direct");
  });

  it("gives a crop sown twice a lane each, earliest on top", () => {
    // Written late sowing first, to prove the lanes are ordered by when they
    // go in the ground rather than by the order the rules are listed.
    const lanes = sowingLanesForEntry(
      entry([
        {
          phase: "direct",
          anchor: "firstFrost",
          startOffsetDays: -95,
          endOffsetDays: -70,
          sowing: "late-summer",
        },
        {
          phase: "direct",
          anchor: "lastFrost",
          startOffsetDays: 17,
          endOffsetDays: 55,
          sowing: "spring",
        },
      ]),
      garden,
    );
    expect(lanes.map((lane) => lane.sowing)).toEqual(["spring", "late-summer"]);
    // Spring is in the ground in April; the late-summer sowing is not.
    expect(lanes[0].slots[6].phase).toBe("direct");
    expect(lanes[1].slots[6].phase).toBeNull();
    // And in August the late-summer sowing is, while spring is done.
    expect(lanes[1].slots[14].phase).toBe("direct");
    expect(lanes[0].slots[14].phase).toBeNull();
  });

  it("paints a rule that names no sowing into every lane", () => {
    const lanes = sowingLanesForEntry(
      entry([
        {
          phase: "direct",
          anchor: "lastFrost",
          startOffsetDays: 17,
          endOffsetDays: 55,
          sowing: "spring",
        },
        {
          phase: "direct",
          anchor: "firstFrost",
          startOffsetDays: -95,
          endOffsetDays: -70,
          sowing: "late-summer",
        },
        {
          phase: "indoor",
          anchor: "lastFrost",
          startOffsetDays: -40,
          endOffsetDays: -30,
        },
      ]),
      garden,
    );
    expect(
      lanes[0].slots[dateToSlot(new Date("2026-02-10T12:00:00Z"))].phase,
    ).toBe("indoor");
    expect(
      lanes[1].slots[dateToSlot(new Date("2026-02-10T12:00:00Z"))].phase,
    ).toBe("indoor");
  });
});

describe("a window that runs past the turn of the year", () => {
  const rule = (
    phase: TimingRule["phase"],
    startOffsetDays: number,
    endOffsetDays: number,
  ): TimingRule => ({
    phase,
    anchor: "lastFrost",
    startOffsetDays,
    endOffsetDays,
    sourceIds: ["osu-vegetable-oregon"],
  });
  const painted = (slots: ReturnType<typeof rulesToTimeline>) =>
    slots.flatMap((slot, index) => (slot.phase ? [index] : []));

  it("wraps around the calendar instead of painting backwards", () => {
    // Onions: started indoors 21 December, set out 22 March. The year is a
    // ring — December sits next to January, not eleven months from it.
    const slots = rulesToTimeline([rule("indoor", -84, 7)], garden);
    expect(painted(slots)).toEqual([0, 1, 2, 3, 4, 5, 23]);
    // The months in between must stay empty: this used to say "start indoors"
    // in June and again in October.
    for (const june of [10, 11, 12]) expect(slots[june].phase).toBe(null);
  });

  it("still paints an ordinary window between its own two ends", () => {
    // 14 April to 13 June: the back half of April through the front of June.
    expect(painted(rulesToTimeline([rule("harvest", 30, 90)], garden))).toEqual(
      [6, 7, 8, 9, 10],
    );
  });

  it("marks only the start when the dates are backwards", () => {
    // Malformed rather than wrapping — one cell beats swallowing the year.
    expect(painted(rulesToTimeline([rule("direct", 60, 10)], garden))).toEqual([
      8,
    ]);
  });
});
