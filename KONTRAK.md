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
| `CGT` | Mulai saat 37 anggota. Rabu diisi Core Group Training | Semua | `target_launch` (52) |
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
6. Bahasa tampilan app adalah Inggris. Pesan galat dari API (`pesan`) juga Inggris. Nilai data di sheet (tahap, status, jenis) tetap seperti tertulis di kontrak ini.

## 4. Spreadsheet `Optima - Data Chapter`

Akun `dedydahlan@gmail.com`, privat. Editor hanya Coach Dedy dan Lapis. LT dan member tidak membuka sheet.
Baris pertama setiap tab adalah nama kolom persis seperti di bawah.

Format sel **Plain text** wajib untuk kolom yang berisi kode atau nomor, supaya angka nol di depan tidak hilang:
`Akses.kode_akses`, `Master.whatsapp_norm`, semua kolom `id_...`, kolom berisi `id_orang` (`PIC`,
`diajukan_oleh`, `dipesan_oleh`, `pendamping`, `dicatat_oleh`), `Events.jam_mulai`, `Events.jam_selesai`,
`Jadwal_CS.tanggal`, `Jadwal_CS.jam`.

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
| `target_launch` | 52 |
| `target_nama_min` | 20 (nama minimal per orang, berlaku untuk LDC, LT, dan anggota) |
| `target_nama_maks` | 40 (sasaran nama per orang) |
| `hari_bod` | Rabu |
| `tanggal_esm` | 2027-05-24 |
| `tanggal_grand_launch` | 2027-08-02 |
| `tautan_form` | https://forms.gle/... |
| `tautan_zoom_cs` | tautan Zoom tetap untuk coffee session, ikut di pesan konfirmasi |

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
`diajukan_oleh` · `tanggal_masuk` · `tanggal_sentuh` · `alasan_tidak_lanjut` · `catatan` · `terakhir_diubah` · `jadwal_cs`

| Kolom | Nilai |
|---|---|
| `kategori` | `Calon` · `Guest` · `Observer` · `LT` · `LDC` |
| `tahap` | `Listed` · `Invited` · `Coffee_Scheduled` · `Attended` · `Coffee_Session` · `Applied` · `Anggota` · `Joined_Other` · `Declined` · `Rejected` (alur mengikuti Ventura; `Anggota` = Joined_Optima; `jadwal_cs` wajib saat `Coffee_Scheduled`; alasan keluar disimpan di `alasan_tidak_lanjut`) |
| `jenis_anggota` | kosong · `Founding` · `Core Group` |
| `id_sponsor` | `id_orang` sponsor, atau `BNI` |
| `PIC` | `id_orang` LT atau LDC yang menindaklanjuti |
| `diajukan_oleh` | `id_orang` yang memasukkan nama ini |
| `tanggal_sentuh` | terakhir kali tahap atau catatan diubah |
| `id_kursi` | boleh kosong untuk calon yang bidangnya belum pasti; LT memasangkan kursinya kemudian |
| `jadwal_cs` | tanggal dan jam coffee session, diisi saat tahap diubah ke `CS` |

LT dan LDC juga punya baris di `Master` (kategori `LT` atau `LDC`) supaya punya `id_orang`.
Kalau LT juga anggota chapter, `kategori` tetap `LT` dan `tahap` = `Anggota`.

### `Undangan`
`id_undangan` · `tanggal` · `id_pengundang` · `id_orang_calon` · `id_event` · `status` · `sumber`

