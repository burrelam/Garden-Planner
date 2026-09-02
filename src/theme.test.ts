import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SEASON_STARTS,
  THEME_IDS,
  THEME_STORAGE_KEY,
  BED_COLOR_KEYS,
  bedColorLabel,
  bedStyle,
  BED_INK,
  bedSurfaceFor,
  isBedColorKey,
  resolveTheme,
  seasonForDate,
} from "./theme";

const on = (iso: string) => new Date(`${iso}T12:00:00`);

const relativeLuminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((n >> 16) & 255) +
    0.7152 * channel((n >> 8) & 255) +
    0.0722 * channel(n & 255)
  );
};
const contrastOf = (a: string, b: string) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort(
    (x, y) => y - x,
  );
  return (hi + 0.05) / (lo + 0.05);
};

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

describe("the pre-paint bootstrap in index.html", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");

  it("uses the same season boundaries as this module", () => {
    const inline = [...html.matchAll(/\[(\d+),\s*(\d+),\s*"(\w+)"\]/g)].map(
      (m) => ({ month: Number(m[1]), day: Number(m[2]), theme: m[3] }),
    );
    expect(inline).toEqual(SEASON_STARTS);
  });

  it("knows the same theme ids, so a stored preference is honoured", () => {
    const ids = html.match(/var ids = \[([^\]]+)\]/);
    expect(ids).not.toBeNull();
    const parsed = ids![1].split(",").map((s) => s.trim().replace(/"/g, ""));
    expect(parsed.sort()).toEqual([...THEME_IDS].sort());
  });

  it("reads the same storage key", () => {
    expect(html).toContain(THEME_STORAGE_KEY);
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
    expect(bedColorLabel("soft-fern")).toBe("Mid Fern");
  });

  it("uses one ink for every palette bed, so labels never flip", () => {
    const inks = BED_COLOR_KEYS.map(
      (key) => bedStyle({ color: "#000000", colorKey: key }).color,
    );
    expect(new Set(inks).size).toBe(1);
    expect(inks[0]).toBe("var(--bed-ink)");
  });

  it("resolves palette beds through CSS so they retint with the season", () => {
    expect(bedStyle({ color: "#000000", colorKey: "deep-fern" })).toEqual({
      backgroundColor: "var(--bed-deep-fern)",
      color: "var(--bed-ink)",
    });
    expect(bedStyle({ color: "#000000", colorKey: "soft-sky" })).toEqual({
      backgroundColor: "var(--bed-soft-sky)",
      color: "var(--bed-ink)",
    });
  });
  it("keeps beds saved before the palette working, always with white ink", () => {
    // Already dark enough for white: colour untouched.
    expect(bedStyle({ color: "#4A5E3A" })).toEqual({
      backgroundColor: "#4A5E3A",
      color: BED_INK,
    });
    // Too pale: darkened until white reads on it, ink still white.
    const pale = bedStyle({ color: "#F5E9A0" });
    expect(pale.color).toBe(BED_INK);
    expect(pale.backgroundColor).not.toBe("#F5E9A0");
    expect(contrastOf(BED_INK, pale.backgroundColor)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("gives every bed the same ink, whatever it was saved with", () => {
    const saved = [
      "#4A7A9B",
      "#7A5E9B",
      "#9B7A3A",
      "#4A9B6A",
      "#888888",
      "#FFFFFF",
    ];
    const inks = saved.map((hex) => bedStyle({ color: hex }).color);
    expect(new Set(inks).size).toBe(1);
    for (const hex of saved) {
      const style = bedStyle({ color: hex });
      expect(
        contrastOf(style.color, style.backgroundColor),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Darkening supersedes the old pick-an-ink approach: even colours that could
  // not reach 4.5:1 against any pure ink now clear it against white.
  it("darkens any colour far enough for white, across the range", () => {
    for (let r = 0; r <= 255; r += 15) {
      for (let g = 0; g <= 255; g += 15) {
        const hex = `#${[r, g, 128].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        expect(contrastOf(BED_INK, bedSurfaceFor(hex))).toBeGreaterThanOrEqual(
          4.5,
        );
      }
    }
  });

  it("leaves a colour alone when white already reads on it", () => {
    expect(bedSurfaceFor("#4A5E3A")).toBe("#4A5E3A");
  });

  it("darkens no further than it needs to", () => {
    for (const hex of ["#8A9A6B", "#9C7B5A", "#888888"]) {
      expect(contrastOf(BED_INK, bedSurfaceFor(hex))).toBeLessThan(6.5);
    }
  });
});
