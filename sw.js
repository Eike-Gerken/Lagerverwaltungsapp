/* Offline-Betrieb: Die Seite wird immer zuerst frisch aus dem Netz geholt, damit Änderungen sofort ankommen.
   Ohne Empfang kommt die zuletzt gemerkte Fassung aus dem Speicher. Schriften und Symbole kommen aus dem Speicher. */
var CACHE = "lager-v2";
var FILES = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "apple-touch-icon.png"
];
var FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) {
        /* Eine fehlende Datei darf die Installation nicht verhindern. */
        return Promise.all(FILES.map(function (f) { return c.add(f).catch(function () {}); }));
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function remember(req, res) {
  if (res && (res.ok || res.type === "opaque")) {
    var copy = res.clone();
    caches.open(CACHE).then(function (c) { c.put(req, copy); });
  }
  return res;
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isFont = FONT_HOSTS.indexOf(url.hostname) >= 0;
  if (!sameOrigin && !isFont) return;

  var isPage = req.mode === "navigate" || (sameOrigin && /\.(html|webmanifest)$/.test(url.pathname));

  if (isPage) {
    /* Seite und Manifest: zuerst aus dem Netz, bei fehlendem Empfang aus dem Speicher. */
    e.respondWith(
      fetch(req, { cache: "no-cache" })
        .then(function (res) { return remember(req, res); })
        .catch(function () {
          return caches.match(req, { ignoreSearch: true }).then(function (hit) {
            return hit || caches.match("./") || caches.match("index.html");
          });
        })
    );
    return;
  }

  /* Symbole und Schriften: aus dem Speicher, sonst aus dem Netz. */
  e.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then(function (hit) {
      return hit || fetch(req).then(function (res) { return remember(req, res); });
    })
  );
});
