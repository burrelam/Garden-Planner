// Minimal CSV parse/stringify — handles quoted fields with embedded commas, no external dependency.

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') { inQuotes = false; }
      else { field += char; }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      pushField();
    } else if (char === "\r") {
      // skip, \n handles the row break
    } else if (char === "\n") {
      pushField();
      pushRow();
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) { pushField(); pushRow(); }

  const cleaned = rows.filter((r) => r.some((f) => f.trim() !== ""));
  if (cleaned.length === 0) return [];
  const headers = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((r) => {
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx].trim() : ""; });
    return obj;
  });
}

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCSV(rows, headers) {
  const cols = headers || (rows[0] ? Object.keys(rows[0]) : []);
  const lines = [cols.join(",")];
  for (const row of rows) {
    lines.push(cols.map((c) => csvEscape(row[c])).join(","));
  }
  return lines.join("\r\n");
}
