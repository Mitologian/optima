// Pembersih. Cangkang lama (iframe ke app lama) sudah pindah ke lama/ dan app baru ada di web/.
// Service worker ini hanya ada supaya perangkat yang masih menyimpan cangkang lama membuangnya,
// lalu mencabut dirinya sendiri. App baru memakai web/sw.js.
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('optima-web-') !== 0; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
      .then(function () { return self.clients.matchAll(); })
      .then(function (cs) { cs.forEach(function (c) { c.navigate(c.url).catch(function () {}); }); })
  );
});
