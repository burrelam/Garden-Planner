// Hand-placed pixel-grid icons. Most read their color from `currentColor`
// (set via the parent's `color`) plus the theme's --color-accent-light /
// --color-accent-hover tokens, so a single icon adapts across all five
// seasonal themes without per-theme assets. The shovel and planted sprout
// are fixed-palette illustrations instead — they're small mascot-style art,
// not UI glyphs, so they don't need to shift with the theme.

import type { SVGProps } from "react";

type IconProps = Omit<SVGProps<SVGSVGElement>, "viewBox" | "children"> & {
  size?: number;
};

function Pixels({
  viewBox,
  size = 16,
  ...rest
}: IconProps & { viewBox: string; size?: number; children: React.ReactNode }) {
  return (
    <svg
      viewBox={viewBox}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      aria-hidden="true"
      focusable="false"
      {...rest}
    />
  );
}

export function PlannerIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="4" y="0" width="1" height="3" />
      <rect x="11" y="0" width="1" height="3" />
      <rect x="1" y="2" width="14" height="1" />
      <rect x="1" y="13" width="14" height="1" />
      <rect x="1" y="2" width="1" height="12" />
      <rect x="14" y="2" width="1" height="12" />
      <rect x="1" y="5" width="14" height="1" />
      <rect x="4" y="7" width="2" height="2" />
      <rect x="7" y="7" width="2" height="2" />
      <rect x="10" y="7" width="2" height="2" />
      <rect x="4" y="10" width="2" height="2" />
      <rect x="7" y="10" width="2" height="2" />
      <rect x="10" y="10" width="2" height="2" fill="var(--color-gold)" />
    </Pixels>
  );
}

export function SourcesIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="7" y="1" width="2" height="2" />
      <rect x="1" y="2" width="6" height="1" />
      <rect x="9" y="2" width="6" height="1" />
      <rect x="1" y="3" width="1" height="10" />
      <rect x="7" y="2" width="1" height="12" />
      <rect x="8" y="2" width="1" height="12" />
      <rect x="14" y="3" width="1" height="10" />
      <rect x="1" y="13" width="6" height="1" />
      <rect x="9" y="13" width="6" height="1" />
      <rect x="3" y="6" width="3" height="1" />
      <rect x="3" y="9" width="3" height="1" />
      <rect x="10" y="6" width="3" height="1" />
      <rect x="10" y="9" width="3" height="1" />
    </Pixels>
  );
}

export function SettingsIcon({
  holeColor = "var(--color-surface)",
  ...props
}: IconProps & { holeColor?: string }) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <g transform="translate(8 8) scale(0.92) translate(-8 -8)">
        <rect x="6" y="0" width="4" height="3" />
        <rect x="6" y="13" width="4" height="3" />
        <rect x="0" y="6" width="3" height="4" />
        <rect x="13" y="6" width="3" height="4" />
        <rect x="1" y="1" width="3" height="3" />
        <rect x="12" y="1" width="3" height="3" />
        <rect x="1" y="12" width="3" height="3" />
        <rect x="12" y="12" width="3" height="3" />
        <rect x="4" y="2" width="8" height="1" />
        <rect x="3" y="3" width="10" height="1" />
        <rect x="2" y="4" width="12" height="8" />
        <rect x="3" y="12" width="10" height="1" />
        <rect x="4" y="13" width="8" height="1" />
        <rect x="7" y="6" width="2" height="1" fill={holeColor} />
        <rect x="6" y="7" width="4" height="2" fill={holeColor} />
        <rect x="7" y="9" width="2" height="1" fill={holeColor} />
      </g>
    </Pixels>
  );
}

