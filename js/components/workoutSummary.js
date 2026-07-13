import { MUSCLE_GROUPS } from "../state.js";

function shortDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00Z") - new Date(a + "T00:00:00Z")) / (24 * 60 * 60 * 1000));
}

function muscleRotationGrid(container, last7Workouts, last7Dates, trackingStartDate) {
  const heading = document.createElement("h3");
  heading.textContent = "Muscle Rotation (trailing 7 days, independent of range above)";
  heading.style.fontSize = "0.85rem";
  heading.style.marginTop = "1rem";
  container.appendChild(heading);

  const workoutsByDate = new Map();
  for (const w of last7Workouts) {
    if (!workoutsByDate.has(w.date)) workoutsByDate.set(w.date, []);
    workoutsByDate.get(w.date).push(w);
  }

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.innerHTML = "<th></th>";
  for (const d of last7Dates) {
    const th = document.createElement("th");
    th.textContent = d < trackingStartDate ? "—" : shortDateLabel(d);
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  const lastHit = {};
  for (const group of MUSCLE_GROUPS) {
    const tr = document.createElement("tr");
    const nameTd = document.createElement("td");
    nameTd.textContent = group;
    tr.appendChild(nameTd);
    for (const d of last7Dates) {
      const td = document.createElement("td");
      if (d < trackingStartDate) {
        td.textContent = "";
      } else {
        const workouts = workoutsByDate.get(d) || [];
        const hit = workouts.some((w) => (w.muscleGroups || []).includes(group));
        if (hit) {
          td.appendChild(dotSpan());
          lastHit[group] = d;
        } else if (workouts.length > 0) {
          td.title = "Cardio only";
        }
      }
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  container.appendChild(table);

  const today = last7Dates[last7Dates.length - 1];
  const gaps = [];
  for (const group of MUSCLE_GROUPS) {
    if (today < trackingStartDate) continue;
    const last = lastHit[group];
    const gapDays = last ? daysBetween(last, today) : null;
    if (gapDays === null || gapDays >= 3) {
      gaps.push(`${group} — ${last ? `last hit ${gapDays} day${gapDays === 1 ? "" : "s"} ago` : "not hit in the last 7 days"}`);
    }
  }
  if (gaps.length > 0) {
    const gapList = document.createElement("ul");
    gapList.style.marginTop = "0.5rem";
    gapList.style.paddingLeft = "1.2rem";
    for (const g of gaps) {
      const li = document.createElement("li");
      li.className = "status-text over_max";
      li.style.fontSize = "0.8rem";
      li.textContent = `⚠ ${g}`;
      gapList.appendChild(li);
    }
    container.appendChild(gapList);
  }
}

function dotSpan() {
  const span = document.createElement("span");
  span.className = "status-dot at_ideal";
  return span;
}

// rangeWorkouts: workouts within the selected dashboard range.
// last7Workouts/last7Dates: always the trailing 7 days, independent of the range toggle.
export function renderWorkoutSummary(container, rangeWorkouts, last7Workouts, last7Dates, trackingStartDate) {
  container.innerHTML = `<h2>Workouts</h2>`;

  if (rangeWorkouts.length === 0) {
    container.innerHTML += `<p class="empty-state">No workouts logged in this range yet.</p>`;
  } else {
    const totalMin = rangeWorkouts.reduce((s, w) => s + (w.duration_min || 0), 0);
    const totalCal = rangeWorkouts.reduce((s, w) => s + (w.activeCalories || 0), 0);
    const summary = document.createElement("p");
    summary.style.fontFamily = "var(--font-mono)";
    summary.textContent = `${rangeWorkouts.length} session${rangeWorkouts.length === 1 ? "" : "s"} · ${totalMin} min · ${totalCal} cal`;
    container.appendChild(summary);

    const list = document.createElement("ul");
    list.className = "meal-list";
    for (const w of [...rangeWorkouts].sort((a, b) => (a.date < b.date ? 1 : -1))) {
      const li = document.createElement("li");
      const groups = w.muscleGroups && w.muscleGroups.length ? ` · ${w.muscleGroups.join(", ")}` : "";
      li.innerHTML = `${w.date} — ${w.type}<div class="meal-macros">${w.duration_min} min · ${w.activeCalories} cal${groups}</div>`;
      list.appendChild(li);
    }
    container.appendChild(list);
  }

  muscleRotationGrid(container, last7Workouts, last7Dates, trackingStartDate);
}
