/* Offline-Betrieb: Dateien der App und die Schriften werden beim ersten Start gemerkt.
   Beim nächsten Öffnen kommt alles sofort aus dem Speicher, im Hintergrund wird nachgeladen. */
var CACHE = "lager-v1";
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
      .then(function (c) { return c.addAll(FILES); })
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

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  var sameOrigin = url.origin === self.location.origin;
  var isFont = FONT_HOSTS.indexOf(url.hostname) >= 0;
  if (!sameOrigin && !isFont) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: sameOrigin }).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        if (hit) return hit;
        if (req.mode === "navigate") return caches.match("./");
        return Response.error();
      });
      return hit || net;
    })
  );
});
