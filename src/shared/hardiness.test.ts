import { describe, expect, it } from "vitest";
import { hardinessVerdict, zoneRank } from "./hardiness";

describe("reading a USDA zone", () => {
  it("orders half zones by how cold they are", () => {
    expect(zoneRank("5a")!).toBeLessThan(zoneRank("5b")!);
    expect(zoneRank("5b")!).toBeLessThan(zoneRank("6a")!);
    // The string sort that would tempt anyone: "10b" reads as less than "9a".
    expect(zoneRank("9a")!).toBeLessThan(zoneRank("10b")!);
  });

  it("treats a bare number as the colder half", () => {
    expect(zoneRank("7")).toBe(zoneRank("7a"));
  });

  it("refuses anything that is not a zone", () => {
    // The field is free text, so a gardener can type whatever she likes.
    for (const value of ["", "eight", "5c", "0", "14a", "8b or so"])
      expect(zoneRank(value)).toBeNull();
  });
});

describe("what a zone range means for a garden", () => {
  const rosemary = { min: "8a", max: "10b" };
  const peony = { min: "3a", max: "8b" };

  it("says a plant well inside its range comes back", () => {
    expect(hardinessVerdict(peony, "5b")!.tone).toBe("safe");
  });

  it("warns when the garden is colder than the plant survives", () => {
    const verdict = hardinessVerdict(rosemary, "5a")!;
    expect(verdict.tone).toBe("cold");
    expect(verdict.text).toContain("8a");
  });

  it("warns when the garden is warmer than the plant likes", () => {
    expect(hardinessVerdict(peony, "10a")!.tone).toBe("warm");
  });

  it("flags a plant sitting within a half zone of its cold limit", () => {
    // Amanda's own case: rosemary is hardy to 8a and her garden is 8b, which
    // is inside the range but with one hard winter's worth of margin.
    expect(hardinessVerdict(rosemary, "8b")!.tone).toBe("edge");
    expect(hardinessVerdict(rosemary, "8a")!.tone).toBe("edge");
    expect(hardinessVerdict(rosemary, "9a")!.tone).toBe("safe");
  });

  it("says nothing rather than guessing when a zone will not parse", () => {
    expect(hardinessVerdict(rosemary, "")).toBeNull();
    expect(hardinessVerdict({ min: "", max: "10b" }, "8b")).toBeNull();
  });
});
