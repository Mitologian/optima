# Kontrak Data dan API · BNI Optima

Versi 1, 4 Oktober 2026. Disusun Claude dari keputusan Coach Dedy Dahlan, konsep Lapis
(`konsep-tulang-punggung-data-optima.md`, 3 Oktober) dan peta fungsi Lapis (4 Oktober).

Dokumen ini satu-satunya titik temu Claude dan Lapis. Nama tab, nama kolom, urutan kolom, dan nama aksi
adalah kontrak. Perubahan harus disetujui Coach Dedy, lalu ditulis di bagian **Riwayat** paling bawah.

`Optima` masih nama kerja. Nama chapter diambil dari `Pengaturan.nama_chapter`, jangan ditulis keras di kode.

---

## 1. Pembagian wilayah

| Wilayah | Pemilik |
|---|---|
| `web/` · PWA (semua layar) | Claude |
| `apps-script/Api.js` · endpoint JSON di bagian 6 | Claude |
| `apps-script/` lainnya · normalisasi Form, laporan, pintu Telegram, trigger | Lapis |
| Spreadsheet `Optima - Data Chapter`, Google Form, Script Properties | Lapis |
| `clasp push` dan `clasp deploy -i <id>` (alamat API tidak boleh berubah) | Lapis |
| `KONTRAK.md` | Bersama, disetujui Coach Dedy |

Aturan main:
1. Setiap pihak hanya menyunting berkas miliknya.
2. Perubahan lewat branch, masuk `main` setelah disetujui Coach Dedy.
3. Tidak ada rahasia di repo (repo publik). PIN, ID sheet, dan token disimpan di Script Properties.
4. Tampilan lama (`Main.html`, `Admin.html`, `Member.html`, `Dashboard_v2.html`, `Code.js`) tetap jalan
   sampai app baru dipakai, lalu dipensiunkan.

## 2. Fase chapter

Fase aktif disimpan di `Pengaturan.fase`. Hanya Coach Dedy yang mengubahnya.

| Fase | Isi | Siapa memakai app | Target bilah Misi |
|---|---|---|---|
| `Pembentukan` | Mengumpulkan founding member, oleh LDC dan LT | LDC dan LT | `target_founding` (20) |
| `BOD` | Dimulai hari ESM. BOD pagi dan Lunch Networking setiap Rabu | Semua | `target_cgt` (37) |
| `CGT` | Mulai saat 37 anggota. Rabu diisi Core Group Training | Semua | `target_launch` (51) |
| `Soft Launch` | Uji coba rangkaian | Semua | `target_launch` |
| `Grand Launch` | Chapter resmi | Semua | `target_launch` |

ESM adalah acara di tab `Events`, bukan fase. Saat ESM selesai, Coach Dedy mengubah fase ke `BOD`.
Anggota yang bergabung saat fase `Pembentukan` otomatis `Founding`. Sesudahnya `Core Group`.

## 3. Aturan BNI yang dijaga sistem

Sumber: BNI Indonesia Official Handbook.

1. **Satu kursi satu klasifikasi** (2.15). Kursi yang sudah terisi anggota tidak menerima calon baru.
2. **Visitor diundang paling banyak dua kali** (4.5.3). Undangan ketiga untuk orang yang sama ditolak.
3. **Sponsor** (8.2). Pengundang tidak otomatis sponsor. LT mengisi sponsor saat orang bergabung:
   member pengundang kalau calon mengenalnya secara pribadi, selain itu `BNI` kecuali calon menunjuk
   member tertentu.
4. **Guest dan Observer** (4.5.4, 4.5.5) dicatat di `Master.kategori` dan tidak dihitung sebagai calon.
5. Istilah **referral** tidak dipakai di app. Referral adalah potensi bisnis antar member dan dicatat di
   BNI Connect.

## 4. Spreadsheet `Optima - Data Chapter`

Akun `dedydahlan@gmail.com`, privat. Editor hanya Coach Dedy dan Lapis. LT dan member tidak membuka sheet.
Baris pertama setiap tab adalah nama kolom persis seperti di bawah.

