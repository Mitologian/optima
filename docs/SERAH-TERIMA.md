# Serah terima · BNI Optima

Catatan untuk melanjutkan pengerjaan di sesi Claude Code baru. Ditulis 11 Oktober 2026.

## Mulai dari sini

1. Repo `Mitologian/optima`, branch kerja `claude/optima-fondasi`, PR #1 (belum di-merge ke `main`).
2. Baca berurutan: `CLAUDE.md` (aturan kerja dan keputusan), `KONTRAK.md` (sheet, API, status; sumber
   kebenaran), `docs/ALUR.md` (alur per peran), `docs/INSTRUKSI-LAPIS.md` (tugas Lapis).
3. Coba app: `python3 -m http.server 8765` dari akar repo, buka `http://localhost:8765/web/`. Kode contoh
   `LDC001` (Coach Dedy), `LT0001` (LT), `AGT001` (anggota, hanya setelah ESM). Tombol fase di kepala app
   (Pre-ESM / Post-ESM) atau `?fase=BOD`.
4. Pratinjau di claude.ai: artifact privat "BNI Optima App",
   https://claude.ai/artifact/WZmQYuYL6WFsG5Ph1G9TgQ (Versi 15). Bangun ulang dengan
   `python3 alat/bangun-pratinjau.py <keluaran.html>` lalu publish ke URL yang sama.

## Peta kode

| Berkas | Isi |
|---|---|
| `apps-script/Inti.js` | Semua logika dan aturan (aksi API, status, lencana, slot coffee session). Dipakai Apps Script dan mode tiruan |
| `apps-script/Api.js` | `doPost` + adaptor Google Sheet (baca tab per nama kolom baris 1) |
| `web/app.js` | Seluruh UI: layar, lembar (bottom sheet), templat pesan, kalender, Schedule |
| `web/gaya.css` | Gaya: latar putih, merah #C8102E, judul Helvetica/Arial, isi Plus Jakarta Sans |
| `web/tiruan.js` | Data contoh dan adaptor memori (localStorage `optima_tiruan_v6`) |
| `web/api.js`, `web/config.js` | Pemanggil API. `API_URL` kosong = mode tiruan |
| `data/klasifikasi-awal.csv` | 64 kursi, 8 contact sphere, nama Inggris |
| `alat/` | Pembangun pratinjau dan skrip uji Playwright |

Fungsi penting di `web/app.js`: `menu`, `layarUndang` (My list), `lembarPilihUndang` (kunjungan atau coffee),
`lembarUndangan` (4 pesan kunjungan), `lembarKopi` (3 pesan coffee + pesan jam), `subJadwal` dan
`lembarBukaJam` (Schedule), `subCalon` (Interviews), `kalender` (komponen kalender), `TEMPLAT` lama sudah
diganti `PESAN_ID`, `PESAN_EN`, `KOPI_ID`, `KOPI_EN`, `BALASAN`.

## Yang sudah jadi

- Pre-ESM (LDC, LT): Home, Seats (Papan 64 Kursi), Team (Interviews, Schedule, Regroup, Summary untuk LDC).
- Post-ESM (semua anggota): Home, My list, This week, Seats, Board; LT menambah Team (Check-in).
- Undangan kunjungan Rabu: kalender acara, 4 pesan berurutan, 3 tingkat kedekatan, ID/EN, balasan keraguan.
- Undangan langsung coffee session: kalender jam kosong, 3 pesan, pesan jam setelah calon setuju.
- Scheduler: Coach Dedy membuka jam, LT Join sebagai pendamping, LT berdua bisa membuka jam sendiri,
  "Needs an outcome" untuk sesi yang sudah lewat.
- Interviews: To schedule, Coffee set (Done), Interviewed (Applied, lalu Joined saat bayar), Closed (Reopen).
- Misi Chapter dengan grafik, 5 lencana (outline merah), papan pengundang dan dinding sponsor.
- Akses per orang (kode 6 karakter), kunci 10 menit setelah 20 kode salah.

## Belum dikerjakan

1. Layar LT untuk baris Form `Perlu_Cek` dan pendaftar tanpa pengundang (`Tidak Ada`).
2. Impact Board (kolom Invites, Attended, Joined) belum ada.
3. Belum pernah diuji dengan Google Sheet asli. `Api.js` + `Inti.js` menunggu Lapis menyiapkan sheet dan deploy.
4. Setelah Lapis mengirim alamat `/exec`: isi `web/config.js`, uji akhir, lalu peralihan cangkang PWA lama di
   akar (`index.html`, `manifest.json`, `sw.js`) ke `web/` atas izin Coach Dedy.
5. Kecil: membatalkan check-in mengembalikan `Undangan.status` ke `Diundang`, seharusnya `Terdaftar` bila
   tamu sudah daftar Form.
6. Opsional: label Founding/Core Group khusus LT kalau Coach Dedy memintanya.

## Menunggu orang lain

- Coach Dedy: setujui dan merge PR #1; tautan Zoom tetap untuk coffee session; daftar LT yang sudah
  menandatangani surat komitmen; konfirmasi nama `Optima` dari National Director.
- Lapis: `docs/INSTRUKSI-LAPIS.md` bagian A sampai D.

## Cara kerja yang disepakati

- Teks app bahasa Inggris; dokumen untuk Coach Dedy bahasa Indonesia, lugas, tanpa em dash, tanpa kata
  "kamu" di app, selalu "Coach Dedy".
- Setiap perubahan: uji di mode tiruan (`alat/uji/`), cek tangkapan layar ukuran 390 px, commit ke branch,
  push, bangun ulang pratinjau dan publish ke artifact yang sama.
- Perubahan sheet atau aksi API dicatat di `KONTRAK.md` bagian Riwayat.
- Jangan menyentuh berkas milik Lapis (skrip `.sh` di akar, `apps-script/` selain `Api.js` dan `Inti.js`).