- `status`: `Diundang` · `Terdaftar` · `Hadir` · `Batal`
- `sumber`: `app` · `form`.
- **Pencocokan registrasi Form (tanpa kode undangan).** Pesan undangan dari app meminta tamu memilih nama
  pengundang di kolom `diundang_oleh` (pilihan dropdown berisi nama anggota, LT, dan LDC, disinkronkan Lapis
  dari `Master`) dan memakai nomor WhatsApp yang diundang. Lapis mencocokkan tiap baris `Responses` begini:
  1. `whatsapp_norm` sama **dan** pengundang sama dengan `id_pengundang` di Undangan: cocok penuh.
  2. `whatsapp_norm` sama, pengundang beda atau kosong: cocok. Undangan tetap milik pengundang aslinya.
  3. Nomor tidak ada di Master, tetapi pengundang cocok dan nama tamu mirip dengan calon milik pengundang itu
     (token nama sama, urutan boleh beda): **jangan digabung otomatis.** Beri `status_cocok` = `Perlu_Cek`;
     LT mengonfirmasi, lalu nomor baru disimpan ke baris calon.
  4. Tidak ada yang cocok: buat baris Master dan Undangan baru dengan `sumber` = `form`, `id_pengundang` dari
     `diundang_oleh`. Jika `diundang_oleh` = `Tidak Ada`, `id_pengundang` dikosongkan dan LT mengisi pengundang
     bila ternyata ada (lihat di bawah).
  Pada cocok penuh atau cocok, status Undangan menjadi `Terdaftar` dan `id_event` Undangan diganti ke acara
  yang dipilih tamu di Form. **Opsi `Tidak Ada`:** dropdown `diundang_oleh` selalu memuat satu pilihan tetap
  `Tidak Ada` di urutan terakhir, untuk tamu yang tahu acara dari sumber lain. Pada aturan 1 dan 3 opsi ini
  dianggap tanpa pengundang (tidak pernah cocok). Aturan 2 tetap berlaku bila nomornya sudah ada di Master
  (pengundang asli menang). Aturan 4 membuat baris baru tanpa `id_pengundang`; baris ini tampil di layar Team
  LT sebagai "Tanpa pengundang" dan tidak masuk papan pengundang sampai LT menetapkan pengundangnya. Kolom tambahan di `Responses`: `status_cocok` (`Cocok` · `Perlu_Cek` · `Baru`).

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
`id_slot` · `tanggal` · `jam` · `PIC` · `tempat` · `status` · `id_orang` · `dipesan_oleh` · `pendamping`

- Satu baris = satu jam coffee session (30 menit). `tanggal` YYYY-MM-DD, `jam` HH:MM WIB, keduanya Plain text.
- `PIC` = pewawancara utama. Normalnya Coach Dedy; LT hanya membuka jam sendiri untuk wawancara berdua
  tanpa Coach Dedy (wajib memilih satu rekan LT). `pendamping` = `id_orang` LT pendamping, dipisah koma; LT
  menekan Join untuk ikut. `tempat`: `Zoom` atau nama tempat. `dipesan_oleh` = yang memesan.
- `status`: `Kosong` (dibuka LT/LDC) · `Terisi` (sudah dipesan untuk `id_orang`) · `Batal` (jam dihapus).
- Anggota hanya boleh memesan jam `Kosong` untuk calon yang ia ajukan sendiri. LT boleh untuk semua calon
  dan boleh memakai jam di luar slot (baris baru langsung `Terisi`).
- Memesan mengubah calon ke `Coffee_Scheduled` dan mengisi `jadwal_cs`. Ganti jam atau batal membebaskan
  slot lama kembali ke `Kosong`.

### `Responses`
Mentah dari Google Form, tidak diubah tangan:
`timestamp` · `nama` · `whatsapp` · `email` · `perusahaan` · `bisnis` · `kota` · `id_event` · `slot_cs` ·
`diundang_oleh` · `catatan` · `status_cocok`

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

**Misi Chapter.** Jumlah `Master` dengan `tahap` = `Anggota`, dibandingkan gerbang 20, 37, 52, plus grafik
garis jumlah anggota di akhir setiap ronde.

**Daftar nama.** Setiap orang (LDC, LT, anggota) mengisi 20 sampai 40 nama, masing-masing terikat ke satu
kursi atau ke "bidang belum pasti".

**Tanpa poin.** Keputusan Coach Dedy 4 Oktober: tidak ada poin. Yang dihitung hanya angka nyata (undangan,
tamu hadir, sponsor) dan lencana.

