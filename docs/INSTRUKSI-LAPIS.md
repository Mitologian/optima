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
6. (Pembaruan 12 Oktober: LDC dan LT bukan member chapter, jadi `tahap`, `id_kursi`, `jenis_anggota`, dan `tanggal_bergabung` baris mereka dikosongkan.) Isi `Master` dan `Akses` untuk Coach Dedy dan LT yang sudah menandatangani surat komitmen:
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
- `Pengaturan.target_gold` = 6 dan `Pengaturan.target_driver` = 5 (opsional, bawaan sama).
- Kolom `driver` di `Master` dibuat otomatis oleh `Api.js`. Tidak perlu diisi tangan.
- Rekomendasi driver membaca `Hadir` (check-in BOD dan Lunch oleh LT), `Undangan`, dan `Log`. Pastikan `Log` terisi dan `Hadir` rutin diabsen. Ambang bisa diubah di `Pengaturan` (kunci `driver_*`, lihat `KONTRAK.md`).

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
- Peralihan cangkang PWA ke `web/` sudah disiapkan: akar menjadi pengalih ke `web/`, cangkang lama dipindah ke `lama/`.
  Setelah peralihan, hapus `Main.html`, `Admin.html`, `Dashboard_v2.html`, `Member.html` dari proyek Apps Script
  supaya hanya ada satu `doPost`. Jalan kembali: arahkan akar ke `lama/` (lihat `README.md`).

## F. Menyusul: menu People, kode akses, Settings (12 Oktober 2026)

- Naikkan versi Apps Script lagi supaya aksi baru aktif: `orangSemua`, `orangDetail`, `tambahOrang`, `ubahOrang`, `aturAkses`,
  `aktifkanKodeAnggota`, `bacaPengaturan`, `ubahPengaturan`, `lihatTab`. Tidak ada tab atau kolom baru di sheet.
- Kode akses member kini dibuat otomatis oleh app (baris baru di `Akses`, `aktif` FALSE sampai ESM). Lapis tidak perlu membuat
  kode lagi, cukup jangan menghapus baris `Akses` yang dibuat app.
- `Pengaturan` boleh diubah app untuk kunci tertentu saja (fase, tanggal, tautan, target, ambang driver). Baris yang belum ada dibuat app.
- Baris Master Coach Dedy (P0001): kosongkan `tahap` supaya konsisten dengan aturan pendiri bukan member.

## G. Menyusul: ganti kode sendiri dan reset semua kode (12 Oktober 2026)

- Naikkan versi Apps Script lagi supaya aksi `gantiKodeSaya` dan `ulangSemuaKode` aktif. Tidak ada perubahan sheet.
- Setelah naik, jangan mengubah kolom `kode_akses` di sheet tanpa memberi tahu Coach Dedy, karena kode sekarang diatur dari app.

## H. Menyusul: seat baru untuk member dan LT tanpa gamifikasi (12 Oktober 2026)

- Naikkan versi Apps Script lagi: aksi baru `tambahKursi`, parameter `kursi_baru`, dan `kursi.tanpa_kursi`. Tidak ada kolom atau tab baru.
- App kini menambah baris di tab `Klasifikasi` (kolom `id_kursi`, `baris`, `sphere`, `bidang`, `singkat`, `aktif`). Mohon jangan menghapus atau menyusun ulang baris itu. Jika `Klasifikasi` punya kolom lain yang wajib, kabari agar app mengisinya.

## I. Menyusul: simpanan sementara agar app lebih cepat (12 Oktober 2026)

Hanya `apps-script/Api.js` yang berubah. Pembacaan tab kini disimpan 45 detik di `CacheService`, dan spreadsheet baru dibuka bila ada
tab yang belum tersimpan atau ada tulisan. Tulisan lewat app langsung membuat simpanan tab itu tidak terpakai lagi.

- Naikkan versi dan deploy seperti biasa (`clasp deploy -i <id yang sama>`).
- **Dampak ke kode Lapis:** perubahan di sheet yang dibuat di luar app (Form masuk, normalisasi `Responses`, otomasi, edit tangan)
  bisa baru terlihat di app sampai 45 detik kemudian. Supaya langsung terlihat, panggil `api_bersihkanCache_();` di akhir
  fungsi Lapis yang menulis ke sheet (misalnya selesai memproses pendaftar Form). Fungsi itu ada di `Api.js` dan aman dipanggil kapan saja.
