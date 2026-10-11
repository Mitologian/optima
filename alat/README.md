# Alat bantu

- `bangun-pratinjau.py <keluaran.html>` · menggabungkan `web/` + `Inti.js` + data contoh menjadi satu berkas HTML
  (mode tiruan) untuk dipublish sebagai artifact.
- `uji/*.js` · skrip Playwright untuk mode tiruan. Jalankan server dulu (`python3 -m http.server 8765` dari
  akar repo), lalu `node alat/uji/uji-kopi.js <folder-screenshot>`. Set `PLAYWRIGHT_PATH` kalau modul
  `playwright` tidak ada di path biasa. Galat `fonts.googleapis.com` di sandbox boleh diabaikan.
  - `smoke.js` semua layar per peran · `uji-alur.js` alur LT · `uji-kopi.js` coffee session dan Schedule
  - `uji-damping.js` LT pendamping · `uji-kal.js` kalender · `uji-templat2.js` pesan kunjungan
  - `uji-ui.js` tampilan umum · `uji-lencana.js` lencana