**Sorotan.** Saat app dibuka, pengundang melihat kabar bila tamunya hadir atau bergabung. Notifikasi hanya
di dalam app.

**Papan 64 Kursi.** Setiap kursi punya satu keadaan:
- `terisi` · ada anggota dengan `id_kursi` ini
- `ada_calon` · ada calon aktif (tahap `Listed` sampai `Applied`; kategori `Calon`)
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
| `beranda` | | `misi {anggota, gerbang[], fase, target, riwayat [{selesai, jumlah}], hari_ke_esm, hari_ke_launch, tamu_pekan, anggota_baru_pekan}`, `ronde {mulai, selesai, acara_berikut}`, `saya {undangan_ronde, undangan_total, tamu_hadir, sponsor, rabu_beruntun, nama_daftar, target_nama_min, target_nama_maks}`, `lencana [{kode, nama, didapat, tanggal}]`, `kabar [{jenis, teks, waktu}]` |
| `kursi` | | `baris [{nomor, sphere, terisi, kursi [{id_kursi, bidang, singkat, status, pemilik, jumlah_calon, jumlah_butuh, saya_butuh, saya_calon}]}]` |
| `kursiDetail` | `id_kursi` | `kursi {...}`, `calon [...]` (LT dan LDC saja), `calon_saya [{id_orang, nama, tahap}]` nama milik sendiri |
| `tambahCalon` | `id_kursi?` (kosong = bidang belum pasti), `nama, bisnis, whatsapp?, id_event?` | `{id_orang, id_undangan?}` atau `ok:false` dengan `duplikat {nama_depan, tahap?, pic?}` |
| `butuh` | `id_kursi` | `{saya_butuh}` (sakelar) |
| `acara` | | `acara [{id_event, tanggal, jam_mulai, nama_acara, jenis, mode, lokasi}]` yang akan datang |
| `undang` | `id_orang, id_event, whatsapp?` | `{id_undangan}` atau `ok:false` kalau sudah dua kali diundang. `whatsapp` mengisi nomor calon kalau sebelumnya kosong |
| `usulanSaya` | | `usulan [{id_orang, nama, bidang, tahap, punya_wa, whatsapp, bisnis, jumlah_undangan, jadwal_cs, status_undangan, acara_undangan, tanggal_undangan}]` nama yang diajukan sendiri |
| `undanganSaya` | | `undangan [{id_undangan, nama_depan, bidang, acara, tanggal, status}]`. `status` = `Bergabung` bila tamunya sudah anggota |
| `papan` | | `pengundang [{nama_depan, jumlah}]`, `sponsor [{nama_depan, jumlah}]` |
| `tamuPekanIni` | | `tamu [{nama, bidang, sphere, pengundang, acara, jenis, tanggal, jam_mulai, status, bergabung}]` tamu berstatus `Terdaftar` atau `Hadir` di acara ronde ini. Tanpa nomor telepon |
| `daftarAnggota` | | `anggota [{nama, bidang, sphere, jenis_anggota, sponsor, tanggal_bergabung}]` tanpa kontak |
| `slotCS` | | `slot [{id_slot, waktu, tanggal, jam, tempat, pic, pic_id, pic_ldc, status, id_orang?, nama?, tahap?}]` 4 pekan ke depan. Anggota: jam `Kosong` dan pesanan calonnya sendiri. LT: semua, ditambah `bidang, whatsapp, bisnis, pengundang, saya_dampingi, boleh_hapus`; semua slot memuat `pendamping []` nama depan, `pewawancara [...]`, `perlu_hasil [{id_orang, nama, waktu, pic}]` |
| `pesanSlot` | `id_orang, id_slot` atau `waktu` (LT saja), `whatsapp?`, `pic?`, `tempat?` | `{waktu, tempat, pic}`. Calon menjadi `Coffee_Scheduled` |
| `batalSlot` | `id_orang` | `{tahap}` calon kembali ke `Attended`, `Invited`, atau `Listed` sesuai riwayatnya |

### 6.2 Khusus LT dan LDC

