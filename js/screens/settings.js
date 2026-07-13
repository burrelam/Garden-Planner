import { getSettings, saveSettings, exportAllData, importAllData } from "../db.js";
import { toCSV } from "../csv.js";

const THRESHOLD_FIELDS = [
  { key: "grossCaloriesWorkout", label: "Gross Calories — Workout day", cols: ["min", "ideal", "max"] },
  { key: "grossCaloriesRest", label: "Gross Calories — Rest day", cols: ["min", "ideal", "max"] },
  { key: "deficitDaily", label: "Current/Projected EOD Deficit", cols: ["ideal", "max"] },
  { key: "deficitWeekly", label: "7-Day Current/EOD Projected", cols: ["ideal", "max"] },
  { key: "protein", label: "Protein (g)", cols: ["min", "ideal", "max"] },
  { key: "carbs", label: "Carbs (g)", cols: ["min", "ideal", "max"] },
  { key: "fat", label: "Fat (g)", cols: ["min", "ideal", "max"] },
  { key: "fiber", label: "Fiber (g)", cols: ["min", "ideal", "max"] },
  { key: "water", label: "Water (oz)", cols: ["min", "ideal", "max"] },
  { key: "netCalorieBand", label: "Net Calorie Goal Band", cols: ["min", "max"] },
];

