import {
  currentDeficit, projectedEodTdee, projectedEodDeficit, remaining,
  grossCaloriesRemaining, sevenDayCurrent, sevenDayEodProjected, statusForMetric, statusForDeficit,
} from "../formulas.js";

const CAL_TOLERANCE = 100;
const MACRO_TOLERANCE = 5;
const WATER_TOLERANCE = 5;

function statusRow(label, valueText, status) {
  const tr = document.createElement("tr");
  const labelTd = document.createElement("td");
  labelTd.textContent = label;
  const valueTd = document.createElement("td");
  valueTd.className = "mono";
  const dot = document.createElement("span");
  dot.className = `status-dot ${status}`;
  const valueSpan = document.createElement("span");
  valueSpan.className = `status-text ${status}`;
  valueSpan.textContent = valueText;
  valueTd.appendChild(dot);
  valueTd.appendChild(valueSpan);
  tr.appendChild(labelTd);
  tr.appendChild(valueTd);
  return tr;
}

// data: { dayType, autoUpgraded, grossCalories, activeCalories, restingCalories,
//         protein_g, carbs_g, fat_g, fiber_g, water_oz, pastSixTrueDeficits, isMidDay }
export function renderRunningTotals(container, data, settings) {
  container.innerHTML = "";
  const t = settings.thresholds;
  const {
    dayType, autoUpgraded, grossCalories, activeCalories, restingCalories,
    protein_g, carbs_g, fat_g, fiber_g, water_oz, pastSixTrueDeficits, isMidDay,
  } = data;

  if (autoUpgraded) {
    const banner = document.createElement("div");
    banner.className = "pill";
    banner.style.marginBottom = "0.75rem";
    banner.style.background = "var(--amber)";
    banner.style.color = "var(--paper)";
    banner.textContent = "Auto-upgraded to workout-day targets (active calories exceeded 300)";
    container.appendChild(banner);
  }

  const calThresholds = dayType === "rest" ? t.grossCaloriesRest : t.grossCaloriesWorkout;

  const current = currentDeficit(grossCalories, activeCalories, restingCalories);
  const eodTdee = projectedEodTdee(settings.restingTDEEBaseline, activeCalories);
  const projEod = projectedEodDeficit(grossCalories, eodTdee);
  const dailyRemaining = remaining(projEod, t.deficitDaily.ideal, t.deficitDaily.max);
  const grossRemaining = grossCaloriesRemaining(grossCalories, calThresholds.max);

  const sevenCurrent = sevenDayCurrent(pastSixTrueDeficits, current, true);
  const sevenProjected = sevenDayEodProjected(pastSixTrueDeficits, projEod, true);
  const weeklyRemaining = remaining(sevenProjected.total, t.deficitWeekly.ideal, t.deficitWeekly.max);

  const netCalories = grossCalories - activeCalories;
  const netStatus = netCalories < t.netCalorieBand.min ? "close_to_min"
    : netCalories > t.netCalorieBand.max ? "over_max" : "in_range";

  const table = document.createElement("table");
  const tbody = document.createElement("tbody");

  tbody.appendChild(statusRow(
    `Gross Calories (${dayType})`,
    `${grossCalories} — ${grossRemaining.over ? grossRemaining.label : grossRemaining.label + " left"}`,
    statusForMetric(grossCalories, calThresholds, CAL_TOLERANCE, isMidDay)
  ));
  tbody.appendChild(statusRow("Active Calories", `${activeCalories}`, "in_range"));
  tbody.appendChild(statusRow("Resting Calories", `${restingCalories}`, "in_range"));
  tbody.appendChild(statusRow("Current Deficit", `${current}`, statusForDeficit(current, t.deficitDaily)));
  tbody.appendChild(statusRow("Projected EOD TDEE", `${eodTdee}`, "in_range"));
  tbody.appendChild(statusRow("Projected EOD Deficit", `${projEod}`, statusForDeficit(projEod, t.deficitDaily)));
  tbody.appendChild(statusRow("Remaining (vs -375 target)", dailyRemaining.label, dailyRemaining.status));
  tbody.appendChild(statusRow("Net Calories (gross − active)", `${netCalories} (target ${t.netCalorieBand.min}–${t.netCalorieBand.max})`, netStatus));

  const sep1 = document.createElement("tr");
  sep1.innerHTML = `<td colspan="2" style="padding-top:0.8rem; color:var(--mist); font-size:0.72rem; text-transform:uppercase;">7-Day (${sevenCurrent.trackedCount}/7 tracked)</td>`;
  tbody.appendChild(sep1);
  tbody.appendChild(statusRow("7-Day Current", `${sevenCurrent.total}`, statusForDeficit(sevenCurrent.total, t.deficitWeekly)));
  tbody.appendChild(statusRow("7-Day EOD Projected", `${sevenProjected.total}`, statusForDeficit(sevenProjected.total, t.deficitWeekly)));
  tbody.appendChild(statusRow("Remaining (vs weekly target)", weeklyRemaining.label, weeklyRemaining.status));

  const sep2 = document.createElement("tr");
  sep2.innerHTML = `<td colspan="2" style="padding-top:0.8rem; color:var(--mist); font-size:0.72rem; text-transform:uppercase;">Macros</td>`;
  tbody.appendChild(sep2);
  tbody.appendChild(statusRow("Protein (g)", `${protein_g}`, statusForMetric(protein_g, t.protein, MACRO_TOLERANCE, isMidDay)));
  tbody.appendChild(statusRow("Carbs (g)", `${carbs_g}`, statusForMetric(carbs_g, t.carbs, MACRO_TOLERANCE, isMidDay)));
  tbody.appendChild(statusRow("Fat (g)", `${fat_g}`, statusForMetric(fat_g, t.fat, MACRO_TOLERANCE, isMidDay)));
  tbody.appendChild(statusRow("Fiber (g)", `${fiber_g}`, statusForMetric(fiber_g, t.fiber, MACRO_TOLERANCE, isMidDay)));
  tbody.appendChild(statusRow("Water (oz)", `${water_oz}`, statusForMetric(water_oz, t.water, WATER_TOLERANCE, isMidDay)));

  table.appendChild(tbody);
  container.appendChild(table);
}
