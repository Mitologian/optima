# BNI Optima · Chapter App

App pendamping peluncuran chapter BNI Optima (nama kerja). Dipakai launch team sejak masa pembentukan,
dan semua member mulai hari ESM.

Mulai dari `KONTRAK.md` (sheet, API, fase, aturan permainan) dan `CLAUDE.md` (keputusan dan aturan kerja).

## Isi repo

| Folder atau berkas | Isi | Pemilik |
|---|---|---|
| `web/` | PWA baru: Misi Chapter, Papan 64 Kursi, Undang, Papan, layar launch team dan LDC | Claude |
| `apps-script/Inti.js` | Logika permainan dan aturan data, dipakai server dan mode tiruan | Claude |
| `apps-script/Api.js` | Endpoint `doPost` untuk PWA | Claude |
| `apps-script/` lainnya | App lama turunan Ventura, masih jalan sampai app baru dipakai | Lapis |
| `data/klasifikasi-awal.csv` | Draf 64 kursi, 8 contact sphere | Coach Dedy |
| `index.html`, `manifest.json`, `sw.js` di akar | Cangkang lama (iframe ke app lama) | Lapis |
| Skrip `.sh` di akar | Alat kerja Lapis | Lapis |

## Mencoba tanpa sheet

`web/config.js` dengan `API_URL` kosong menjalankan mode tiruan berisi data contoh.

```
python3 -m http.server 8000
# buka http://localhost:8000/web/
```

Kode contoh: `LDC001` (Coach Dedy), `LT0001` (launch team), `AGT001` (anggota).
Tambahkan `?fase=BOD` untuk layar setelah ESM, `?reset=1` untuk mengulang data contoh.

## Menyambung ke sheet asli

1. Lapis membuat sheet `Optima - Data Chapter` sesuai `KONTRAK.md` bagian 4.
2. Script Properties: `DATA_SHEET_ID` (ID sheet tadi) dan `ADMIN_PIN` (PIN baru untuk halaman admin lama).
3. `clasp push`, lalu `clasp deploy -i <id deployment yang sudah ada>` supaya alamat tidak berubah.
4. Isi `API_URL` di `web/config.js` dengan alamat `/exec` web app.