- Tab `Log` dan `Responses` sengaja tidak disimpan.
- Ukur sebelum dan sesudah, lalu laporkan ke Claude: waktu satu permintaan `{"action":"beranda","kode":"<kode>"}` dari alamat `/exec`
  (misalnya `curl -w "%{time_total}"`, dua kali berturut-turut). Perkiraan: permintaan kedua dan seterusnya lebih cepat dari yang pertama.
- Bila ada galat baru `Server error` setelah deploy, kembalikan ke versi sebelumnya dan kabari Claude beserta pesan galat dari log eksekusi.

## J. Menyusul: simpanan 10 menit, pemicu onEdit, dan pemanasan tiap 5 menit (12 Oktober 2026)

Hanya `apps-script/Api.js` yang berubah. Simpanan tab kini hidup 10 menit (sebelumnya 45 detik) dan dijaga tetap hangat.

1. Deploy seperti biasa (`clasp push`, `clasp deploy -i <id yang sama>`).
2. Dari editor Apps Script, jalankan **`api_pasangPemicu_`** satu kali (aman diulang). Fungsi itu memasang:
   - pemicu waktu `api_panaskan_` tiap 5 menit, yang memuat ulang semua tab ke simpanan,
   - pemicu `api_saatEdit_` pada sheet "Optima - Data Chapter" (onEdit terpasang), yang membersihkan simpanan setiap kali ada edit tangan.
   Izinkan otorisasi bila diminta. Jangan memasang pemicu lain dengan nama fungsi yang sama.
3. Aturan lama tetap: kode Lapis yang menulis ke sheet lewat skrip atau API Sheets memanggil `api_bersihkanCache_();` setelah menulis,
   karena onEdit tidak aktif untuk perubahan lewat skrip atau API.
4. Ukur ulang waktu `{"action":"beranda","kode":"<kode>"}`: satu kali sesudah jeda lebih dari 10 menit, lalu dua kali berturut-turut.
   Harapannya permintaan pertama sesudah jeda pun mendekati angka permintaan beruntun (sekitar 2,5 detik). Laporkan angkanya.
5. Bila ada galat baru, hapus kedua pemicu itu (Triggers di editor) dan kabari Claude. Aplikasi tetap jalan tanpa pemicu,
   hanya simpanannya kembali kedaluwarsa tiap 10 menit.

## K. Menyusul: jadwal acara dikelola dari app (13 Oktober 2026)

- Naikkan versi Apps Script lagi: aksi `tambahAcara`, `acaraCheckin`, dan `ubahAcara` yang diperluas. Perubahan `Api.js`: kolom `tanggal`, `jam_mulai`, `jam_selesai`
  di tab `Events` kini ditulis sebagai teks supaya Sheets tidak mengubahnya menjadi tanggal atau waktu.
- App kini menambah baris di tab `Events` dengan `status` = Terbuka dan `tampil_di_form` = TRUE. Mohon pastikan sinkronisasi pilihan acara di Google Form
  (dropdown "Acara yang diikuti") ikut mengambil baris baru itu, dan beri tahu Claude bila perlu jeda atau pemicu tertentu.
- Acara yang dibatalkan dari app diberi `status` = Batal. Mohon dropdown Form tidak menampilkan acara yang Batal.

## L. Menyusul: pilihan acara di Form langsung tersegarkan (13 Oktober 2026)

- `Api.js` kini memanggil `sinkronPilihan()` (fungsi milik Lapis) di akhir aksi `tambahAcara` dan `ubahAcara` bila hasilnya berhasil. Bila fungsi itu tidak ada
  atau gagal, aksinya tetap berhasil dan hanya dicatat di log. Pemicu per jam milik Lapis tetap dipertahankan sebagai jaring pengaman.
- Syarat untuk Lapis: nama fungsi `sinkronPilihan` jangan diubah, tanpa argumen, aman dipanggil berulang, dan selesai dalam beberapa detik
  (dipanggil saat LT menekan Add event, jadi waktunya terasa oleh LT).
- Naikkan versi lagi, lalu uji dari app: Team, More, Announcements, Add event, buka Form, dan acara baru seharusnya langsung ada di dropdown.

## M. Menyusul: Edit seat dari app (13 Oktober 2026)

- Naikkan versi Apps Script lagi: aksi baru `ubahKursi`. Tidak ada kolom atau tab baru.
- App kini mengubah baris di tab `Klasifikasi` (kolom `bidang`, `singkat`, `baris`, `sphere`, `aktif`). Mohon jangan menyusun ulang atau menghapus baris di tab itu.
- Bila ada otomasi Lapis yang membaca nama seat dari `Klasifikasi` (misalnya pilihan di Form), pastikan ia membaca nilai terbaru dan tidak menyimpan salinan nama lama.


