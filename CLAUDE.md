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
- Tampilan app dibedakan menurut **peran** (LDC, LT, anggota), bukan menurut fase. Sebelum ESM hanya LDC dan LT yang punya kode, jadi otomatis hanya mereka yang memakai. Kode anggota dibagikan setelah ESM. `Pengaturan.fase` tetap ada, tetapi hanya untuk target Misi Chapter (20, 37, 52) dan label Founding atau Core Group. Setiap orang mengisi **20 sampai 40
  nama**, terikat ke kursi atau "bidang belum pasti".
- **LDC dan LT adalah pendiri, bukan member BNI Optima.** Mereka tidak punya kursi, tidak masuk daftar member, Misi Chapter, sponsor, atau kandidat driver. LT dan LDC boleh melihat nama, klasifikasi, dan nomor WhatsApp semua member dan calon (More, Contacts).
- **Menu LDC (Team, More): People, Settings, Data.** Satu app, bukan app terpisah. LDC melihat semua orang sejak awal (Master) beserta riwayat, menambah LT dan member dari luar chapter, membuat dan mengirim kode akses lewat WhatsApp. Kode member dibuat otomatis saat menjadi member, aktif setelah ESM (LDC menghidupkan sekaligus). Data viewer baca saja. Tidak ada editor sel bebas, supaya aturan data tetap dijaga.
- **LDC dan LT tanpa gamifikasi.** Tidak ada lencana, Gold path, atau menu Board bagi mereka. Daftar "belum mengundang ronde ini" ada di Team, More, Round history. Chapter Mission tetap tampil sebagai kemajuan chapter.
- **Seat dan klasifikasi.** Calon yang bidangnya belum ada di daftar seat tetap bisa dicatat tanpa seat dengan klasifikasi ditulis bebas. Seat baru hanya dibuat untuk member yang sudah join: lewat "New classification" saat menjadikan member, saat menambah member langsung, atau tombol + seat di halaman Seats (LT dan LDC).
- **Tanpa poin.** Hanya angka nyata (undangan, tamu hadir, sponsor) dan lencana.
- Semua anggota melihat nama lengkap dan bidang tamu yang terdaftar hadir Rabu itu, tanpa nomor telepon.
- Notifikasi hanya di dalam app (sorotan saat app dibuka).
- Gamifikasi: Misi Chapter (gerbang 20, 37, 52, dengan grafik garis), Papan Kursi (9 baris contact sphere: 8 baris x 8 kursi dan baris 9 Retail & Home Services dengan 4 kursi, total 68),
  Ronde Rabu (satu undangan per pekan), 5 lencana, papan pengundang ronde ini, dinding sponsor.
- **Tim (13 Oktober 2026).** Kompetisi antar tim, dimulai LDC saat ESM (People, Teams, Set up teams): minimal 3 tim dibagi rata menurut urutan bergabung, tim baru dibuka bila semua tim penuh (`tim_maks`, default 10). Anggota baru masuk tim terkecil. Hanya LDC yang memindahkan (`timAtur`). Tiga ukuran per ronde dan sepanjang waktu: tamu hadir, anggota yang bergabung, kehadiran BOD anggota sendiri, dibandingkan per anggota. Tampil sebagai satu kartu di Board (dua tab yang sama) dan satu baris di Home anggota. LDC dan LT tidak punya tim.
- **Konfirmasi H-1 (15 Oktober 2026).** Setelah visitor mendaftar lewat Form, LDC atau LT mengirim pesan konfirmasi dengan detail Zoom: Team, Check-in, tombol Confirm pada visitor berstatus Terdaftar. Teks pesan dibuat app (nama pengundang, tanggal, jam, Zoom dari Settings) dan bisa disunting sebelum dikirim. Tanggal ESM dan jadwal Rabu berubah-ubah, jadi keduanya diatur manual oleh LDC di Settings dan Events; app tidak mengganti fase otomatis, hanya menyalakan lampu di Summary bila tanggal ESM sudah lewat dan fase masih Pembentukan.
- **Jadwal berubah (15 Oktober 2026).** Form tamu hanya menampilkan acara terdekat (BOD pagi dan Lunch Networking siang Rabu berikutnya): `Events.tampil_di_form` diatur otomatis oleh `api_segarkanJendelaForm_()` (pemicu 5 menit). LDC menggeser seluruh jadwal lewat More, Announcements, Events, Shift dates. Tanggal ESM di Settings dan acara ESM di Events saling mengikuti.
- **Alur member disederhanakan (16 Oktober 2026).** Member hanya menambah calon kapan saja, menyapa dengan template sapaan (Say hi, di daftar calon, tanpa mencatat apa pun), dan mengundang lewat satu tombol Invite: BOD, Lunch Networking, atau Coffee session. BOD dan Lunch memakai satu pesan undangan bertemplat tetap yang diisi dari detail acara (`Events.pembuka`, `judul_topik`, `pembicara`, `biaya`, `tautan_lokasi`, ditulis LT atau LDC; biaya hanya tampil bila diisi) dan memuat link pendaftaran pribadi. Undangan tercatat saat pesan dibuka atau disalin. Status Registered muncul sendiri saat tamu mengisi halaman. Coffee session: member boleh memilih slot terbuka atau membuat waktu baru yang sudah disepakati dengan Coach Dedy lewat WhatsApp (dipegang LDC, tampil di Schedule), dan mengonfirmasi jam kepada calon. Konfirmasi H-1 oleh LT dan LDC tetap. Tidak ada lagi 4 pesan berurutan.
- **Satu pintu pendaftaran tamu (15 Oktober 2026).** Google Form diganti halaman `daftar/` (publik, tanpa kode akses) dengan tautan pribadi per member: `daftar/?m=<Master.kode_ajak>`. Tamu yang mendaftar langsung tercatat sebagai Terdaftar (`sumber=daftar`) di database yang sama, atas nama pengundang pemilik tautan. Aksi publik `infoDaftar` dan `daftarTamu` (pembatas laju `db.batasi`, honeypot). Member meneruskan poster seperti biasa dengan caption dari This week, Links to share. Tautan Form lama dan sinkron dropdown Form menjadi warisan.
- Jalur Gold (6 member baru) kembali sebagai angka nyata, bukan poin (keputusan Coach Dedy, 11 Oktober). Pengumuman dan info acara (pembicara, poster) ada di app, ditulis LT.
- Dibuang dari app Ventura: poin, tim dan bonus tim, persentase konversi, member
  mengundang ke coffee session, PIN bersama, halaman terpisah. Brain jolter dan permintaan klasifikasi
  dilebur ke Papan Kursi.
