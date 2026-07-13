import { statusForMetric } from "../formulas.js";

const MACRO_TOLERANCE = 5;
const WATER_TOLERANCE = 5;

const DAY_TYPE_BADGE = { workout: "W", rest: "R", untracked: "X" };

function dot(status) {
  const span = document.createElement("span");
  span.className = `status-dot ${status}`;
  return span;
}

// dailyLogs: tracked DailyLog records within the selected range.
export function renderMacroTable(container, dailyLogs, settings) {
  container.innerHTML = `<h2>Macro Compliance</h2>`;

  if (dailyLogs.length === 0) {
    container.innerHTML += `<p class="empty-state">No tracked days in this range yet.</p>`;
    return;
  }

  const t = settings.thresholds;
  const sorted = [...dailyLogs].sort((a, b) => (a.date < b.date ? 1 : -1));

  const table = document.createElement("table");
  table.innerHTML = `<thead><tr><th>Date</th><th></th><th>P</th><th>C</th><th>F</th><th>Fib</th><th>Water</th></tr></thead>`;
  const tbody = document.createElement("tbody");

  for (const log of sorted) {
    const tr = document.createElement("tr");
    const dateTd = document.createElement("td");
    dateTd.textContent = log.date;
    const typeTd = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "tag";
    badge.textContent = DAY_TYPE_BADGE[log.dayType] || "?";
    typeTd.appendChild(badge);
    tr.appendChild(dateTd);
    tr.appendChild(typeTd);

    const cells = [
      [log.protein_g, t.protein, MACRO_TOLERANCE],
      [log.carbs_g, t.carbs, MACRO_TOLERANCE],
      [log.fat_g, t.fat, MACRO_TOLERANCE],
      [log.fiber_g, t.fiber, MACRO_TOLERANCE],
      [log.water_oz, t.water, WATER_TOLERANCE],
    ];
    for (const [value, thresholds, tolerance] of cells) {
      const td = document.createElement("td");
      if (value === undefined || value === null) {
        td.textContent = "—";
      } else {
        td.appendChild(dot(statusForMetric(value, thresholds, tolerance, false)));
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);
}
