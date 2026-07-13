import { dbGetAll, dbPut, dbDelete } from "../db.js";
import { parseCSV } from "../csv.js";

// Manual, local-only import — the CSV never ships in the app bundle (it's derived from a private
// sheet), so seeding the library is a one-time file picker action instead of an automatic fetch.
async function importCSVFile(file) {
  const text = await file.text();
  const rows = parseCSV(text);
  for (const row of rows) {
    await dbPut("foodLibrary", {
      name: row["Item"],
      servingSize: row["Serving Size"],
      calories: Number(row["Calories"]) || 0,
      protein_g: Number(row["Protein (g)"]) || 0,
      carbs_g: Number(row["Carbs (g)"]) || 0,
      fat_g: Number(row["Fat (g)"]) || 0,
      fiber_g: Number(row["Fiber (g)"]) || 0,
      source: row["Source"] || "",
      lastUpdated: new Date().toISOString().slice(0, 10),
    });
  }
  return rows.length;
}

function numInput(value, step = "1") {
  const input = document.createElement("input");
  input.type = "number";
  input.step = step;
  input.value = value ?? "";
  return input;
}

function editForm(container, item, onSave, onCancel) {
  const form = document.createElement("div");
  form.className = "card";

  const nameInput = document.createElement("input");
  nameInput.placeholder = "Item name";
  nameInput.value = item?.name || "";
  nameInput.style.width = "100%";
  nameInput.style.marginBottom = "0.5rem";

  const servingInput = document.createElement("input");
  servingInput.placeholder = "Serving size";
  servingInput.value = item?.servingSize || "";
  servingInput.style.width = "100%";
  servingInput.style.marginBottom = "0.5rem";

  const row = document.createElement("div");
  row.className = "field-row";
  const calInput = numInput(item?.calories);
  const proteinInput = numInput(item?.protein_g, "0.1");
  const carbsInput = numInput(item?.carbs_g, "0.1");
  const fatInput = numInput(item?.fat_g, "0.1");
  const fiberInput = numInput(item?.fiber_g, "0.1");
  for (const [labelText, input] of [
    ["Cal", calInput], ["Protein", proteinInput], ["Carbs", carbsInput], ["Fat", fatInput], ["Fiber", fiberInput],
  ]) {
    const label = document.createElement("label");
    const span = document.createElement("span");
    span.textContent = labelText;
    label.appendChild(span);
    label.appendChild(input);
    row.appendChild(label);
  }

  const sourceInput = document.createElement("select");
  ["Label", "Estimate", "Library"].forEach((opt) => {
    const o = document.createElement("option");
    o.value = opt;
    o.textContent = opt;
    sourceInput.appendChild(o);
  });
  sourceInput.value = item?.source && ["Label", "Estimate", "Library"].includes(item.source) ? item.source : "Estimate";

  const sourceLabel = document.createElement("label");
  sourceLabel.style.marginBottom = "0.5rem";
  const sourceSpan = document.createElement("span");
  sourceSpan.textContent = "Source";
  sourceLabel.appendChild(sourceSpan);
  sourceLabel.appendChild(sourceInput);

  const saveBtn = document.createElement("button");
  saveBtn.textContent = item ? "Save" : "Add to Library";
  const cancelBtn = document.createElement("button");
  cancelBtn.className = "secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.marginLeft = "0.5rem";

  saveBtn.addEventListener("click", async () => {
    if (!nameInput.value.trim()) { nameInput.focus(); return; }
    const record = {
      ...(item || {}),
      name: nameInput.value.trim(),
      servingSize: servingInput.value.trim(),
      calories: Number(calInput.value) || 0,
      protein_g: Number(proteinInput.value) || 0,
      carbs_g: Number(carbsInput.value) || 0,
      fat_g: Number(fatInput.value) || 0,
      fiber_g: Number(fiberInput.value) || 0,
      source: sourceInput.value,
      lastUpdated: new Date().toISOString().slice(0, 10),
    };
    await dbPut("foodLibrary", record);
    onSave();
  });
  cancelBtn.addEventListener("click", onCancel);

  form.appendChild(nameInput);
  form.appendChild(servingInput);
  form.appendChild(row);
  form.appendChild(sourceLabel);
  form.appendChild(saveBtn);
  form.appendChild(cancelBtn);
  container.appendChild(form);
}

