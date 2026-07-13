import { dbGetAll } from "../db.js";

function numField(labelText, value = "") {
  const label = document.createElement("label");
  const span = document.createElement("span");
  span.textContent = labelText;
  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.value = value;
  label.appendChild(span);
  label.appendChild(input);
  return { label, input };
}

// Manual meal entry, including the shared-meal portioning tool (pre/post-share totals -> consumed calories).
export function renderManualEntry(container, onAdd) {
  container.innerHTML = "";

  const descInput = document.createElement("input");
  descInput.placeholder = "Meal description";
  descInput.style.width = "100%";
  descInput.style.marginBottom = "0.5rem";
  container.appendChild(descInput);

  const macroRow = document.createElement("div");
  macroRow.className = "field-row";
  const cal = numField("Calories");
  const protein = numField("Protein (g)");
  const carbs = numField("Carbs (g)");
  const fat = numField("Fat (g)");
  const fiber = numField("Fiber (g)");
  [cal, protein, carbs, fat, fiber].forEach((f) => macroRow.appendChild(f.label));
  container.appendChild(macroRow);

  const sourceSelect = document.createElement("select");
  ["Label", "Estimate", "Library"].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt.toLowerCase();
    o.textContent = opt;
    sourceSelect.appendChild(o);
  });
  const sourceLabel = document.createElement("label");
  const sourceSpan = document.createElement("span");
  sourceSpan.textContent = "Source";
  sourceLabel.appendChild(sourceSpan);
  sourceLabel.appendChild(sourceSelect);
  sourceLabel.style.marginBottom = "0.5rem";
  container.appendChild(sourceLabel);

  // --- Shared-meal portioning tool ---
  const sharedToggle = document.createElement("label");
  sharedToggle.style.display = "flex";
  sharedToggle.style.alignItems = "center";
  sharedToggle.style.gap = "0.5rem";
  sharedToggle.style.marginBottom = "0.5rem";
  const sharedCheckbox = document.createElement("input");
  sharedCheckbox.type = "checkbox";
  const sharedSpan = document.createElement("span");
  sharedSpan.textContent = "This was a shared meal (calculate portion from before/after totals)";
  sharedToggle.appendChild(sharedCheckbox);
  sharedToggle.appendChild(sharedSpan);
  container.appendChild(sharedToggle);

  const sharedFields = document.createElement("div");
  sharedFields.className = "field-row";
  sharedFields.style.display = "none";
  const preShare = numField("Pre-share total (cal)");
  const postShare = numField("Post-share total (cal)");
  const sharedCount = numField("# sharing (incl. you)", 1);
  [preShare, postShare, sharedCount].forEach((f) => sharedFields.appendChild(f.label));
  container.appendChild(sharedFields);

  sharedCheckbox.addEventListener("change", () => {
    sharedFields.style.display = sharedCheckbox.checked ? "flex" : "none";
  });

  function recalcSharedCalories() {
    const pre = Number(preShare.input.value) || 0;
    const post = Number(postShare.input.value) || 0;
    const count = Number(sharedCount.input.value) || 1;
    if (pre > 0 && count > 0) {
      cal.input.value = Math.round((pre - post) / count);
    }
  }
  preShare.input.addEventListener("input", recalcSharedCalories);
  postShare.input.addEventListener("input", recalcSharedCalories);
  sharedCount.input.addEventListener("input", recalcSharedCalories);

  const addBtn = document.createElement("button");
  addBtn.textContent = "Add Meal";
  addBtn.addEventListener("click", () => {
    if (!descInput.value.trim()) { descInput.focus(); return; }
    onAdd({
      description: descInput.value.trim(),
      calories: Number(cal.input.value) || 0,
      protein_g: Number(protein.input.value) || 0,
      carbs_g: Number(carbs.input.value) || 0,
      fat_g: Number(fat.input.value) || 0,
      fiber_g: Number(fiber.input.value) || 0,
      source: sourceSelect.value,
      isSharedMeal: sharedCheckbox.checked,
      sharedWithCount: sharedCheckbox.checked ? Number(sharedCount.input.value) || 1 : null,
      preShareTotal: sharedCheckbox.checked ? Number(preShare.input.value) || 0 : null,
      postShareTotal: sharedCheckbox.checked ? Number(postShare.input.value) || 0 : null,
    });
    descInput.value = "";
    [cal, protein, carbs, fat, fiber, preShare, postShare].forEach((f) => (f.input.value = ""));
    sharedCount.input.value = 1;
    sharedCheckbox.checked = false;
    sharedFields.style.display = "none";
    descInput.focus();
  });
  container.appendChild(addBtn);
}

// Library search-and-add, with a serving-count multiplier.
export async function renderLibrarySearch(container, onAdd) {
  container.innerHTML = "";
  const items = (await dbGetAll("foodLibrary")).sort((a, b) => a.name.localeCompare(b.name));

  const searchInput = document.createElement("input");
  searchInput.className = "search-box";
  searchInput.placeholder = "Search food library…";
  container.appendChild(searchInput);

  const resultsHost = document.createElement("div");
  container.appendChild(resultsHost);

  function draw(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items.slice(0, 15);
    resultsHost.innerHTML = "";
    if (filtered.length === 0) {
      resultsHost.innerHTML = `<p class="empty-state">No matches.</p>`;
      return;
    }
    const list = document.createElement("ul");
    list.className = "meal-list";
    for (const item of filtered) {
      const li = document.createElement("li");
      const info = document.createElement("div");
      info.innerHTML = `${item.name}<div class="meal-macros">${item.servingSize || ""} · ${item.calories} cal · P${item.protein_g} C${item.carbs_g} F${item.fat_g}</div>`;

      const actions = document.createElement("div");
      const qtyInput = document.createElement("input");
      qtyInput.type = "number";
      qtyInput.step = "0.5";
      qtyInput.value = "1";
      qtyInput.style.width = "3.5rem";
      qtyInput.style.marginRight = "0.4rem";
      const addBtn = document.createElement("button");
      addBtn.textContent = "Add";
      addBtn.style.fontSize = "0.8rem";
      addBtn.style.padding = "0.3rem 0.6rem";
      addBtn.addEventListener("click", () => {
        const qty = Number(qtyInput.value) || 1;
        onAdd({
          description: qty === 1 ? item.name : `${item.name} × ${qty}`,
          calories: Math.round(item.calories * qty),
          protein_g: Math.round(item.protein_g * qty * 10) / 10,
          carbs_g: Math.round(item.carbs_g * qty * 10) / 10,
          fat_g: Math.round(item.fat_g * qty * 10) / 10,
          fiber_g: Math.round(item.fiber_g * qty * 10) / 10,
          source: "library",
          foodLibraryItemId: item.id,
        });
      });
      actions.appendChild(qtyInput);
      actions.appendChild(addBtn);

      li.appendChild(info);
      li.appendChild(actions);
      list.appendChild(li);
    }
    resultsHost.appendChild(list);
  }

  searchInput.addEventListener("input", () => draw(searchInput.value));
  draw("");
}