| action | Masukan | Balasan |
|---|---|---|
| `calonSaya` | `semua?` (LDC) | `calon [{id_orang, nama, bisnis, id_kursi, bidang, tahap, whatsapp, hari_diam, pic, jadwal_cs}]` |
| `jadwalCS` | | `cs [{id_orang, nama, bidang, pic, jadwal_cs, whatsapp}]` coffee session mendatang |
| `tindakLanjut` | `id_orang, tahap, catatan?, jadwal_cs?` (wajib bila tahap `Coffee_Scheduled`, sekaligus membuat baris `Jadwal_CS`), `id_kursi?` | `{tahap}` |
| `tambahSlot` | `tanggal, jam[]` (HH:MM), `pendamping[]?`, `tempat?`. PIC selalu yang membuka | `{dibuat}` |
| `hapusSlot` | `id_slot` (hanya yang `Kosong`, oleh PIC atau LDC) | `{ok}` |
| `dampingiSlot` | `id_slot, ikut` | `{ikut}` LT ikut atau batal mendampingi |
| `regroup` | | `founding {jumlah, target}`, `lt [{nama_depan, total, ronde, target}]`, `kursi_tanpa_calon`, `calon_diam [{nama, pic, hari}]` |
| `daftarHadir` | `id_event` | `orang [{id_orang, nama, peran, hadir}]` |
| `checkin` | `id_event, id_orang, hadir` | `{hadir}` |
| `anggota` | | `anggota [{id_orang, nama}]` untuk pemilih sponsor |
| `jadikanAnggota` | `id_orang, id_kursi` (wajib bila calon belum punya kursi), `id_sponsor` | `{jenis_anggota, kursi}` |

### 6.3 Khusus LDC

| action | Masukan | Balasan |
|---|---|---|
| `ringkas` | | `angka {...}`, `peringatan [{teks, menyala}]` sesuai `06-papan-angka.md` |

### 6.4 Aturan wajib

1. Tidak pernah mengirim WhatsApp, email, atau catatan orang lain ke peran `Anggota`.
2. Papan dan kursi hanya memuat nama depan. Pengecualian: `tamuPekanIni` dan `daftarAnggota` memuat nama
   lengkap dan bidang untuk semua anggota (keputusan Coach Dedy), tetap tanpa nomor telepon.
3. Kode salah: setelah 20 kali gagal dalam 10 menit dari semua sumber, semua `masuk` dikunci 10 menit
   dan Coach Dedy diberi tahu. (Kode yang salah tidak bisa dikaitkan ke orang tertentu.)
4. Semua aksi tulis dicatat di `Log`.
5. Script Properties yang dipakai `Api.js`: `DATA_SHEET_ID` (ID sheet `Optima - Data Chapter`).
   `ADMIN_PIN` hanya untuk tampilan lama.

## 7. Riwayat

| Tanggal | Perubahan | Disetujui |
|---|---|---|
| 2026-10-04 | Versi 1 | menunggu Coach Dedy |
| 2026-10-04 | Putaran 2: target 52, daftar 20 sampai 40 nama untuk semua, tanpa poin, kolom `jadwal_cs`, aksi `tamuPekanIni`, `jadwalCS`, `daftarAnggota`, kursi boleh kosong | menunggu Coach Dedy |
| 2026-10-04 | Tambah aksi `usulanSaya`, parameter `whatsapp` di `undang`, aturan format Plain text | menunggu Coach Dedy |
| 2026-10-05 | Jadwal coffee session: kolom `tempat`, `dipesan_oleh` di `Jadwal_CS`, aksi `slotCS`, `tambahSlot`, `hapusSlot`, `pesanSlot`, `batalSlot`, pengaturan `tautan_zoom_cs`. Anggota boleh mengundang langsung ke coffee session. Opsi `Tidak Ada` di Form | menunggu Coach Dedy |
| 2026-10-05 | Coach Dedy pewawancara utama, LT pendamping (kolom `pendamping`, aksi `dampingiSlot`), LT boleh membuka jam hanya untuk wawancara berdua | menunggu Coach Dedy |
