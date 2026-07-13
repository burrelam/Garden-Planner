const CACHE_NAME = "fittracker-shell-v3";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/theme.css",
  "./css/layout.css",
  "./js/app.js",
  "./js/db.js",
  "./js/formulas.js",
  "./js/csv.js",
  "./js/macroPaste.js",
  "./js/state.js",
  "./js/screens/settings.js",
  "./js/screens/dailyLog.js",
  "./js/screens/dashboard.js",
  "./js/screens/foodLibrary.js",
  "./js/components/runningTotals.js",
  "./js/components/mealEntryForm.js",
  "./js/components/pastePreview.js",
  "./js/components/workoutEntryForm.js",
  "./js/components/deficitTrend.js",
  "./js/components/weightTrend.js",
  "./js/components/macroTable.js",
  "./js/components/workoutSummary.js",
  "./js/components/waterGlass.js",
];

self.addEventListener("install", (event) => {
  // Fetch with {cache: "reload"} explicitly, not cache.addAll() — addAll() can silently satisfy
  // requests from the browser's regular HTTP cache instead of the network, precaching stale files.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(SHELL_FILES.map((url) =>
          fetch(url, { cache: "reload" }).then((response) => cache.put(url, response))
        ))
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
