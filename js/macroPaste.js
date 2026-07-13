// Parses pasted macro tables from the companion chat workflow into candidate MealEntry rows.
// Supports markdown tables and tab-separated rows, and tolerates each row being individually
// wrapped in a ``` code block — the reliable workaround for iOS paste merging rows.

function stripCodeFences(text) {
  return text.split("\n").filter((line) => !/^\s*```/.test(line)).join("\n");
}

function cleanCell(s) {
  return s.replace(/\*\*/g, "").trim();
}

function parseNumber(s) {
  if (s === undefined || s === null || s === "") return 0;
  const cleaned = String(s).replace(/[^0-9.\-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

function splitRow(line) {
  const trimmed = line.trim();
  if (trimmed.includes("|")) {
    let cells = trimmed.split("|");
    if (trimmed.startsWith("|")) cells.shift();
    if (trimmed.endsWith("|")) cells.pop();
    return cells.map(cleanCell);
  }
  if (trimmed.includes("\t")) {
    return trimmed.split("\t").map(cleanCell);
  }
  return [cleanCell(trimmed)];
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function isHeaderRow(cells) {
  const first = (cells[0] || "").toLowerCase();
  return ["item", "food", "meal", "description"].includes(first);
}

function isTotalRow(cells) {
  const first = (cells[0] || "").toLowerCase();
  return first === "total" || first === "totals";
}

// Returns an array of { description, calories, protein_g, carbs_g, fat_g, fiber_g }.
export function parseMacroPaste(text) {
  const withoutFences = stripCodeFences(text || "");
  const lines = withoutFences.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim() !== "");

  const results = [];
  for (const line of lines) {
    const cells = splitRow(line);
    if (cells.length < 2) continue; // prose / sign-off lines have no delimiter, skip silently
    if (isSeparatorRow(cells)) continue;
    if (isHeaderRow(cells)) continue;
    if (isTotalRow(cells)) continue;

    const [item, cal, protein, carbs, fat, fiber] = cells;
    if (!item) continue;

    results.push({
      description: item,
      calories: parseNumber(cal),
      protein_g: parseNumber(protein),
      carbs_g: parseNumber(carbs),
      fat_g: parseNumber(fat),
      fiber_g: fiber !== undefined ? parseNumber(fiber) : 0,
    });
  }
  return results;
}
