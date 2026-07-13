import { dbGetAllInRange, dbGetAllByIndex, getSettings } from "../db.js";
import { todayPDT, lastNDates } from "../state.js";
import { renderDeficitTrend } from "../components/deficitTrend.js";
import { renderWeightTrend } from "../components/weightTrend.js";
import { renderMacroTable } from "../components/macroTable.js";
import { renderWorkoutSummary } from "../components/workoutSummary.js";

function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

const RANGES = {
  "7day": { label: "7 Day", days: 7 },
  month: { label: "Month", days: 30 },
  all: { label: "All-Time", days: null },
};

export async function renderDashboard(container) {
  const settings = await getSettings();
  const today = todayPDT();
  let activeRange = "7day";

  container.innerHTML = "";
  const heading = document.createElement("h1");
  heading.textContent = "Dashboard";
  container.appendChild(heading);

  const toggle = document.createElement("div");
  toggle.className = "day-type-toggle";
  const buttons = {};
  for (const key of Object.keys(RANGES)) {
    const btn = document.createElement("button");
    btn.textContent = RANGES[key].label;
    btn.addEventListener("click", () => {
      activeRange = key;
      updateToggle();
      draw();
    });
    toggle.appendChild(btn);
    buttons[key] = btn;
  }
  container.appendChild(toggle);

  function updateToggle() {
    for (const key of Object.keys(buttons)) buttons[key].classList.toggle("active", key === activeRange);
  }
  updateToggle();

  const deficitCard = document.createElement("div");
  deficitCard.className = "card";
  const weightCard = document.createElement("div");
  weightCard.className = "card";
  const macroCard = document.createElement("div");
  macroCard.className = "card";
  const workoutCard = document.createElement("div");
  workoutCard.className = "card";
  [deficitCard, weightCard, macroCard, workoutCard].forEach((c) => container.appendChild(c));

  async function draw() {
    const range = RANGES[activeRange];
    let startDate = range.days ? addDays(today, -(range.days - 1)) : settings.trackingStartDate;
    if (startDate < settings.trackingStartDate) startDate = settings.trackingStartDate;

    const dailyLogs = (await dbGetAllInRange("dailyLogs", startDate, today)).filter((l) => l.tracked);

    renderDeficitTrend(deficitCard, dailyLogs, startDate, today);
    renderWeightTrend(weightCard, dailyLogs, settings);
    renderMacroTable(macroCard, dailyLogs, settings);

    const rangeWorkouts = await dbGetAllByIndex("workouts", "date", IDBKeyRange.bound(startDate, today));
    const last7Dates = [...lastNDates(today, 6), today];
    const last7Workouts = await dbGetAllByIndex("workouts", "date", IDBKeyRange.bound(last7Dates[0], today));
    renderWorkoutSummary(workoutCard, rangeWorkouts, last7Workouts, last7Dates, settings.trackingStartDate);
  }

  await draw();
}
