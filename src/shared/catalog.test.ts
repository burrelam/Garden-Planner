import { describe, expect, it } from "vitest";
import { catalog, sources } from "./catalog";

describe("catalog provenance", () => {
  it("points every reviewed fact and timing rule at a registered source", () => {
    const sourceIds = new Set(sources.map((source) => source.id));
    for (const plant of catalog) {
      const facts = [
        plant.daysToMaturity,
        plant.sun,
        plant.water,
        plant.spacing,
        plant.growingTips,
      ];
      for (const fact of facts) {
        expect(fact.reviewedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(fact.sourceIds.length).toBeGreaterThan(0);
        for (const id of fact.sourceIds)
          expect(sourceIds.has(id), `${plant.id} references ${id}`).toBe(true);
      }
      for (const rule of plant.timing)
        for (const id of rule.sourceIds) expect(sourceIds.has(id)).toBe(true);
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
