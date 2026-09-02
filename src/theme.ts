// Seasonal themes. The palette itself lives in CSS custom properties
// (see the token block at the top of App.module.css); this module only
// decides *which* theme is active and how bed colours resolve.

export const THEME_IDS = [
  "fall",
  "winter",
  "spring",
  "summer",
  "night",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

/** "auto" follows the calendar; anything else is an explicit choice. */
export type ThemePreference = "auto" | ThemeId;

export const THEMES: { id: ThemeId; name: string; blurb: string }[] = [
  {
    id: "spring",
    name: "Spring",
    blurb: "Dewy green, tulip pink and daffodil gold",
  },
  {
    id: "summer",
    name: "Summer",
    blurb: "Bleached gold, emerald and ripe tomato",
  },
  {
    id: "fall",
    name: "Fall",
    blurb: "Toasted tan, olive bronze and burnt rust",
  },
  {
    id: "winter",
    name: "Winter",
    blurb: "Icy blue, deep navy and velvet cranberry",
  },
  // The one theme the calendar never selects on its own.
  {
    id: "night",
    name: "Twilight",
    blurb: "Indigo dusk, periwinkle and blush pink",
  },
];

/**
 * Seasons that "auto" can land on. Twilight is deliberately absent — it is
 * only ever reached by choosing it in Settings.
 */
export type SeasonThemeId = Exclude<ThemeId, "night">;

// Astronomical boundaries: equinoxes and solstices, not calendar months.
// The real events drift by a day or so each year; these are the usual dates.
// Exported because index.html re-implements this inline to stamp the theme
// before first paint; theme.test.ts asserts the two copies agree.
export const SEASON_STARTS: {
  month: number;
  day: number;
  theme: SeasonThemeId;
}[] = [
  { month: 3, day: 20, theme: "spring" },
  { month: 6, day: 21, theme: "summer" },
  { month: 9, day: 22, theme: "fall" },
  { month: 12, day: 21, theme: "winter" },
];

/**
 * The season a date falls in, northern hemisphere. Before the spring
 * equinox we are still in the winter that began the previous December.
 */
export function seasonForDate(date: Date): SeasonThemeId {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let current: SeasonThemeId = "winter";
  for (const start of SEASON_STARTS) {
    if (month > start.month || (month === start.month && day >= start.day)) {
      current = start.theme;
    }
  }
  return current;
}

/** The theme to actually paint, given a stored preference and the date. */
export function resolveTheme(
  preference: ThemePreference,
  date: Date = new Date(),
): ThemeId {
  return preference === "auto" ? seasonForDate(date) : preference;
}

export const THEME_STORAGE_KEY = "gardenbuddy.theme";

function isPreference(value: unknown): value is ThemePreference {
  return value === "auto" || THEME_IDS.includes(value as ThemeId);
}

/** Reading storage can throw in private windows, so never let it break boot. */
export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : "auto";
  } catch {
    return "auto";
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // A preference we cannot persist still applies for this session.
  }
}

export function applyTheme(theme: ThemeId): void {
  document.documentElement.dataset.theme = theme;
  // Match the phone's browser chrome to the page it is framing.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--color-bg")
      .trim();
    if (bg) meta.setAttribute("content", bg);
  }
}

// ---------------------------------------------------------------------------
// Bed colours
// ---------------------------------------------------------------------------

export const BED_TONES = ["deep", "soft"] as const;
export const BED_FAMILIES = [
  "rose",
  "poppy",
  "amber",
  "wheat",
  "lime",
  "fern",
  "teal",
  "sky",
  "iris",
  "plum",
] as const;

export type BedColorKey =
  `${(typeof BED_TONES)[number]}-${(typeof BED_FAMILIES)[number]}`;

export const BED_COLOR_KEYS: BedColorKey[] = BED_TONES.flatMap((tone) =>
  BED_FAMILIES.map((family) => `${tone}-${family}` as BedColorKey),
);

const label = (word: string) => word[0].toUpperCase() + word.slice(1);
export const bedColorLabel = (key: BedColorKey) =>
  key.split("-").map(label).join(" ");

export function isBedColorKey(value: unknown): value is BedColorKey {
  return (
    typeof value === "string" && BED_COLOR_KEYS.includes(value as BedColorKey)
  );
}

/**
 * Relative luminance, per WCAG. Used only for beds saved before the curated
 * palette existed, whose colour is an arbitrary hex with no paired ink.
 */
function luminance(hex: string): number {
  const value = parseInt(hex.slice(1), 16);
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel((value >> 16) & 255) +
    0.7152 * channel((value >> 8) & 255) +
    0.0722 * channel(value & 255)
  );
}

const LIGHT_INK = "#FFFFFF";
const DARK_INK = "#1A1A1A";

/** WCAG contrast ratio between two colours. */
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Ink that stays readable on an arbitrary bed colour. Compares both candidates
 * rather than splitting on a luminance threshold: the crossover sits near 0.2,
 * not the midpoint, so any hand-picked cut leaves a band of mid-tones reading
 * at about 3:1.
 */
export function inkForHex(hex: string): string {
  return contrast(DARK_INK, hex) >= contrast(LIGHT_INK, hex)
    ? DARK_INK
    : LIGHT_INK;
}

/**
 * Every bed still stores a plain hex alongside its key, so exports and any
 * older reader keep working. These are the Fall values — the palette the
 * bare :root block paints — used when the live token cannot be read.
 */
const BED_FALLBACK_HEX: Record<string, string> = {
  "deep-rose": "#9D444C",
  "deep-poppy": "#924E2F",
  "deep-amber": "#7C5B1D",
  "deep-wheat": "#5D661E",
  "deep-lime": "#2D6D39",
  "deep-fern": "#036E5B",
  "deep-teal": "#016B75",
  "deep-sky": "#06688E",
  "deep-iris": "#535C9E",
  "deep-plum": "#8D497D",
  "soft-rose": "#E29396",
  "soft-poppy": "#DA9A7D",
  "soft-amber": "#C5A370",
  "soft-wheat": "#A9AD71",
  "soft-lime": "#82B586",
  "soft-fern": "#60B8A2",
  "soft-teal": "#46B7C4",
  "soft-sky": "#64B1DE",
  "soft-iris": "#A1A4DE",
  "soft-plum": "#D196C1",
};

/** The hex to persist for a chosen swatch, preferring what is on screen now. */
export function bedFallbackHex(key: BedColorKey): string {
  try {
    const live = getComputedStyle(document.documentElement)
      .getPropertyValue(`--bed-${key}`)
      .trim();
    if (/^#[0-9a-fA-F]{6}$/.test(live)) return live;
  } catch {
    // Fall through to the static table.
  }
  return BED_FALLBACK_HEX[key] ?? "#4C5B2A";
}

/**
 * How to paint a bed header. Beds picked from the palette carry a key and
 * resolve through CSS, so they retint with the season; older beds keep the
 * exact hex they were saved with and get a derived ink.
 */
export function bedStyle(bed: { color: string; colorKey?: string | null }): {
  backgroundColor: string;
  color: string;
} {
  if (isBedColorKey(bed.colorKey)) {
    const tone = bed.colorKey.startsWith("deep-") ? "deep" : "soft";
    return {
      backgroundColor: `var(--bed-${bed.colorKey})`,
      color: `var(--bed-ink-${tone})`,
    };
  }
  return { backgroundColor: bed.color, color: inkForHex(bed.color) };
}
