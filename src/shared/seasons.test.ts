import { describe, expect, it } from "vitest";
import { catalogById } from "./catalog";
import type {
  GardenEntry,
  GardenSettings,
  PlantRecord,
  TimingRule,
} from "./model";
import {
  harvestWindowFor,
  indoorWindowFor,
  plantingSeasonOf,
  seasonOfWindow,
  seasonsOfRange,
  sowingActionLabel,
  sowingLanesForEntry,
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

/* A plant made up on the spot, so the named-sowing rules can be exercised
   without putting dates nobody has sourced into the shipped catalog. */
const rule = (
  phase: TimingRule["phase"],
  startOffsetDays: number,
  endOffsetDays: number,
  sowing?: string,
): TimingRule => ({
  phase,
  anchor: "lastFrost",
  startOffsetDays,
  endOffsetDays,
  sourceIds: ["osu-vegetable-oregon"],
  sowing,
});

const sown = (timing: TimingRule[]): PlantRecord => ({
  id: "test-crop",
  commonName: "Test Crop",
  category: "vegetable",
  summary: "A crop that exists only in this test.",
  timing,
  cultivars: [],
  problems: [],
  companions: [],
  growingTips: {
    value: [],
    sourceIds: ["osu-vegetable-oregon"],
    locationScope: "western-oregon",
    evidenceLevel: "extension-guidance",
    reviewedAt: "2026-09-08",
  },
  reviewStatus: "reviewed",
});

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
  it("merges overlapping transplant and direct windows, then cuts by season", () => {
    // EC 871 puts lettuce in the ground April through August in the Western valleys, whether
    // set out or direct sown; those overlap, so they read as one stretch, not two buttons.
    // Five months is two growing seasons though — sow in spring and you pick in summer, sow in
    // summer and you pick in the fall — so the stretch is cut where the seasons change.
    const lettuce = windows("lettuce");
    expect(lettuce).toHaveLength(2);
    expect([lettuce[0].start, lettuce[0].end]).toEqual([
      "2026-04-01",
      "2026-05-31",
    ]);
    expect([lettuce[1].start, lettuce[1].end]).toEqual([
      "2026-06-01",
      "2026-08-31",
    ]);
    // Both halves still describe the act the same way, because the phases came with them.
    expect(sowingActionLabel(lettuce[0])).toBe("Sow or set out");
    expect(sowingActionLabel(lettuce[1])).toBe("Sow or set out");
  });

  it("gives each season's sowing the picking dates that sowing produces", () => {
    // Carrots are 60–88 days, which the catalog's own sowing and harvest rules already imply.
    // The spring sowing is picked from late April, the summer one not until the end of July —
    // instead of one smear claiming carrots are pickable from April right through October.
    const [spring, summer] = windows("carrot");
    expect(spring.harvest).toEqual({
      start: "2026-04-30",
      end: "2026-08-27",
    });
    expect(summer.harvest).toEqual({
      start: "2026-07-31",
      end: "2026-10-11",
    });
    // Between them they still cover exactly what the plant's own harvest rule says.
    const whole = harvestWindowFor(plant("carrot"), garden)!;
    expect(spring.harvest!.start).toBe(whole.start);
    expect(summer.harvest!.end).toBe(whole.end);
  });

  it("leaves a short stretch whole, however the calendar labels it", () => {
    // Beans go in through May and June. That crosses from spring into summer on the calendar
    // without being two growing seasons by any gardener's reckoning, so it stays one sowing.
    const beans = windows("bean");
    expect(beans).toHaveLength(1);
    expect([beans[0].start, beans[0].end]).toEqual([
      "2026-05-01",
      "2026-06-30",
    ]);
  });

  it("does not work out maturity for a crop that overwinters", () => {
    // Garlic goes in during autumn and is lifted the following summer. Measuring its harvest
    // against its sowing gives a negative maturity and dates that run backwards, so it keeps
    // the single harvest rule the catalog states for it.
    for (const window of windows("garlic")) {
      expect(window.harvest).toEqual(harvestWindowFor(plant("garlic"), garden));
      expect(window.harvest!.start <= window.harvest!.end).toBe(true);
    }
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

  it("keeps named sowings apart even where they run into each other", () => {
    // The lettuce shape: the ground is occupied continuously from April to
    // August, so merging by overlap gives one stretch and one smeared harvest.
    // Naming the sowings splits the same dates into the two plantings a
    // gardener actually makes, each carrying what it alone produces.
    const twiceSown = sown([
      rule("direct", 17, 55, "spring"),
      rule("harvest", 52, 100, "spring"),
      rule("direct", 56, 169, "late-summer"),
      rule("harvest", 120, 242, "late-summer"),
    ]);
    const windows = sowingWindowsFor(twiceSown, garden);
    expect(windows).toHaveLength(2);
    expect(windows.map((window) => window.sowing)).toEqual([
      "spring",
      "late-summer",
    ]);
    expect(windows[0].harvest).toEqual({
      start: "2026-05-06",
      end: "2026-06-23",
    });
    expect(windows[1].harvest).toEqual({
      start: "2026-07-13",
      end: "2026-11-12",
    });
  });

  it("numbers named sowings by date, not by the order they are written", () => {
    // A wish already saved against window 0 has to keep meaning the year's
    // first sowing, however the rules happen to be listed in the catalog.
    const outOfOrder = sown([
      rule("direct", 120, 169, "late-summer"),
      rule("direct", 17, 55, "spring"),
    ]);
    const windows = sowingWindowsFor(outOfOrder, garden);
    expect(windows.map((window) => window.sowing)).toEqual([
      "spring",
      "late-summer",
    ]);
    expect(windows.map((window) => window.index)).toEqual([0, 1]);
  });

  it("gives a sowing only the indoor start that is its own", () => {
    const twiceSown = sown([
      rule("indoor", -18, 0, "spring"),
      rule("direct", 17, 55, "spring"),
      rule("direct", 120, 169, "late-summer"),
    ]);
    expect(indoorWindowFor(twiceSown, garden, "spring")).toEqual({
      start: "2026-02-25",
      end: "2026-03-15",
    });
    // The late-summer sowing goes straight in the ground. It says nothing
    // rather than borrowing the spring sowing's indoor dates.
    expect(indoorWindowFor(twiceSown, garden, "late-summer")).toBeNull();
  });

  it("moves with the garden's frost dates", () => {
    const later = { ...garden, lastFrost: "2026-04-15" };
    expect(sowingWindowsFor(plant("tomato"), later)[0].start).toBe(
      "2026-06-01",
    );
    expect(harvestWindowFor(plant("tomato"), later)?.start).toBe("2026-07-31");
  });
});

describe("what earns a lane of its own", () => {
  const rowFor = (plantId: string): GardenEntry => ({
    id: "e1",
    plantId,
    name: plantId,
    variety: null,
    dtm: null,
    qty: 1,
    bedId: null,
    status: "willplant",
    sortOrder: 0,
  });
  // Amanda's own frost dates rather than the defaults: they are what pushed
  // garlic's autumn planting back into August and gave it a third window.
  const hers: GardenSettings = {
    ...garden,
    lastFrost: "2026-04-15",
    firstFrost: "2026-10-15",
  };

  it("gives an overwintering sowing a lane of its own", () => {
    // Garlic can go in during the autumn and sit through the winter, or go in
    // during late winter and not. Both are lifted the same summer, but they
    // are two different plantings on two different timelines and a gardener
    // choosing between them wants to see both.
    for (const settings of [garden, hers]) {
      const lanes = sowingLanesForEntry(rowFor("garlic"), settings);
      expect(lanes).toHaveLength(2);
      expect(lanes.map((lane) => lane.sowing)).toContain("Overwintering");
    }
  });

  it("keeps every autumn planting of one crop in the same overwintering lane", () => {
    // At Amanda's frost dates garlic's autumn stretch is long enough for the
    // season splitter to cut it in two. Both halves overwinter, so they are
    // one way of growing the crop and share a lane — cutting them apart is
    // what gave garlic three lanes and a row half again as tall.
    const windows = sowingWindowsFor(plant("garlic"), hers);
    expect(
      windows.filter((window) => window.overwinters).length,
    ).toBeGreaterThan(1);
    expect(sowingLanesForEntry(rowFor("garlic"), hers)).toHaveLength(2);
  });

  it("gives shallots a lane each, now that both plantings have picking dates", () => {
    // This used to be the case with nothing to tell two sowings apart, because
    // OSU gives shallots sowing months and no maturity. Utah State dates both:
    // autumn sets crop the following late spring, and a late-winter planting
    // gives green tops 50 to 60 days on. Two crops, two lanes.
    for (const settings of [garden, hers]) {
      const lanes = sowingLanesForEntry(rowFor("shallot"), settings);
      expect(lanes).toHaveLength(2);
      expect(lanes.map((lane) => lane.sowing)).toEqual([
        "Late winter",
        "Autumn",
      ]);
    }
  });

  it("still gives a lane each where the pickings genuinely differ", () => {
    const carrots = sowingLanesForEntry(rowFor("carrot"), hers);
    expect(carrots).toHaveLength(2);
    expect(carrots.map((lane) => lane.sowing)).toEqual(["Spring", "Summer"]);
  });
});
