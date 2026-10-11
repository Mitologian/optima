# Instruksi untuk Lapis · BNI Optima

Dari Claude, atas permintaan Coach Dedy Dahlan, 5 Oktober 2026, diperbarui 11 Oktober 2026. Acuan tetap
`KONTRAK.md`; dokumen ini urutan kerjanya. Kode app ada di branch `main`. Bagian A sampai C bisa mulai
sekarang, bagian D (`clasp push`) setelah A sampai C selesai.

Laporkan ke Coach Dedy setelah setiap bagian selesai, termasuk yang tidak bisa dikerjakan.

---

## A. Spreadsheet `Optima - Data Chapter`

Akun `dedydahlan@gmail.com`, privat, editor hanya Coach Dedy dan Lapis.

1. Buat 13 tab dengan nama persis: `Pengaturan`, `Klasifikasi`, `Master`, `Undangan`, `Hadir`, `Events`,
   `Butuh`, `Wawancara`, `Jadwal_CS`, `Responses`, `Akses`, `Lencana`, `Log`.
2. Baris 1 setiap tab = nama kolom persis dan berurutan seperti `KONTRAK.md` bagian 4. API membaca kolom
   menurut nama di baris 1, jadi salah ketik satu huruf membuat kolom itu tidak terbaca.
   Kolom yang baru ditambahkan hari ini:
   - `Jadwal_CS`: `id_slot` · `tanggal` · `jam` · `PIC` · `tempat` · `status` · `id_orang` · `dipesan_oleh` · `pendamping`
   - `Responses`: kolom terakhir `status_cocok`
   - `Master`: kolom terakhir `jadwal_cs`
3. **Format Plain text (Format > Number > Plain text) untuk seluruh kolom berikut, sebelum ada data:**
   - semua kolom `id_...`, `PIC`, `diajukan_oleh`, `dipesan_oleh`, `pendamping`, `dicatat_oleh`
   - `Master.whatsapp_norm`, `Akses.kode_akses`
   - `Events.jam_mulai`, `Events.jam_selesai`
   - `Jadwal_CS.tanggal`, `Jadwal_CS.jam`

   Alasannya: Sheets mengubah `09:00` menjadi nilai waktu tahun 1899 dan `0812...` kehilangan nol. Keduanya
   merusak jadwal dan pencocokan nomor.
4. Isi `Pengaturan` (kolom `kunci` · `nilai`):

   | kunci | nilai |
   |---|---|
   | `nama_chapter` | Optima |
   | `fase` | Pembentukan |
   | `target_founding` | 20 |
   | `target_cgt` | 37 |
   | `target_launch` | 52 |
   | `target_nama_min` | 20 |
   | `target_nama_maks` | 40 |
   | `hari_bod` | Rabu |
   | `tanggal_esm` | 2027-05-24 |
   | `tanggal_grand_launch` | 2027-08-02 |
   | `tautan_form` | tautan Google Form (bagian B) |
   | `tautan_zoom_cs` | tautan Zoom tetap Coach Dedy untuk coffee session (minta ke Coach Dedy) |

5. Impor `data/klasifikasi-awal.csv` ke `Klasifikasi` (64 baris, `K01` sampai `K64`, nama Inggris).
6. Isi `Master` dan `Akses` untuk Coach Dedy dan LT yang sudah menandatangani surat komitmen:
   - `Master`: `id_orang` `P0001` dan seterusnya, `kategori` `LDC` atau `LT`, `tahap` `Anggota`,
     `jenis_anggota` `Founding`, `id_kursi` sesuai bidangnya, `whatsapp_norm` format `62...`.
   - `Akses`: `kode_akses` 6 huruf atau angka huruf besar, unik, `peran` `LDC` atau `LT`, `aktif` TRUE.
   - Kirim kode ke masing-masing lewat WhatsApp pribadi, bukan grup. Anggota biasa baru diberi kode setelah ESM.
7. Isi `Events` untuk setiap Rabu sejak ESM: dua baris per Rabu (`BOD` pagi, `Lunch Networking` siang),
   `status` `Terbuka`, `tampil_di_form` TRUE. Sebelum ESM boleh kosong. ESM sendiri satu baris `jenis` `ESM`.
8. Validasi data (dropdown) disarankan untuk `Master.tahap`, `Master.kategori`, `Undangan.status`,
   `Jadwal_CS.status`, `Events.jenis`, `Events.status`, memakai nilai persis dari kontrak. Daftar `tahap` yang
   berlaku sekarang: `Listed`, `Invited`, `Coffee_Scheduled`, `Attended`, `Coffee_Session`, `Applied`,
   `Anggota`, `Joined_Other`, `Declined`, `Rejected`.

## Tambahan 11 Oktober: pengumuman dan info acara

- Tab `Pengumuman` (kolom di `KONTRAK.md` bagian 4) dan kolom `pembicara`, `poster` di `Events` dibuat otomatis
  oleh `Api.js` saat pertama kali dipakai. Tidak perlu dibuat tangan. Kalau mau membuatnya sendiri, ikuti urutan kolom di kontrak.
- `Pengaturan.target_gold` = 6 (opsional, bawaan 6).

## B. Google Form pendaftaran visitor

Dipakai setelah ESM. Satu Form tetap, tautannya tidak berubah (disimpan di `Pengaturan.tautan_form`).

