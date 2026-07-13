import { MUSCLE_GROUPS } from "../state.js";

const WORKOUT_TYPES = ["Run", "Strength", "Pilates", "HIIT", "Mobility", "Other"];
const MUSCLE_GROUP_TYPES = ["Strength", "Pilates"];

export function renderWorkoutEntry(container, onAdd) {
  container.innerHTML = "";

  const typeSelect = document.createElement("select");
  WORKOUT_TYPES.forEach((t) => {
    const o = document.createElement("option");
    o.value = t;
    o.textContent = t;
    typeSelect.appendChild(o);
  });

  const durationInput = document.createElement("input");
  durationInput.type = "number";
  durationInput.step = "1";
  durationInput.placeholder = "Duration (min)";

  const caloriesInput = document.createElement("input");
  caloriesInput.type = "number";
  caloriesInput.step = "1";
  caloriesInput.placeholder = "Active Calories";

  const row = document.createElement("div");
  row.className = "field-row";
  for (const [labelText, input] of [["Type", typeSelect], ["Duration (min)", durationInput], ["Active Calories", caloriesInput]]) {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    label.appendChild(span);
    label.appendChild(input);
    row.appendChild(label);
  }
  container.appendChild(row);

  const muscleGroupHost = document.createElement("div");
  muscleGroupHost.style.marginBottom = "0.5rem";
  container.appendChild(muscleGroupHost);

  const muscleCheckboxes = {};
  function drawMuscleGroups() {
    muscleGroupHost.innerHTML = "";
    if (!MUSCLE_GROUP_TYPES.includes(typeSelect.value)) return;
    for (const group of MUSCLE_GROUPS) {
      const label = document.createElement("label");
      label.style.display = "inline-flex";
      label.style.alignItems = "center";
      label.style.gap = "0.3rem";
      label.style.marginRight = "0.75rem";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      muscleCheckboxes[group] = cb;
      const span = document.createElement("span");
      span.textContent = group;
      label.appendChild(cb);
      label.appendChild(span);
      muscleGroupHost.appendChild(label);
    }
  }
  typeSelect.addEventListener("change", drawMuscleGroups);
  drawMuscleGroups();

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Workout";
  addBtn.addEventListener("click", () => {
    const muscleGroups = Object.entries(muscleCheckboxes)
      .filter(([, cb]) => cb.checked)
      .map(([group]) => group);
    onAdd({
      type: typeSelect.value,
      duration_min: Number(durationInput.value) || 0,
      activeCalories: Number(caloriesInput.value) || 0,
      muscleGroups,
      source: "manual",
    });
    durationInput.value = "";
    caloriesInput.value = "";
    Object.values(muscleCheckboxes).forEach((cb) => { cb.checked = false; });
  });
  container.appendChild(addBtn);
}
