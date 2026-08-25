import { describe, expect, it } from "vitest";
import { mapLegacyExport, previewLegacyExport } from "./state";

describe("legacy garden migration", () => {
  const legacy = {
    version: 1,
    plants: [
      {
        id: "old-tomato",
        name: "Tomato",
        variety: "Family Roma",
        dtm: "72 days",
        qty: 6,
        bed: "bed-one",
        status: "planted",
        months: ["stale", "computed", "values"],
      },
      {
        name: "Grandma’s ground cherry",
        variety: "Saved seed",
        qty: 2,
        status: "undecided",
      },
    ],
    beds: [{ id: "bed-one", label: "Sunny bed", color: "#4A5E3A" }],
    customVarieties: { Tomato: ["Family Roma"] },
  };

  it("keeps personal data while replacing stale calendar cells", () => {
    const state = mapLegacyExport(legacy, {
      zip: "97330",
      lastFrost: "2026-04-15",
      firstFrost: "2026-10-25",
    });
    expect(state.entries[0]).toMatchObject({
      plantId: "tomato",
      variety: "Family Roma",
      dtm: "72 days",
      qty: 6,
      bedId: "bed-one",
    });
    expect(state.entries[0]).not.toHaveProperty("months");
    expect(state.entries[1]).toMatchObject({
      plantId: null,
      name: "Grandma’s ground cherry",
    });
    expect(state.garden.lastFrost).toBe("2026-04-15");
  });

  it("previews counts and calls out custom plants without changing state", () => {
    expect(previewLegacyExport(legacy)).toEqual({
      plants: 2,
      beds: 1,
      customPlants: ["Grandma’s ground cherry"],
      varieties: 2,
    });
  });
});
