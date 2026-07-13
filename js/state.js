// Small shared helpers used across screens. No global mutable app state beyond "which day is open" —
// everything else is read fresh from IndexedDB on each render so the UI can never drift from storage.

const PDT_OFFSET_HOURS = 7;

export const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Arms", "Core", "Legs"];

export function todayPDT() {
  const nowUtc = new Date();
  const pdt = new Date(nowUtc.getTime() - PDT_OFFSET_HOURS * 60 * 60 * 1000);
  return pdt.toISOString().slice(0, 10);
}

export function dayNumberFor(dateStr, trackingStartDate) {
  const start = new Date(trackingStartDate + "T00:00:00Z");
  const date = new Date(dateStr + "T00:00:00Z");
  const diffDays = Math.round((date - start) / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}

export function lastNDates(dateStr, n) {
  const dates = [];
  const base = new Date(dateStr + "T00:00:00Z");
  for (let i = 1; i <= n; i++) {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates.reverse();
}

export function sumMealEntries(entries) {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + (e.calories || 0),
      protein_g: acc.protein_g + (e.protein_g || 0),
      carbs_g: acc.carbs_g + (e.carbs_g || 0),
      fat_g: acc.fat_g + (e.fat_g || 0),
      fiber_g: acc.fiber_g + (e.fiber_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );
}