- Referral (istilah BNI untuk potensi bisnis antar member) tidak dipakai di app. Yang dipakai: undangan
  dan sponsor.

## Prinsip tampilan

App harus tetap simpel, dilihat maupun dipakai. Menambah fitur berarti mengurangi atau menggabungkan yang lama.
Home hanya memuat satu langkah berikutnya, satu pengumuman, Chapter Mission (dengan Gold path), lencana, dan berita.
Board dua tab (This round, All time). Team empat tab (Interviews, Schedule, Check-in, More). Fitur yang jarang dipakai
masuk More.

## Kecepatan

Apps Script lambat (3 sampai 5 detik per panggilan). `web/app.js` memakai simpanan bacaan: jawaban terakhir dipakai langsung, diperbarui diam-diam di belakang, layar digambar ulang bila isinya berubah. Simpanan dan profil login juga disimpan di HP (`optima_cache`, `optima_awal`), jadi app yang dibuka ulang langsung menampilkan data terakhir sementara kode dicek di belakang. Keduanya dihapus saat keluar atau ganti kode. Aksi tulis mengosongkan simpanan. Daftar aksi bacaan ada di `BACA_CEPAT`; aksi baru yang hanya membaca harus ditambahkan di sana.

## Aturan bahasa di app dan dokumen

- Bahasa app: Inggris (dipakai di app, termasuk klasifikasi). Dokumen kerja untuk Coach Dedy tetap Bahasa Indonesia.
- Tampilan: latar putih, merah sebagai warna utama. Judul Helvetica/Arial, isi Plus Jakarta Sans. Satu tema terang.
- Tanpa em dash. Tanpa kata "kamu". Sapaan ke pengguna memakai nama atau kalimat tanpa kata ganti.
- Sebut "Coach Dedy", bukan "Dedy" saja, di teks yang dibaca orang lain.
- Di daftar dan papan nama LDC tampil lengkap: "Dedy Dahlan", tanpa akhiran "(LDC)" karena perannya sudah tampil sebagai label. Sapaan di Home tetap nama depan.

## Struktur repo

- Alamat app (GitHub Pages, dari branch `main`): https://mitologian.github.io/optima/ (dikonfirmasi Coach Dedy, 12 Oktober 2026). Root meneruskan ke `web/`.

- `web/` · PWA baru (HTML, CSS, JS biasa, tanpa build). `web/config.js` memuat alamat API; kosong = mode
  tiruan dengan data contoh dari `web/tiruan.js`.
- `apps-script/Api.js` · endpoint `doPost` sesuai `KONTRAK.md` bagian 6.
- `apps-script/` lainnya · app lama Ventura yang sudah dinamai Optima. Masih jalan, jangan diubah kecuali
  untuk keamanan. Dipensiunkan setelah app baru dipakai.
- `index.html`, `manifest.json`, `sw.js` di akar · pengalih ke `web/` (peralihan 12 Oktober 2026). `sw.js` hanya
  pembersih untuk perangkat yang masih menyimpan cangkang lama, lalu mencabut dirinya.
- `lama/index.html` · cangkang lama (iframe ke app lama), disimpan sebagai jalan kembali selama `Main.html` masih
  ada di proyek Apps Script. Hapus setelah app lama dipensiunkan.
- `data/klasifikasi-awal.csv` · draf 68 kursi.
- Skrip `.sh` di akar milik Lapis.

## Menguji

Mode tiruan: buka `web/index.html` lewat server statis (`python3 -m http.server` dari akar repo), lalu
`/web/?tiruan=1` (`web/config.js` kini berisi alamat API asli, jadi tanpa `?tiruan=1` app memanggil sheet sungguhan). Kode contoh: `LDC001` (Coach Dedy), `LT0001` (LT), `AGT001` (anggota). Tambahkan `?fase=BOD`
untuk melihat target Misi dan label anggota seperti setelah ESM.
