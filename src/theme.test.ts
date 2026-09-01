import { describe, expect, it } from "vitest";
import {
  BED_COLOR_KEYS,
  bedColorLabel,
  bedStyle,
  inkForHex,
  isBedColorKey,
  resolveTheme,
  seasonForDate,
} from "./theme";

const on = (iso: string) => new Date(`${iso}T12:00:00`);

describe("seasonForDate", () => {
  it("follows the equinoxes and solstices, not calendar months", () => {
    // 1 September is still summer — the equinox has not happened yet.
    expect(seasonForDate(on("2026-09-01"))).toBe("summer");
    expect(seasonForDate(on("2026-09-21"))).toBe("summer");
    expect(seasonForDate(on("2026-09-22"))).toBe("fall");
  });

  it("picks each season mid-way through it", () => {
    expect(seasonForDate(on("2026-04-15"))).toBe("spring");
    expect(seasonForDate(on("2026-07-15"))).toBe("summer");
    expect(seasonForDate(on("2026-10-15"))).toBe("fall");
    expect(seasonForDate(on("2026-01-15"))).toBe("winter");
  });

  it("handles both edges of every boundary", () => {
    expect(seasonForDate(on("2026-03-19"))).toBe("winter");
    expect(seasonForDate(on("2026-03-20"))).toBe("spring");
    expect(seasonForDate(on("2026-06-20"))).toBe("spring");
    expect(seasonForDate(on("2026-06-21"))).toBe("summer");
    expect(seasonForDate(on("2026-12-20"))).toBe("fall");
    expect(seasonForDate(on("2026-12-21"))).toBe("winter");
  });

  it("carries winter across the new year", () => {
    expect(seasonForDate(on("2026-12-31"))).toBe("winter");
    expect(seasonForDate(on("2027-01-01"))).toBe("winter");
  });

  it("never lands on twilight", () => {
    for (let day = 0; day < 366; day += 1) {
      const date = new Date(2026, 0, 1);
      date.setDate(date.getDate() + day);
      expect(seasonForDate(date)).not.toBe("night");
    }
  });
});

describe("resolveTheme", () => {
  it("follows the calendar when set to auto", () => {
    expect(resolveTheme("auto", on("2026-09-01"))).toBe("summer");
    expect(resolveTheme("auto", on("2026-10-01"))).toBe("fall");
  });

  it("honours an explicit choice whatever the date", () => {
    expect(resolveTheme("winter", on("2026-07-15"))).toBe("winter");
    expect(resolveTheme("night", on("2026-07-15"))).toBe("night");
  });
});

describe("bed colours", () => {
  it("offers twenty per season", () => {
    expect(BED_COLOR_KEYS).toHaveLength(20);
    expect(new Set(BED_COLOR_KEYS).size).toBe(20);
  });

  it("recognises its own keys and rejects anything else", () => {
    expect(isBedColorKey("deep-fern")).toBe(true);
    expect(isBedColorKey("soft-plum")).toBe(true);
    expect(isBedColorKey("#4A5E3A")).toBe(false);
    expect(isBedColorKey(undefined)).toBe(false);
  });

  it("names them readably", () => {
    expect(bedColorLabel("deep-fern")).toBe("Deep Fern");
  });

  it("resolves palette beds through CSS so they retint with the season", () => {
    expect(bedStyle({ color: "#000000", colorKey: "deep-fern" })).toEqual({
      backgroundColor: "var(--bed-deep-fern)",
      color: "var(--bed-ink-deep)",
    });
    expect(bedStyle({ color: "#000000", colorKey: "soft-sky" })).toEqual({
      backgroundColor: "var(--bed-soft-sky)",
      color: "var(--bed-ink-soft)",
    });
  });

  it("keeps beds saved before the palette working, with readable ink", () => {
    expect(bedStyle({ color: "#4A5E3A" })).toEqual({
      backgroundColor: "#4A5E3A",
      color: "#FFFFFF",
    });
    expect(bedStyle({ color: "#F5E9A0" })).toEqual({
      backgroundColor: "#F5E9A0",
      color: "#1A1A1A",
    });
  });

  it("puts dark ink on pale colours and light ink on dark ones", () => {
    expect(inkForHex("#FFFFFF")).toBe("#1A1A1A");
    expect(inkForHex("#000000")).toBe("#FFFFFF");
  });
});