1. Pertanyaan: Nama lengkap, Nomor WhatsApp, Email, Nama perusahaan, Bidang usaha, Kota, Acara yang
   diikuti, **Diundang oleh**, Catatan. Pertanyaan coffee session tidak perlu lagi (dipesan di app).
2. **Acara yang diikuti**: dropdown dari `Events` dengan `tampil_di_form` TRUE, `status` `Terbuka`, tanggal
   belum lewat. Label contoh: `Rabu, 7 Okt 2026 · BOD 07:00 (Online)`. Saat normalisasi, ubah label kembali ke
   `id_event`. Perbarui pilihan setiap ada perubahan `Events` (trigger harian cukup).
3. **Diundang oleh**: dropdown nama lengkap semua orang di `Master` dengan `tahap` `Anggota` (termasuk LT
   dan Coach Dedy), urut abjad, ditambah satu pilihan tetap **`Tidak Ada`** di urutan paling akhir. Perbarui
   setiap ada anggota baru.
4. Hubungkan Form ke tab `Responses`. Kolom `slot_cs` dibiarkan kosong.

## C. Normalisasi `Responses` (trigger `onFormSubmit`)

Aturan lengkap ada di `KONTRAK.md`, bagian `Undangan`. Ringkasnya, untuk setiap baris baru:

1. Normalkan nomor ke `62...` (hanya angka). Petakan `diundang_oleh` ke `id_orang`; `Tidak Ada` = kosong.
2. Cari `Master.whatsapp_norm` yang sama.
   - Ketemu, dan pengundangnya sama dengan `Undangan.id_pengundang` → `status_cocok` = `Cocok`.
   - Ketemu, pengundang beda atau `Tidak Ada` → tetap `Cocok`, undangan tetap milik pengundang aslinya.
   - Pada keduanya: `Undangan.status` → `Terdaftar`, `Undangan.id_event` → acara yang dipilih di Form.
     Kalau calon belum punya baris `Undangan`, buat satu (`sumber` `form`).
3. Nomor tidak ketemu, tetapi pengundang cocok dan nama mirip dengan calon milik pengundang itu (token nama
   sama, urutan boleh beda) → **jangan digabung dan jangan membuat baris Master atau Undangan.**
   `status_cocok` = `Perlu_Cek`, isi `id_kandidat` dengan `id_orang` calon yang dicurigai. LT memutuskan
   sendiri di app (Team, Interviews, kartu Form sign-ups). Tidak perlu memberi tahu Coach Dedy.
4. Tidak ada yang cocok → baris baru di `Master` (`kategori` `Calon`, `tahap` `Invited`, `sumber` `form`,
   `diajukan_oleh` = pengundang atau kosong) dan di `Undangan` (`status` `Terdaftar`, `sumber` `form`).
   `status_cocok` = `Baru`. Kalau pengundangnya `Tidak Ada`, `id_pengundang` kosong.
5. Setiap baris baru juga diberi `id_response` (`R0001` dan seterusnya) dan `id_pengundang` (hasil pemetaan
   `diundang_oleh`, kosong bila `Tidak Ada`). Pada `Cocok` dan `Baru`, isi juga `id_orang_hasil`.
6. Jangan mengubah kolom hasil Form di `Responses`. Kolom `status_cocok`, `id_response`, `id_pengundang`,
   `id_kandidat` diisi Lapis. `id_orang_hasil` dan perubahan `Perlu_Cek` menjadi `Cocok` atau `Baru` dilakukan app.

## D. Apps Script dan deploy

1. Berkas milik Claude yang perlu ikut di-push: `apps-script/Api.js` dan `apps-script/Inti.js`. Jangan
   diubah; kalau perlu perubahan, tulis permintaan ke Coach Dedy.
2. Script Properties:
   - `DATA_SHEET_ID` = ID sheet `Optima - Data Chapter`
   - `EMAIL_PERINGATAN` = dedydahlan@gmail.com (dikirimi surel bila masuk dikunci)
   - `ADMIN_PIN` = nilai baru untuk tampilan lama (yang lama dianggap bocor)
   - `UJI_KODE` = kode akses Coach Dedy, hanya untuk uji, hapus setelah lolos
3. Uji dari editor: jalankan `api_ujiMasuk`. Hasil yang benar berisi `"ok": true` dan blok `misi`.
   Galat `Tab tidak ada` atau kolom kosong berarti nama tab atau kolom tidak persis.
4. Deploy sebagai Web app: Execute as **Me**, Who has access **Anyone**. Kirim alamat berakhiran `/exec`
   ke Coach Dedy; Claude yang mengisi `web/config.js`. Deploy berikutnya selalu `clasp deploy -i <id>` yang
   sama supaya alamatnya tidak berubah.
5. Uji akhir dari app: masuk dengan kode LDC dan satu kode LT, tambah satu nama, buka satu jam coffee
   session di Team > Schedule, pesan jam itu, cek baris baru di `Master` dan `Jadwal_CS`.

## E. Yang belum dikerjakan di sisi app (untuk diketahui)

- Layar LT untuk baris `Perlu_Cek` dan baris tanpa pengundang sudah ada (Team, Interviews, kartu Form sign-ups).
  Lapis tidak perlu merapikannya di sheet.
- Peralihan cangkang PWA lama (`index.html`, `manifest.json`, `sw.js` di akar) ke `web/` dilakukan setelah
  uji akhir lolos, atas izin Coach Dedy.