export function SproutNavIcon(props: IconProps) {
  return (
    <Pixels viewBox="-6 0 19 16" {...props}>
      <rect x="3" y="9" width="2" height="6" fill="var(--color-text)" />
      <rect x="8" y="1" width="4" height="1" fill="var(--color-text)" />
      <rect x="6" y="2" width="2" height="1" fill="var(--color-text)" />
      <rect x="8" y="2" width="4" height="1" fill="var(--color-accent-hover)" />
      <rect x="12" y="2" width="1" height="1" fill="var(--color-text)" />
      <rect x="5" y="3" width="1" height="1" fill="var(--color-text)" />
      <rect x="6" y="3" width="4" height="1" fill="var(--color-accent-hover)" />
      <rect
        x="10"
        y="3"
        width="1"
        height="1"
        fill="var(--color-accent-light)"
      />
      <rect
        x="11"
        y="3"
        width="1"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="12" y="3" width="1" height="1" fill="var(--color-text)" />
      <rect x="5" y="4" width="1" height="1" fill="var(--color-text)" />
      <rect x="6" y="4" width="2" height="1" fill="var(--color-accent-hover)" />
      <rect x="8" y="4" width="2" height="1" fill="var(--color-accent-light)" />
      <rect
        x="10"
        y="4"
        width="1"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="11" y="4" width="1" height="1" fill="var(--color-accent)" />
      <rect x="12" y="4" width="1" height="1" fill="var(--color-text)" />
      <rect x="4" y="5" width="1" height="1" fill="var(--color-text)" />
      <rect x="5" y="5" width="2" height="1" fill="var(--color-accent-hover)" />
      <rect x="7" y="5" width="1" height="1" fill="var(--color-accent-light)" />
      <rect x="8" y="5" width="1" height="1" fill="var(--color-accent-hover)" />
      <rect x="9" y="5" width="2" height="1" fill="var(--color-accent)" />
      <rect x="11" y="5" width="1" height="1" fill="var(--color-text)" />
      <rect x="4" y="6" width="1" height="1" fill="var(--color-text)" />
      <rect x="5" y="6" width="1" height="1" fill="var(--color-accent-hover)" />
      <rect x="6" y="6" width="1" height="1" fill="var(--color-accent-light)" />
      <rect x="7" y="6" width="4" height="1" fill="var(--color-accent)" />
      <rect x="11" y="6" width="1" height="1" fill="var(--color-text)" />
      <rect x="4" y="7" width="1" height="1" fill="var(--color-text)" />
      <rect x="5" y="7" width="1" height="1" fill="var(--color-accent-light)" />
      <rect x="6" y="7" width="3" height="1" fill="var(--color-accent)" />
      <rect x="9" y="7" width="2" height="1" fill="var(--color-text)" />
      <rect x="4" y="8" width="5" height="1" fill="var(--color-text)" />
      <rect x="-5" y="1" width="4" height="1" fill="var(--color-text)" />
      <rect x="-1" y="2" width="2" height="1" fill="var(--color-text)" />
      <rect
        x="-5"
        y="2"
        width="4"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="-6" y="2" width="1" height="1" fill="var(--color-text)" />
      <rect x="1" y="3" width="1" height="1" fill="var(--color-text)" />
      <rect
        x="-3"
        y="3"
        width="4"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect
        x="-4"
        y="3"
        width="1"
        height="1"
        fill="var(--color-accent-light)"
      />
      <rect
        x="-5"
        y="3"
        width="1"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="-6" y="3" width="1" height="1" fill="var(--color-text)" />
      <rect x="1" y="4" width="1" height="1" fill="var(--color-text)" />
      <rect
        x="-1"
        y="4"
        width="2"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect
        x="-3"
        y="4"
        width="2"
        height="1"
        fill="var(--color-accent-light)"
      />
      <rect
        x="-4"
        y="4"
        width="1"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="-5" y="4" width="1" height="1" fill="var(--color-accent)" />
      <rect x="-6" y="4" width="1" height="1" fill="var(--color-text)" />
      <rect x="2" y="5" width="1" height="1" fill="var(--color-text)" />
      <rect x="0" y="5" width="2" height="1" fill="var(--color-accent-hover)" />
      <rect
        x="-1"
        y="5"
        width="1"
        height="1"
        fill="var(--color-accent-light)"
      />
      <rect
        x="-2"
        y="5"
        width="1"
        height="1"
        fill="var(--color-accent-hover)"
      />
      <rect x="-4" y="5" width="2" height="1" fill="var(--color-accent)" />
      <rect x="-5" y="5" width="1" height="1" fill="var(--color-text)" />
      <rect x="2" y="6" width="1" height="1" fill="var(--color-text)" />
      <rect x="1" y="6" width="1" height="1" fill="var(--color-accent-hover)" />
      <rect x="0" y="6" width="1" height="1" fill="var(--color-accent-light)" />
      <rect x="-4" y="6" width="4" height="1" fill="var(--color-accent)" />
      <rect x="-5" y="6" width="1" height="1" fill="var(--color-text)" />
      <rect x="2" y="7" width="1" height="1" fill="var(--color-text)" />
      <rect x="1" y="7" width="1" height="1" fill="var(--color-accent-light)" />
      <rect x="-2" y="7" width="3" height="1" fill="var(--color-accent)" />
      <rect x="-4" y="7" width="2" height="1" fill="var(--color-text)" />
      <rect x="-2" y="8" width="5" height="1" fill="var(--color-text)" />
    </Pixels>
  );
}

