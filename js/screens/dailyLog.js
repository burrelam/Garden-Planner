import { dbGet, dbPut, dbDelete, dbGetAllByIndex, getSettings } from "../db.js";
import { todayPDT, dayNumberFor, lastNDates, sumMealEntries } from "../state.js";
import { trueDeficit, restDayAutoUpgrade } from "../formulas.js";
import { renderRunningTotals } from "../components/runningTotals.js";
import { renderManualEntry, renderLibrarySearch } from "../components/mealEntryForm.js";
import { renderPastePreview } from "../components/pastePreview.js";
import { renderWorkoutEntry } from "../components/workoutEntryForm.js";
import { renderWaterGlass } from "../components/waterGlass.js";

async function loadDay(date, settings) {
  const existing = await dbGet("dailyLogs", date);
  if (existing) return existing;
  const fresh = {
    date,
    dayNumber: dayNumberFor(date, settings.trackingStartDate),
    dayType: "workout",
    activeCalories: 0,
    restingCalories: settings.restingTDEEBaseline,
    weight: null,
    water_oz: 0,
    notes: "",
    tracked: false,
    autoUpgraded: false,
  };
  await dbPut("dailyLogs", fresh);
  return fresh;
}

async function loadPastSixTrueDeficits(date, trackingStartDate) {
  const dates = lastNDates(date, 6);
  const results = [];
  for (const d of dates) {
    if (d < trackingStartDate) { results.push(null); continue; }
    const log = await dbGet("dailyLogs", d);
    results.push(log && log.tracked ? log.trueDeficit : null);
  }
  return results;
}

