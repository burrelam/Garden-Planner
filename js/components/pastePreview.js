import { parseMacroPaste } from "../macroPaste.js";

// Renders a paste textarea -> parsed preview (editable/removable) -> onCommit(rows) flow.
// Nothing is written to storage from here; the caller decides what to do with committed rows.
export function renderPastePreview(container, onCommit) {
  container.innerHTML = "";

  const textarea = document.createElement("textarea");
  textarea.className = "paste-input";
  textarea.placeholder = "Paste a markdown or tab-separated macro table here…";
  container.appendChild(textarea);

  const parseBtn = document.createElement("button");
  parseBtn.textContent = "Parse";
  parseBtn.style.marginTop = "0.5rem";
  container.appendChild(parseBtn);

  const previewHost = document.createElement("div");
  previewHost.style.marginTop = "1rem";
  container.appendChild(previewHost);

  let rows = [];

  function drawPreview() {
    previewHost.innerHTML = "";
    if (rows.length === 0) return;

    const header = document.createElement("div");
    header.className = "preview-row";
    header.innerHTML = `<strong>Item</strong><strong>Cal</strong><strong>P</strong><strong>C</strong><strong>F</strong><strong>Fib</strong><span></span>`;
    previewHost.appendChild(header);

    rows.forEach((row, idx) => {
      const rowEl = document.createElement("div");
      rowEl.className = "preview-row";

      const nameInput = document.createElement("input");
      nameInput.value = row.description;
      nameInput.addEventListener("input", () => { row.description = nameInput.value; });

      const calInput = document.createElement("input");
      calInput.type = "number";
      calInput.value = row.calories;
      calInput.addEventListener("input", () => { row.calories = Number(calInput.value) || 0; });

      const proteinInput = document.createElement("input");
      proteinInput.type = "number";
      proteinInput.value = row.protein_g;
      proteinInput.addEventListener("input", () => { row.protein_g = Number(proteinInput.value) || 0; });

      const carbsInput = document.createElement("input");
      carbsInput.type = "number";
      carbsInput.value = row.carbs_g;
      carbsInput.addEventListener("input", () => { row.carbs_g = Number(carbsInput.value) || 0; });

      const fatInput = document.createElement("input");
      fatInput.type = "number";
      fatInput.value = row.fat_g;
      fatInput.addEventListener("input", () => { row.fat_g = Number(fatInput.value) || 0; });

      const fiberInput = document.createElement("input");
      fiberInput.type = "number";
      fiberInput.value = row.fiber_g;
      fiberInput.addEventListener("input", () => { row.fiber_g = Number(fiberInput.value) || 0; });

      const removeBtn = document.createElement("button");
      removeBtn.className = "icon-btn";
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        rows.splice(idx, 1);
        drawPreview();
      });

      rowEl.appendChild(nameInput);
      rowEl.appendChild(calInput);
      rowEl.appendChild(proteinInput);
      rowEl.appendChild(carbsInput);
      rowEl.appendChild(fatInput);
      rowEl.appendChild(fiberInput);
      rowEl.appendChild(removeBtn);
      previewHost.appendChild(rowEl);
    });

    const commitBtn = document.createElement("button");
    commitBtn.textContent = `Add ${rows.length} Meal Entr${rows.length === 1 ? "y" : "ies"}`;
    commitBtn.style.marginTop = "0.75rem";
    commitBtn.addEventListener("click", () => {
      onCommit(rows.map((r) => ({ ...r, source: "estimate" })));
      textarea.value = "";
      rows = [];
      drawPreview();
    });
    previewHost.appendChild(commitBtn);
  }

  parseBtn.addEventListener("click", () => {
    rows = parseMacroPaste(textarea.value);
    if (rows.length === 0) {
      previewHost.innerHTML = `<p style="color:var(--mist);">No rows detected — check the pasted format.</p>`;
      return;
    }
    drawPreview();
  });
}
