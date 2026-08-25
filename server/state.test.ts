import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import {
  createAmandaGarden,
  mapLegacyExport,
  previewLegacyExport,
} from "./state";

function originalArray<T>(name: "DEFAULT_BEDS" | "DEFAULT_PLANTS") {
  const html = readFileSync(
    resolve(process.cwd(), "original-planner/index.html"),
    "utf8",
  );
  const match = html.match(
    new RegExp(`const ${name} = (\\[[\\s\\S]*?\\n\\]);`),
  );
  if (!match) throw new Error(`Could not find ${name} in the original planner`);
  const sandbox: { result?: T } = {};
  runInNewContext(
    `const getPlantMonths = () => []; result = ${match[1]};`,
    sandbox,
  );
  return sandbox.result!;
}

describe("the committed Amanda garden", () => {
  it("matches every bed and plant field in her preserved planner", () => {
    const garden = createAmandaGarden();
    const originalBeds =
      originalArray<Array<{ id: string; label: string; color: string }>>(
        "DEFAULT_BEDS",
      );
    const originalPlants = originalArray<
      Array<{
        id: string;
        name: string;
        variety: string | null;
        dtm: string;
        bed: string;
        status: "planted" | "willplant" | "undecided";
        qty?: number;
      }>
    >("DEFAULT_PLANTS");

    expect(
      garden.beds.map(({ id, label, color, sortOrder }) => ({
        id,
        label,
        color,
        sortOrder,
      })),
    ).toEqual(
      originalBeds.map((bed, sortOrder) => ({
        ...bed,
        color:
          bed.color.length === 4
            ? `#${[...bed.color.slice(1)].map((part) => part + part).join("")}`
            : bed.color,
        sortOrder,
      })),
    );
    expect(
      garden.entries.map(
        ({ id, name, variety, dtm, qty, bedId, status, sortOrder }) => ({
          id,
          name,
          variety,
          dtm,
          qty,
          bedId,
          status,
          sortOrder,
        }),
      ),
    ).toEqual(
      originalPlants.map((plant, sortOrder) => ({
        id: plant.id,
        name: plant.name,
        variety: plant.variety,
        dtm: plant.dtm,
        qty: plant.qty ?? 1,
        bedId: plant.bed,
        status: plant.status,
        sortOrder,
      })),
    );
  });
});

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