export function QuestionIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="6" y="2" width="4" height="1" />
      <rect x="4" y="3" width="2" height="1" />
      <rect x="10" y="3" width="2" height="1" />
      <rect x="4" y="4" width="2" height="1" />
      <rect x="10" y="4" width="2" height="1" />
      <rect x="10" y="5" width="2" height="1" />
      <rect x="9" y="6" width="2" height="1" />
      <rect x="8" y="7" width="2" height="1" />
      <rect x="7" y="8" width="2" height="1" />
      <rect x="7" y="9" width="2" height="1" />
      <rect x="7" y="12" width="2" height="1" />
    </Pixels>
  );
}

const SNOWFLAKE_DIRS: Array<[number, number]> = [
  [0, -1],
  [0, 1],
  [1, 0],
  [-1, 0],
  [1, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
];
const SNOWFLAKE_TICKS: Array<[number, number]> = [
  [7, 4],
  [9, 4],
  [7, 12],
  [9, 12],
  [4, 7],
  [4, 9],
  [12, 7],
  [12, 9],
  [11, 4],
  [12, 5],
  [13, 12],
  [12, 13],
  [3, 12],
  [4, 13],
  [3, 4],
  [4, 3],
];
const SNOWFLAKE_POINTS: Array<[number, number]> = [
  [8, 8],
  ...SNOWFLAKE_DIRS.flatMap(([dx, dy]) =>
    Array.from(
      { length: 7 },
      (_, i) => [8 + dx * (i + 1), 8 + dy * (i + 1)] as [number, number],
    ),
  ),
  ...SNOWFLAKE_TICKS,
];

export function SnowflakeIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      {SNOWFLAKE_POINTS.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </Pixels>
  );
}

