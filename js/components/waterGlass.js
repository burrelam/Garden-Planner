import { statusForMetric } from "../formulas.js";

const WATER_TOLERANCE = 5;
const GLASS_X = 10, GLASS_Y = 8, GLASS_W = 40, GLASS_H = 74, GLASS_RX = 6;

const STATUS_COLOR = {
  below_min: "var(--clay)",
  close_to_min: "var(--amber)",
  in_range: "var(--sage)",
  at_ideal: "var(--sage)",
  close_to_max: "var(--amber)",
  over_max: "var(--rust)",
};

// waterOz: current total. thresholds: { min, ideal, max } from settings.thresholds.water.
export function renderWaterGlass(container, waterOz, thresholds) {
  container.innerHTML = "";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", 60);
  svg.setAttribute("height", 100);
  svg.setAttribute("viewBox", "0 0 60 100");

  const clipId = `water-glass-clip-${Math.random().toString(36).slice(2)}`;
  const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
  clipPath.setAttribute("id", clipId);
  const clipRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  clipRect.setAttribute("x", GLASS_X);
  clipRect.setAttribute("y", GLASS_Y);
  clipRect.setAttribute("width", GLASS_W);
  clipRect.setAttribute("height", GLASS_H);
  clipRect.setAttribute("rx", GLASS_RX);
  clipPath.appendChild(clipRect);
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.appendChild(clipPath);
  svg.appendChild(defs);

  const pct = Math.max(0, Math.min(1, waterOz / thresholds.max));
  const fillHeight = GLASS_H * pct;
  const fill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  fill.setAttribute("x", GLASS_X);
  fill.setAttribute("y", GLASS_Y + GLASS_H - fillHeight);
  fill.setAttribute("width", GLASS_W);
  fill.setAttribute("height", fillHeight);
  fill.setAttribute("clip-path", `url(#${clipId})`);
  const status = statusForMetric(waterOz, thresholds, WATER_TOLERANCE, true);
  fill.setAttribute("fill", STATUS_COLOR[status] || "var(--sage)");
  fill.style.transition = "height 0.3s ease, y 0.3s ease";
  svg.appendChild(fill);

  const idealY = GLASS_Y + GLASS_H * (1 - thresholds.ideal / thresholds.max);
  const idealLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  idealLine.setAttribute("x1", GLASS_X - 2);
  idealLine.setAttribute("x2", GLASS_X + GLASS_W + 2);
  idealLine.setAttribute("y1", idealY);
  idealLine.setAttribute("y2", idealY);
  idealLine.setAttribute("stroke", "var(--ink)");
  idealLine.setAttribute("stroke-width", 1);
  idealLine.setAttribute("stroke-dasharray", "2,2");
  idealLine.setAttribute("opacity", 0.5);
  const idealTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
  idealTitle.textContent = `Ideal: ${thresholds.ideal} oz`;
  idealLine.appendChild(idealTitle);
  svg.appendChild(idealLine);

  const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  outline.setAttribute("x", GLASS_X);
  outline.setAttribute("y", GLASS_Y);
  outline.setAttribute("width", GLASS_W);
  outline.setAttribute("height", GLASS_H);
  outline.setAttribute("rx", GLASS_RX);
  outline.setAttribute("fill", "none");
  outline.setAttribute("stroke", "var(--mist)");
  outline.setAttribute("stroke-width", 2);
  svg.appendChild(outline);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("x", 30);
  label.setAttribute("y", 96);
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("font-size", "9");
  label.setAttribute("font-family", "var(--font-mono)");
  label.setAttribute("fill", "var(--mist)");
  label.textContent = `${waterOz} oz`;
  svg.appendChild(label);

  container.appendChild(svg);
}