## N. Menyusul: kompetisi Tim (13 Oktober 2026)

- Naikkan versi Apps Script lagi: aksi baru `timPapan`, `timDaftar`, `timAtur`.
- Kolom baru `tim` di tab `Master` (ditambah otomatis oleh `Api.js`). Isinya nomor tim anggota (1, 2, 3, ...). Mohon jangan diisi atau diubah dari luar app; LDC mengatur tim dari app (People, Teams).
- Dua kunci baru di tab `Pengaturan` (dibuat app saat dipakai): `tim_maks` (maksimum anggota per tim, default 10, bisa diubah LDC di Settings) dan `tim_mulai` (tanggal tim dimulai, diisi app saat LDC menekan Set up teams). Jangan diisi manual.
- Tim belum aktif sampai LDC menekan Set up teams. Sebelum itu app tidak menampilkan apa pun soal tim.
- Tim dibagi rata menurut urutan bergabung. Anggota baru otomatis masuk tim terkecil, dan tim baru dibuka bila semua tim sudah `tim_maks`. Bila otomasi Lapis meresmikan anggota lewat script sendiri (bukan lewat `Inti.js`), kolom `tim` perlu diisi dengan cara yang sama, atau biarkan kosong lalu LDC menekan Rebalance.
- Tidak ada tab baru dan tidak ada pemicu baru.

## O. Menyusul: pilihan sponsor lebih luas (13 Oktober 2026)

- Naikkan versi Apps Script lagi. Tidak ada kolom, tab, atau pemicu baru, dan aksi lama tidak berubah nama. Aksi `anggota` kini juga mengembalikan daftar `pendiri` (LDC dan LT).
- Kolom `Master.id_sponsor` kini bisa berisi: id member (seperti sebelumnya), id LDC atau LT, `BNI` (tampil di app sebagai "BNI Indonesia"), atau teks bebas berawalan `Luar: ` (misalnya `Luar: Pak Andi, BNI Bandung`) untuk sponsor di luar daftar.
- Bila ada otomasi atau laporan Lapis yang membaca `id_sponsor`, anggap nilai yang tidak cocok dengan id orang sebagai teks nama. Sponsor LDC, LT, BNI, dan teks bebas tidak dihitung ke Jalur Gold, Board, atau skor tim (hanya sponsor member yang dihitung).

## P. Menyusul: nama pengundang di Form, pesan konfirmasi H-1, pengaturan Zoom (15 Oktober 2026)

Temuan dari uji Coach Dedy: tamu uji (P0003) diundang lewat app oleh LDC (`Undangan.U0001`, `id_pengundang` = P0001, benar), tetapi di tab `Responses` kolom `Diundang oleh` berisi "Tidak Ada" dan `id_pengundang` kosong. Di app nama pengundang tampil benar. Yang kosong ada di sisi Form.

Mohon dikerjakan Lapis:

1. **Pilihan "Diundang oleh" di Form.** Periksa isinya. Harus memuat semua member, semua LT, dan LDC (LT dan LDC sudah ada di app, mis. P0001 Dedy Dahlan dan P0002 Herlambang Prayatno). Format teks pilihan mohon sama persis dengan kolom `Master.nama` (nama lengkap), supaya bisa diisi otomatis dari app. Kabari format yang dipakai bila berbeda.
2. **Isi otomatis pengundang.** Bantu app mengisi kolom itu sendiri: berikan (a) alamat panjang Form `https://docs.google.com/forms/d/e/.../viewform` (bukan forms.gle, karena tautan pendek tidak meneruskan isian otomatis), dan (b) kode kolom "Diundang oleh" (bentuk `entry.1234567890`, bisa dilihat dari menu "Dapatkan tautan isi otomatis" di Form). Coach Dedy memasukkan keduanya di More, Settings: `Guest Form link` dan `Form field code for Invited by`. App kemudian membuat tautan Form yang nama pengundangnya sudah terisi, jadi tamu tidak perlu memilih.
3. **Normalisasi.** Bila tamu mengisi Form dan nomornya cocok dengan calon yang sudah punya `Undangan` (kasus aturan 2 di KONTRAK bagian Form), isi `Responses.id_pengundang` dari `Undangan.id_pengundang` supaya tab itu tidak tampak kosong. Undangan tetap milik pengundang asli seperti sekarang.
4. **Pilihan Form lebih cepat segar.** `Api.js` kini memanggil `sinkronPilihan()` juga sesudah `tambahOrang`, `jadikanAnggota`, dan `ubahOrang`, jadi LT atau member baru langsung masuk ke pilihan Form tanpa menunggu penyegaran per jam. Pastikan `sinkronPilihan()` aman dipanggil berulang.
5. **Pengaturan baru** di tab `Pengaturan` (dibuat app saat disimpan lewat Settings, jangan diisi manual): `tautan_zoom_bod`, `zoom_bod_id`, `zoom_bod_kode`, `form_entry_pengundang`. Tidak ada tab, kolom, atau pemicu baru.