export function ShovelIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" {...props}>
      <g transform="translate(8 8) rotate(20) scale(0.82) translate(-8 -8)">
        <rect x="4" y="0" width="8" height="1" fill="#1f1a14" />
        <rect x="4" y="0" width="1" height="3" fill="#1f1a14" />
        <rect x="11" y="0" width="1" height="3" fill="#1f1a14" />
        <rect x="5" y="1" width="3" height="2" fill="#cbb392" />
        <rect x="8" y="1" width="3" height="2" fill="#b5652f" />
        <rect x="6" y="3" width="2" height="1" fill="#b9c4b0" />
        <rect x="6" y="3" width="1" height="7" fill="#1f1a14" />
        <rect x="9" y="3" width="1" height="7" fill="#1f1a14" />
        <rect x="7" y="4" width="1" height="6" fill="#cbb392" />
        <rect x="8" y="4" width="1" height="6" fill="#b5652f" />
        <rect x="6" y="10" width="1" height="1" fill="#1f1a14" />
        <rect x="9" y="10" width="1" height="1" fill="#1f1a14" />
        <rect x="7" y="10" width="1" height="1" fill="#c9ccd0" />
        <rect x="8" y="10" width="1" height="1" fill="#8b9096" />
        <rect x="4" y="11" width="1" height="1" fill="#1f1a14" />
        <rect x="11" y="11" width="1" height="1" fill="#1f1a14" />
        <rect x="5" y="11" width="3" height="1" fill="#c9ccd0" />
        <rect x="8" y="11" width="3" height="1" fill="#8b9096" />
        <rect x="3" y="12" width="1" height="1" fill="#1f1a14" />
        <rect x="12" y="12" width="1" height="1" fill="#1f1a14" />
        <rect x="4" y="12" width="4" height="1" fill="#c9ccd0" />
        <rect x="8" y="12" width="4" height="1" fill="#8b9096" />
        <rect x="3" y="13" width="1" height="1" fill="#1f1a14" />
        <rect x="12" y="13" width="1" height="1" fill="#1f1a14" />
        <rect x="4" y="13" width="4" height="1" fill="#c9ccd0" />
        <rect x="8" y="13" width="4" height="1" fill="#8b9096" />
        <rect x="4" y="14" width="1" height="1" fill="#1f1a14" />
        <rect x="11" y="14" width="1" height="1" fill="#1f1a14" />
        <rect x="5" y="14" width="3" height="1" fill="#c9ccd0" />
        <rect x="8" y="14" width="3" height="1" fill="#8b9096" />
        <rect x="6" y="15" width="1" height="1" fill="#1f1a14" />
        <rect x="9" y="15" width="1" height="1" fill="#1f1a14" />
        <rect x="7" y="15" width="1" height="1" fill="#c9ccd0" />
        <rect x="8" y="15" width="1" height="1" fill="#8b9096" />
      </g>
      <rect x="6" y="12" width="1" height="1" fill="#8a6239" />
      <rect x="7" y="12" width="1" height="1" fill="#7a5530" />
      <rect x="4" y="13" width="1" height="1" fill="#6b4a28" />
      <rect x="5" y="13" width="1" height="1" fill="#8a6239" />
      <rect x="6" y="13" width="1" height="1" fill="#7a5530" />
      <rect x="7" y="13" width="1" height="1" fill="#6b4a28" />
      <rect x="8" y="13" width="1" height="1" fill="#8a6239" />
      <rect x="9" y="13" width="1" height="1" fill="#7a5530" />
      <rect x="2" y="14" width="1" height="1" fill="#6b4a28" />
      <rect x="3" y="14" width="1" height="1" fill="#8a6239" />
      <rect x="4" y="14" width="1" height="1" fill="#7a5530" />
      <rect x="5" y="14" width="1" height="1" fill="#6b4a28" />
      <rect x="6" y="14" width="1" height="1" fill="#8a6239" />
      <rect x="7" y="14" width="1" height="1" fill="#7a5530" />
      <rect x="8" y="14" width="1" height="1" fill="#6b4a28" />
      <rect x="9" y="14" width="1" height="1" fill="#8a6239" />
      <rect x="10" y="14" width="1" height="1" fill="#7a5530" />
      <rect x="1" y="15" width="1" height="1" fill="#6b4a28" />
      <rect x="2" y="15" width="1" height="1" fill="#8a6239" />
      <rect x="3" y="15" width="1" height="1" fill="#7a5530" />
      <rect x="4" y="15" width="1" height="1" fill="#6b4a28" />
      <rect x="5" y="15" width="1" height="1" fill="#8a6239" />
      <rect x="6" y="15" width="1" height="1" fill="#7a5530" />
      <rect x="7" y="15" width="1" height="1" fill="#6b4a28" />
      <rect x="8" y="15" width="1" height="1" fill="#8a6239" />
      <rect x="9" y="15" width="1" height="1" fill="#7a5530" />
      <rect x="10" y="15" width="1" height="1" fill="#6b4a28" />
      <rect x="11" y="15" width="1" height="1" fill="#8a6239" />
      <rect x="3" y="11" width="1" height="1" fill="#8a6239" />
      <rect x="11" y="12" width="1" height="1" fill="#6b4a28" />
      <rect x="1" y="13" width="1" height="1" fill="#7a5530" />
      <rect x="12" y="14" width="1" height="1" fill="#8a6239" />
    </Pixels>
  );
}

/**
 * The app's only arrow. One shape, rotated about (8, 8) — a grid
 * intersection, so every corner still lands on a whole unit and the steps
 * stay hard-edged in all four directions rather than being drawn four times.
 *
 * Open, not solid: a filled triangle is a play button and reads as "go",
 * while a chevron is a hinge — it can flip to point down when a panel opens.
 */
export function ChevronIcon({
  direction = "up",
  ...props
}: IconProps & { direction?: "up" | "down" | "left" | "right" }) {
  const turn = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <g transform={`rotate(${turn} 8 8)`}>
        <rect x="6" y="5" width="4" height="2" />
        <rect x="4" y="7" width="3" height="2" />
        <rect x="2" y="9" width="3" height="2" />
        <rect x="9" y="7" width="3" height="2" />
        <rect x="11" y="9" width="3" height="2" />
      </g>
    </Pixels>
  );
}