export async function renderFoodLibrary(container) {
  container.innerHTML = "";
  const heading = document.createElement("h1");
  heading.textContent = "Food Library";
  container.appendChild(heading);

  const formHost = document.createElement("div");
  container.appendChild(formHost);

  const addBtn = document.createElement("button");
  addBtn.textContent = "+ Add Item";
  addBtn.style.marginBottom = "0.75rem";
  addBtn.addEventListener("click", () => {
    formHost.innerHTML = "";
    editForm(formHost, null, () => { formHost.innerHTML = ""; renderTable(); }, () => { formHost.innerHTML = ""; });
  });
  container.appendChild(addBtn);

  const importLabel = document.createElement("label");
  importLabel.className = "secondary";
  importLabel.style.display = "inline-block";
  importLabel.style.marginLeft = "0.5rem";
  importLabel.style.marginBottom = "0.75rem";
  importLabel.style.padding = "0.6rem 1.1rem";
  importLabel.style.borderRadius = "10px";
  importLabel.style.border = "1px solid var(--mist)";
  importLabel.style.cursor = "pointer";
  importLabel.textContent = "Import CSV";
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".csv,text/csv";
  importInput.style.display = "none";
  importInput.addEventListener("change", async () => {
    const file = importInput.files[0];
    if (!file) return;
    const count = await importCSVFile(file);
    importInput.value = "";
    await renderTable();
    alert(`Imported ${count} items.`);
  });
  importLabel.appendChild(importInput);
  container.appendChild(importLabel);

  const searchInput = document.createElement("input");
  searchInput.className = "search-box";
  searchInput.placeholder = "Search food library…";
  container.appendChild(searchInput);

  const tableHost = document.createElement("div");
  container.appendChild(tableHost);

  let allItems = [];

  async function renderTable() {
    allItems = (await dbGetAll("foodLibrary")).sort((a, b) => a.name.localeCompare(b.name));
    draw(searchInput.value);
  }

  function draw(query) {
    const q = query.trim().toLowerCase();
    const filtered = q ? allItems.filter((i) => i.name.toLowerCase().includes(q)) : allItems;
    tableHost.innerHTML = "";
    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.textContent = "No items found.";
      tableHost.appendChild(empty);
      return;
    }
    const table = document.createElement("table");
    table.innerHTML = `<thead><tr>
      <th>Item</th><th>Serving</th><th>Cal</th><th>P</th><th>C</th><th>F</th><th>Fiber</th><th>Source</th><th></th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");
    for (const item of filtered) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${item.name}</td><td>${item.servingSize || ""}</td><td>${item.calories}</td>
        <td>${item.protein_g}</td><td>${item.carbs_g}</td><td>${item.fat_g}</td><td>${item.fiber_g}</td>
        <td><span class="tag">${item.source || ""}</span></td>`;
      const actionsTd = document.createElement("td");
      const editBtn = document.createElement("button");
      editBtn.className = "secondary";
      editBtn.textContent = "Edit";
      editBtn.style.fontSize = "0.75rem";
      editBtn.style.padding = "0.3rem 0.5rem";
      editBtn.addEventListener("click", () => {
        formHost.innerHTML = "";
        editForm(formHost, item, () => { formHost.innerHTML = ""; renderTable(); }, () => { formHost.innerHTML = ""; });
        formHost.scrollIntoView({ behavior: "smooth" });
      });
      const delBtn = document.createElement("button");
      delBtn.className = "icon-btn";
      delBtn.textContent = "✕";
      delBtn.addEventListener("click", async () => {
        if (confirm(`Delete "${item.name}" from the library?`)) {
          await dbDelete("foodLibrary", item.id);
          renderTable();
        }
      });
      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);
      tr.appendChild(actionsTd);
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableHost.appendChild(table);
  }

  searchInput.addEventListener("input", () => draw(searchInput.value));

  await renderTable();
}