Identitas orang: `id_orang` berbentuk `P0001`, `P0002`, dan seterusnya. Kunci penggabung adalah
`whatsapp_norm`: hanya angka, diawali `62` (contoh `0812-3456` dan `+62 812 3456` menjadi `628123456`).

### `Pengaturan`
Dua kolom: `kunci` · `nilai`.

| kunci | contoh nilai |
|---|---|
| `nama_chapter` | Optima |
| `fase` | Pembentukan |
| `target_founding` | 20 |
| `target_cgt` | 37 |
| `target_launch` | 51 |
| `target_nama_lt` | 20 |
| `hari_bod` | Rabu |
| `tanggal_esm` | 2027-05-24 |
| `tanggal_grand_launch` | 2027-08-02 |
| `tautan_form` | https://forms.gle/... |

### `Klasifikasi`
`id_kursi` · `baris` · `sphere` · `bidang` · `singkat` · `aktif`

- 64 kursi utama: `K01` sampai `K64`, baris 1 sampai 8, satu baris satu contact sphere.
  Isi awal: `data/klasifikasi-awal.csv`.
- Kursi tambahan untuk member dari bidang di luar 64: `L01`, `L02`, dan seterusnya, `baris` = 9,
  `sphere` = `Lainnya`. Ditambah Coach Dedy secara manual.
- `singkat`: paling banyak 14 huruf, tampil di kotak kursi.
- `aktif`: TRUE atau FALSE.

### `Master`
Satu baris per orang, dari calon sampai anggota.

`id_orang` · `nama` · `nama_depan` · `whatsapp_norm` · `email` · `perusahaan` · `bisnis` · `id_kursi` ·
`kota` · `sumber` · `kategori` · `tahap` · `jenis_anggota` · `tanggal_bergabung` · `id_sponsor` · `PIC` ·
`diajukan_oleh` · `tanggal_masuk` · `tanggal_sentuh` · `alasan_tidak_lanjut` · `catatan` · `terakhir_diubah`

| Kolom | Nilai |
|---|---|
| `kategori` | `Calon` · `Guest` · `Observer` · `LT` · `LDC` |
| `tahap` | `Baru` · `Dihubungi` · `Tertarik` · `CS` · `Bimbang` · `Anggota` · `Tidak Lanjut` · `Parkir` |
| `jenis_anggota` | kosong · `Founding` · `Core Group` |
| `id_sponsor` | `id_orang` sponsor, atau `BNI` |
| `PIC` | `id_orang` LT atau LDC yang menindaklanjuti |
| `diajukan_oleh` | `id_orang` yang memasukkan nama ini |
| `tanggal_sentuh` | terakhir kali tahap atau catatan diubah |

LT dan LDC juga punya baris di `Master` (kategori `LT` atau `LDC`) supaya punya `id_orang`.
Kalau LT juga anggota chapter, `kategori` tetap `LT` dan `tahap` = `Anggota`.

### `Undangan`
`id_undangan` · `tanggal` · `id_pengundang` · `id_orang_calon` · `id_event` · `status` · `sumber`

- `status`: `Diundang` · `Terdaftar` · `Hadir` · `Batal`
- `sumber`: `app` · `form`. Form yang diisi visitor dicocokkan ke undangan lewat `whatsapp_norm`;
  kalau cocok, status menjadi `Terdaftar`.

### `Hadir`
`id_hadir` · `id_event` · `id_orang` · `peran` · `waktu_checkin` · `dicatat_oleh`

- `peran`: `Anggota` · `Visitor` · `LT`. Satu orang satu baris per acara.

### `Events`
`id_event` · `tanggal` · `jam_mulai` · `jam_selesai` · `nama_acara` · `jenis` · `mode` · `lokasi` ·
`kapasitas` · `status` · `tampil_di_form`

- `jenis`: `CS` · `ESM` · `BOD` · `Lunch Networking` · `CGT` · `Soft Launch` · `Grand Launch`
- `mode`: `Online` · `Onsite`
- `status`: `Terbuka` · `Penuh` · `Selesai` · `Batal`
- Setiap Rabu biasanya dua baris: `BOD` pagi dan `Lunch Networking` siang.

