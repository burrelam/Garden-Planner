import { describe, expect, it } from "vitest";
import { catalogById } from "./catalog";
import type { GardenSettings } from "./model";
import {
  harvestWindowFor,
  indoorWindowFor,
  plantingSeasonOf,
  seasonOfWindow,
  seasonsOfRange,
  sowingActionLabel,
  sowingWindowsFor,
} from "./seasons";

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
};

const plant = (id: string) => catalogById.get(id)!;
const windows = (id: string) => sowingWindowsFor(plant(id), garden);

describe("the gardener's calendar", () => {
  it("puts whole months in one season", () => {
    expect(plantingSeasonOf(new Date("2026-03-01T12:00:00Z"))).toBe("spring");
    expect(plantingSeasonOf(new Date("2026-05-31T12:00:00Z"))).toBe("spring");
    expect(plantingSeasonOf(new Date("2026-06-01T12:00:00Z"))).toBe("summer");
    expect(plantingSeasonOf(new Date("2026-12-01T12:00:00Z"))).toBe("winter");
    expect(plantingSeasonOf(new Date("2026-02-28T12:00:00Z"))).toBe("winter");
  });

  it("names every season a range passes through", () => {
    expect(seasonsOfRange({ start: "2026-02-08", end: "2026-04-19" })).toEqual([
      "winter",
      "spring",
    ]);
    expect(seasonsOfRange({ start: "2026-03-29", end: "2026-04-26" })).toEqual([
      "spring",
    ]);
  });
});

describe("sowing windows", () => {
  it("merges overlapping transplant and direct windows into one", () => {
    // EC 871 puts lettuce in the ground April through August in the Western valleys, whether
    // set out or direct sown; those overlap, so the gardener sees one stretch, not two buttons.
    const lettuce = windows("lettuce");
    expect(lettuce).toHaveLength(1);
    expect(lettuce[0].start).toBe("2026-04-01");
    expect(lettuce[0].end).toBe("2026-08-31");
    expect(sowingActionLabel(lettuce[0])).toBe("Sow or set out");
  });

  it("ignores indoor starts, which are not going in the ground", () => {
    const tomato = windows("tomato");
    expect(tomato).toHaveLength(1);
    expect(tomato[0].phases).toEqual(["transplant"]);
    // EC 871 starts tomatoes indoors 8 weeks before the region 2 May planting.
    expect(indoorWindowFor(plant("tomato"), garden)).toEqual({
      start: "2026-03-06",
      end: "2026-04-05",
    });
  });

  it("files a window under the season it starts in", () => {
    expect(seasonOfWindow(windows("peas")[0])).toBe("winter");
    expect(seasonOfWindow(windows("tomato")[0])).toBe("spring");
    // EC 871 plants garlic any time from September to February in the Western valleys, so it
    // has two windows: the main fall one and a late-winter one either side of the new year.
    const garlic = windows("garlic");
    expect(garlic).toHaveLength(2);
    expect(seasonOfWindow(garlic[0])).toBe("winter");
    expect(seasonOfWindow(garlic[1])).toBe("fall");
  });

  it("carries the picking dates the catalog records", () => {
    expect(windows("tomato")[0].harvest).toEqual({
      start: "2026-06-30",
      end: "2026-08-14",
    });
    // Peas are picked rather than cut, and still carry dates.
    expect(windows("peas")[0].harvest).not.toBeNull();
  });

  it("either knows how a plant goes in the ground or says nothing at all", () => {
    // A plant with timing rules must produce a window a gardener can act on. A plant whose
    // sources give no sowing date carries no rules rather than borrowing another crop's.
    const withoutTiming: string[] = [];
    for (const record of catalogById.values()) {
      if (record.timing.length === 0) {
        withoutTiming.push(record.id);
        continue;
      }
      expect(
        sowingWindowsFor(record, garden).length,
        `${record.id} has timing rules but no sowing window`,
      ).toBeGreaterThan(0);
    }
    // Every plant now has a sourced window. The list is kept, and kept empty, so that adding a
    // plant nobody has dated fails here rather than sliding in with a borrowed date.
    expect(withoutTiming.sort()).toEqual([]);
  });

  it("moves with the garden's frost dates", () => {
    const later = { ...garden, lastFrost: "2026-04-15" };
    expect(sowingWindowsFor(plant("tomato"), later)[0].start).toBe(
      "2026-06-01",
    );
    expect(harvestWindowFor(plant("tomato"), later)?.start).toBe("2026-07-31");
  });
});