function cmToFeetInches(cm) {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

function field(labelText, inputEl) {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  label.appendChild(span);
  label.appendChild(inputEl);
  return label;
}

function textInput(value, type = "text", step) {
  const input = document.createElement("input");
  input.type = type;
  if (step) input.step = step;
  input.value = value ?? "";
  return input;
}

export async function renderSettings(container) {
  const settings = await getSettings();
  container.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "Settings";
  container.appendChild(heading);

  // --- Profile card ---
  const profileCard = document.createElement("div");
  profileCard.className = "card";
  profileCard.innerHTML = `<h2>Profile</h2>`;

  const nameInput = textInput(settings.name);
  const heightInput = textInput((settings.heightCm / 2.54).toFixed(1), "number", "0.1");
  const startWeightInput = textInput(settings.startWeight, "number", "0.1");
  const goalWeightInput = textInput(settings.goalWeight, "number", "0.1");
  const paceInput = textInput(settings.targetPaceLbsPerWeek, "number", "0.05");
  const trackingStartInput = textInput(settings.trackingStartDate, "date");

  const row1 = document.createElement("div");
  row1.className = "field-row";
  row1.appendChild(field("Name", nameInput));
  row1.appendChild(field(`Height (in) — currently ${cmToFeetInches(settings.heightCm)}`, heightInput));

  const row2 = document.createElement("div");
  row2.className = "field-row";
  row2.appendChild(field("Start weight (lbs)", startWeightInput));
  row2.appendChild(field("Goal weight (lbs)", goalWeightInput));
  row2.appendChild(field("Target pace (lbs/week)", paceInput));

  const row3 = document.createElement("div");
  row3.className = "field-row";
  row3.appendChild(field("Tracking start date", trackingStartInput));

  profileCard.appendChild(row1);
  profileCard.appendChild(row2);
  profileCard.appendChild(row3);
  container.appendChild(profileCard);

  // --- TDEE card ---
  const tdeeCard = document.createElement("div");
  tdeeCard.className = "card";
  tdeeCard.innerHTML = `<h2>Resting TDEE Baseline</h2>`;
  const baselineInput = textInput(settings.restingTDEEBaseline, "number", "1");
  const recalcInput = textInput(settings.lastRecalculatedDate || "", "date");
  const tdeeRow = document.createElement("div");
  tdeeRow.className = "field-row";
  tdeeRow.appendChild(field("Baseline (kcal/day)", baselineInput));
  tdeeRow.appendChild(field("Last recalculated", recalcInput));
  tdeeCard.appendChild(tdeeRow);
  container.appendChild(tdeeCard);

  // --- Thresholds card ---
  const thresholdsCard = document.createElement("div");
  thresholdsCard.className = "card";
  thresholdsCard.innerHTML = `<h2>Targets / Thresholds</h2>`;
  const header = document.createElement("div");
  header.className = "threshold-grid";
  header.innerHTML = `<div></div><div class="header">Min</div><div class="header">Ideal</div><div class="header">Max</div>`;
  thresholdsCard.appendChild(header);

  const thresholdInputs = {};
  for (const def of THRESHOLD_FIELDS) {
    const grid = document.createElement("div");
    grid.className = "threshold-grid";
    const nameDiv = document.createElement("div");
    nameDiv.textContent = def.label;
    grid.appendChild(nameDiv);
    thresholdInputs[def.key] = {};
    const allCols = ["min", "ideal", "max"];
    for (const col of allCols) {
      if (!def.cols.includes(col)) {
        const blank = document.createElement("div");
        grid.appendChild(blank);
        continue;
      }
      const input = textInput(settings.thresholds[def.key][col], "number", "1");
      thresholdInputs[def.key][col] = input;
      grid.appendChild(input);
    }
    thresholdsCard.appendChild(grid);
  }
  container.appendChild(thresholdsCard);

  // --- Save button ---
  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save Settings";

  const lastSavedLabel = document.createElement("span");
  lastSavedLabel.style.marginLeft = "0.75rem";
  lastSavedLabel.style.fontSize = "0.8rem";
  lastSavedLabel.style.color = "var(--mist)";
  function formatLastSaved(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return `Last saved ${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  lastSavedLabel.textContent = formatLastSaved(settings.lastSavedAt);

  saveBtn.addEventListener("click", async () => {
    const thresholds = {};
    for (const def of THRESHOLD_FIELDS) {
      thresholds[def.key] = { ...settings.thresholds[def.key] };
      for (const col of def.cols) {
        thresholds[def.key][col] = Number(thresholdInputs[def.key][col].value);
      }
    }
    const lastSavedAt = new Date().toISOString();
    await saveSettings({
      name: nameInput.value,
      heightCm: Number(heightInput.value) * 2.54,
      startWeight: Number(startWeightInput.value),
      goalWeight: Number(goalWeightInput.value),
      targetPaceLbsPerWeek: Number(paceInput.value),
      trackingStartDate: trackingStartInput.value,
      restingTDEEBaseline: Number(baselineInput.value),
      lastRecalculatedDate: recalcInput.value || null,
      thresholds,
      lastSavedAt,
    });
    lastSavedLabel.textContent = formatLastSaved(lastSavedAt);
    saveBtn.textContent = "Saved ✓";
    setTimeout(() => { saveBtn.textContent = "Save Settings"; }, 1500);
  });
  const saveRow = document.createElement("div");
  saveRow.style.marginBottom = "1rem";
  saveRow.appendChild(saveBtn);
  saveRow.appendChild(lastSavedLabel);
  container.appendChild(saveRow);

  // --- Backup card ---
  const backupCard = document.createElement("div");
  backupCard.className = "card";
  backupCard.innerHTML = `<h2>Backup</h2><p style="color:var(--mist); font-size:0.85rem;">Local storage can be lost on device wipe or reinstall. Export regularly.</p>`;

  const exportBtn = document.createElement("button");
  exportBtn.textContent = "Export JSON Backup";
  exportBtn.addEventListener("click", async () => {
    const dump = await exportAllData();
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `panda-fittracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const exportCsvBtn = document.createElement("button");
  exportCsvBtn.className = "secondary";
  exportCsvBtn.textContent = "Export Food Library CSV";
  exportCsvBtn.style.marginLeft = "0.5rem";
  exportCsvBtn.addEventListener("click", async () => {
    const dump = await exportAllData();
    const csv = toCSV(dump.foodLibrary || []);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `food-library-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  const importLabel = document.createElement("label");
  importLabel.className = "secondary";
  importLabel.style.display = "inline-block";
  importLabel.style.marginTop = "0.75rem";
  importLabel.style.padding = "0.6rem 1.1rem";
  importLabel.style.borderRadius = "10px";
  importLabel.style.border = "1px solid var(--mist)";
  importLabel.style.cursor = "pointer";
  importLabel.textContent = "Import JSON Backup (overwrites current data)";
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json";
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    if (!confirm("This will overwrite all current data with the contents of this backup file. Continue?")) {
      importInput.value = "";
      return;
    }
    const text = await file.text();
    try {
      const dump = JSON.parse(text);
      await importAllData(dump);
      alert("Backup restored. Reloading.");
      location.reload();
    } catch (err) {
      alert("Could not read that file as a valid backup: " + err.message);
    }
  });
  importLabel.appendChild(importInput);

  backupCard.appendChild(exportBtn);
  backupCard.appendChild(exportCsvBtn);
  backupCard.appendChild(document.createElement("br"));
  backupCard.appendChild(importLabel);
  container.appendChild(backupCard);
}
