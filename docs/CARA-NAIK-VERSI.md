# Cara menaikkan versi Apps Script sendiri (tanpa Lapis)

Hanya bila Lapis belum bisa. Sekitar 10 menit. Yang berubah hanya dua file: `Inti.js` dan `Api.js`.

1. Buka proyek Apps Script Optima (script.google.com, proyek yang dipakai app).
2. Di daftar file kiri, buka `Inti.js`. Hapus semua isinya (klik di dalam kode, Ctrl+A, Delete). Tempel isi baru dari `apps-script/Inti.js` di repo (buka file di GitHub, tombol Raw, Ctrl+A, Ctrl+C). Ulangi untuk `Api.js`.
3. Tekan ikon simpan (Ctrl+S). Jangan menyentuh `Code.js` atau file lain.
4. Deploy, Manage deployments. Pada deployment yang dipakai app (Web app), klik ikon pensil. Di Version pilih New version. Tekan Deploy. Lakukan juga untuk deployment kedua bila ada.
5. Bila muncul permintaan izin (Authorization required), tekan Review permissions, pilih akun, lalu Allow.
6. Pastikan akses deployment tetap "Anyone".

Cek berhasil: buka `.../exec` lewat POST `{"action":"infoDaftar"}` harus memuat `"versi":"2026-11-09.2"` (Claude bisa memeriksanya).
