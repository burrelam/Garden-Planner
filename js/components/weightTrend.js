import { bmiBandsInLbs } from "../formulas.js";

function sparkline(points, width, height) {
  if (points.length < 2) return null;
  const values = points.map((p) => p.weight);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = width / (points.length - 1);

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  const coords = points.map((p, i) => {
    const x = i * stepX;
    const y = height - 6 - ((p.weight - min) / range) * (height - 12);
    return [x, y];
  });

  const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  path.setAttribute("points", coords.map(([x, y]) => `${x},${y}`).join(" "));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "var(--sage)");
  path.setAttribute("stroke-width", 2);
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);

  coords.forEach(([x, y], i) => {
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", 3);
    dot.setAttribute("fill", "var(--sage)");
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${points[i].date}: ${points[i].weight} lbs`;
    dot.appendChild(title);
    svg.appendChild(dot);
  });

  return svg;
}

function bmiPanel(settings, currentWeight) {
  const wrap = document.createElement("div");
  wrap.style.marginTop = "1rem";

  if (!settings.heightCm) {
    wrap.innerHTML = `<p class="empty-state">Set your height in Settings to see the BMI panel.</p>`;
    return wrap;
  }
  const heightIn = settings.heightCm / 2.54;
  const bands = bmiBandsInLbs(heightIn);
  const barMin = Math.max(0, bands.underweightMax - 30);
  const barMax = bands.overweightMax + 30;
  const span = barMax - barMin;

  const segments = [
    { from: barMin, to: bands.underweightMax, color: "var(--amber)" },
    { from: bands.underweightMax, to: bands.normalMax, color: "var(--sage)" },
    { from: bands.normalMax, to: bands.overweightMax, color: "var(--amber)" },
    { from: bands.overweightMax, to: barMax, color: "var(--rust)" },
  ];

  const barHeight = 14;
  const width = 100; // percent-based, rendered as a flex bar
  const bar = document.createElement("div");
  bar.style.display = "flex";
  bar.style.height = `${barHeight}px`;
  bar.style.borderRadius = "7px";
  bar.style.overflow = "hidden";
  bar.style.position = "relative";
  bar.style.marginTop = "0.5rem";

  for (const seg of segments) {
    const pct = ((seg.to - seg.from) / span) * 100;
    const div = document.createElement("div");
    div.style.width = `${pct}%`;
    div.style.background = seg.color;
    bar.appendChild(div);
  }

  const markersHost = document.createElement("div");
  markersHost.style.position = "relative";
  markersHost.style.height = "1.4rem";
  const markers = [
    { label: "Start", value: settings.startWeight, symbol: "▲" },
    { label: "Current", value: currentWeight, symbol: "●" },
    { label: "Goal", value: settings.goalWeight, symbol: "◆" },
  ].filter((m) => m.value !== null && m.value !== undefined);

  for (const m of markers) {
    const clamped = Math.max(barMin, Math.min(barMax, m.value));
    const pct = ((clamped - barMin) / span) * 100;
    const marker = document.createElement("span");
    marker.style.position = "absolute";
    marker.style.left = `${pct}%`;
    marker.style.transform = "translateX(-50%)";
    marker.style.fontSize = "0.7rem";
    marker.title = `${m.label}: ${m.value} lbs`;
    marker.textContent = m.symbol;
    markersHost.appendChild(marker);
  }

  const legend = document.createElement("p");
  legend.style.fontSize = "0.72rem";
  legend.style.color = "var(--mist)";
  legend.textContent = `▲ Start ${settings.startWeight ?? "—"} · ● Current ${currentWeight ?? "—"} · ◆ Goal ${settings.goalWeight ?? "—"} (lbs)`;

  wrap.appendChild(bar);
  wrap.appendChild(markersHost);
  wrap.appendChild(legend);
  return wrap;
}

// dailyLogs: tracked DailyLog records within the selected range (may or may not have .weight set).
export function renderWeightTrend(container, dailyLogs, settings) {
  container.innerHTML = `<h2>Weight Trend</h2>`;

  const points = dailyLogs
    .filter((l) => l.weight !== null && l.weight !== undefined)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((l) => ({ date: l.date, weight: l.weight }));

  if (points.length === 0) {
    container.innerHTML += `<p class="empty-state">No weight logged in this range yet.</p>`;
    container.appendChild(bmiPanel(settings, settings.startWeight));
    return;
  }

  const svg = sparkline(points, 280, 90);
  if (svg) {
    const scroller = document.createElement("div");
    scroller.style.overflowX = "auto";
    scroller.appendChild(svg);
    container.appendChild(scroller);
  }

  const current = points[points.length - 1].weight;
  const change = settings.startWeight !== null && settings.startWeight !== undefined ? current - settings.startWeight : null;
  const summary = document.createElement("p");
  summary.style.fontFamily = "var(--font-mono)";
  summary.textContent = `Current: ${current} lbs${change !== null ? ` (${change >= 0 ? "+" : ""}${change.toFixed(1)} from start)` : ""}`;
  container.appendChild(summary);

  container.appendChild(bmiPanel(settings, current));
}