export async function renderDailyLog(container) {
  const settings = await getSettings();
  const date = todayPDT();
  let dayLog = await loadDay(date, settings);

  container.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = `Day ${dayLog.dayNumber} — ${date}`;
  container.appendChild(heading);

  // --- Day type + active/resting + weight card ---
  const infoCard = document.createElement("div");
  infoCard.className = "card";

  const dayTypeToggle = document.createElement("div");
  dayTypeToggle.className = "day-type-toggle";
  const workoutBtn = document.createElement("button");
  workoutBtn.textContent = "Workout Day";
  const restBtn = document.createElement("button");
  restBtn.textContent = "Rest Day";
  dayTypeToggle.appendChild(workoutBtn);
  dayTypeToggle.appendChild(restBtn);
  infoCard.appendChild(dayTypeToggle);

  const row = document.createElement("div");
  row.className = "field-row";
  row.style.marginTop = "0.75rem";

  function labeledInput(labelText, type, value, step) {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    const input = document.createElement("input");
    input.type = type;
    if (step) input.step = step;
    input.value = value ?? "";
    label.appendChild(span);
    label.appendChild(input);
    return { label, input };
  }

  const activeField = labeledInput("Active Calories", "number", dayLog.activeCalories, "1");
  const restingField = labeledInput("Resting Calories", "number", dayLog.restingCalories, "1");
  const weightField = labeledInput("Weight (lbs)", "number", dayLog.weight, "0.1");
  const waterField = labeledInput("Water (oz)", "number", dayLog.water_oz, "1");
  [activeField, restingField, weightField, waterField].forEach((f) => row.appendChild(f.label));
  infoCard.appendChild(row);

  const waterGlassHost = document.createElement("div");
  waterGlassHost.style.marginTop = "0.5rem";
  infoCard.appendChild(waterGlassHost);

  container.appendChild(infoCard);

  function updateDayTypeButtons() {
    workoutBtn.classList.toggle("active", dayLog.dayType === "workout");
    restBtn.classList.toggle("active", dayLog.dayType === "rest");
  }
  updateDayTypeButtons();

  // --- Meal entry tabs ---
  const entryCard = document.createElement("div");
  entryCard.className = "card";
  const tabRow = document.createElement("div");
  tabRow.className = "day-type-toggle";
  const manualTab = document.createElement("button");
  manualTab.textContent = "Manual";
  const libraryTab = document.createElement("button");
  libraryTab.textContent = "Library";
  const pasteTab = document.createElement("button");
  pasteTab.textContent = "Paste Macros";
  tabRow.appendChild(manualTab);
  tabRow.appendChild(libraryTab);
  tabRow.appendChild(pasteTab);
  entryCard.appendChild(tabRow);
  const entryHost = document.createElement("div");
  entryHost.style.marginTop = "0.75rem";
  entryCard.appendChild(entryHost);
  container.appendChild(entryCard);

  // --- Meal list ---
  const mealListCard = document.createElement("div");
  mealListCard.className = "card";
  mealListCard.innerHTML = `<h2>Today's Meals</h2>`;
  const mealListHost = document.createElement("div");
  mealListCard.appendChild(mealListHost);
  container.appendChild(mealListCard);

  // --- Workouts ---
  const workoutCard = document.createElement("div");
  workoutCard.className = "card";
  workoutCard.innerHTML = `<h2>Workouts</h2>`;
  const workoutFormHost = document.createElement("div");
  workoutCard.appendChild(workoutFormHost);
  const workoutListHost = document.createElement("div");
  workoutListHost.style.marginTop = "0.75rem";
  workoutCard.appendChild(workoutListHost);
  container.appendChild(workoutCard);

  // --- Notes ---
  const notesCard = document.createElement("div");
  notesCard.className = "card";
  notesCard.innerHTML = `<h2>Notes</h2>`;
  const notesInput = document.createElement("textarea");
  notesInput.style.width = "100%";
  notesInput.style.minHeight = "5rem";
  notesInput.value = dayLog.notes || "";
  notesInput.placeholder = "Meal summary, muscle groups if strength/Pilates day…";
  notesCard.appendChild(notesInput);
  container.appendChild(notesCard);

  // --- Running totals ---
  const totalsCard = document.createElement("div");
  totalsCard.className = "card";
  totalsCard.innerHTML = `<h2>Running Totals</h2>`;
  const totalsHost = document.createElement("div");
  totalsCard.appendChild(totalsHost);
  container.appendChild(totalsCard);

  // --- EOD close-out ---
  const closeCard = document.createElement("div");
  closeCard.className = "card";
  container.appendChild(closeCard);

  let pastSixTrueDeficits = await loadPastSixTrueDeficits(date, settings.trackingStartDate);

  async function persistDayLog(patch) {
    dayLog = { ...dayLog, ...patch };
    await dbPut("dailyLogs", dayLog);
  }

  async function refresh() {
    const meals = await dbGetAllByIndex("mealEntries", "date", date);
    const sums = sumMealEntries(meals);
    const activeCalories = Number(activeField.input.value) || 0;

    const autoUpgraded = restDayAutoUpgrade(activeCalories, dayLog.dayType);
    const effectiveDayType = autoUpgraded ? "workout" : dayLog.dayType;

    renderRunningTotals(totalsHost, {
      dayType: effectiveDayType,
      autoUpgraded,
      grossCalories: sums.calories,
      activeCalories,
      restingCalories: Number(restingField.input.value) || 0,
      protein_g: sums.protein_g,
      carbs_g: sums.carbs_g,
      fat_g: sums.fat_g,
      fiber_g: sums.fiber_g,
      water_oz: Number(waterField.input.value) || 0,
      pastSixTrueDeficits,
      isMidDay: !dayLog.tracked,
    }, settings);

    renderMealList(meals);
    renderCloseOut(sums, activeCalories);
    renderWaterGlass(waterGlassHost, Number(waterField.input.value) || 0, settings.thresholds.water);

    // Persist mid-day field values as they're typed, not just at close-out, so a reload never loses them.
    await persistDayLog({
      autoUpgraded,
      activeCalories,
      restingCalories: Number(restingField.input.value) || 0,
      water_oz: Number(waterField.input.value) || 0,
    });
  }

  async function renderWorkoutList() {
    const workouts = await dbGetAllByIndex("workouts", "date", date);
    workoutListHost.innerHTML = "";
    if (workouts.length === 0) {
      workoutListHost.innerHTML = `<p class="empty-state">No workouts logged yet.</p>`;
      return;
    }
    const list = document.createElement("ul");
    list.className = "meal-list";
    for (const workout of workouts) {
      const li = document.createElement("li");
      const info = document.createElement("div");
      const groups = workout.muscleGroups && workout.muscleGroups.length ? ` · ${workout.muscleGroups.join(", ")}` : "";
      info.innerHTML = `${workout.type}<div class="meal-macros">${workout.duration_min} min · ${workout.activeCalories} cal${groups}</div>`;
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", async () => {
        await dbDelete("workouts", workout.id);
        await renderWorkoutList();
      });
      li.appendChild(info);
      li.appendChild(delBtn);
      list.appendChild(li);
    }
    workoutListHost.appendChild(list);
  }

  async function addWorkout(entry) {
    await dbPut("workouts", { ...entry, date });
    await renderWorkoutList();
  }
  renderWorkoutEntry(workoutFormHost, addWorkout);

  function renderMealList(meals) {
    mealListHost.innerHTML = "";
    if (meals.length === 0) {
      mealListHost.innerHTML = `<p class="empty-state">No meals logged yet.</p>`;
      return;
    }
    const list = document.createElement("ul");
    list.className = "meal-list";
    for (const meal of meals) {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.innerHTML = `${meal.description}<div class="meal-macros">${meal.calories} cal · P${meal.protein_g} C${meal.carbs_g} F${meal.fat_g} Fib${meal.fiber_g}${meal.isSharedMeal ? " · shared" : ""}</div>`;
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", async () => {
        await dbDelete("mealEntries", meal.id);
        await refresh();
      });
      li.appendChild(info);
      li.appendChild(delBtn);
      list.appendChild(li);
    }
    mealListHost.appendChild(list);
  }

  function renderCloseOut(sums, activeCalories) {
    closeCard.innerHTML = "";
    if (dayLog.tracked) {
      const banner = document.createElement("div");
      banner.innerHTML = `<h2>Day Closed ✓</h2><p>True deficit locked at <strong>${dayLog.trueDeficit}</strong> kcal.</p>`;
      const reopenBtn = document.createElement("button");
      reopenBtn.className = "secondary";
      reopenBtn.textContent = "Reopen Day";
      reopenBtn.addEventListener("click", async () => {
        await persistDayLog({ tracked: false });
        await refresh();
      });
      closeCard.appendChild(banner);
      closeCard.appendChild(reopenBtn);
      return;
    }
    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close Out Day (lock true deficit)";
    closeBtn.addEventListener("click", async () => {
      const restingCalories = Number(restingField.input.value) || 0;
      const finalDeficit = trueDeficit(sums.calories, activeCalories, restingCalories);
      await persistDayLog({
        grossCalories: sums.calories,
        activeCalories,
        restingCalories,
        weight: Number(weightField.input.value) || null,
        water_oz: Number(waterField.input.value) || 0,
        protein_g: sums.protein_g,
        carbs_g: sums.carbs_g,
        fat_g: sums.fat_g,
        fiber_g: sums.fiber_g,
        notes: notesInput.value,
        trueDeficit: finalDeficit,
        tracked: true,
      });
      pastSixTrueDeficits = await loadPastSixTrueDeficits(date, settings.trackingStartDate);
      await refresh();
    });
    closeCard.appendChild(closeBtn);
  }

  workoutBtn.addEventListener("click", async () => {
    await persistDayLog({ dayType: "workout" });
    updateDayTypeButtons();
    refresh();
  });
  restBtn.addEventListener("click", async () => {
    await persistDayLog({ dayType: "rest" });
    updateDayTypeButtons();
    refresh();
  });

  [activeField, restingField, waterField].forEach((f) => {
    f.input.addEventListener("input", refresh);
  });
  weightField.input.addEventListener("change", () => persistDayLog({ weight: Number(weightField.input.value) || null }));
  notesInput.addEventListener("change", () => persistDayLog({ notes: notesInput.value }));

  async function addMeal(entry) {
    await dbPut("mealEntries", { ...entry, date, timestamp: new Date().toISOString() });
    await refresh();
  }

  function showTab(tab) {
    manualTab.classList.toggle("active", tab === "manual");
    libraryTab.classList.toggle("active", tab === "library");
    pasteTab.classList.toggle("active", tab === "paste");
    entryHost.innerHTML = "";
    if (tab === "manual") renderManualEntry(entryHost, addMeal);
    else if (tab === "library") renderLibrarySearch(entryHost, addMeal);
    else renderPastePreview(entryHost, async (rows) => {
      for (const row of rows) await addMeal(row);
    });
  }
  manualTab.addEventListener("click", () => showTab("manual"));
  libraryTab.addEventListener("click", () => showTab("library"));
  pasteTab.addEventListener("click", () => showTab("paste"));

  showTab("manual");
  await renderWorkoutList();
  await refresh();
}