/**
 * Amanda's pencil, transcribed pixel-for-pixel from her drawing
 * (docs/brand/pencil-source.png) rather than redrawn: eraser at the top
 * left, facet lines down the barrel, sharpened nib bottom right.
 *
 * One path in currentColor, so it takes the button's ink in every season.
 * Its grid is 25 wide, not 16 like the glyph icons — the line work is a
 * single pixel thick, and squeezing it onto a 16 grid would lose it. It
 * draws at 20, which every diagonal survives without a break.
 */
export function PencilIcon({ size = 20, ...props }: IconProps) {
  return (
    <Pixels viewBox="0 0 25 25" size={size} fill="currentColor" {...props}>
      <path d="M5 0h3v1h-3zM4 1h1v1h-1zM8 1h1v1h-1zM3 2h1v1h-1zM9 2h1v1h-1zM2 3h1v1h-1zM8 3h3v1h-3zM1 4h1v1h-1zM7 4h1v1h-1zM10 4h2v1h-2zM0 5h1v1h-1zM6 5h1v1h-1zM11 5h2v1h-2zM0 6h1v1h-1zM5 6h1v1h-1zM12 6h2v1h-2zM0 7h1v1h-1zM4 7h1v1h-1zM9 7h1v1h-1zM13 7h2v1h-2zM1 8h1v1h-1zM3 8h1v1h-1zM10 8h1v1h-1zM14 8h2v1h-2zM2 9h2v1h-2zM7 9h1v1h-1zM11 9h1v1h-1zM15 9h2v1h-2zM3 10h2v1h-2zM8 10h1v1h-1zM12 10h1v1h-1zM16 10h2v1h-2zM4 11h2v1h-2zM9 11h1v1h-1zM13 11h1v1h-1zM17 11h2v1h-2zM5 12h2v1h-2zM10 12h1v1h-1zM14 12h1v1h-1zM18 12h2v1h-2zM6 13h2v1h-2zM11 13h1v1h-1zM15 13h1v1h-1zM19 13h2v1h-2zM7 14h2v1h-2zM12 14h1v1h-1zM16 14h1v1h-1zM20 14h2v1h-2zM8 15h2v1h-2zM13 15h1v1h-1zM17 15h1v1h-1zM21 15h2v1h-2zM9 16h2v1h-2zM14 16h1v1h-1zM18 16h1v1h-1zM22 16h2v1h-2zM10 17h2v1h-2zM15 17h1v1h-1zM21 17h4v1h-4zM11 18h2v1h-2zM16 18h1v1h-1zM20 18h2v1h-2zM24 18h1v1h-1zM12 19h2v1h-2zM19 19h2v1h-2zM24 19h1v1h-1zM13 20h2v1h-2zM18 20h2v1h-2zM24 20h1v1h-1zM14 21h2v1h-2zM17 21h2v1h-2zM24 21h1v1h-1zM15 22h3v1h-3zM22 22h3v1h-3zM16 23h2v1h-2zM22 23h3v1h-3zM17 24h8v1h-8z" />
    </Pixels>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="2" y="3" width="12" height="2" />
      <rect x="2" y="7" width="12" height="2" />
      <rect x="2" y="11" width="12" height="2" />
    </Pixels>
  );
}

/** The dialog close. × is not in Silkscreen, so the font was drawing a tofu
 *  box; on the grid it is four steps and a font can no longer let it down. */
export function CloseIcon(props: IconProps) {
  return (
    <Pixels viewBox="0 0 16 16" fill="currentColor" {...props}>
      <rect x="3" y="3" width="3" height="2" />
      <rect x="10" y="3" width="3" height="2" />
      <rect x="5" y="5" width="3" height="2" />
      <rect x="8" y="5" width="3" height="2" />
      <rect x="6" y="7" width="4" height="2" />
      <rect x="5" y="9" width="3" height="2" />
      <rect x="8" y="9" width="3" height="2" />
      <rect x="3" y="11" width="3" height="2" />
      <rect x="10" y="11" width="3" height="2" />
    </Pixels>
  );
}
