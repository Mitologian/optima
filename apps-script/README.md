# Sumber Apps Script — BNI Optima

Kode ini hasil pemindahan dari proyek Apps Script yang menempel di sheet **BNI Ventura Road to Launch**,
dilakukan 24 September 2026. Fungsinya belum diubah sama sekali.

## Isi

- `Code.js` · seluruh logika sisi server (1.157 baris)
- `Main.html` · antarmuka utama aplikasi (3.106 baris)
- `Dashboard_v2.html`, `Admin.html`, `Member.html` · halaman lain
- `appsscript.json` · pengaturan proyek (zona waktu, izin web app)
- `.clasp.json` · penanda proyek yang jadi sasaran, jangan dihapus

## Fakta penting tentang kode ini

- Aplikasi membaca sheet lewat `SpreadsheetApp.getActiveSpreadsheet()`. Artinya proyek yang menempel pada
  sheet Optima otomatis membaca data Optima, tanpa perlu menulis ID sheet di kode.
- Tidak ada kata sandi, token, atau kunci API di dalam kode. Aman disimpan di repo privat maupun publik.
- `appsscript.json` memakai zona waktu Asia/Bangkok. Untuk Optima sebaiknya diganti Asia/Jakarta.
- Hanya satu angka yang ditulis keras: `MAX_MEMBERS_PER_TEAM = 7`.

## Cara kerja mulai sekarang

Repo ini jadi sumber kebenaran. Alurnya:

1. Kode diubah di repo (bisa langsung dari halaman GitHub, termasuk dari ponsel)
2. Perubahan dinaikkan ke Apps Script dengan `clasp push` dari folder `apps-script`
3. Situs tidak berubah sampai dinaikkan. Artinya salah edit tidak langsung merusak aplikasi yang jalan
4. Versi web app yang dipakai orang dipasang dengan `clasp deploy`. Alamatnya dipasang di `index.html`
   milik cangkang PWA

Dedy tidak perlu membuka editor Apps Script lagi. Semua penyesuaian lewat repo.

## Yang belum dikerjakan

1. Tulisan "Ventura" di dalam kode dan halaman belum diganti "Optima" (sekitar 67 baris di lima berkas)
2. Zona waktu masih Asia/Bangkok
3. Alamat web app Optima belum ada, jadi `index.html` di akar repo masih menunjuk ke web app Ventura
4. Tagline Optima belum ditetapkan
