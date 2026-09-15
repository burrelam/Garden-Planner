import { describe, expect, it } from "vitest";
import type { TimelineSlot } from "./timing";
import {
  laneNote,
  runAround,
  slotRangeWords,
  slotWords,
  variantNote,
} from "./pillBubble";

/** A year of empty slots, with runs painted in by phase. */
const year = (
  runs: Array<{ from: number; to: number; phase: TimelineSlot["phase"] }>,
): TimelineSlot[] => {
  const slots: TimelineSlot[] = Array.from({ length: 24 }, (_, i) => ({
    phase: null,
    month: Math.floor(i / 2),
    half: i % 2 ? ("late" as const) : ("early" as const),
  }));
  for (const run of runs)
    for (let i = run.from; i <= run.to; i += 1)
      slots[i] = { ...slots[i], phase: run.phase };
  return slots;
};

describe("saying when a pill happens", () => {
  it("names the half of the month", () => {
    expect(slotWords(0)).toBe("early January");
    expect(slotWords(1)).toBe("late January");
    expect(slotWords(23)).toBe("late December");
  });

  it("says a single fortnight once, not as a range", () => {
    expect(slotRangeWords(8, 8)).toBe("early May");
  });

  it("says a run as where it starts and where it ends", () => {
    expect(slotRangeWords(8, 11)).toBe("early May to late June");
  });
});

describe("how far the phase under your finger runs", () => {
  const slots = year([
    { from: 4, to: 7, phase: "direct" },
    { from: 12, to: 15, phase: "harvest" },
  ]);

  it("widens out to the whole band, wherever in it you tap", () => {
    // Tapping the middle of a green band asks about the band, not the fortnight.
    for (const tapped of [12, 13, 14, 15]) {
      expect(runAround(slots, tapped)).toEqual({
        phase: "harvest",
        start: 12,
        end: 15,
      });
    }
  });

  it("stops where the phase changes", () => {
    expect(runAround(slots, 7)).toEqual({ phase: "direct", start: 4, end: 7 });
  });

  it("says nothing for an empty slot", () => {
    expect(runAround(slots, 9)).toBe(null);
  });

  it("does not join a run across the turn of the year", () => {
    // A planting that crosses New Year is two runs on the drawn calendar, and
    // a bubble tapped in January must not claim the previous autumn.
    const wraps = year([
      { from: 0, to: 2, phase: "harvest" },
      { from: 21, to: 23, phase: "harvest" },
    ]);
    expect(runAround(wraps, 1)).toEqual({
      phase: "harvest",
      start: 0,
      end: 2,
    });
    expect(runAround(wraps, 22)).toEqual({
      phase: "harvest",
      start: 21,
      end: 23,
    });
  });

  it("keeps one picking whole when the guide and her own date differ", () => {
    // The overlay changes the pill's fill partway along; the run is still one
    // picking, so walking it must ignore the variant and follow the phase.
    const picking = year([{ from: 16, to: 19, phase: "harvest" }]);
    expect(runAround(picking, 17)).toEqual({
      phase: "harvest",
      start: 16,
      end: 19,
    });
  });
});

describe("what the bubble adds about this particular pill", () => {
  it("tells the two kinds of dashes apart", () => {
    expect(variantNote("Tint", false)).toMatch(/Still a maybe/);
    expect(variantNote("Tint", true)).toMatch(/guide daydreaming/);
  });

  it("says a slashed pill is not in the ground yet", () => {
    expect(variantNote("Slashed", false)).toMatch(/Still just a plan/);
  });

  it("credits her own logged date", () => {
    expect(variantNote("Actual", true)).toMatch(/your own handwriting/);
  });

  it("congratulates a plain pill on a dated row, and says nothing otherwise", () => {
    expect(variantNote("", true)).toMatch(/Spot on!/);
    expect(variantNote("", false)).toBe("");
  });

  it("explains an overwintering lane rather than just naming it", () => {
    expect(laneNote("Overwintering", true)).toMatch(/sits through it/);
    expect(laneNote("Spring", false)).toBe("This is the spring sowing.");
    expect(laneNote(undefined, false)).toBe("");
  });
});
