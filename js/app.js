import { renderDailyLog } from "./screens/dailyLog.js";
import { renderDashboard } from "./screens/dashboard.js";
import { renderFoodLibrary } from "./screens/foodLibrary.js";
import { renderSettings } from "./screens/settings.js";
import { getSettings } from "./db.js";

const SCREENS = {
  dailyLog: renderDailyLog,
  dashboard: renderDashboard,
  foodLibrary: renderFoodLibrary,
  settings: renderSettings,
};

const screenEl = document.getElementById("screen");
const tabButtons = document.querySelectorAll("nav.tabs button");

async function showScreen(name) {
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.screen === name));
  screenEl.innerHTML = "";
  location.hash = name;
  await SCREENS[name](screenEl, showScreen);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => showScreen(btn.dataset.screen));
});

async function init() {
  await getSettings(); // ensures defaults are seeded on first run
  const initial = SCREENS[location.hash.slice(1)] ? location.hash.slice(1) : "dailyLog";
  await showScreen(initial);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  }
}

init();
