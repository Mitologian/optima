# Alur kerja BNI Optima

Satu halaman untuk Coach Dedy, Lapis, dan siapa pun yang menyentuh app. Teks app berbahasa Inggris, dokumen ini Indonesia.

## Dua jalur calon

```
Jalur kunjungan:  undang ke BOD/Lunch > daftar Form > hadir > pesan coffee session > interview Zoom > Applied > bayar = Joined
Jalur langsung:   undang ke coffee session > pesan jam > interview Zoom > Applied > bayar = Joined
Keluar kapan saja: Declined (calon menolak), Rejected (chapter menolak), Joined_Other
```

Status di sheet: Listed, Invited, Attended, Coffee_Scheduled, Coffee_Session (sudah interview), Applied (setuju
bergabung, menunggu pembayaran), Anggota (pembayaran masuk). Keluar: Joined_Other, Declined, Rejected.

## Jadwal coffee session (Team, Schedule)

1. LDC atau LT membuka jam kosong: Open times, pilih tanggal dan beberapa jam sekaligus, pewawancara, tempat.
2. Siapa pun memesan jam untuk calonnya: pilih jam, kirim pesan 1 dan 2, setelah calon setuju tekan
   "They said yes: book this time", lalu kirim pesan 3 (konfirmasi dengan link Zoom).
3. Sesudah jamnya lewat, nama muncul di "Needs an outcome": Done (sudah interview) atau No show (kembali
   ke antrean). Hasil berikutnya di Interviews: Applied, lalu Joined saat pembayaran masuk.

Anggota hanya melihat jam kosong dan pesanan calonnya sendiri. LT bisa memakai "Other time" di luar slot.

## Pre-ESM · LDC dan LT (tanpa Google Form)

| Langkah | Di app | Di sheet |
|---|---|---|
| 1. Daftarkan nama calon | Seats, ketuk kursi, isi nama (atau Interviews, Add a prospect) | baris baru di `Master`, tahap Listed |
| 2. Undang langsung ke coffee session | Interviews, To schedule, Set coffee: pilih jam, kirim pesan, book | tahap Coffee_Scheduled, `jadwal_cs`, baris `Jadwal_CS` |
| 3. Selesai interview | Interviews, Coffee set, Done (atau Schedule, Needs an outcome) | tahap Coffee_Session |
| 4. Setuju bergabung | Interviews, Interviewed, Applied | tahap Applied |
| 5. Pembayaran masuk | Interviews, Interviewed, Joined (pilih sponsor) | tahap Anggota, jenis Founding |
| Keluar | ketuk nama, pilih Joined other chapter, Declined, atau Rejected, isi alasan | tahap Joined_Other, Declined, Rejected |

## Post-ESM · anggota dan LT

| Kebutuhan | Di app |
|---|---|
| Bikin daftar nama yang mau diundang | My list, Add a name |
| Undang ke acara Rabu | My list, Invite, Visit a Wednesday meeting: 4 pesan berurutan |
| Undang langsung ke coffee session | My list, Invite, Coffee session straight away: pilih jam, 3 pesan, book |
| Kapan tamu datang | **Tidak diinput di app.** Tamu mendaftar lewat Google Form, Lapis menarik ke `Responses`, app mencocokkan lewat nomor WhatsApp. Status berubah Diundang, Terdaftar, Hadir. |
| Lihat tamu yang akan datang Rabu ini | This week (nama lengkap dan klasifikasi, tanpa nomor) |
| Lihat klasifikasi terisi | Seats, Papan Kursi |
| Lihat roster anggota | Seats, Member list |
| Lihat leaderboard | Board |

Pesan undangan mengikuti panduan Ventura dan menyesuaikan kedekatan: Close friend (lu/gue), Friend (aku/kamu),
Acquaintance (saya/Anda). Balasan untuk keraguan selalu mengarahkan ke obrolan 15 menit dengan Coach Dedy.

## Khusus LT dan LDC (tab Team)

| Kebutuhan | Di app |
|---|---|
| Status interview calon | Team, Interviews |
| Buka jam dan lihat jadwal coffee session | Team, Schedule |
| Catat siapa hadir tiap BOD (anggota dan tamu) | Team, Check-in |
| Lihat siapa sering absen | Seats, Member list, lencana `hadir/total BOD` |
| Pantau nama per LT dan kursi kosong | Team, Regroup |
| Ringkasan chapter | Team, Summary (hanya LDC) |

## Perbandingan dengan Ventura

| Ventura | Optima |
|---|---|
| Dashboard dengan poin dan tim | Home: satu Next step, Chapter Mission, tanpa poin |
| Add Visitor (Visit Meeting atau Coffee Session, pilih tanggal Selasa) | My list: Add a name lalu Invite, pilih kunjungan Rabu atau coffee session (jam dari Schedule) |
| Who to Invite (brain jolter) | Seats: kursi kosong menunjukkan bidang yang dicari |
| Launch Team, Follow-Up | Team, Interviews (3 langkah) |
| Launch Team, Update Status | Ketuk nama di Interviews |
| Launch Team, Check-in | Team, Check-in |
| Launch Team, Wanted | Seats, filter Wanted, tombol "I need this" |
| Leaderboard (poin) | Board: jumlah undangan ronde ini dan dinding sponsor |
| Classification (locked, wanted, post) | Seats (Papan 64 Kursi dan Member list) |
| PIN admin bersama | Kode akses per orang |
| Tidak ada: tamu minggu ini | This week |
