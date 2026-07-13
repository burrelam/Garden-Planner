import { paceFromDeficit } from "../formulas.js";

const BAR_WIDTH = 18;
const BAR_GAP = 6;
const MAX_BAR_HEIGHT = 60;
const SCALE_REFERENCE = 700; // kcal magnitude that reaches full bar height

// Spec's exact spectrum: deep deficit (sage) -> breakeven (amber) -> large surplus (rust).
function colorForDeficit(value) {
  const clamped = Math.max(-SCALE_REFERENCE, Math.min(SCALE_REFERENCE, value));
  const t = (clamped + SCALE_REFERENCE) / (2 * SCALE_REFERENCE); // 0 = deep deficit, 1 = large surplus
  // Two-segment interpolation: 0..0.5 => hue 142->48, 0.5..1 => hue 48->6
  let h;
  if (t <= 0.5) h = 142 + (t / 0.5) * (48 - 142);
  else h = 48 + ((t - 0.5) / 0.5) * (6 - 48);
  return `hsl(${h}, 68%, 55%)`;
}

// dailyLogs: tracked DailyLog records with .date and .trueDeficit, within [startDate, endDate].
export function renderDeficitTrend(container, dailyLogs, startDate, endDate) {
  container.innerHTML = `<h2>Deficit Trend</h2>`;

  const byDate = new Map(dailyLogs.map((l) => [l.date, l.trueDeficit]));
  const dates = [];
  for (let d = startDate; d <= endDate; ) {
    dates.push(d);
    const next = new Date(d + "T00:00:00Z");
    next.setUTCDate(next.getUTCDate() + 1);
    d = next.toISOString().slice(0, 10);
  }

  const trackedValues = dates.map((d) => byDate.get(d)).filter((v) => v !== undefined);
  const total = trackedValues.reduce((sum, v) => sum + v, 0);
  const pace = paceFromDeficit(total);
  const weeks = dates.length / 7;
  const paceLabel = weeks > 0 ? `${(pace / weeks).toFixed(2)} lbs/week implied` : "";

  const summary = document.createElement("p");
  summary.style.fontFamily = "var(--font-mono)";
  summary.innerHTML = `Total: <strong>${Math.round(total)}</strong> kcal (${trackedValues.length}/${dates.length} tracked) — ${pace >= 0 ? `${pace.toFixed(2)} lbs lost` : `${Math.abs(pace).toFixed(2)} lbs gained`}${paceLabel ? ` · ${paceLabel}` : ""}`;
  container.appendChild(summary);

  const width = dates.length * (BAR_WIDTH + BAR_GAP);
  const height = MAX_BAR_HEIGHT * 2 + 20;
  const midY = height / 2;

  const scroller = document.createElement("div");
  scroller.style.overflowX = "auto";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", Math.max(width, 280));
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${Math.max(width, 280)} ${height}`);

  const baseline = document.createElementNS("http://www.w3.org/2000/svg", "line");
  baseline.setAttribute("x1", 0);
  baseline.setAttribute("x2", width);
  baseline.setAttribute("y1", midY);
  baseline.setAttribute("y2", midY);
  baseline.setAttribute("stroke", "var(--mist)");
  baseline.setAttribute("stroke-width", 1);
  svg.appendChild(baseline);

  dates.forEach((d, i) => {
    const value = byDate.get(d);
    const x = i * (BAR_WIDTH + BAR_GAP);
    if (value === undefined) {
      const tick = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      tick.setAttribute("x", x);
      tick.setAttribute("y", midY - 1);
      tick.setAttribute("width", BAR_WIDTH);
      tick.setAttribute("height", 2);
      tick.setAttribute("fill", "var(--mist)");
      tick.setAttribute("rx", 1);
      svg.appendChild(tick);
      return;
    }
    const magnitude = Math.min(Math.abs(value) / SCALE_REFERENCE, 1) * MAX_BAR_HEIGHT;
    const isDeficit = value < 0;
    const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bar.setAttribute("x", x);
    bar.setAttribute("y", isDeficit ? midY : midY - magnitude);
    bar.setAttribute("width", BAR_WIDTH);
    bar.setAttribute("height", Math.max(magnitude, 2));
    bar.setAttribute("rx", 4);
    bar.setAttribute("fill", colorForDeficit(value));
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${d}: ${value} kcal`;
    bar.appendChild(title);
    svg.appendChild(bar);
  });

  scroller.appendChild(svg);
  container.appendChild(scroller);
}