### `Butuh`
Member menandai bidang yang mereka butuhkan di chapter.
`id_kursi` · `id_orang` · `tanggal`. Satu pasangan satu baris; menekan lagi menghapus barisnya.

### `Wawancara`
`id_wawancara` · `tanggal` · `id_orang` · `kanal` · `PIC` · `hasil` · `keberatan` · `tindak_lanjut` ·
`tanggal_tindak_lanjut` · `tautan_bukti`

- `kanal`: `Offline` · `Online` · `Telepon` · `WhatsApp`. `hasil`: `Tertarik` · `Bimbang` · `Tidak`.
- Diisi Lapis dari pintu Telegram Coach Dedy, dan oleh aksi `tindakLanjut` kalau ada catatan.

### `Jadwal_CS`
`id_slot` · `tanggal` · `jam` · `PIC` · `status` · `id_orang`. `status`: `Kosong` · `Ditahan` · `Terisi`.

### `Responses`
Mentah dari Google Form, tidak diubah tangan:
`timestamp` · `nama` · `whatsapp` · `email` · `perusahaan` · `bisnis` · `kota` · `id_event` · `slot_cs` ·
`diundang_oleh` · `catatan`

### `Akses`
`id_orang` · `kode_akses` · `peran` · `aktif` · `terakhir_masuk`

- `peran`: `Anggota` · `LT` · `LDC`. `kode_akses`: 6 huruf atau angka, unik, huruf besar.
- LT baru menerima kode setelah surat komitmen ditandatangani.
- Mencabut akses: ubah `aktif` menjadi FALSE.

### `Lencana`
`id_orang` · `lencana` · `tanggal`. Ditulis oleh `Api.js` saat lencana pertama kali terdeteksi.

### `Log`
`waktu` · `id_orang` · `aksi` · `ringkasan`. Setiap aksi tulis dicatat di sini.

### Tab milik Lapis
`Papan` (ringkasan mingguan untuk laporan) dan tab bantu lain boleh ditambah Lapis, asal tidak mengubah
tab di atas.

## 5. Permainan

Semua dihitung `Api.js` dari data di atas. Tidak ada poin dan tidak ada tim.

**Ronde Rabu.** Satu ronde = Kamis 00.00 sampai Rabu 23.59 WIB. Misi member setiap ronde: satu undangan.

**Misi Chapter.** Jumlah `Master` dengan `tahap` = `Anggota`, dibandingkan gerbang 20, 37, 51.

**Papan 64 Kursi.** Setiap kursi punya satu keadaan:
- `terisi` · ada anggota dengan `id_kursi` ini
- `ada_calon` · ada calon aktif (tahap selain `Anggota`, `Tidak Lanjut`, `Parkir`; kategori `Calon`)
- `kosong`

Satu baris berisi 8 kursi terisi = **baris lengkap**, dirayakan di Kabar.

**Lencana**, masing-masing sekali:

| Kode | Nama | Syarat |
|---|---|---|
| `UNDANGAN_PERTAMA` | Undangan Pertama | punya 1 baris `Undangan` sebagai pengundang |
| `TAMU_DATANG` | Tamu Datang | 1 orang yang diundangnya tercatat `Hadir` sebagai Visitor |
| `SPONSOR_PERTAMA` | Sponsor Pertama | `id_sponsor` di 1 anggota |
| `TIGA_KURSI` | Pembuka Tiga Kursi | `id_sponsor` di 3 anggota |
| `RABU_5` | Lima Rabu Beruntun | 5 ronde berturut-turut dengan minimal 1 undangan |

**Papan.** Dua papan, hanya nama depan dan angka:
- Pengundang ronde ini (direset setiap Kamis)
- Dinding sponsor (tidak direset)

Kehadiran tidak dilombakan. Kehadiran adalah syarat, bukan prestasi.

## 6. API

Web app Apps Script, `Execute as: Me`, `Who has access: Anyone`. Satu alamat untuk selamanya.

