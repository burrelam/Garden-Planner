import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SEASON_STARTS,
  THEME_IDS,
  THEME_STORAGE_KEY,
  BED_COLOR_KEYS,
  bedColorLabel,
  bedStyle,
  inkForHex,
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

  // The old implementation split on luminance > 0.4. The real crossover is
  // near 0.204, so everything in between took white ink at roughly 3:1.
  it("keeps mid-tone colours readable, not just the extremes", () => {
    for (const hex of ["#8A9A6B", "#8899AA", "#A0846B", "#6B8F5A"]) {
      expect(contrastOf(inkForHex(hex), hex)).toBeGreaterThanOrEqual(4.5);
    }
  });

  // Some arbitrary colours cannot reach 4.5:1 against any pure ink -- #9C7B5A
  // tops out at 4.47. Beds picked from the palette always can; for a legacy
  // hex the most we can promise is the better of the two.
  it("still picks the better ink when neither can reach 4.5:1", () => {
    const hex = "#9C7B5A";
    expect(inkForHex(hex)).toBe("#1A1A1A");
    expect(contrastOf("#1A1A1A", hex)).toBeGreaterThan(
      contrastOf("#FFFFFF", hex),
    );
  });

  it("chooses whichever ink actually reads better, across the range", () => {
    for (let r = 0; r <= 255; r += 15) {
      for (let g = 0; g <= 255; g += 15) {
        const hex = `#${[r, g, 128].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
        const chosen = contrastOf(inkForHex(hex), hex);
        const other = contrastOf(
          inkForHex(hex) === "#FFFFFF" ? "#1A1A1A" : "#FFFFFF",
          hex,
        );
        expect(chosen).toBeGreaterThanOrEqual(other);
      }
    }
  });
});