Aksi `daftarHadir` kini juga mengembalikan nomor WhatsApp, nama lengkap pengundang, dan status undangan tiap visitor (hanya untuk LT dan LDC), dan `masuk` memuat `profil.usaha`. Tanpa perubahan kolom.

## Q. Menyusul: Form hanya menampilkan acara terdekat, geser jadwal, ESM sinkron (15 Oktober 2026)

Coach Dedy menguji Form: pilihan "Diundang oleh" tidak memuat nama LDC dan LT (Dedy Dahlan dan Herlambang Prayatno, keduanya ada di tab Master), dan daftar tanggal acara terlalu panjang (22 acara sekaligus).

**Sudah dikerjakan di kode (Api.js dan Inti.js), perlu naik versi:**
- Kolom `Events.tampil_di_form` kini diatur otomatis oleh `api_segarkanJendelaForm_()` (tiap 5 menit lewat pemicu `api_panaskan_` yang sudah ada, dan sesudah jadwal berubah). Isinya `TRUE` hanya untuk acara BOD, Lunch Networking, dan ESM yang belum mulai dan paling dekat, plus acara lain dalam 6 hari sesudahnya. Jadi pada hari biasa hanya dua pilihan: BOD pagi dan Lunch Networking siang Rabu berikutnya. Setelah BOD mulai, pilihannya tinggal Lunch; setelah Lunch mulai, pindah ke Rabu berikutnya. Acara jenis lain tidak disentuh.
- Bila daftar yang tampil berubah, `Api.js` memanggil `sinkronPilihan()` sendiri, jadi Form segar dalam sekitar 5 menit tanpa menunggu pemicu per jam.
- Aksi baru `geserAcara` (LDC): menggeser semua acara yang belum lewat sekian hari. Tanggal ESM di tab `Pengaturan` dan acara ESM di tab `Events` kini dijaga sama dari dua arah.

**Mohon dikerjakan Lapis di `sinkronPilihan()`:**
1. Pilihan **"Diundang oleh"**: muat semua baris `Master` dengan `kategori` = `LDC` atau `LT`, ditambah yang `tahap` = `Anggota`, dengan teks = kolom `nama` (nama lengkap), diurutkan menurut abjad, ditambah satu pilihan `Tidak Ada`. Dugaan penyebab nama LDC dan LT tidak muncul: daftar sekarang hanya mengambil `tahap` = `Anggota`. Kabari format yang dipakai bila berbeda.
2. Pilihan **"Acara yang diikuti"**: hanya acara dengan `tampil_di_form` = TRUE (jangan menyaring sendiri dengan aturan lain), dengan format label yang sama seperti sekarang supaya pemetaan label ke `id_event` di normalisasi tetap jalan. Bila tidak ada satu pun, isi satu pilihan penanda (mis. "Belum ada jadwal terdekat") karena Form tidak boleh kosong.
3. Dari catatan versi 41 sebelumnya (tetap berlaku): alamat panjang Form dan kode kolom "Diundang oleh" (`entry.…`) untuk isi otomatis pengundang, dan isi `Responses.id_pengundang` dari `Undangan` saat tamu cocok dengan undangan yang sudah ada.

## R. Menyusul: tindak lanjut versi 42 (15 Oktober 2026)

- Catatan Lapis soal acara jenis lain benar. Kini acara yang bukan BOD, Lunch Networking, atau ESM dibuat dengan `tampil_di_form` = FALSE oleh `tambahAcara`, dan `api_segarkanJendelaForm_()` menyembunyikannya dari Form (baris lama yang TRUE ikut dimatikan).
- Kartu "No inviter" di app kini memuat LDC dan LT di pilihan pengundang (sebelumnya hanya member), dan menyarankan pengundang dari undangan lain milik orang yang sama.
- Masih mohon Lapis: saat normalisasi Form membuat baris `Undangan` baru untuk tamu yang sudah punya `Undangan` dengan pengundang (mis. diundang lewat app, lalu mendaftar ke acara lain dengan memilih "Tidak Ada"), warisi `id_pengundang` dari undangan terakhir tamu itu, sama seperti yang sudah dilakukan untuk `Responses.id_pengundang`.