Semua panggilan: `POST` ke alamat web app, badan berupa teks JSON (header `Content-Type: text/plain`
supaya browser tidak mengirim preflight). Setiap badan membawa `action` dan `kode`.

Balasan selalu JSON: `{ "ok": true, ... }` atau `{ "ok": false, "pesan": "kalimat untuk pengguna" }`.

### 6.1 Untuk semua peran

| action | Masukan | Balasan |
|---|---|---|
| `masuk` | | `profil {id_orang, nama, nama_depan, peran}`, `pengaturan {...}` |
| `beranda` | | `misi {anggota, gerbang[], fase, target}`, `ronde {mulai, selesai, acara_berikut}`, `saya {undangan_ronde, undangan_total, tamu_hadir, sponsor, rabu_beruntun}`, `lencana [{kode, nama, didapat, tanggal}]`, `kabar [{jenis, teks, waktu}]` |
| `kursi` | | `baris [{nomor, sphere, terisi, kursi [{id_kursi, bidang, singkat, status, pemilik, jumlah_calon, jumlah_butuh, saya_butuh}]}]` |
| `kursiDetail` | `id_kursi` | `kursi {...}`, `calon [...]` (LT dan LDC saja, member menerima daftar kosong) |
| `tambahCalon` | `id_kursi, nama, bisnis, whatsapp?, id_event?` | `{id_orang, id_undangan?}` atau `ok:false` dengan `duplikat {nama_depan, tahap?, pic?}` |
| `butuh` | `id_kursi` | `{saya_butuh}` (sakelar) |
| `acara` | | `acara [{id_event, tanggal, jam_mulai, nama_acara, jenis, mode, lokasi}]` yang akan datang |
| `undang` | `id_orang, id_event` | `{id_undangan}` atau `ok:false` kalau sudah dua kali diundang |
| `undanganSaya` | | `undangan [{id_undangan, nama_depan, bidang, acara, tanggal, status}]` |
| `papan` | | `pengundang [{nama_depan, jumlah}]`, `sponsor [{nama_depan, jumlah}]` |

### 6.2 Khusus LT dan LDC

| action | Masukan | Balasan |
|---|---|---|
| `calonSaya` | `semua?` (LDC) | `calon [{id_orang, nama, bisnis, bidang, tahap, whatsapp, hari_diam, pic}]` |
| `tindakLanjut` | `id_orang, tahap, catatan?` | `{tahap}` |
| `regroup` | | `founding {jumlah, target}`, `lt [{nama_depan, total, ronde, target}]`, `kursi_tanpa_calon`, `calon_diam [{nama, pic, hari}]` |
| `daftarHadir` | `id_event` | `orang [{id_orang, nama, peran, hadir}]` |
| `checkin` | `id_event, id_orang, hadir` | `{hadir}` |
| `anggota` | | `anggota [{id_orang, nama}]` untuk pemilih sponsor |
| `jadikanAnggota` | `id_orang, id_kursi, id_sponsor` | `{jenis_anggota}` |

### 6.3 Khusus LDC

| action | Masukan | Balasan |
|---|---|---|
| `ringkas` | | `angka {...}`, `peringatan [{teks, menyala}]` sesuai `06-papan-angka.md` |

### 6.4 Aturan wajib

1. Tidak pernah mengirim WhatsApp, email, atau catatan orang lain ke peran `Anggota`.
2. Papan dan kursi hanya memuat nama depan.
3. Kode salah: setelah 20 kali gagal dalam 10 menit dari semua sumber, semua `masuk` dikunci 10 menit
   dan Coach Dedy diberi tahu. (Kode yang salah tidak bisa dikaitkan ke orang tertentu.)
4. Semua aksi tulis dicatat di `Log`.
5. Script Properties yang dipakai `Api.js`: `DATA_SHEET_ID` (ID sheet `Optima - Data Chapter`).
   `ADMIN_PIN` hanya untuk tampilan lama.

## 7. Riwayat

| Tanggal | Perubahan | Disetujui |
|---|---|---|
| 2026-10-04 | Versi 1 | menunggu Coach Dedy |
