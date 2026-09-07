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
    expect(indoorWindowFor(plant("tomato"), garden)).toEqual({
      start: "2026-01-18",
      end: "2026-02-01",
    });
  });

  it("files a window under the season it starts in", () => {
    expect(seasonOfWindow(windows("peas")[0])).toBe("winter");
    expect(seasonOfWindow(windows("tomato")[0])).toBe("spring");
    // Garlic goes in on 11 October, which is fall planting either way.
    expect(seasonOfWindow(windows("garlic")[0])).toBe("fall");
  });

  it("carries the picking dates the catalog records", () => {
    expect(windows("tomato")[0].harvest).toEqual({
      start: "2026-05-24",
      end: "2026-08-12",
    });
    // Marigolds bloom rather than being picked, and still get a window.
    expect(windows("marigold")[0].harvest).not.toBeNull();
  });

  it("gives every catalog plant at least one way into the ground", () => {
    for (const record of catalogById.values())
      expect(sowingWindowsFor(record, garden).length).toBeGreaterThan(0);
  });

  it("moves with the garden's frost dates", () => {
    const later = { ...garden, lastFrost: "2026-04-15" };
    expect(sowingWindowsFor(plant("tomato"), later)[0].start).toBe(
      "2026-04-29",
    );
    expect(harvestWindowFor(plant("tomato"), later)?.start).toBe("2026-06-24");
  });
});
