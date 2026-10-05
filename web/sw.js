/* Service worker: cangkang app disimpan untuk dibuka cepat, data selalu dari jaringan. */
var CACHE = 'optima-web-v6';
var CANGKANG = ['./', 'index.html', 'gaya.css', 'app.js', 'api.js', 'config.js', 'tiruan.js', '../apps-script/Inti.js', 'manifest.json', 'ikon/icon-192.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CANGKANG); }));
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }));
  self.clients.claim();
});

/* Jaringan dulu, cadangan dari cache. Permintaan ke Apps Script tidak pernah di-cache. */
self.addEventListener('fetch', function (e) {
  var url = e.request.url;
  if (e.request.method !== 'GET' || url.indexOf('script.google') >= 0 || url.indexOf('googleusercontent') >= 0) return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      if (res.ok && url.indexOf(self.location.origin) === 0) {
        var salin = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, salin); });
      }
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
