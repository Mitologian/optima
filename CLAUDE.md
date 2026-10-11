# BNI Optima · catatan kerja untuk Claude

App pendamping peluncuran chapter BNI yang dipimpin Coach Dedy Dahlan sebagai Launch Director Consultant
(LDC). `Optima` masih nama kerja, menunggu konfirmasi National Director.

**Baca `KONTRAK.md` lebih dulu.** Itu sumber kebenaran untuk sheet, API, fase, dan aturan permainan.

## Keputusan yang sudah diambil (4 Oktober 2026)

- Arsitektur dominan di repo: PWA di `web/`, Apps Script hanya API dan otomasi.
- Claude memegang `web/` dan `apps-script/Api.js`. Lapis (agen di mesin kantor Coach Dedy) memegang sheet,
  Form, Telegram, otomasi lain, dan `clasp push/deploy`. Claude tidak bisa menaikkan ke Apps Script.
- Tahap pembentukan: Pembentukan (kumpulkan 17 sampai 20 founding member, oleh LDC dan LT) → ESM →
  era BOD setiap **Rabu** (BOD pagi, Lunch Networking siang, 10 sampai 12 kali) → **CGT di 37 anggota** →
  Soft Launch → Grand Launch (**52**).
- Sebelum ESM, app hanya dipakai LDC dan LT. Setelah ESM semua anggota. Setiap orang mengisi **20 sampai 40
  nama**, terikat ke kursi atau "bidang belum pasti".
- **Tanpa poin.** Hanya angka nyata (undangan, tamu hadir, sponsor) dan lencana.
- Semua anggota melihat nama lengkap dan bidang tamu yang terdaftar hadir Rabu itu, tanpa nomor telepon.
- Notifikasi hanya di dalam app (sorotan saat app dibuka).
- Gamifikasi: Misi Chapter (gerbang 20, 37, 52, dengan grafik garis), Papan 64 Kursi (8 baris contact sphere x 8 kursi),
  Ronde Rabu (satu undangan per pekan), 5 lencana, papan pengundang ronde ini, dinding sponsor.
- Dibuang dari app Ventura: poin, tim dan bonus tim, gold progress, persentase konversi, PIN bersama,
  halaman terpisah. Brain jolter dan permintaan klasifikasi
  dilebur ke Papan 64 Kursi.
- Referral (istilah BNI untuk potensi bisnis antar member) tidak dipakai di app. Yang dipakai: undangan
  dan sponsor.

## Keputusan tambahan (5 Oktober 2026)

- Dua jalur calon: kunjungan Rabu (BOD/Lunch, daftar lewat Form) lalu coffee session, atau langsung coffee
  session tanpa kunjungan. Anggota dan LT boleh mengundang langsung ke coffee session.
- Alur status: Listed, Invited, Attended, Coffee_Scheduled, Coffee_Session (sudah interview), Applied (setuju,
  menunggu bayar), Anggota (pembayaran masuk). Keluar: Joined_Other, Declined, Rejected.
- Coach Dedy pewawancara utama, LT pendamping (tombol Join). Sesekali dua LT tanpa Coach Dedy.
  Jadwal di Team > Schedule (tab `Jadwal_CS`), dipilih lewat kalender.
- Pencocokan Form tanpa kode undangan: nomor WhatsApp + kolom "Diundang oleh" (dropdown anggota + "Tidak Ada").
- Pesan undangan mengikuti panduan Ventura ("Let's Invite Visitor"): 4 pesan kunjungan, 3 pesan coffee
  session, balasan keraguan, 3 tingkat kedekatan (lu/gue, aku/kamu, saya/Anda), ID dan EN.
- Label Founding/Core Group tidak ditampilkan di daftar anggota.
- Akses per orang: kode 6 karakter di tab `Akses`. Pengunjung tidak punya akun.

## Aturan bahasa di app dan dokumen

- Bahasa app: Inggris (dipakai di app, termasuk klasifikasi). Dokumen kerja untuk Coach Dedy tetap Bahasa Indonesia.
- Tampilan: latar putih, merah sebagai warna utama. Judul Helvetica/Arial, isi Plus Jakarta Sans. Satu tema terang.
- Tanpa em dash. Tanpa kata "kamu". Sapaan ke pengguna memakai nama atau kalimat tanpa kata ganti.
- Sebut "Coach Dedy", bukan "Dedy" saja, di teks yang dibaca orang lain.

## Struktur repo

- `web/` · PWA baru (HTML, CSS, JS biasa, tanpa build). `web/config.js` memuat alamat API; kosong = mode
  tiruan dengan data contoh dari `web/tiruan.js`.
- `apps-script/Api.js` · endpoint `doPost` sesuai `KONTRAK.md` bagian 6.
- `apps-script/` lainnya · app lama Ventura yang sudah dinamai Optima. Masih jalan, jangan diubah kecuali
  untuk keamanan. Dipensiunkan setelah app baru dipakai.
- `index.html`, `manifest.json`, `sw.js` di akar · cangkang lama (iframe ke app lama). Diganti ke `web/`
  saat peralihan.
- `data/klasifikasi-awal.csv` · draf 64 kursi.
- Skrip `.sh` di akar milik Lapis.

## Menguji

Lihat juga `docs/SERAH-TERIMA.md` untuk status terakhir dan pekerjaan terbuka.

Mode tiruan: buka `web/index.html` lewat server statis (`python3 -m http.server` dari akar repo), lalu
`/web/`. Kode contoh: `LDC001` (Coach Dedy), `LT0001` (LT), `AGT001` (anggota). Tambahkan `?fase=BOD`
untuk melihat layar setelah ESM.

Uji otomatis (Playwright, server di port 8765): `node alat/uji/<nama>.js <folder-screenshot>`, set
`PLAYWRIGHT_PATH` bila modul tidak ditemukan. Pratinjau satu berkas untuk artifact:
`python3 alat/bangun-pratinjau.py <keluaran.html>`. Setelah mengubah data contoh, naikkan kunci
`optima_tiruan_vN` di `web/tiruan.js` dan cache di `web/sw.js`.
