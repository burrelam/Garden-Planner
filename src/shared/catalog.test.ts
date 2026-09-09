import { describe, expect, it } from "vitest";
import { catalog, familyNames, sources } from "./catalog";

describe("catalog provenance", () => {
  it("points every reviewed fact and timing rule at a registered source", () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    for (const plant of catalog) {
      const facts = [
        plant.daysToMaturity,
        plant.sun,
        plant.water,
        plant.spacing,
        ...(plant.soil ? [plant.soil] : []),
        plant.growingTips,
        ...(plant.family ? [plant.family] : []),
      ];
      for (const fact of facts) {
        // A missing fact is allowed — a fact that exists must be able to name its source.
        if (!fact) continue;
        expect(fact.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fact.sourceIds.length).toBeGreaterThan(0);
        for (const id of fact.sourceIds)
          expect(sourceIds.has(id), `${plant.id} references ${id}`).toBe(true);
      }
      for (const cultivar of plant.cultivars) {
        for (const fact of [
          cultivar.daysToMaturity,
          cultivar.notes,
          cultivar.type,
          cultivar.habit,
        ]) {
          if (!fact) continue;
          expect(fact.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(fact.sourceIds.length).toBeGreaterThan(0);
          for (const id of fact.sourceIds)
            expect(
              sourceIds.has(id),
              `${plant.id}/${cultivar.id} references ${id}`,
            ).toBe(true);
        }
      }
      for (const rule of plant.timing) {
        expect(rule.sourceIds.length).toBeGreaterThan(0);
        for (const id of rule.sourceIds) expect(sourceIds.has(id)).toBe(true);
      }
      for (const problem of plant.problems) {
        expect(problem.sourceIds.length).toBeGreaterThan(0);
        for (const id of problem.sourceIds)
          expect(
            sourceIds.has(id),
            `${plant.id}/${problem.id} references ${id}`,
          ).toBe(true);
      }
      if (plant.toxicity) {
        expect(plant.toxicity.sourceIds.length).toBeGreaterThan(0);
        for (const id of plant.toxicity.sourceIds)
          expect(
            sourceIds.has(id),
            `${plant.id} toxicity references ${id}`,
          ).toBe(true);
      }
      for (const relationship of plant.companions) {
        expect([
          "research-supported",
          "extension-guidance",
          "observational",
          "traditional",
        ]).toContain(relationship.evidenceLevel);
        expect(relationship.mechanism).toBeTruthy();
      }
    }
  });
});

describe("plant families", () => {
  it("can say every family it carries in plain words", () => {
    // The line on a plant page reads "in the daisy family". A family with no
    // friendly name falls back to the Latin, which is exactly the dry taxonomy
    // the line exists to avoid — so every family in use needs an entry.
    for (const plant of catalog) {
      if (!plant.family) continue;
      expect(
        familyNames[plant.family.value],
        `${plant.id} is in ${plant.family.value}, which has no plain-words name`,
      ).toBeTruthy();
    }
  });

  it("gives every plant a family, so nobody is left without relatives", () => {
    for (const plant of catalog)
      expect(plant.family?.value, `${plant.id} has no family`).toBeTruthy();
  });
});

describe("plants that are planted once", () => {
  it("still has something to draw after the planting pills come off", () => {
    /* The calendar drops the sowing and planting pills for one of these as soon
       as the row says planted. A plant whose only rules describe planting would
       then render an empty row, so each one has to own a phase that outlives
       going in the ground. */
    for (const plant of catalog) {
      if (!plant.plantOnce) continue;
      const lasting = plant.timing.filter(
        (rule) => rule.phase === "bloom" || rule.phase === "harvest",
      );
      expect(
        lasting.length,
        `${plant.id} is planted once but has no bloom or harvest window`,
      ).toBeGreaterThan(0);
    }
  });

  it("is never something grown from a bulb, corm or tuber", () => {
    /* Amanda's rule: she lifts the dahlias and rebuys the tulips, so those keep
       their planting window every year no matter how long they live. Only crowns,
       bare root and shrubs are planted once. */
    const grownFromStorageOrgan = [
      "daffodil",
      "tulip",
      "dahlia",
      "gladiolus",
      "crocus",
      "hyacinth",
      "onion",
      "garlic",
      "shallot",
    ];
    for (const id of grownFromStorageOrgan) {
      const plant = catalog.find((item) => item.id === id);
      if (!plant) continue;
      expect(plant.plantOnce, `${id} should keep its planting window`).not.toBe(
        true,
      );
    }
  });
});
