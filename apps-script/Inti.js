/* =====================================================================
   INTI OPTIMA · logika permainan dan aturan data
   Dipakai bersama oleh:
   - Apps Script (Api.js) dengan adaptor sheet
   - PWA mode tiruan (web/tiruan.js) dengan adaptor memori
   Jangan memakai sintaks modul (import/export) supaya jalan di keduanya.
   Acuan: KONTRAK.md
   ===================================================================== */
var Inti = (function () {
  'use strict';

  // Alur status calon mengikuti app Ventura:
  // Listed (nama masuk) > Invited > Coffee_Scheduled > Attended > Coffee_Session (wawancara selesai) > Applied > Anggota (Joined_Optima)
  // Keluar: Joined_Other, Declined, Rejected
  var TAHAP_AKTIF = ['Listed', 'Invited', 'Coffee_Scheduled', 'Attended', 'Coffee_Session', 'Applied'];
  var TAHAP_TUTUP = ['Joined_Other', 'Declined', 'Rejected'];
  var TAHAP_LT = TAHAP_AKTIF.concat(TAHAP_TUTUP);
  var JAM = 3600 * 1000;
  var HARI = 24 * JAM;
  var WIB = 7 * JAM;

  var LENCANA = [
    { kode: 'UNDANGAN_PERTAMA', nama: 'First Invitation', ket: 'Invited one person' },
    { kode: 'TAMU_DATANG', nama: 'Guest Arrived', ket: 'One invitation attended an event' },
    { kode: 'SPONSOR_PERTAMA', nama: 'First Sponsor', ket: 'Sponsored one member' },
    { kode: 'TIGA_KURSI', nama: 'Three Seat Opener', ket: 'Sponsored three members' },
    { kode: 'RABU_5', nama: 'Five Wednesday Streak', ket: 'Invited five rounds in a row' }
  ];


  // pengaturan yang boleh diubah LDC dari app, dan tab yang boleh dilihat (tanpa Master dan Akses; keduanya lewat People)
  var PENGATURAN_BISA = ['fase', 'tanggal_esm', 'tanggal_grand_launch', 'tautan_zoom_cs', 'tautan_form', 'target_founding', 'target_cgt', 'target_launch', 'target_nama_min', 'target_nama_maks', 'target_gold', 'target_driver',
    'driver_ronde_min', 'driver_hadir_bod', 'driver_undang', 'driver_tamu_hadir', 'driver_konversi', 'driver_lunch', 'driver_aktif_ronde'];
  var PENGATURAN_CONTOH = { tanggal_esm: 'YYYY-MM-DD', tanggal_grand_launch: 'YYYY-MM-DD', tautan_zoom_cs: 'https://...', tautan_form: 'https://...' };
  var FASE_BOLEH = ['Pembentukan', 'BOD', 'CGT', 'Soft Launch', 'Grand Launch'];
  var TAB_LIHAT = ['Undangan', 'Hadir', 'Events', 'Wawancara', 'Jadwal_CS', 'Responses', 'Butuh', 'Lencana', 'Pengumuman', 'Log'];

  /* ---------- alat bantu ---------- */

  function Gagal(pesan, tambahan) {
    this.pesan = pesan;
    this.tambahan = tambahan || null;
  }
  function gagal(pesan, tambahan) { throw new Gagal(pesan, tambahan); }

  function teks(v) { return v === null || v === undefined ? '' : String(v).trim(); }
  function sama(a, b) { return teks(a).toLowerCase() === teks(b).toLowerCase(); }
  function benar(v) { return v === true || /^(true|ya|1)$/i.test(teks(v)); }

  function tgl(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v) ? null : v;
    var s = teks(v);
    // tanggal saja dibaca sebagai tengah malam WIB
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(Date.parse(s + 'T00:00:00+07:00'));
    var d = new Date(s);
    return isNaN(d) ? null : d;
  }
  function isoTanggal(d) {
    var w = new Date(d.getTime() + WIB);
    return w.toISOString().slice(0, 10);
  }
  function normWa(v) {
    var s = teks(v).replace(/\D/g, '');
    if (!s) return '';
    if (s.charAt(0) === '0') s = '62' + s.slice(1);
    else if (s.indexOf('62') !== 0 && s.charAt(0) === '8') s = '62' + s;
    return s;
  }
  function timPendiri(r) { var kat = teks(r.kategori); return kat === 'LT' || kat === 'LDC'; }
  function namaPanggil(o) {
    if (!o) return '';
    return teks(o.nama_depan) || teks(o.nama).split(/\s+/)[0] || '';
  }
  /* Nama yang tampil di daftar dan papan. Coach Dedy selalu tampil lengkap dengan perannya: "Dedy Dahlan (LDC)". */
  function namaDepan(o) {
    if (!o) return '';
    return teks(o.kategori) === 'LDC' ? teks(o.nama) + ' (LDC)' : namaPanggil(o);
  }
  function namaTampil(o) {
    return teks(o.kategori) === 'LDC' ? teks(o.nama) + ' (LDC)' : teks(o.nama);
  }
  function idBaru(baris, kolom, awalan, lebar) {
    var maks = 0;
    baris.forEach(function (r) {
      var m = teks(r[kolom]).match(/(\d+)$/);
      if (m && teks(r[kolom]).indexOf(awalan) === 0) maks = Math.max(maks, Number(m[1]));
    });
    var n = String(maks + 1);
    while (n.length < lebar) n = '0' + n;
    return awalan + n;
  }

  /* Ronde Rabu: Kamis 00.00 sampai Rabu 23.59 WIB.
     Nomor ronde dihitung dari Kamis 1 Januari 1970 (hari ke-0 epoch adalah Kamis). */
  function nomorRonde(d) { return Math.floor((d.getTime() + WIB) / (7 * HARI)); }
  function batasRonde(n) {
    var mulai = new Date(n * 7 * HARI - WIB);
    return { mulai: mulai, selesai: new Date(mulai.getTime() + 7 * HARI - 1000) };
  }

  /* ---------- konteks satu permintaan ---------- */

  function Konteks(db, sekarang) {
    this.db = db;
    this.now = sekarang || new Date();
    this._tab = {};
  }
  Konteks.prototype.tab = function (nama) {
    if (!this._tab[nama]) this._tab[nama] = this.db.baca(nama);
    return this._tab[nama];
  };
  Konteks.prototype.tambah = function (nama, obj) {
    this.db.tambah(nama, obj);
    if (this._tab[nama]) this._tab[nama].push(obj);
  };
  Konteks.prototype.ubah = function (nama, obj, perubahan) {
    this.db.ubah(nama, obj, perubahan);
    for (var k in perubahan) obj[k] = perubahan[k];
  };
  Konteks.prototype.hapus = function (nama, obj) {
    this.db.hapus(nama, obj);
    if (this._tab[nama]) this._tab[nama] = this._tab[nama].filter(function (r) { return r !== obj; });
  };
  Konteks.prototype.log = function (aksi, ringkasan) {
    this.tambah('Log', { waktu: this.now.toISOString(), id_orang: this.saya ? this.saya.id_orang : '', aksi: aksi, ringkasan: ringkasan });
  };
  Konteks.prototype.pengaturan = function () {
    if (this._atur) return this._atur;
    var a = {};
    this.tab('Pengaturan').forEach(function (r) { if (teks(r.kunci)) a[teks(r.kunci)] = r.nilai; });
    ['target_founding', 'target_cgt', 'target_launch', 'target_nama_min', 'target_nama_maks', 'target_gold', 'target_driver', 'driver_ronde_min', 'driver_hadir_bod', 'driver_undang', 'driver_tamu_hadir', 'driver_konversi', 'driver_lunch', 'driver_aktif_ronde'].forEach(function (k) { a[k] = Number(a[k]) || 0; });
    a.target_founding = a.target_founding || 20;
    a.target_cgt = a.target_cgt || 37;
    a.target_launch = a.target_launch || 52;
    a.target_nama_min = a.target_nama_min || 20;
    a.target_nama_maks = a.target_nama_maks || 40;
    a.target_gold = a.target_gold || 6;
    a.target_driver = a.target_driver || 5;
    // ambang rekomendasi driver (persen), dapat diubah di Pengaturan
    a.driver_ronde_min = a.driver_ronde_min || 4;
    a.driver_hadir_bod = a.driver_hadir_bod || 80;
    a.driver_undang = a.driver_undang || 60;
    a.driver_tamu_hadir = a.driver_tamu_hadir || 60;
    a.driver_konversi = a.driver_konversi || 20;
    a.driver_lunch = a.driver_lunch || 50;
    a.driver_aktif_ronde = a.driver_aktif_ronde || 2;
    a.fase = teks(a.fase) || 'Pembentukan';
    a.nama_chapter = teks(a.nama_chapter) || 'Optima';
    a.hari_bod = teks(a.hari_bod) || 'Rabu';
    a.tautan_form = teks(a.tautan_form);
    a.tautan_zoom_cs = teks(a.tautan_zoom_cs);
    if (a.tanggal_esm instanceof Date) a.tanggal_esm = isoTanggal(a.tanggal_esm);
    if (a.tanggal_grand_launch instanceof Date) a.tanggal_grand_launch = isoTanggal(a.tanggal_grand_launch);
    this._atur = a;
    return a;
  };
  Konteks.prototype.orang = function (id) {
    if (!this._idx) {
      var idx = {};
      this.tab('Master').forEach(function (r) { idx[teks(r.id_orang)] = r; });
      this._idx = idx;
    }
    return this._idx[teks(id)] || null;
  };
  Konteks.prototype.anggota = function () {
    // LDC dan LT adalah pendiri, bukan member chapter: tidak masuk daftar member, kursi, dan hitungan anggota
    return this.tab('Master').filter(function (r) { return teks(r.tahap) === 'Anggota' && !timPendiri(r); });
  };
  Konteks.prototype.calonAktif = function () {
    return this.tab('Master').filter(function (r) {
      return teks(r.kategori) === 'Calon' && TAHAP_AKTIF.indexOf(teks(r.tahap)) >= 0;
    });
  };
  Konteks.prototype.kursiDipakai = function () {
    var peta = {};
    this.anggota().forEach(function (r) { if (teks(r.id_kursi)) peta[teks(r.id_kursi)] = r; });
    return peta;
  };
  Konteks.prototype.isLT = function () { return this.saya && (this.saya.peran === 'LT' || this.saya.peran === 'LDC'); };
  Konteks.prototype.isLDC = function () { return this.saya && this.saya.peran === 'LDC'; };
  Konteks.prototype.undanganAktif = function () {
    return this.tab('Undangan').filter(function (u) { return teks(u.status) !== 'Batal'; });
  };
  Konteks.prototype.ronde = function () { return nomorRonde(this.now); };
  Konteks.prototype.hariDiam = function (o) {
    var t = tgl(o.tanggal_sentuh) || tgl(o.tanggal_masuk);
    return t ? Math.max(0, Math.floor((this.now - t) / HARI)) : 0;
  };

  /* ---------- masuk ---------- */

  function autentikasi(k, kode) {
    var db = k.db;
    if (db.terkunci && db.terkunci()) gagal('Too many login attempts. Try again in 10 minutes.');
    var bersih = teks(kode).toUpperCase();
    var akses = bersih && k.tab('Akses').filter(function (a) {
      return teks(a.kode_akses).toUpperCase() === bersih && benar(a.aktif);
    })[0];
    if (!akses) {
      if (db.catatGagal) db.catatGagal();
      gagal('Access code not recognized.');
    }
    var o = k.orang(akses.id_orang);
    k.saya = {
      id_orang: teks(akses.id_orang),
      nama: o ? teks(o.nama) : '',
      nama_depan: namaPanggil(o),
      peran: teks(akses.peran) || 'Anggota',
      akses: akses
    };
  }

  /* ---------- perhitungan bersama ---------- */

  function statistik(k, id) {
    var ronde = k.ronde();
    var milik = k.undanganAktif().filter(function (u) { return teks(u.id_pengundang) === id; });
    var set = {};
    milik.forEach(function (u) { var t = tgl(u.tanggal); if (t) set[nomorRonde(t)] = true; });
    var mulai = set[ronde] ? ronde : ronde - 1;
    var beruntun = 0;
    while (set[mulai - beruntun]) beruntun++;
    var hadirVisitor = {};
    k.tab('Hadir').forEach(function (h) { if (teks(h.peran) === 'Visitor') hadirVisitor[teks(h.id_orang)] = true; });
    var tamu = {};
    milik.forEach(function (u) { if (hadirVisitor[teks(u.id_orang_calon)]) tamu[teks(u.id_orang_calon)] = true; });
    var sponsor = k.anggota().filter(function (r) { return teks(r.id_sponsor) === id; }).length;
    return {
      undangan_ronde: milik.filter(function (u) { var t = tgl(u.tanggal); return t && nomorRonde(t) === ronde; }).length,
      undangan_total: milik.length,
      tamu_hadir: Object.keys(tamu).length,
      sponsor: sponsor,
      rabu_beruntun: beruntun
    };
  }

  function lencana(k, id, st) {
    var syarat = {
      UNDANGAN_PERTAMA: st.undangan_total >= 1,
      TAMU_DATANG: st.tamu_hadir >= 1,
      SPONSOR_PERTAMA: st.sponsor >= 1,
      TIGA_KURSI: st.sponsor >= 3,
      RABU_5: st.rabu_beruntun >= 5
    };
    var tercatat = {};
    k.tab('Lencana').forEach(function (l) { if (teks(l.id_orang) === id) tercatat[teks(l.lencana)] = l; });
    return LENCANA.map(function (L) {
      var ada = tercatat[L.kode];
      if (!ada && syarat[L.kode]) {
        ada = { id_orang: id, lencana: L.kode, tanggal: k.now.toISOString() };
        k.tambah('Lencana', ada);
        ada._baru = true;
      }
      return { kode: L.kode, nama: L.nama, ket: L.ket, didapat: !!ada, baru: !!(ada && ada._baru), tanggal: ada ? teks(tgl(ada.tanggal) ? tgl(ada.tanggal).toISOString() : '') : '' };
    });
  }

  function petaKursi(k) {
    var dipakai = k.kursiDipakai();
    var calon = {}, sayaCalon = {};
    var idSaya = k.saya ? k.saya.id_orang : '';
    k.calonAktif().forEach(function (r) {
      var id = teks(r.id_kursi);
      if (!id) return;
      calon[id] = (calon[id] || 0) + 1;
      if (teks(r.diajukan_oleh) === idSaya) sayaCalon[id] = (sayaCalon[id] || 0) + 1;
    });
    var butuh = {}, sayaButuh = {};
    var saya = k.saya ? k.saya.id_orang : '';
    k.tab('Butuh').forEach(function (b) {
      var id = teks(b.id_kursi);
      butuh[id] = (butuh[id] || 0) + 1;
      if (teks(b.id_orang) === saya) sayaButuh[id] = true;
    });
    var baris = {};
    k.tab('Klasifikasi').filter(function (r) { return benar(r.aktif) || teks(r.aktif) === ''; }).forEach(function (r) {
      var no = Number(r.baris) || 9;
      if (!baris[no]) baris[no] = { nomor: no, sphere: teks(r.sphere), kursi: [] };
      var id = teks(r.id_kursi);
      var p = dipakai[id];
      baris[no].kursi.push({
        id_kursi: id,
        bidang: teks(r.bidang),
        singkat: teks(r.singkat) || teks(r.bidang),
        sphere: teks(r.sphere),
        status: p ? 'terisi' : (calon[id] ? 'ada_calon' : 'kosong'),
        pemilik: p ? namaDepan(p) : '',
        jumlah_calon: calon[id] || 0,
        jumlah_butuh: butuh[id] || 0,
        saya_butuh: !!sayaButuh[id],
        saya_calon: sayaCalon[id] || 0
      });
    });
    return Object.keys(baris).map(Number).sort(function (a, b) { return a - b; }).map(function (no) {
      var b = baris[no];
      b.kursi.sort(function (x, y) { return x.id_kursi < y.id_kursi ? -1 : 1; });
      b.terisi = b.kursi.filter(function (x) { return x.status === 'terisi'; }).length;
      b.lengkap = b.nomor <= 8 && b.kursi.length >= 8 && b.terisi === b.kursi.length;
      return b;
    });
  }

  function kursiById(k, id) {
    var hasil = null;
    petaKursi(k).forEach(function (b) { b.kursi.forEach(function (x) { if (x.id_kursi === teks(id)) hasil = x; }); });
    return hasil;
  }

  function acaraBerikut(k) {
    var hariIni = isoTanggal(k.now);
    return k.tab('Events').filter(function (e) {
      var t = tgl(e.tanggal);
      var st = teks(e.status);
      return t && isoTanggal(t) >= hariIni && st !== 'Batal' && st !== 'Selesai';
    }).map(function (e) {
      return {
        id_event: teks(e.id_event), tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: jamEv(e.jam_mulai), jam_selesai: jamEv(e.jam_selesai),
        nama_acara: teks(e.nama_acara), jenis: teks(e.jenis), mode: teks(e.mode), lokasi: teks(e.lokasi),
        pembicara: teks(e.pembicara), poster: teks(e.poster)
      };
    }).sort(function (a, b) { return (a.tanggal + a.jam_mulai) < (b.tanggal + b.jam_mulai) ? -1 : 1; });
  }

  /* Driver: orang yang punya jaringan, pengaruh, aktif, dan berkomitmen. Hanya terlihat oleh LT dan LDC. */
  function driverAktif(k) {
    return k.tab('Master').filter(function (r) {
      var t = teks(r.tahap);
      return benar(r.driver) && !timPendiri(r) && (t === 'Anggota' || TAHAP_AKTIF.indexOf(t) >= 0);
    });
  }

  /* Rekomendasi driver otomatis. Hanya bahan diskusi untuk LT dan LDC, tidak pernah tampil ke anggota.
     Enam syarat, semuanya dari data yang sudah tercatat. Kehadiran BOD adalah kewajiban, Lunch Networking
     bersifat sukarela dan dihitung terpisah, tidak pernah ikut kehadiran wajib. */
  function rekomendasiDriver(k) {
    var a = k.pengaturan();
    var kini = k.ronde();
    var hariIni = isoTanggal(k.now);
    var acara = {};
    k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
    // hadir anggota per acara; acara tanpa catatan hadir sama sekali dianggap belum diabsen dan tidak dihitung
    var hadirAnggota = {}, diabsen = {};
    var hadirVisitor = {};
    k.tab('Hadir').forEach(function (h) {
      var idE = teks(h.id_event), peran = teks(h.peran);
      if (peran === 'Visitor') { hadirVisitor[teks(h.id_orang)] = true; return; }
      diabsen[idE] = true;
      hadirAnggota[teks(h.id_orang) + '|' + idE] = true;
    });
    var undanganPer = {};
    k.undanganAktif().forEach(function (u) { var id = teks(u.id_pengundang); if (id) (undanganPer[id] = undanganPer[id] || []).push(u); });
    var sponsorPer = {};
    k.anggota().forEach(function (r) { var sp = teks(r.id_sponsor); if (sp && sp !== 'BNI') sponsorPer[sp] = (sponsorPer[sp] || 0) + 1; });
    var aktifRonde = {};
    k.tab('Log').forEach(function (l) {
      var t = tgl(l.waktu), id = teks(l.id_orang);
      if (t && id) (aktifRonde[id] = aktifRonde[id] || {})[nomorRonde(t)] = true;
    });
    function persen(x, y) { return y ? Math.round(100 * x / y) : 0; }

    var hasil = [];
    k.anggota().forEach(function (m) {
      var id = teks(m.id_orang);
      if (teks(m.kategori) === 'LDC' || benar(m.driver)) return;
      var gabung = tgl(m.tanggal_bergabung);
      if (!gabung) return;
      var awal = nomorRonde(gabung);
      var ronde = kini - awal;               // ronde penuh sejak bergabung, ronde berjalan tidak dihitung
      if (ronde < a.driver_ronde_min) return;

      // 1 dan 6: kehadiran BOD (wajib) dan Lunch Networking (sukarela), dihitung terpisah
      var bod = { total: 0, hadir: 0 }, lunch = { total: 0, hadir: 0 };
      Object.keys(acara).forEach(function (idE) {
        var e = acara[idE], t = tgl(e.tanggal), j = teks(e.jenis);
        if (!t || teks(e.status) === 'Batal' || isoTanggal(t) >= hariIni || t < gabung || !diabsen[idE]) return;
        var tujuan = j === 'BOD' ? bod : j === 'Lunch Networking' ? lunch : null;
        if (!tujuan) return;
        tujuan.total++;
        if (hadirAnggota[id + '|' + idE]) tujuan.hadir++;
      });
      // 2: mengundang di setidaknya satu orang tiap ronde
      var punya = undanganPer[id] || [];
      var rondeUndang = {};
      punya.forEach(function (u) { var t = tgl(u.tanggal); if (t) { var n = nomorRonde(t); if (n >= awal && n < kini) rondeUndang[n] = true; } });
      var jmlRondeUndang = Object.keys(rondeUndang).length;
      // 3 dan 4: tamu terdaftar, hadir, dan yang bergabung
      var terdaftar = {}, hadir = {};
      punya.forEach(function (u) {
        var st = teks(u.status), c = teks(u.id_orang_calon);
        if (st === 'Terdaftar' || st === 'Hadir') terdaftar[c] = true;
        if (st === 'Hadir' || hadirVisitor[c]) { terdaftar[c] = true; hadir[c] = true; }
      });
      var nTerdaftar = Object.keys(terdaftar).length, nHadir = Object.keys(hadir).length;
      var bergabung = sponsorPer[id] || 0;
      // 5: aktif memakai app, ada aksi tulis di sedikitnya N dari 4 ronde terakhir
      var rondeAktif = 0;
      for (var n = kini - 1; n >= kini - 4 && n >= awal; n--) if ((aktifRonde[id] || {})[n]) rondeAktif++;
      var perluAktif = Math.min(a.driver_aktif_ronde, Math.min(4, ronde));

      var pBod = persen(bod.hadir, bod.total), pUndang = persen(jmlRondeUndang, ronde);
      var pTamu = persen(nHadir, nTerdaftar), pKonv = persen(bergabung, nHadir), pLunch = persen(lunch.hadir, lunch.total);
      var kriteria = [
        { kode: 'bod', label: 'BOD attendance', ok: bod.total >= 3 ? pBod >= a.driver_hadir_bod : null, teks: bod.hadir + ' of ' + bod.total + ' BOD (' + pBod + '%), needs ' + a.driver_hadir_bod + '%' },
        { kode: 'undang', label: 'Invites each week', ok: pUndang >= a.driver_undang, teks: 'Invited in ' + jmlRondeUndang + ' of ' + ronde + ' weeks (' + pUndang + '%), needs ' + a.driver_undang + '%' },
        { kode: 'tamu', label: 'Guests show up', ok: nTerdaftar >= 3 ? pTamu >= a.driver_tamu_hadir : null, teks: nHadir + ' of ' + nTerdaftar + ' registered guests attended (' + pTamu + '%), needs ' + a.driver_tamu_hadir + '%' },
        { kode: 'konversi', label: 'Guests who join', ok: bergabung >= 1 && nHadir >= 1 && pKonv >= a.driver_konversi, teks: bergabung + ' joined from ' + nHadir + ' guests who attended (' + pKonv + '%), needs ' + a.driver_konversi + '% and at least 1' },
        { kode: 'app', label: 'Active in the app', ok: rondeAktif >= perluAktif, teks: 'Active in ' + rondeAktif + ' of the last ' + Math.min(4, ronde) + ' weeks, needs ' + perluAktif },
        { kode: 'lunch', label: 'Lunch Networking (voluntary)', ok: lunch.total >= 3 ? pLunch >= a.driver_lunch : null, teks: lunch.hadir + ' of ' + lunch.total + ' lunches (' + pLunch + '%), needs ' + a.driver_lunch + '%' }
      ];
      function ok(kode) { return kriteria.filter(function (c) { return c.kode === kode; })[0].ok; }
      // tiga pilar: komit, punya network, punya pengaruh. Lunch Networking hanya bonus, tidak diwajibkan.
      var pilar = [
        { kode: 'komit', label: 'Committed', ok: ok('bod') === true && ok('app') === true, kriteria: ['bod', 'app'] },
        { kode: 'network', label: 'Has a network', ok: ok('undang') === true && ok('tamu') !== false, kriteria: ['undang', 'tamu'] },
        { kode: 'pengaruh', label: 'Has influence', ok: ok('konversi') === true, kriteria: ['konversi'] }
      ];
      var x = kursiById(k, m.id_kursi);
      hasil.push({
        id_orang: id, nama: teks(m.nama), bidang: x ? x.bidang : (teks(m.bisnis) || ''), minggu: ronde,
        memenuhi: pilar.filter(function (q) { return q.ok; }).length, dari: pilar.length,
        bonus_lunch: ok('lunch') === true,
        tamu_bergabung: bergabung, tamu_hadir: nHadir, pilar: pilar, kriteria: kriteria
      });
    });
    return hasil.sort(function (p, q) { return q.memenuhi - p.memenuhi || (q.bonus_lunch ? 1 : 0) - (p.bonus_lunch ? 1 : 0) || q.tamu_bergabung - p.tamu_bergabung || q.tamu_hadir - p.tamu_hadir || (p.nama < q.nama ? -1 : 1); });
  }

  function pendaftarPerluCek(k) {
    return k.tab('Responses').filter(function (r) { return teks(r.status_cocok) === 'Perlu_Cek' && teks(r.id_response) && !teks(r.id_orang_hasil); });
  }
  function pendaftarTanpaPengundang(k) {
    return k.undanganAktif().filter(function (u) { return !teks(u.id_pengundang) && teks(u.sumber) === 'form'; });
  }

  function tautanAman(v) {
    var u = teks(v);
    if (!u) return '';
    if (u.length > 500 || !/^https:\/\/[^\s]+$/i.test(u)) gagal('The poster link must start with https://');
    return u;
  }

  function pengumumanAktif(k) {
    var hariIni = isoTanggal(k.now);
    return k.tab('Pengumuman').filter(function (r) {
      if (teks(r.status) === 'Dihapus' || !teks(r.judul)) return false;
      var tayang = tgl(r.tanggal_tayang);
      if (tayang && tayang > k.now) return false;
      var akhir = tgl(r.tanggal_berakhir);
      return !(akhir && isoTanggal(akhir) < hariIni);
    }).sort(function (a, b) {
      var x = tgl(a.tanggal_tayang), y = tgl(b.tanggal_tayang);
      return (y ? y.getTime() : 0) - (x ? x.getTime() : 0);
    });
  }

  function misi(k) {
    var a = k.pengaturan();
    var jumlah = k.anggota().length;
    var target = a.fase === 'Pembentukan' ? a.target_founding : (a.fase === 'BOD' ? a.target_cgt : a.target_launch);
    // riwayat: jumlah anggota di akhir setiap ronde Rabu, dari ronde anggota pertama sampai sekarang
    var kini = k.ronde();
    var awal = kini;
    var tglGabung = k.anggota().map(function (r) { return tgl(r.tanggal_bergabung); });
    tglGabung.forEach(function (d) { if (d) awal = Math.min(awal, nomorRonde(d)); });
    awal = Math.max(awal, kini - 51);
    var riwayat = [];
    for (var n = awal; n <= kini; n++) {
      var batas = batasRonde(n).selesai;
      riwayat.push({ selesai: batas.toISOString(), jumlah: tglGabung.filter(function (d) { return !d || d <= batas; }).length });
    }
    function hariKe(v) { var d = tgl(v); return d ? Math.max(0, Math.ceil((d.getTime() - k.now.getTime()) / HARI)) : null; }
    var mulai = batasRonde(kini).mulai, akhir = batasRonde(kini).selesai;
    var tamuPekan = 0, sudahTamu = {};
    var acaraRonde = {};
    k.tab('Events').forEach(function (e) { var t = tgl(e.tanggal); if (t && nomorRonde(t) === kini && teks(e.status) !== 'Batal') acaraRonde[teks(e.id_event)] = true; });
    k.undanganAktif().forEach(function (u) {
      var st = teks(u.status), kunci = teks(u.id_orang_calon) + '|' + teks(u.id_event);
      if (acaraRonde[teks(u.id_event)] && (st === 'Terdaftar' || st === 'Hadir') && !sudahTamu[kunci]) { sudahTamu[kunci] = true; tamuPekan++; }
    });
    var baruPekan = tglGabung.filter(function (d) { return d && d >= mulai && d <= akhir; }).length;
    return { anggota: jumlah, gerbang: [a.target_founding, a.target_cgt, a.target_launch], fase: a.fase, target: target, riwayat: riwayat,
      hari_ke_esm: hariKe(a.tanggal_esm), hari_ke_launch: hariKe(a.tanggal_grand_launch), tamu_pekan: tamuPekan, anggota_baru_pekan: baruPekan };
  }

  function kabar(k) {
    var hasil = [];
    k.anggota().forEach(function (r) {
      var t = tgl(r.tanggal_bergabung);
      if (!t) return;
      var s = teks(r.id_sponsor) && teks(r.id_sponsor) !== 'BNI' ? k.orang(r.id_sponsor) : null;
      var kursi = kursiById(k, r.id_kursi);
      hasil.push({ jenis: 'anggota', waktu: t.toISOString(), teks: namaDepan(r) + ' took the ' + (kursi ? kursi.bidang : 'new') + ' seat' + (s ? ', sponsored by ' + namaDepan(s) : '') });
    });
    k.tab('Hadir').forEach(function (h) {
      if (teks(h.peran) !== 'Visitor') return;
      var o = k.orang(h.id_orang), t = tgl(h.waktu_checkin);
      if (o && t) hasil.push({ jenis: 'tamu', waktu: t.toISOString(), teks: namaDepan(o) + ' attended as a Visitor' });
    });
    k.tab('Lencana').forEach(function (l) {
      var o = k.orang(l.id_orang), t = tgl(l.tanggal);
      var L = LENCANA.filter(function (x) { return x.kode === teks(l.lencana); })[0];
      if (o && t && L) hasil.push({ jenis: 'lencana', waktu: t.toISOString(), teks: namaDepan(o) + ' earned ' + L.nama });
    });
    petaKursi(k).forEach(function (b) {
      if (!b.lengkap) return;
      var akhir = null;
      k.anggota().forEach(function (r) {
        var x = kursiById(k, r.id_kursi);
        var t = tgl(r.tanggal_bergabung);
        if (x && x.sphere === b.sphere && t && (!akhir || t > akhir)) akhir = t;
      });
      if (akhir) hasil.push({ jenis: 'baris', waktu: akhir.toISOString(), teks: 'Row ' + b.sphere + ' complete, 8 of 8 seats filled' });
    });
    return hasil.sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; }).slice(0, 12);
  }

  function waktuSlot(r) {
    var t = r.tanggal instanceof Date ? isoTanggal(r.tanggal) : teks(r.tanggal).slice(0, 10);
    var j = r.jam instanceof Date ? jamWIB(r.jam) : teks(r.jam).replace('.', ':');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || !/^\d{1,2}:\d{2}$/.test(j)) return null;
    if (j.length === 4) j = '0' + j;
    return tgl(t + 'T' + j + ':00+07:00');
  }
  function perannya(k, id) {
    var a = k.tab('Akses').filter(function (x) { return teks(x.id_orang) === teks(id); })[0];
    return a ? teks(a.peran) : '';
  }
  function daftarPendamping(r) { return teks(r.pendamping).split(',').map(teks).filter(Boolean); }
  function jamEv(v) { return v instanceof Date ? jamWIB(v) : teks(v).replace(/^(\d):/, '0$1:'); }
  function jamWIB(d) { return new Date(d.getTime() + WIB).toISOString().slice(11, 16); }
  function slotById(k, id) {
    var r = k.tab('Jadwal_CS').filter(function (x) { return teks(x.id_slot) === teks(id); })[0];
    if (!r) gagal('That time is no longer available.');
    return r;
  }
  // bebaskan slot lama milik calon (saat jadwal diganti atau dibatalkan)
  function lepasSlot(k, o) {
    k.tab('Jadwal_CS').forEach(function (r) {
      if (teks(r.id_orang) !== teks(o.id_orang) || teks(r.status) !== 'Terisi') return;
      var w = waktuSlot(r);
      if (w && w < k.now) return;
      k.ubah('Jadwal_CS', r, { status: 'Kosong', id_orang: '', dipesan_oleh: '' });
    });
  }
  function wajibLT(k) { if (!k.isLT()) gagal('This feature is for the launch team only.'); }
  function wajibLDC(k) { if (!k.isLDC()) gagal('This feature is for the LDC only.'); }


  /* ---------- kode akses ---------- */
  var HURUF_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function kodeBaru(k) {
    var ada = {};
    k.tab('Akses').forEach(function (a) { ada[teks(a.kode_akses).toUpperCase()] = true; });
    for (var n = 0; n < 300; n++) {
      var s = '';
      for (var i = 0; i < 6; i++) s += HURUF_KODE.charAt(Math.floor(Math.random() * HURUF_KODE.length));
      if (!ada[s]) return s;
    }
    gagal('Could not make a unique code. Try again.');
  }
  function aksesOrang(k, id) {
    return k.tab('Akses').filter(function (a) { return teks(a.id_orang) === teks(id); })[0] || null;
  }
  function setelahEsm(k) { return k.pengaturan().fase !== 'Pembentukan'; }
  function peranUntuk(o) {
    if (teks(o.kategori) === 'LT') return 'LT';
    if (teks(o.kategori) === 'LDC') return 'LDC';
    return teks(o.tahap) === 'Anggota' ? 'Anggota' : '';
  }
  /* Satu orang satu baris Akses. Member baru mendapat kode otomatis; sebelum ESM kodenya belum aktif. */
  function pastikanAkses(k, o, aktif) {
    var a = aksesOrang(k, o.id_orang);
    if (a) return a;
    var peran = peranUntuk(o);
    if (!peran) gagal('Only the launch team and members can have an access code.');
    a = { id_orang: teks(o.id_orang), kode_akses: kodeBaru(k), peran: peran, aktif: aktif ? 'TRUE' : 'FALSE', terakhir_masuk: '' };
    k.tambah('Akses', a);
    return a;
  }
  function infoAkses(a) {
    return a ? { ada: true, kode: teks(a.kode_akses), peran: teks(a.peran), aktif: benar(a.aktif), terakhir_masuk: teks(a.terakhir_masuk) } : { ada: false };
  }
  /* Menjadikan seseorang member: dipakai alur wawancara (jadikanAnggota) dan penambahan langsung dari luar chapter. */
  function resmikanAnggota(k, o, x, sp, tambahan) {
    var jenis = k.pengaturan().fase === 'Pembentukan' ? 'Founding' : 'Core Group';
    var ubah = { tahap: 'Anggota', id_kursi: x.id_kursi, id_sponsor: sp, jenis_anggota: jenis, tanggal_bergabung: k.now.toISOString(), tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() };
    for (var z in tambahan || {}) ubah[z] = tambahan[z];
    k.ubah('Master', o, ubah);
    var a = pastikanAkses(k, o, setelahEsm(k));
    return { jenis_anggota: jenis, akses: a };
  }
  function cekSponsor(k, sp) {
    if (!sp) gagal('Choose a sponsor. If no member is known personally, choose BNI.');
    if (sp !== 'BNI') {
      var so = k.orang(sp);
      if (!so || teks(so.tahap) !== 'Anggota' || timPendiri(so)) gagal('The sponsor must be a chapter member, or BNI.');
    }
  }

  /* Seat baru untuk member yang bisnisnya belum ada di daftar. Hanya dipanggil saat ada member yang langsung menempatinya. */
  function buatKursi(k, kb) {
    kb = kb || {};
    var bidang = teks(kb.bidang), singkat = teks(kb.singkat), baris = Number(kb.baris);
    if (bidang.length < 3 || bidang.length > 60) gagal('The classification name must be 3 to 60 characters.');
    if (singkat.length > 16) gagal('The short name is too long (16 characters at most).');
    var aktif = k.tab('Klasifikasi').filter(function (r) { return benar(r.aktif) || teks(r.aktif) === ''; });
    if (aktif.some(function (r) { return sama(r.bidang, bidang); })) gagal('That classification is already on the seat list. Choose its seat instead.');
    var contoh = aktif.filter(function (r) { return Number(r.baris) === baris; })[0];
    if (!contoh) gagal('Choose the row (contact sphere) for the new seat.');
    var r = { id_kursi: idBaru(k.tab('Klasifikasi'), 'id_kursi', 'K', 2), baris: baris, sphere: teks(contoh.sphere), bidang: bidang, singkat: singkat || bidang, aktif: 'TRUE' };
    k.tambah('Klasifikasi', r);
    k.log('buatKursi', bidang + ' di baris ' + baris);
    return kursiById(k, r.id_kursi);
  }

  /* Kehadiran member sejak bergabung: BOD dan Lunch Networking yang sudah lewat (yang dibatalkan tidak dihitung). */
  function kehadiranOrang(k, o) {
    if (teks(o.tahap) !== 'Anggota' || timPendiri(o)) return null;
    var mulai = tgl(o.tanggal_bergabung);
    var hadir = {};
    k.tab('Hadir').forEach(function (h) { if (teks(h.id_orang) === teks(o.id_orang)) hadir[teks(h.id_event)] = true; });
    var h = { bod: 0, total_bod: 0, lunch: 0, total_lunch: 0, absen: [] };
    k.tab('Events').forEach(function (e) {
      var t = tgl(e.tanggal), jenis = teks(e.jenis);
      if (!t || t > k.now || teks(e.status) === 'Batal' || (mulai && t < new Date(mulai.getTime() - 7 * HARI))) return;
      if (jenis === 'BOD') { h.total_bod++; if (hadir[teks(e.id_event)]) h.bod++; else h.absen.push(isoTanggal(t)); }
      else if (jenis === 'Lunch Networking') { h.total_lunch++; if (hadir[teks(e.id_event)]) h.lunch++; }
    });
    h.absen.sort();
    return h;
  }

  function buatUndangan(k, idCalon, idEvent) {
    var calon = k.orang(idCalon);
    if (!calon) gagal('Prospect not found.');
    if (teks(calon.tahap) === 'Anggota') gagal(namaDepan(calon) + ' is already a member.');
    if (!teks(calon.whatsapp_norm)) gagal('The prospect\'s WhatsApp number is required before inviting.');
    var acara = acaraBerikut(k).filter(function (e) { return e.id_event === teks(idEvent); })[0];
    if (!acara) gagal('Event not found or already past.');
    var milikCalon = k.undanganAktif().filter(function (u) { return teks(u.id_orang_calon) === teks(idCalon); });
    if (milikCalon.some(function (u) { return teks(u.id_event) === acara.id_event; })) gagal(namaDepan(calon) + ' is already invited to this event.');
    if (milikCalon.length >= 2) gagal('Per BNI rules, a person can be invited as a Visitor only twice. ' + namaDepan(calon) + ' has already been invited twice.');
    var u = {
      id_undangan: idBaru(k.tab('Undangan'), 'id_undangan', 'U', 4),
      tanggal: k.now.toISOString(),
      id_pengundang: k.saya.id_orang,
      id_orang_calon: teks(idCalon),
      id_event: acara.id_event,
      status: 'Diundang',
      sumber: 'app'
    };
    k.tambah('Undangan', u);
    if (teks(calon.tahap) === 'Listed') k.ubah('Master', calon, { tahap: 'Invited', tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() });
    k.log('undang', namaDepan(calon) + ' ke ' + acara.nama_acara + ' ' + acara.tanggal);
    return u;
  }

  /* ---------- aksi ---------- */

  var AKSI = {
    masuk: function (k) {
      var a = k.pengaturan();
      if (k.saya.akses) k.ubah('Akses', k.saya.akses, { terakhir_masuk: k.now.toISOString() });
      return {
        profil: { id_orang: k.saya.id_orang, nama: k.saya.nama, nama_depan: k.saya.nama_depan, peran: k.saya.peran },
        pengaturan: {
          nama_chapter: a.nama_chapter, fase: a.fase, hari_bod: a.hari_bod, tautan_form: a.tautan_form, tautan_zoom_cs: a.tautan_zoom_cs,
          target_founding: a.target_founding, target_cgt: a.target_cgt, target_launch: a.target_launch,
          target_nama_min: a.target_nama_min, target_nama_maks: a.target_nama_maks, target_gold: a.target_gold, tanggal_esm: teks(a.tanggal_esm), tanggal_grand_launch: teks(a.tanggal_grand_launch)
        }
      };
    },

    beranda: function (k) {
      var id = k.saya.id_orang;
      var st = statistik(k, id);
      var atur = k.pengaturan();
      st.nama_daftar = k.tab('Master').filter(function (r) { return teks(r.diajukan_oleh) === id && teks(r.kategori) === 'Calon'; }).length;
      st.target_nama_min = atur.target_nama_min;
      st.target_nama_maks = atur.target_nama_maks;
      st.target_gold = atur.target_gold;
      var r = batasRonde(k.ronde());
      var berikut = acaraBerikut(k);
      return {
        misi: misi(k),
        ronde: { mulai: r.mulai.toISOString(), selesai: r.selesai.toISOString(), acara_berikut: berikut[0] || null },
        saya: st,
        lencana: k.isLT() ? [] : lencana(k, id, st),
        kabar: kabar(k)
      };
    },

    kursi: function (k) {
      var hasil = { baris: petaKursi(k) };
      if (k.isLT()) {
        var per = {};
        k.calonAktif().forEach(function (r) {
          if (teks(r.id_kursi)) return;
          var t = teks(r.bisnis) || 'Not described';
          per[t.toLowerCase()] = per[t.toLowerCase()] || { bisnis: t, jumlah: 0 };
          per[t.toLowerCase()].jumlah++;
        });
        hasil.tanpa_kursi = Object.keys(per).map(function (z) { return per[z]; }).sort(function (a, b) { return b.jumlah - a.jumlah; });
      }
      return hasil;
    },

    kursiDetail: function (k, b) {
      var x = kursiById(k, b.id_kursi);
      if (!x) gagal('Seat not found.');
      var calon = [];
      var milikSaya = k.calonAktif().filter(function (r) { return teks(r.id_kursi) === x.id_kursi && teks(r.diajukan_oleh) === k.saya.id_orang; })
        .map(function (r) { return { id_orang: teks(r.id_orang), nama: teks(r.nama), tahap: teks(r.tahap) }; });
      if (k.isLT()) {
        calon = k.calonAktif().filter(function (r) { return teks(r.id_kursi) === x.id_kursi; }).map(function (r) {
          var pic = k.orang(r.PIC), aju = k.orang(r.diajukan_oleh);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bisnis: teks(r.bisnis), tahap: teks(r.tahap), pic: namaDepan(pic), diajukan: namaDepan(aju) };
        });
      }
      return { kursi: x, calon: calon, calon_saya: milikSaya };
    },

    tambahCalon: function (k, b) {
      var x = teks(b.id_kursi) ? kursiById(k, b.id_kursi) : null;
      if (teks(b.id_kursi) && !x) gagal('Seat not found.');
      if (x && x.status === 'terisi') gagal('The ' + x.bidang + ' seat is already taken by ' + x.pemilik + '. One classification is for one member only.');
      var nama = teks(b.nama), bisnis = teks(b.bisnis), wa = normWa(b.whatsapp);
      if (nama.length < 2) gagal('Name is required.');
      if (!bisnis) gagal('Business name or type is required.');
      if (k.isLT() && !wa) gagal('WhatsApp number is required for prospects from the launch team.');
      if (b.id_event && !wa) gagal('WhatsApp number is required to invite.');
      if (wa && wa.length < 10) gagal('WhatsApp number is too short.');
      var ada = k.tab('Master').filter(function (r) {
        return (wa && teks(r.whatsapp_norm) === wa) || (x && sama(r.nama, nama) && teks(r.id_kursi) === x.id_kursi);
      })[0];
      if (ada) {
        var info = { nama_depan: namaDepan(ada) };
        if (k.isLT()) { info.tahap = teks(ada.tahap); info.pic = namaDepan(k.orang(ada.PIC)); info.id_orang = teks(ada.id_orang); }
        gagal('This name is already on the chapter list.', { duplikat: info });
      }
      var bagian = nama.split(/\s+/);
      var o = {
        id_orang: idBaru(k.tab('Master'), 'id_orang', 'P', 4),
        nama: nama, nama_depan: bagian[0], whatsapp_norm: wa, email: '', perusahaan: teks(b.perusahaan), bisnis: bisnis,
        id_kursi: x ? x.id_kursi : '', kota: '', sumber: 'app', kategori: 'Calon', tahap: 'Listed', jenis_anggota: '',
        tanggal_bergabung: '', id_sponsor: '', PIC: k.isLT() ? k.saya.id_orang : '', diajukan_oleh: k.saya.id_orang,
        tanggal_masuk: k.now.toISOString(), tanggal_sentuh: k.now.toISOString(), alasan_tidak_lanjut: '', catatan: '',
        terakhir_diubah: k.now.toISOString(), jadwal_cs: ''
      };
      k.tambah('Master', o);
      k._idx = null;
      k.log('tambahCalon', o.nama_depan + ' untuk ' + (x ? x.bidang : 'bidang belum pasti'));
      var hasil = { id_orang: o.id_orang };
      if (b.id_event) hasil.id_undangan = buatUndangan(k, o.id_orang, b.id_event).id_undangan;
      return hasil;
    },

    butuh: function (k, b) {
      var x = kursiById(k, b.id_kursi);
      if (!x) gagal('Seat not found.');
      var ada = k.tab('Butuh').filter(function (r) { return teks(r.id_kursi) === x.id_kursi && teks(r.id_orang) === k.saya.id_orang; })[0];
      if (ada) { k.hapus('Butuh', ada); return { saya_butuh: false }; }
      k.tambah('Butuh', { id_kursi: x.id_kursi, id_orang: k.saya.id_orang, tanggal: k.now.toISOString() });
      return { saya_butuh: true };
    },

    acara: function (k) { return { acara: acaraBerikut(k) }; },

    undang: function (k, b) {
      var calon = k.orang(b.id_orang);
      if (!k.isLT() && calon && teks(calon.diajukan_oleh) !== k.saya.id_orang) gagal('Members can only invite names they added themselves.');
      var wa = normWa(b.whatsapp);
      if (calon && wa && !teks(calon.whatsapp_norm)) {
        if (wa.length < 10) gagal('WhatsApp number is too short.');
        var kembar = k.tab('Master').filter(function (r) { return teks(r.whatsapp_norm) === wa; })[0];
        if (kembar) gagal('This number is already used by ' + namaDepan(kembar) + ' on the chapter list.');
        k.ubah('Master', calon, { whatsapp_norm: wa, terakhir_diubah: k.now.toISOString() });
      }
      return { id_undangan: buatUndangan(k, b.id_orang, b.id_event).id_undangan };
    },

    usulanSaya: function (k) {
      var id = k.saya.id_orang;
      var hitung = {};
      k.undanganAktif().forEach(function (u) { hitung[teks(u.id_orang_calon)] = (hitung[teks(u.id_orang_calon)] || 0) + 1; });
      var acara = {}, terakhir = {};
      k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
      k.undanganAktif().forEach(function (u) { terakhir[teks(u.id_orang_calon)] = u; });
      return {
        usulan: k.tab('Master').filter(function (r) { return teks(r.diajukan_oleh) === id && teks(r.kategori) === 'Calon'; }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          var u = terakhir[teks(r.id_orang)], e = u ? acara[teks(u.id_event)] : null;
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bidang: x ? x.bidang : 'Undecided classification', tahap: teks(r.tahap), punya_wa: !!teks(r.whatsapp_norm), whatsapp: teks(r.whatsapp_norm), bisnis: teks(r.bisnis), jumlah_undangan: hitung[teks(r.id_orang)] || 0,
            jadwal_cs: tgl(r.jadwal_cs) ? tgl(r.jadwal_cs).toISOString() : '', status_undangan: u ? teks(u.status) : '', acara_undangan: e ? teks(e.nama_acara) : '', tanggal_undangan: e && tgl(e.tanggal) ? isoTanggal(tgl(e.tanggal)) : '' };
        }).reverse()
      };
    },

    undanganSaya: function (k) {
      var id = k.saya.id_orang;
      var acara = {};
      k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
      return {
        undangan: k.tab('Undangan').filter(function (u) { return teks(u.id_pengundang) === id; }).map(function (u) {
          var o = k.orang(u.id_orang_calon), e = acara[teks(u.id_event)];
          var x = o ? kursiById(k, o.id_kursi) : null;
          return { id_undangan: teks(u.id_undangan), nama_depan: namaDepan(o), bidang: x ? x.bidang : '', acara: e ? teks(e.nama_acara) : '', tanggal: e && tgl(e.tanggal) ? isoTanggal(tgl(e.tanggal)) : '', status: o && teks(o.tahap) === 'Anggota' ? 'Bergabung' : teks(u.status) };
        }).reverse()
      };
    },

    papan: function (k) {
      var ronde = k.ronde();
      var hitung = {};
      k.undanganAktif().forEach(function (u) {
        var t = tgl(u.tanggal);
        if (t && nomorRonde(t) === ronde && k.orang(teks(u.id_pengundang))) hitung[teks(u.id_pengundang)] = (hitung[teks(u.id_pengundang)] || 0) + 1;
      });
      var sp = {};
      k.anggota().forEach(function (r) {
        var s = teks(r.id_sponsor);
        if (s && s !== 'BNI') sp[s] = (sp[s] || 0) + 1;
      });
      function urut(peta) {
        return Object.keys(peta).map(function (id) { return { nama_depan: namaDepan(k.orang(id)), jumlah: peta[id], saya: id === k.saya.id_orang }; })
          .sort(function (a, b) { return b.jumlah - a.jumlah || (a.nama_depan < b.nama_depan ? -1 : 1); });
      }
      /* Impact Board: sejak awal, per orang. Undangan dan hadir dihitung per tamu unik, bergabung = anggota yang disponsori. */
      var hadirVisitor = {};
      k.tab('Hadir').forEach(function (h) { if (teks(h.peran) === 'Visitor') hadirVisitor[teks(h.id_orang)] = true; });
      var dampak = {};
      function barisDampak(id) { return dampak[id] || (dampak[id] = { u: {}, h: {}, b: 0 }); }
      k.undanganAktif().forEach(function (u) {
        var id = teks(u.id_pengundang), calon = teks(u.id_orang_calon);
        if (!k.orang(id)) return;
        var d = barisDampak(id);
        d.u[calon] = true;
        if (hadirVisitor[calon]) d.h[calon] = true;
      });
      Object.keys(sp).forEach(function (id) { if (k.orang(id)) barisDampak(id).b = sp[id]; });
      var daftarDampak = Object.keys(dampak).map(function (id) {
        var d = dampak[id];
        return { nama_depan: namaDepan(k.orang(id)), undangan: Object.keys(d.u).length, hadir: Object.keys(d.h).length, bergabung: d.b, saya: id === k.saya.id_orang };
      }).filter(function (d) { return d.undangan + d.hadir + d.bergabung > 0; })
        .sort(function (a, b) { return b.bergabung - a.bergabung || b.hadir - a.hadir || b.undangan - a.undangan || (a.nama_depan < b.nama_depan ? -1 : 1); });
      var hasil = { pengundang: urut(hitung).slice(0, 15), sponsor: urut(sp), dampak: daftarDampak };
      if (k.isLT()) {
        hasil.belum_ronde = k.anggota().filter(function (r) { return !hitung[teks(r.id_orang)]; })
          .map(function (r) { return namaDepan(r); }).sort();
      }
      return hasil;
    },

    calonSaya: function (k, b) {
      wajibLT(k);
      var semua = k.isLDC() && b.semua;
      var id = k.saya.id_orang;
      return {
        calon: k.tab('Master').filter(function (r) { return teks(r.kategori) === 'Calon' && TAHAP_LT.indexOf(teks(r.tahap)) >= 0; }).filter(function (r) { return semua || teks(r.PIC) === id || (!teks(r.PIC) && k.isLDC()); }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bisnis: teks(r.bisnis), id_kursi: x ? x.id_kursi : '', bidang: x ? x.bidang : 'Undecided classification', tahap: teks(r.tahap), whatsapp: teks(r.whatsapp_norm), hari_diam: k.hariDiam(r), pic: namaDepan(k.orang(r.PIC)) || 'None yet', jadwal_cs: tgl(r.jadwal_cs) ? tgl(r.jadwal_cs).toISOString() : '', alasan: teks(r.alasan_tidak_lanjut) };
        }).sort(function (a, b) { return b.hari_diam - a.hari_diam; })
      };
    },

    tindakLanjut: function (k, b) {
      wajibLT(k);
      var o = k.orang(b.id_orang);
      if (!o || teks(o.kategori) !== 'Calon') gagal('Prospect not found.');
      var tahap = teks(b.tahap);
      if (TAHAP_LT.indexOf(tahap) < 0) gagal('Unknown stage.');
      if (!k.isLDC() && teks(o.PIC) && teks(o.PIC) !== k.saya.id_orang) gagal('This prospect is handled by ' + namaDepan(k.orang(o.PIC)) + '.');
      var ubah = { tahap: tahap, tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() };
      if (!teks(o.PIC)) ubah.PIC = k.saya.id_orang;
      if (tahap === 'Coffee_Scheduled') {
        var j = tgl(b.jadwal_cs);
        if (!j) gagal('Enter the date and time of the coffee session.');
        ubah.jadwal_cs = j.toISOString();
        lepasSlot(k, o);
        k.tambah('Jadwal_CS', { id_slot: idBaru(k.tab('Jadwal_CS'), 'id_slot', 'S', 4), tanggal: isoTanggal(j), jam: jamWIB(j), PIC: teks(o.PIC) || k.saya.id_orang, tempat: 'Zoom', status: 'Terisi', id_orang: teks(o.id_orang), dipesan_oleh: k.saya.id_orang });
      }
      if (teks(b.id_kursi) && teks(b.id_kursi) !== teks(o.id_kursi)) {
        var kx = kursiById(k, b.id_kursi);
        if (!kx) gagal('Seat not found.');
        if (kx.status === 'terisi') gagal('The ' + kx.bidang + ' seat is already taken by ' + kx.pemilik + '.');
        ubah.id_kursi = kx.id_kursi;
      }
      if (teks(b.catatan)) ubah.catatan = (teks(o.catatan) ? teks(o.catatan) + '\n' : '') + isoTanggal(k.now) + ' ' + k.saya.nama_depan + ': ' + teks(b.catatan);
      if (TAHAP_TUTUP.indexOf(tahap) >= 0 && teks(b.catatan)) ubah.alasan_tidak_lanjut = teks(b.catatan);
      k.ubah('Master', o, ubah);
      k.log('tindakLanjut', namaDepan(o) + ' menjadi ' + tahap);
      return { tahap: tahap };
    },

    regroup: function (k) {
      wajibLT(k);
      var a = k.pengaturan();
      var ronde = k.ronde();
      var lt = k.tab('Akses').filter(function (x) { return (teks(x.peran) === 'LT' || teks(x.peran) === 'LDC') && benar(x.aktif); }).map(function (x) {
        var id = teks(x.id_orang);
        var milik = k.tab('Master').filter(function (r) { return teks(r.diajukan_oleh) === id && teks(r.kategori) === 'Calon'; });
        return {
          nama_depan: namaDepan(k.orang(id)),
          peran: teks(x.peran),
          total: milik.length,
          ronde: milik.filter(function (r) { var t = tgl(r.tanggal_masuk); return t && nomorRonde(t) === ronde; }).length,
          target: a.target_nama_min,
          maks: a.target_nama_maks
        };
      }).sort(function (x, y) { return y.total - x.total; });
      var kosong = 0;
      petaKursi(k).forEach(function (b) { b.kursi.forEach(function (x) { if (x.status === 'kosong') kosong++; }); });
      var founding = k.anggota().filter(function (r) { return teks(r.jenis_anggota) === 'Founding'; }).length;
      var rek = rekomendasiDriver(k);
      var drv = driverAktif(k).map(function (r) {
        var x = kursiById(k, r.id_kursi);
        return { id_orang: teks(r.id_orang), nama: namaTampil(r), tahap: teks(r.tahap), bidang: x ? x.bidang : (teks(r.bisnis) || '') };
      }).sort(function (x, y) { return x.nama < y.nama ? -1 : 1; });
      return {
        founding: { jumlah: founding, target: a.target_founding },
        driver: { jumlah: drv.length, target: a.target_driver, daftar: drv, rekomendasi: rek.filter(function (x) { return x.memenuhi === 3; }), hampir: rek.filter(function (x) { return x.memenuhi === 2; }) },
        lt: lt,
        kursi_tanpa_calon: kosong,
        calon_diam: k.calonAktif().map(function (r) { return { nama: teks(r.nama), pic: namaDepan(k.orang(r.PIC)) || 'None yet', hari: k.hariDiam(r) }; })
          .filter(function (r) { return r.hari >= 7; }).sort(function (x, y) { return y.hari - x.hari; }).slice(0, 10)
      };
    },

    daftarHadir: function (k, b) {
      wajibLT(k);
      var idEv = teks(b.id_event);
      var ev = k.tab('Events').filter(function (e) { return teks(e.id_event) === idEv; })[0];
      if (!ev) gagal('Event not found.');
      var hadir = {};
      k.tab('Hadir').forEach(function (h) { if (teks(h.id_event) === idEv) hadir[teks(h.id_orang)] = true; });
      var orang = [];
      var sudah = {};
      k.undanganAktif().forEach(function (u) {
        if (teks(u.id_event) !== idEv) return;
        var o = k.orang(u.id_orang_calon);
        if (!o || sudah[o.id_orang]) return;
        sudah[o.id_orang] = true;
        orang.push({ id_orang: teks(o.id_orang), nama: teks(o.nama), peran: 'Visitor', pengundang: namaDepan(k.orang(u.id_pengundang)), hadir: !!hadir[teks(o.id_orang)] });
      });
      k.tab('Master').forEach(function (r) {
        var kat = teks(r.kategori);
        if (sudah[r.id_orang]) return;
        if (teks(r.tahap) === 'Anggota' || kat === 'LT' || kat === 'LDC') {
          orang.push({ id_orang: teks(r.id_orang), nama: namaTampil(r), peran: kat === 'LDC' ? 'LDC' : kat === 'LT' ? 'LT' : 'Anggota', pengundang: '', hadir: !!hadir[teks(r.id_orang)] });
        }
      });
      return { acara: { id_event: idEv, nama_acara: teks(ev.nama_acara), tanggal: tgl(ev.tanggal) ? isoTanggal(tgl(ev.tanggal)) : '' }, orang: orang };
    },

    checkin: function (k, b) {
      wajibLT(k);
      var idEv = teks(b.id_event), idO = teks(b.id_orang);
      var o = k.orang(idO);
      if (!o) gagal('Person not found.');
      var ada = k.tab('Hadir').filter(function (h) { return teks(h.id_event) === idEv && teks(h.id_orang) === idO; })[0];
      var und = k.undanganAktif().filter(function (u) { return teks(u.id_event) === idEv && teks(u.id_orang_calon) === idO; });
      if (b.hadir && !ada) {
        var kat = teks(o.kategori);
        var peran = (kat === 'LT' || kat === 'LDC') ? 'LT' : (teks(o.tahap) === 'Anggota' ? 'Anggota' : 'Visitor');
        k.tambah('Hadir', { id_hadir: idBaru(k.tab('Hadir'), 'id_hadir', 'H', 5), id_event: idEv, id_orang: idO, peran: peran, waktu_checkin: k.now.toISOString(), dicatat_oleh: k.saya.id_orang });
        und.forEach(function (u) { k.ubah('Undangan', u, { status: 'Hadir' }); });
        if (peran === 'Visitor' && ['Listed', 'Invited'].indexOf(teks(o.tahap)) >= 0) k.ubah('Master', o, { tahap: 'Attended', tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() });
      } else if (!b.hadir && ada) {
        k.hapus('Hadir', ada);
        und.forEach(function (u) { k.ubah('Undangan', u, { status: 'Diundang' }); });
        if (teks(o.tahap) === 'Attended') k.ubah('Master', o, { tahap: 'Invited', terakhir_diubah: k.now.toISOString() });
      }
      k.log('checkin', namaDepan(o) + (b.hadir ? ' hadir' : ' batal hadir') + ' di ' + idEv);
      return { hadir: !!b.hadir };
    },

    anggota: function (k) {
      wajibLT(k);
      return { anggota: k.anggota().map(function (r) { return { id_orang: teks(r.id_orang), nama: namaTampil(r) }; }).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; }) };
    },

    jadikanAnggota: function (k, b) {
      wajibLT(k);
      var o = k.orang(b.id_orang);
      if (!o) gagal('Person not found.');
      if (teks(o.tahap) === 'Anggota') gagal(namaDepan(o) + ' is already a member.');
      if (timPendiri(o)) gagal('Launch team members are founders, not chapter members.');
      var sp = teks(b.id_sponsor);
      cekSponsor(k, sp);
      var x;
      if (b.kursi_baru) x = buatKursi(k, b.kursi_baru);
      else {
        x = kursiById(k, b.id_kursi || o.id_kursi);
        if (!x) gagal('Choose the classification seat.');
        if (x.status === 'terisi') gagal('The ' + x.bidang + ' seat is already taken by ' + x.pemilik + '.');
      }
      var h = resmikanAnggota(k, o, x, sp);
      k.log('jadikanAnggota', namaDepan(o) + ' di kursi ' + x.bidang + ', sponsor ' + sp);
      return { jenis_anggota: h.jenis_anggota, kursi: x.bidang, akses: { kode: teks(h.akses.kode_akses), aktif: benar(h.akses.aktif) }, whatsapp: teks(o.whatsapp_norm) };
    },

    /* Seat baru dari halaman Seats: hanya untuk member yang sudah join. Member pindah ke seat baru, seat lamanya kosong kembali. */
    tambahKursi: function (k, b) {
      wajibLT(k);
      var o = k.orang(b.id_orang);
      if (!o || teks(o.tahap) !== 'Anggota' || timPendiri(o)) gagal('A new seat can only be added for a member who has joined.');
      var x = buatKursi(k, b.kursi_baru);
      var lama = kursiById(k, o.id_kursi);
      k.ubah('Master', o, { id_kursi: x.id_kursi, terakhir_diubah: k.now.toISOString() });
      k.log('tambahKursi', namaDepan(o) + ' pindah ke ' + x.bidang + (lama ? ', seat lama ' + lama.bidang + ' kosong' : ''));
      return { kursi: x.bidang, seat_lama: lama ? lama.bidang : '' };
    },

    /* ---------- pendaftar Form yang perlu diputuskan LT ---------- */
    perluCek: function (k) {
      wajibLT(k);
      var acara = {};
      k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
      function infoAcara(id) {
        var e = acara[teks(id)];
        if (!e) return null;
        return { id_event: teks(e.id_event), nama_acara: teks(e.nama_acara), jenis: teks(e.jenis), tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: jamEv(e.jam_mulai) };
      }
      var cek = pendaftarPerluCek(k).map(function (r) {
        var c = k.orang(teks(r.id_kandidat));
        var x = c ? kursiById(k, c.id_kursi) : null;
        var t = tgl(r.timestamp);
        return {
          id_response: teks(r.id_response), nama: teks(r.nama), whatsapp: teks(r.whatsapp), bisnis: teks(r.bisnis), perusahaan: teks(r.perusahaan),
          acara: infoAcara(r.id_event), pengundang: namaDepan(k.orang(teks(r.id_pengundang))), waktu: t ? t.toISOString() : '',
          kandidat: c ? { id_orang: teks(c.id_orang), nama: teks(c.nama), bidang: x ? x.bidang : (teks(c.bisnis) || ''), tahap: teks(c.tahap), punya_wa: !!teks(c.whatsapp_norm) } : null
        };
      });
      var tanpa = pendaftarTanpaPengundang(k).map(function (u) {
        var o = k.orang(teks(u.id_orang_calon)) || {};
        var x = kursiById(k, o.id_kursi);
        var t = tgl(u.tanggal);
        return { id_undangan: teks(u.id_undangan), id_orang: teks(o.id_orang), nama: teks(o.nama), bidang: x ? x.bidang : (teks(o.bisnis) || ''), acara: infoAcara(u.id_event), waktu: t ? t.toISOString() : '' };
      });
      return { perlu_cek: cek, tanpa_pengundang: tanpa, jumlah: cek.length + tanpa.length };
    },

    selesaikanCek: function (k, b) {
      wajibLT(k);
      var r = pendaftarPerluCek(k).filter(function (x) { return teks(x.id_response) === teks(b.id_response); })[0];
      if (!r) gagal('This sign-up was already handled or does not exist.');
      var keputusan = teks(b.keputusan);
      if (keputusan !== 'sama' && keputusan !== 'beda') gagal('Choose Same person or Different person.');
      var wa = normWa(r.whatsapp);
      if (wa.length < 10) gagal('This sign-up has no valid WhatsApp number. Fix it in the sheet first.');
      var nama = teks(r.nama);
      if (nama.length < 2) gagal('This sign-up has no name. Fix it in the sheet first.');
      var idEv = teks(r.id_event);
      if (!k.tab('Events').some(function (e) { return teks(e.id_event) === idEv; })) gagal('The event chosen in the form was not found. Fix it in the sheet first.');
      var idPeng = teks(r.id_pengundang);
      var adaNomor = k.tab('Master').filter(function (x) { return teks(x.whatsapp_norm) === wa; })[0];
      var sekarang = k.now.toISOString();
      var idOrang, status;
      if (keputusan === 'sama') {
        var c = k.orang(teks(r.id_kandidat));
        if (!c) gagal('The suggested match was not found. Choose Different person, or fix it in the sheet.');
        if (adaNomor && teks(adaNomor.id_orang) !== teks(c.id_orang)) gagal('This number already belongs to ' + namaDepan(adaNomor) + '. Merge the two rows in the sheet first.');
        var ubah = { whatsapp_norm: wa, tanggal_sentuh: sekarang, terakhir_diubah: sekarang };
        [['email', 'email'], ['perusahaan', 'perusahaan'], ['kota', 'kota'], ['bisnis', 'bisnis']].forEach(function (p) { if (!teks(c[p[0]]) && teks(r[p[1]])) ubah[p[0]] = teks(r[p[1]]); });
        if (teks(c.tahap) === 'Listed') ubah.tahap = 'Invited';
        k.ubah('Master', c, ubah);
        var u = k.undanganAktif().filter(function (x) { return teks(x.id_orang_calon) === teks(c.id_orang) && teks(x.status) === 'Diundang'; })[0];
        if (u) k.ubah('Undangan', u, { status: 'Terdaftar', id_event: idEv });
        else k.tambah('Undangan', { id_undangan: idBaru(k.tab('Undangan'), 'id_undangan', 'U', 4), tanggal: sekarang, id_pengundang: idPeng || teks(c.diajukan_oleh), id_orang_calon: teks(c.id_orang), id_event: idEv, status: 'Terdaftar', sumber: 'form' });
        idOrang = teks(c.id_orang); status = 'Cocok';
      } else {
        if (adaNomor) gagal('This number already belongs to ' + namaDepan(adaNomor) + '. Choose Same person, or merge the rows in the sheet.');
        var bagian = nama.split(/\s+/);
        var o = {
          id_orang: idBaru(k.tab('Master'), 'id_orang', 'P', 4), nama: nama, nama_depan: bagian[0], whatsapp_norm: wa, email: teks(r.email), perusahaan: teks(r.perusahaan), bisnis: teks(r.bisnis),
          id_kursi: '', kota: teks(r.kota), sumber: 'form', kategori: 'Calon', tahap: 'Invited', jenis_anggota: '', tanggal_bergabung: '', id_sponsor: '', PIC: '', diajukan_oleh: idPeng,
          tanggal_masuk: sekarang, tanggal_sentuh: sekarang, alasan_tidak_lanjut: '', catatan: '', terakhir_diubah: sekarang, jadwal_cs: ''
        };
        k.tambah('Master', o);
        k._idx = null;
        k.tambah('Undangan', { id_undangan: idBaru(k.tab('Undangan'), 'id_undangan', 'U', 4), tanggal: sekarang, id_pengundang: idPeng, id_orang_calon: o.id_orang, id_event: idEv, status: 'Terdaftar', sumber: 'form' });
        idOrang = o.id_orang; status = 'Baru';
      }
      k.ubah('Responses', r, { status_cocok: status, id_orang_hasil: idOrang });
      k.log('selesaikanCek', teks(r.id_response) + ' ' + keputusan + ' ' + idOrang);
      return { id_orang: idOrang, status_cocok: status };
    },

    tetapkanPengundang: function (k, b) {
      wajibLT(k);
      var u = pendaftarTanpaPengundang(k).filter(function (x) { return teks(x.id_undangan) === teks(b.id_undangan); })[0];
      if (!u) gagal('This sign-up already has an inviter or does not exist.');
      var id = teks(b.id_pengundang);
      if (id !== 'Walk-in') {
        var o = k.orang(id);
        if (!o || !(teks(o.tahap) === 'Anggota' || teks(o.kategori) === 'LT' || teks(o.kategori) === 'LDC')) gagal('Choose a member or a launch team person.');
      }
      k.ubah('Undangan', u, { id_pengundang: id });
      var calon = k.orang(teks(u.id_orang_calon));
      if (calon && id !== 'Walk-in' && !teks(calon.diajukan_oleh)) k.ubah('Master', calon, { diajukan_oleh: id, terakhir_diubah: k.now.toISOString() });
      k.log('tetapkanPengundang', teks(u.id_undangan) + ' ' + id);
      return { id_pengundang: id };
    },

    /* ---------- riwayat per ronde (hanya membaca, tidak ada yang dihapus) ---------- */
    riwayatRonde: function (k) {
      var acara = {};
      k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
      var per = {};
      function ronde(n) {
        return per[n] || (per[n] = { undangan: {}, pengundang: {}, tamu: { BOD: {}, Lunch: {} }, hadir: { BOD: {}, Lunch: {} }, bergabung: 0 });
      }
      function jenis(e) { var j = teks(e.jenis); return j === 'BOD' ? 'BOD' : j === 'Lunch Networking' ? 'Lunch' : null; }
      k.undanganAktif().forEach(function (u) {
        var t = tgl(u.tanggal), calon = teks(u.id_orang_calon), id = teks(u.id_pengundang);
        if (t) {
          var r = ronde(nomorRonde(t));
          r.undangan[calon] = true;
          if (k.orang(id)) { var p = r.pengundang[id] || (r.pengundang[id] = {}); p[calon] = true; }
        }
        var e = acara[teks(u.id_event)], st = teks(u.status);
        if (e && (st === 'Terdaftar' || st === 'Hadir') && tgl(e.tanggal) && jenis(e)) ronde(nomorRonde(tgl(e.tanggal))).tamu[jenis(e)][calon + '|' + teks(e.id_event)] = true;
      });
      k.tab('Hadir').forEach(function (h) {
        var e = acara[teks(h.id_event)];
        if (teks(h.peran) !== 'Visitor' || !e || !tgl(e.tanggal) || !jenis(e)) return;
        ronde(nomorRonde(tgl(e.tanggal))).hadir[jenis(e)][teks(h.id_orang) + '|' + teks(h.id_event)] = true;
      });
      k.anggota().forEach(function (r) { var t = tgl(r.tanggal_bergabung); if (t) ronde(nomorRonde(t)).bergabung++; });
      var kini = k.ronde();
      var nomor = Object.keys(per).map(Number);
      var awal = nomor.length ? Math.min.apply(null, nomor) : kini;
      var hasil = [];
      for (var n = kini; n >= awal && hasil.length < 26; n--) {
        var r = per[n] || ronde(n);
        var b = batasRonde(n);
        function jml(o) { return Object.keys(o).length; }
        hasil.push({
          nomor: n, mulai: b.mulai.toISOString(), selesai: b.selesai.toISOString(), berjalan: n === kini,
          undangan: jml(r.undangan), tamu_bod: jml(r.tamu.BOD), tamu_lunch: jml(r.tamu.Lunch), hadir_bod: jml(r.hadir.BOD), hadir_lunch: jml(r.hadir.Lunch), bergabung: r.bergabung,
          pengundang: Object.keys(r.pengundang).map(function (id) { return { nama_depan: namaDepan(k.orang(id)), jumlah: jml(r.pengundang[id]), saya: id === k.saya.id_orang }; })
            .sort(function (a, c) { return c.jumlah - a.jumlah || (a.nama_depan < c.nama_depan ? -1 : 1); })
        });
      }
      return { ronde: hasil };
    },

    /* ---------- kontak untuk LT dan LDC: nama, klasifikasi, nomor ---------- */
    kontak: function (k) {
      wajibLT(k);
      function baris(r, jenis) {
        var x = kursiById(k, r.id_kursi);
        return { id_orang: teks(r.id_orang), nama: teks(r.nama), jenis: jenis, tahap: teks(r.tahap), bidang: x ? x.bidang : (teks(r.bisnis) || ''), whatsapp: teks(r.whatsapp_norm) };
      }
      var urut = function (a, b) { return a.nama < b.nama ? -1 : 1; };
      return {
        anggota: k.anggota().map(function (r) { return baris(r, 'Member'); }).sort(urut),
        calon: k.calonAktif().map(function (r) { return baris(r, 'Prospect'); }).sort(urut)
      };
    },

    /* ---------- driver (hanya LT dan LDC) ---------- */
    kandidatDriver: function (k) {
      wajibLT(k);
      var hasil = k.tab('Master').filter(function (r) {
        var t = teks(r.tahap);
        return !timPendiri(r) && (t === 'Anggota' || TAHAP_AKTIF.indexOf(t) >= 0) && teks(r.nama);
      }).map(function (r) {
        var x = kursiById(k, r.id_kursi);
        return { id_orang: teks(r.id_orang), nama: namaTampil(r), tahap: teks(r.tahap), bidang: x ? x.bidang : (teks(r.bisnis) || ''), driver: benar(r.driver) };
      }).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
      return { orang: hasil };
    },

    tandaiDriver: function (k, b) {
      wajibLT(k);
      var o = k.orang(teks(b.id_orang));
      if (!o) gagal('Person not found.');
      var t = teks(o.tahap);
      var aktif = !timPendiri(o) && (t === 'Anggota' || TAHAP_AKTIF.indexOf(t) >= 0);
      var jadi = b.driver === true || b.driver === 'true';
      if (jadi && !aktif) gagal(namaDepan(o) + ' is not an active member or prospect, so cannot be marked as a driver.');
      k.ubah('Master', o, { driver: jadi ? 'TRUE' : '', terakhir_diubah: k.now.toISOString() });
      k.log('tandaiDriver', namaDepan(o) + (jadi ? ' jadi driver' : ' bukan driver'));
      return { driver: jadi };
    },

    /* ---------- People: seluruh orang sejak awal (hanya LDC) ---------- */
    orangSemua: function (k) {
      wajibLDC(k);
      var akses = {};
      k.tab('Akses').forEach(function (a) { akses[teks(a.id_orang)] = a; });
      var diundang = {}, hadir = {};
      k.undanganAktif().forEach(function (u) { var c = teks(u.id_orang_calon); diundang[c] = (diundang[c] || 0) + 1; });
      k.tab('Hadir').forEach(function (h) { var c = teks(h.id_orang); hadir[c] = (hadir[c] || 0) + 1; });
      var orang = k.tab('Master').filter(function (r) { return teks(r.nama); }).map(function (r) {
        var t = teks(r.tahap), kat = teks(r.kategori);
        var jenis = timPendiri(r) ? kat : (t === 'Anggota' ? 'Member' : (TAHAP_TUTUP.indexOf(t) >= 0 ? 'Closed' : 'Prospect'));
        var x = kursiById(k, r.id_kursi);
        var a = akses[teks(r.id_orang)];
        var sp = teks(r.id_sponsor);
        return {
          id_orang: teks(r.id_orang), nama: namaTampil(r), jenis: jenis, tahap: t, bidang: x ? x.bidang : (teks(r.bisnis) || ''),
          whatsapp: teks(r.whatsapp_norm), sumber: teks(r.sumber),
          sponsor: sp === 'BNI' ? 'BNI' : namaDepan(k.orang(sp)), diajukan: namaDepan(k.orang(r.diajukan_oleh)), pic: namaDepan(k.orang(r.PIC)),
          masuk: teks(r.tanggal_masuk), bergabung: teks(r.tanggal_bergabung),
          undangan: diundang[teks(r.id_orang)] || 0, hadir: hadir[teks(r.id_orang)] || 0,
          kode: a ? (benar(a.aktif) ? 'aktif' : 'nonaktif') : (peranUntuk(r) ? 'belum' : '')
        };
      });
      return { orang: orang, setelah_esm: setelahEsm(k) };
    },

    orangDetail: function (k, b) {
      wajibLDC(k);
      var o = k.orang(b.id_orang);
      if (!o) gagal('Person not found.');
      var id = teks(o.id_orang);
      var acara = {};
      k.tab('Events').forEach(function (e) { acara[teks(e.id_event)] = e; });
      function labelAcara(idE) {
        var e = acara[teks(idE)];
        return e ? (teks(e.jenis) === 'BOD' ? 'BOD' : 'Lunch') + ' ' + (e.tanggal instanceof Date ? isoTanggal(e.tanggal) : teks(e.tanggal).slice(0, 10)) : teks(idE);
      }
      var x = kursiById(k, o.id_kursi);
      var sp = teks(o.id_sponsor);
      var mengundang = k.undanganAktif().filter(function (u) { return teks(u.id_pengundang) === id; });
      var hadirVisitor = {};
      k.tab('Hadir').forEach(function (h) { if (teks(h.peran) === 'Visitor') hadirVisitor[teks(h.id_orang)] = true; });
      return {
        orang: {
          id_orang: id, nama: namaTampil(o), nama_depan: namaPanggil(o), jenis: timPendiri(o) ? teks(o.kategori) : (teks(o.tahap) === 'Anggota' ? 'Member' : 'Prospect'),
          tahap: teks(o.tahap), id_kursi: teks(o.id_kursi), bidang: x ? x.bidang : '', bisnis: teks(o.bisnis), perusahaan: teks(o.perusahaan),
          whatsapp: teks(o.whatsapp_norm), sumber: teks(o.sumber), jenis_anggota: teks(o.jenis_anggota),
          id_sponsor: sp, sponsor: sp === 'BNI' ? 'BNI' : namaDepan(k.orang(sp)), diajukan: namaDepan(k.orang(o.diajukan_oleh)), pic: namaDepan(k.orang(o.PIC)),
          masuk: teks(o.tanggal_masuk), bergabung: teks(o.tanggal_bergabung), jadwal_cs: teks(o.jadwal_cs), catatan: teks(o.catatan), alasan: teks(o.alasan_tidak_lanjut),
          driver: benar(o.driver)
        },
        akses: infoAkses(aksesOrang(k, id)),
        bisa_akses: !!peranUntuk(o),
        diundang_ke: k.undanganAktif().filter(function (u) { return teks(u.id_orang_calon) === id; }).map(function (u) {
          return { acara: labelAcara(u.id_event), status: teks(u.status), oleh: namaDepan(k.orang(u.id_pengundang)) || 'No inviter', tanggal: teks(u.tanggal) };
        }),
        hadir: k.tab('Hadir').filter(function (h) { return teks(h.id_orang) === id; }).map(function (h) {
          return { acara: labelAcara(h.id_event), peran: teks(h.peran), waktu: teks(h.waktu_checkin) };
        }),
        wawancara: k.tab('Wawancara').filter(function (w) { return teks(w.id_orang) === id; }).map(function (w) {
          return { tanggal: teks(w.tanggal), kanal: teks(w.kanal), hasil: teks(w.hasil), pic: namaDepan(k.orang(w.PIC)) };
        }),
        mengundang: { jumlah: mengundang.length, tamu_hadir: mengundang.filter(function (u) { return hadirVisitor[teks(u.id_orang_calon)]; }).length },
        kehadiran: kehadiranOrang(k, o)
      };
    },

    /* LT baru, atau member yang masuk langsung dari luar chapter (bukan lewat LDC, LT, atau member) */
    tambahOrang: function (k, b) {
      wajibLDC(k);
      var jenis = teks(b.jenis);
      if (jenis !== 'LT' && jenis !== 'Anggota') gagal('Choose what to add: a launch team member or a member.');
      var nama = teks(b.nama), wa = normWa(b.whatsapp);
      if (nama.length < 2) gagal('Name is required.');
      if (!wa) gagal('WhatsApp number is required.');
      if (wa.length < 10) gagal('WhatsApp number is too short.');
      var ada = k.tab('Master').filter(function (r) { return teks(r.whatsapp_norm) === wa; })[0];
      if (ada) gagal(namaDepan(ada) + ' is already on the list with this number. Open that person to change the status.');
      var o = {
        id_orang: idBaru(k.tab('Master'), 'id_orang', 'P', 4),
        nama: nama, nama_depan: nama.split(/\s+/)[0], whatsapp_norm: wa, email: '', perusahaan: teks(b.perusahaan), bisnis: teks(b.bisnis),
        id_kursi: '', kota: '', sumber: jenis === 'LT' ? 'LDC' : 'Luar chapter', kategori: jenis === 'LT' ? 'LT' : 'Calon', tahap: '', jenis_anggota: '',
        tanggal_bergabung: '', id_sponsor: '', PIC: k.saya.id_orang, diajukan_oleh: '',
        tanggal_masuk: k.now.toISOString(), tanggal_sentuh: k.now.toISOString(), alasan_tidak_lanjut: '', catatan: teks(b.catatan),
        terakhir_diubah: k.now.toISOString(), jadwal_cs: ''
      };
      var x = null, sp = '';
      if (jenis === 'Anggota') {
        sp = teks(b.id_sponsor) || 'BNI';
        cekSponsor(k, sp);
        if (b.kursi_baru) x = buatKursi(k, b.kursi_baru);
        else {
          x = kursiById(k, b.id_kursi);
          if (!x) gagal('Choose the classification seat.');
          if (x.status === 'terisi') gagal('The ' + x.bidang + ' seat is already taken by ' + x.pemilik + '.');
        }
        if (!o.bisnis) o.bisnis = x.bidang;
      }
      k.tambah('Master', o);
      k._idx = null;
      var akses;
      if (jenis === 'LT') {
        akses = pastikanAkses(k, o, true);
        k.log('tambahOrang', 'LT baru: ' + o.nama_depan);
      } else {
        akses = resmikanAnggota(k, o, x, sp).akses;
        k.log('tambahOrang', 'member dari luar chapter: ' + o.nama_depan + ' di kursi ' + x.bidang + ', sponsor ' + sp);
      }
      return { id_orang: o.id_orang, akses: infoAkses(akses), whatsapp: wa, nama_depan: o.nama_depan };
    },

    ubahOrang: function (k, b) {
      wajibLDC(k);
      var o = k.orang(b.id_orang);
      if (!o) gagal('Person not found.');
      var ubah = {};
      if (b.nama !== undefined) {
        var nama = teks(b.nama);
        if (nama.length < 2) gagal('Name is required.');
        if (nama !== teks(o.nama)) {
          ubah.nama = nama;
          if (!teks(o.nama_depan) || teks(o.nama_depan) === teks(o.nama).split(/\s+/)[0]) ubah.nama_depan = nama.split(/\s+/)[0];
        }
      }
      if (b.whatsapp !== undefined) {
        var wa = normWa(b.whatsapp);
        if (wa && wa.length < 10) gagal('WhatsApp number is too short.');
        var dobel = wa && k.tab('Master').filter(function (r) { return r !== o && teks(r.whatsapp_norm) === wa; })[0];
        if (dobel) gagal('That number belongs to ' + namaDepan(dobel) + '.');
        ubah.whatsapp_norm = wa;
      }
      if (b.bisnis !== undefined) ubah.bisnis = teks(b.bisnis);
      if (b.perusahaan !== undefined) ubah.perusahaan = teks(b.perusahaan);
      if (b.catatan !== undefined) ubah.catatan = teks(b.catatan);
      if (b.kursi_baru) {
        if (teks(o.tahap) !== 'Anggota' || timPendiri(o)) gagal('A new seat can only be added for a member who has joined.');
        ubah.id_kursi = buatKursi(k, b.kursi_baru).id_kursi;
      } else if (b.id_kursi !== undefined && teks(b.id_kursi) !== teks(o.id_kursi)) {
        if (timPendiri(o)) gagal('Launch team members do not take a seat.');
        var x = kursiById(k, b.id_kursi);
        if (!x) gagal('Seat not found.');
        if (x.status === 'terisi') gagal('The ' + x.bidang + ' seat is already taken by ' + x.pemilik + '.');
        ubah.id_kursi = x.id_kursi;
      }
      if (b.id_sponsor !== undefined && teks(b.id_sponsor) !== teks(o.id_sponsor)) {
        if (teks(o.tahap) !== 'Anggota') gagal('Only members have a sponsor.');
        if (teks(b.id_sponsor) === teks(o.id_orang)) gagal('A member cannot sponsor themselves.');
        cekSponsor(k, teks(b.id_sponsor));
        ubah.id_sponsor = teks(b.id_sponsor);
      }
      ubah.terakhir_diubah = k.now.toISOString();
      k.ubah('Master', o, ubah);
      k.log('ubahOrang', namaDepan(o) + ': ' + Object.keys(ubah).filter(function (z) { return z !== 'terakhir_diubah'; }).join(', '));
      return { id_orang: teks(o.id_orang) };
    },

    /* Kode akses: buat, buat ulang (kode lama mati), matikan, hidupkan */
    aturAkses: function (k, b) {
      wajibLDC(k);
      var o = k.orang(b.id_orang);
      if (!o) gagal('Person not found.');
      if (teks(o.id_orang) === k.saya.id_orang) gagal('Your own access cannot be changed here.');
      var tindakan = teks(b.tindakan);
      var a = aksesOrang(k, o.id_orang);
      if (tindakan === 'buat') {
        if (a) gagal(namaDepan(o) + ' already has a code.');
        a = pastikanAkses(k, o, true);
      } else if (!a) {
        gagal(namaDepan(o) + ' has no code yet.');
      } else if (tindakan === 'ulang') {
        k.ubah('Akses', a, { kode_akses: kodeBaru(k), aktif: 'TRUE' });
      } else if (tindakan === 'matikan') {
        k.ubah('Akses', a, { aktif: 'FALSE' });
      } else if (tindakan === 'hidupkan') {
        k.ubah('Akses', a, { aktif: 'TRUE' });
      } else {
        gagal('Unknown action.');
      }
      k.log('aturAkses', namaDepan(o) + ': ' + tindakan);
      return { akses: infoAkses(a) };
    },

    /* Setelah ESM: hidupkan kode semua member (dan buat yang belum punya) */
    aktifkanKodeAnggota: function (k) {
      wajibLDC(k);
      var n = 0;
      k.anggota().forEach(function (r) {
        var a = aksesOrang(k, r.id_orang);
        if (!a) { pastikanAkses(k, r, true); n++; }
        else if (!benar(a.aktif)) { k.ubah('Akses', a, { aktif: 'TRUE' }); n++; }
      });
      k.log('aktifkanKodeAnggota', n + ' kode');
      return { jumlah: n };
    },

    /* LDC mengganti kodenya sendiri. Kode lama harus diketik ulang. */
    gantiKodeSaya: function (k, b) {
      wajibLDC(k);
      var lama = teks(b.kode_lama).toUpperCase();
      var baru = teks(b.kode_baru).toUpperCase();
      if (!k.saya.akses || teks(k.saya.akses.kode_akses).toUpperCase() !== lama) gagal('The current code is not correct.');
      if (!/^[A-Z0-9]{6,8}$/.test(baru)) gagal('Use 6 to 8 letters or digits, without spaces or symbols.');
      if (baru === lama) gagal('The new code must be different from the current one.');
      var jenis = {};
      baru.split('').forEach(function (c) { jenis[c] = true; });
      if (Object.keys(jenis).length < 4 || /^(0123456|1234567|12345678|123456|234567|345678|456789|654321|987654)$/.test(baru) || /^(LDC|LT|AGT)\d+$/.test(baru) || /^(PASSWORD|BNIOPTIMA|OPTIMA\d*)$/.test(baru)) gagal('That code is too easy to guess. Mix letters and digits.');
      var dipakai = k.tab('Akses').some(function (a) { return teks(a.kode_akses).toUpperCase() === baru; });
      if (dipakai) gagal('That code is already in use. Choose another.');
      k.ubah('Akses', k.saya.akses, { kode_akses: baru });
      k.log('gantiKodeSaya', 'kode LDC diganti');
      return { panjang: baru.length };
    },

    /* Keadaan darurat (kode bocor, banyak yang lupa): semua kode lain diganti, kode lama mati. Status aktif tidak berubah. */
    ulangSemuaKode: function (k, b) {
      wajibLDC(k);
      if (teks(b.konfirmasi).toUpperCase() !== 'RESET') gagal('Type RESET to confirm.');
      var hasil = [];
      k.tab('Akses').slice().forEach(function (a) {
        if (teks(a.id_orang) === k.saya.id_orang) return;
        var o = k.orang(a.id_orang);
        var kode = kodeBaru(k);
        k.ubah('Akses', a, { kode_akses: kode });
        hasil.push({ id_orang: teks(a.id_orang), nama: o ? namaTampil(o) : teks(a.id_orang), nama_depan: o ? namaPanggil(o) : '', peran: teks(a.peran), whatsapp: o ? teks(o.whatsapp_norm) : '', kode: kode, aktif: benar(a.aktif) });
      });
      hasil.sort(function (x, y) { return x.nama < y.nama ? -1 : 1; });
      k.log('ulangSemuaKode', hasil.length + ' kode');
      return { daftar: hasil };
    },

    /* ---------- Settings (hanya LDC) ---------- */
    bacaPengaturan: function (k) {
      wajibLDC(k);
      var a = k.pengaturan();
      return { pengaturan: PENGATURAN_BISA.map(function (kunci) { return { kunci: kunci, nilai: teks(a[kunci]), contoh: PENGATURAN_CONTOH[kunci] || '' }; }), fase_boleh: FASE_BOLEH };
    },

    ubahPengaturan: function (k, b) {
      wajibLDC(k);
      var kunci = teks(b.kunci);
      if (PENGATURAN_BISA.indexOf(kunci) < 0) gagal('This setting cannot be changed here.');
      var nilai = teks(b.nilai);
      if (kunci === 'fase' && FASE_BOLEH.indexOf(nilai) < 0) gagal('Unknown phase.');
      if (/^(tanggal_esm|tanggal_grand_launch)$/.test(kunci) && nilai && !/^\d{4}-\d{2}-\d{2}$/.test(nilai)) gagal('Use the date format YYYY-MM-DD.');
      if (/^(target_|driver_)/.test(kunci) && (!/^\d{1,3}$/.test(nilai) || Number(nilai) < 1)) gagal('Enter a whole number.');
      if (/^tautan_/.test(kunci) && nilai && !/^https:\/\/[^\s]{4,480}$/i.test(nilai)) gagal('The link must start with https://');
      var baris = k.tab('Pengaturan').filter(function (r) { return teks(r.kunci) === kunci; })[0];
      if (baris) k.ubah('Pengaturan', baris, { nilai: nilai });
      else k.tambah('Pengaturan', { kunci: kunci, nilai: nilai });
      k._atur = null;
      k.log('ubahPengaturan', kunci + ' = ' + nilai);
      return { kunci: kunci, nilai: nilai };
    },

    /* ---------- Data viewer: baca saja (hanya LDC) ---------- */
    lihatTab: function (k, b) {
      wajibLDC(k);
      var nama = teks(b.tab);
      if (TAB_LIHAT.indexOf(nama) < 0) gagal('This tab cannot be viewed here.');
      var baris = k.tab(nama);
      var kolom = baris.length ? Object.keys(baris[0]) : [];
      var nilai = function (v) { return v instanceof Date ? v.toISOString() : teks(v).slice(0, 200); };
      return {
        tab: nama, total: baris.length, kolom: kolom,
        baris: baris.slice(-150).reverse().map(function (r) { return kolom.map(function (c) { return nilai(r[c]); }); })
      };
    },

    /* ---------- pengumuman dan info acara ---------- */
    pengumuman: function (k) {
      return {
        pengumuman: pengumumanAktif(k).map(function (r) {
          var akhir = tgl(r.tanggal_berakhir);
          var tayang = tgl(r.tanggal_tayang);
          return {
            id_pengumuman: teks(r.id_pengumuman), judul: teks(r.judul), isi: teks(r.isi), poster: teks(r.poster),
            tanggal_tayang: tayang ? tayang.toISOString() : '', tanggal_berakhir: akhir ? isoTanggal(akhir) : '',
            oleh: namaDepan(k.orang(r.dibuat_oleh)) || 'Launch team'
          };
        })
      };
    },

    tulisPengumuman: function (k, b) {
      wajibLT(k);
      var judul = teks(b.judul), isi = teks(b.isi);
      if (!judul) gagal('Write a title.');
      if (judul.length > 80) gagal('The title is too long (80 characters at most).');
      if (!isi) gagal('Write the announcement text.');
      if (isi.length > 1000) gagal('The text is too long (1000 characters at most).');
      var poster = tautanAman(b.poster);
      var akhir = teks(b.tanggal_berakhir);
      if (akhir && !/^\d{4}-\d{2}-\d{2}$/.test(akhir)) gagal('The end date is not valid.');
      if (akhir && akhir < isoTanggal(k.now)) gagal('The end date is already past.');
      var id = teks(b.id_pengumuman);
      if (id) {
        var r = k.tab('Pengumuman').filter(function (x) { return teks(x.id_pengumuman) === id && teks(x.status) !== 'Dihapus'; })[0];
        if (!r) gagal('Announcement not found.');
        k.ubah('Pengumuman', r, { judul: judul, isi: isi, poster: poster, tanggal_berakhir: akhir });
        k.log('tulisPengumuman', 'ubah ' + id);
        return { id_pengumuman: id };
      }
      id = idBaru(k.tab('Pengumuman'), 'id_pengumuman', 'A', 4);
      k.tambah('Pengumuman', { id_pengumuman: id, tanggal_tayang: k.now.toISOString(), tanggal_berakhir: akhir, judul: judul, isi: isi, poster: poster, dibuat_oleh: k.saya.id_orang, status: 'Aktif' });
      k.log('tulisPengumuman', 'baru ' + id + ': ' + judul);
      return { id_pengumuman: id };
    },

    hapusPengumuman: function (k, b) {
      wajibLT(k);
      var id = teks(b.id_pengumuman);
      var r = k.tab('Pengumuman').filter(function (x) { return teks(x.id_pengumuman) === id && teks(x.status) !== 'Dihapus'; })[0];
      if (!r) gagal('Announcement not found.');
      k.ubah('Pengumuman', r, { status: 'Dihapus' });
      k.log('hapusPengumuman', id);
      return {};
    },

    ubahAcara: function (k, b) {
      wajibLT(k);
      var e = k.tab('Events').filter(function (x) { return teks(x.id_event) === teks(b.id_event); })[0];
      if (!e) gagal('Event not found.');
      var ubah = {};
      if (b.pembicara !== undefined) {
        var pembicara = teks(b.pembicara);
        if (pembicara.length > 120) gagal('The speaker line is too long (120 characters at most).');
        ubah.pembicara = pembicara;
      }
      if (b.poster !== undefined) ubah.poster = tautanAman(b.poster);
      if (b.tanggal !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(teks(b.tanggal)) || !tgl(b.tanggal)) gagal('Enter the date.');
        ubah.tanggal = teks(b.tanggal);
      }
      ['jam_mulai', 'jam_selesai'].forEach(function (f) {
        if (b[f] === undefined) return;
        var v = teks(b[f]);
        if (v && !/^\d{2}:\d{2}$/.test(v)) gagal('Use the time format HH:MM.');
        ubah[f] = v;
      });
      if (b.jam_mulai !== undefined || b.jam_selesai !== undefined) {
        var m = ubah.jam_mulai !== undefined ? ubah.jam_mulai : jamEv(e.jam_mulai), sl = ubah.jam_selesai !== undefined ? ubah.jam_selesai : jamEv(e.jam_selesai);
        if (!m) gagal('Enter the start time.');
        if (sl && sl <= m) gagal('The end time must be after the start time.');
      }
      if (b.mode !== undefined) ubah.mode = teks(b.mode) === 'Online' ? 'Online' : 'Onsite';
      if (b.lokasi !== undefined) ubah.lokasi = teks(b.lokasi).slice(0, 120);
      if (b.status !== undefined) {
        if (['Terbuka', 'Batal'].indexOf(teks(b.status)) < 0) gagal('Unknown status.');
        ubah.status = teks(b.status);
      }
      k.ubah('Events', e, ubah);
      k.log('ubahAcara', teks(e.id_event) + ': ' + Object.keys(ubah).join(', '));
      return { pembicara: teks(e.pembicara), poster: teks(e.poster), status: teks(e.status) };
    },

    /* LT dan LDC menambah jadwal: BOD, Lunch Networking, ESM, atau lainnya; bisa diulang tiap pekan (sampai 12 kali). */
    tambahAcara: function (k, b) {
      wajibLT(k);
      var JENIS = ['BOD', 'Lunch Networking', 'ESM', 'Other'];
      var jenis = teks(b.jenis);
      if (JENIS.indexOf(jenis) < 0) gagal('Choose the event type.');
      var tanggal = teks(b.tanggal), awal = /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? tgl(tanggal) : null;
      if (!awal) gagal('Enter the date.');
      if (awal < new Date(k.now.getTime() - 60 * HARI) || awal > new Date(k.now.getTime() + 800 * HARI)) gagal('That date is too far from today. Check the year.');
      var mulai = teks(b.jam_mulai), selesai = teks(b.jam_selesai);
      if (!/^\d{2}:\d{2}$/.test(mulai)) gagal('Enter the start time.');
      if (selesai && !/^\d{2}:\d{2}$/.test(selesai)) gagal('Use the time format HH:MM.');
      if (selesai && selesai <= mulai) gagal('The end time must be after the start time.');
      var nama = jenis === 'Other' ? teks(b.nama_acara) : jenis;
      if (!nama) gagal('Name the event.');
      if (nama.length > 80) gagal('The event name is too long (80 characters at most).');
      var mode = teks(b.mode) === 'Online' ? 'Online' : 'Onsite';
      var lokasi = teks(b.lokasi).slice(0, 120);
      var kap = parseInt(b.kapasitas, 10);
      var ulang = Math.min(Math.max(parseInt(b.ulang, 10) || 1, 1), 12);
      var ada = {};
      k.tab('Events').forEach(function (e) { if (teks(e.status) !== 'Batal' && tgl(e.tanggal)) ada[teks(e.jenis) + '|' + isoTanggal(tgl(e.tanggal)) + '|' + jamEv(e.jam_mulai)] = true; });
      var dibuat = [], dilewati = 0;
      for (var i = 0; i < ulang; i++) {
        var hari = isoTanggal(new Date(awal.getTime() + 7 * i * HARI));
        if (ada[jenis + '|' + hari + '|' + mulai]) { dilewati++; continue; }
        var ev = { id_event: idBaru(k.tab('Events'), 'id_event', 'E', 4), tanggal: hari, jam_mulai: mulai, jam_selesai: selesai, nama_acara: nama, jenis: jenis, mode: mode, lokasi: lokasi, kapasitas: isNaN(kap) ? '' : kap, status: 'Terbuka', tampil_di_form: 'TRUE', pembicara: '', poster: '' };
        k.tambah('Events', ev);
        dibuat.push(ev.id_event);
      }
      k.log('tambahAcara', nama + ' ' + tanggal + ' x' + dibuat.length + (dilewati ? ', ' + dilewati + ' sudah ada' : ''));
      return { dibuat: dibuat.length, dilewati: dilewati, id_event: dibuat[0] || '' };
    },

    /* Acara untuk absen: dua pekan ke depan dan tiga pekan ke belakang, supaya absen yang terlambat tetap bisa dicatat. */
    acaraCheckin: function (k) {
      wajibLT(k);
      var dari = isoTanggal(new Date(k.now.getTime() - 21 * HARI)), sampai = isoTanggal(new Date(k.now.getTime() + 14 * HARI));
      var jumlah = {};
      k.tab('Hadir').forEach(function (h) { jumlah[teks(h.id_event)] = (jumlah[teks(h.id_event)] || 0) + 1; });
      return {
        hari_ini: isoTanggal(k.now),
        acara: k.tab('Events').filter(function (e) {
          var t = tgl(e.tanggal);
          return t && teks(e.status) !== 'Batal' && isoTanggal(t) >= dari && isoTanggal(t) <= sampai;
        }).map(function (e) {
          return { id_event: teks(e.id_event), tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: jamEv(e.jam_mulai), jam_selesai: jamEv(e.jam_selesai), nama_acara: teks(e.nama_acara), jenis: teks(e.jenis), hadir: jumlah[teks(e.id_event)] || 0 };
        }).sort(function (a, b) { return (a.tanggal + a.jam_mulai) < (b.tanggal + b.jam_mulai) ? -1 : 1; })
      };
    },

    tamuPekanIni: function (k) {
      var n = k.ronde();
      var acara = {};
      k.tab('Events').forEach(function (e) {
        var t = tgl(e.tanggal);
        if (t && nomorRonde(t) === n && teks(e.status) !== 'Batal') acara[teks(e.id_event)] = e;
      });
      var sudah = {};
      var tamu = [];
      k.undanganAktif().forEach(function (u) {
        var e = acara[teks(u.id_event)];
        var st = teks(u.status);
        if (!e || (st !== 'Terdaftar' && st !== 'Hadir')) return;
        var o = k.orang(u.id_orang_calon);
        if (!o) return;
        var kunci = teks(o.id_orang) + '|' + teks(e.id_event);
        if (sudah[kunci]) return;
        sudah[kunci] = true;
        var x = kursiById(k, o.id_kursi);
        tamu.push({
          nama: teks(o.nama), bidang: x ? x.bidang : (teks(o.bisnis) || 'Undecided classification'), sphere: x ? x.sphere : '',
          pengundang: namaDepan(k.orang(u.id_pengundang)), saya: teks(u.id_pengundang) === k.saya.id_orang, acara: teks(e.nama_acara), jenis: teks(e.jenis),
          tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: jamEv(e.jam_mulai), status: st, bergabung: teks(o.tahap) === 'Anggota'
        });
      });
      var r = batasRonde(n);
      var acaraRonde = Object.keys(acara).map(function (id) {
        var e = acara[id];
        return { id_event: id, tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: jamEv(e.jam_mulai), jam_selesai: jamEv(e.jam_selesai), nama_acara: teks(e.nama_acara), jenis: teks(e.jenis), mode: teks(e.mode), lokasi: teks(e.lokasi), pembicara: teks(e.pembicara), poster: teks(e.poster) };
      }).sort(function (a, b) { return (a.tanggal + a.jam_mulai) < (b.tanggal + b.jam_mulai) ? -1 : 1; });
      return { ronde: { mulai: r.mulai.toISOString(), selesai: r.selesai.toISOString() }, acara_ronde: acaraRonde, tamu: tamu.sort(function (a, b) { return (a.tanggal + a.jam_mulai + a.nama) < (b.tanggal + b.jam_mulai + b.nama) ? -1 : 1; }) };
    },

    jadwalCS: function (k) {
      wajibLT(k);
      var batas = new Date(k.now.getTime() - 12 * JAM);
      return {
        cs: k.tab('Master').filter(function (r) { var j = tgl(r.jadwal_cs); return teks(r.tahap) === 'Coffee_Scheduled' && j && j >= batas; }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bidang: x ? x.bidang : 'Undecided classification', pic: namaDepan(k.orang(r.PIC)) || 'None yet', jadwal_cs: tgl(r.jadwal_cs).toISOString(), whatsapp: teks(r.whatsapp_norm) };
        }).sort(function (a, b) { return a.jadwal_cs < b.jadwal_cs ? -1 : 1; })
      };
    },

    /* ---------- jadwal coffee session (slot) ----------
       LT dan LDC membuka jam kosong. Anggota memesan jam kosong untuk calon miliknya sendiri,
       LT boleh untuk semua calon dan boleh memakai jam di luar slot. */
    slotCS: function (k, b) {
      var lt = k.isLT(), id = k.saya.id_orang;
      var dari = new Date(k.now.getTime() - (lt ? 3 * HARI : 0)), sampai = new Date(k.now.getTime() + 28 * HARI);
      var slot = k.tab('Jadwal_CS').filter(function (r) {
        var w = waktuSlot(r);
        if (!w || w < dari || w > sampai || teks(r.status) === 'Batal') return false;
        if (lt) return true;
        if (teks(r.status) === 'Kosong') return w > k.now;
        var o = k.orang(r.id_orang);
        return o && teks(o.diajukan_oleh) === id;
      }).map(function (r) {
        var o = k.orang(r.id_orang), x = o ? kursiById(k, o.id_kursi) : null;
        var h = { id_slot: teks(r.id_slot), waktu: waktuSlot(r).toISOString(), tanggal: isoTanggal(tgl(r.tanggal) || waktuSlot(r)), jam: teks(r.jam), tempat: teks(r.tempat) || 'Zoom', pic: namaDepan(k.orang(r.PIC)), pic_id: teks(r.PIC), pic_ldc: perannya(k, r.PIC) === 'LDC', status: teks(r.status),
          pendamping: daftarPendamping(r).map(function (x) { return namaDepan(k.orang(x)); }) };
        if (lt) { h.saya_dampingi = daftarPendamping(r).indexOf(id) >= 0; h.boleh_hapus = k.isLDC() || teks(r.PIC) === id; }
        if (o) {
          h.id_orang = teks(o.id_orang); h.nama = teks(o.nama); h.tahap = teks(o.tahap); h.bisnis = teks(o.bisnis);
          if (lt) { h.bidang = x ? x.bidang : (teks(o.bisnis) || 'Undecided classification'); h.whatsapp = teks(o.whatsapp_norm); h.pengundang = namaDepan(k.orang(r.dipesan_oleh || o.diajukan_oleh)); }
        }
        return h;
      }).sort(function (a, c) { return a.waktu < c.waktu ? -1 : 1; });
      var hasil = { slot: slot };
      if (lt) {
        hasil.pewawancara = k.tab('Akses').filter(function (x) { return (teks(x.peran) === 'LT' || teks(x.peran) === 'LDC') && benar(x.aktif); }).map(function (x) { return { id_orang: teks(x.id_orang), nama_depan: namaDepan(k.orang(x.id_orang)), peran: teks(x.peran) }; });
        // coffee session yang sudah lewat tetapi belum diberi hasil
        hasil.perlu_hasil = k.tab('Master').filter(function (r) { var j = tgl(r.jadwal_cs); return teks(r.tahap) === 'Coffee_Scheduled' && j && j < k.now; }).map(function (r) {
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), waktu: tgl(r.jadwal_cs).toISOString(), pic: namaDepan(k.orang(r.PIC)) };
        });
      }
      return hasil;
    },

    tambahSlot: function (k, b) {
      wajibLT(k);
      var tanggal = teks(b.tanggal), jam = [].concat(b.jam || []).map(teks).filter(Boolean);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) gagal('Choose a date.');
      if (!jam.length) gagal('Choose at least one time.');
      var pic = teks(b.pic) || k.saya.id_orang;
      if (!k.isLDC() && pic !== k.saya.id_orang) gagal('Only Coach Dedy can open times for someone else.');
      var dampingi = [].concat(b.pendamping || []).map(teks).filter(function (x) { return x && x !== pic; });
      var dibuat = 0;
      jam.forEach(function (j) {
        if (!/^\d{2}:\d{2}$/.test(j)) gagal('Time format is HH:MM.');
        var w = tgl(tanggal + 'T' + j + ':00+07:00');
        if (w <= k.now) gagal(j + ' on that date has already passed.');
        var ada = k.tab('Jadwal_CS').some(function (r) { return teks(r.PIC) === pic && teks(r.status) !== 'Batal' && waktuSlot(r) && waktuSlot(r).getTime() === w.getTime(); });
        if (ada) return;
        k.tambah('Jadwal_CS', { id_slot: idBaru(k.tab('Jadwal_CS'), 'id_slot', 'S', 4), tanggal: tanggal, jam: j, PIC: pic, tempat: teks(b.tempat) || 'Zoom', status: 'Kosong', id_orang: '', dipesan_oleh: '', pendamping: dampingi.join(',') });
        dibuat++;
      });
      k.log('tambahSlot', dibuat + ' jam ' + tanggal);
      return { dibuat: dibuat };
    },

    hapusSlot: function (k, b) {
      wajibLT(k);
      var r = slotById(k, b.id_slot);
      if (!k.isLDC() && teks(r.PIC) !== k.saya.id_orang) gagal('Only the interviewer or Coach Dedy can remove this time.');
      if (teks(r.status) !== 'Kosong') gagal('This time is booked. Cancel the booking first.');
      k.ubah('Jadwal_CS', r, { status: 'Batal' });
      return { ok: true };
    },

    // LT ikut mendampingi (atau batal mendampingi) sebuah jam coffee session
    dampingiSlot: function (k, b) {
      wajibLT(k);
      var r = slotById(k, b.id_slot), id = k.saya.id_orang;
      if (teks(r.PIC) === id) gagal('You are the interviewer for this time.');
      var d = daftarPendamping(r).filter(function (x) { return x !== id; });
      if (benar(b.ikut)) d.push(id);
      k.ubah('Jadwal_CS', r, { pendamping: d.join(',') });
      k.log('dampingiSlot', teks(r.id_slot) + (benar(b.ikut) ? ' ikut' : ' batal'));
      return { ikut: benar(b.ikut) };
    },

    pesanSlot: function (k, b) {
      var o = k.orang(b.id_orang);
      if (!o || teks(o.kategori) !== 'Calon') gagal('Prospect not found.');
      var lt = k.isLT();
      if (!lt && teks(o.diajukan_oleh) !== k.saya.id_orang) gagal('Only prospects on your own list can be booked.');
      if (TAHAP_TUTUP.indexOf(teks(o.tahap)) >= 0 || teks(o.tahap) === 'Anggota') gagal('This prospect is closed or already a member.');
      var waktu, slot = null;
      if (teks(b.id_slot)) {
        slot = slotById(k, b.id_slot);
        if (teks(slot.status) !== 'Kosong') gagal('That time was just taken. Pick another one.');
        waktu = waktuSlot(slot);
      } else {
        if (!lt) gagal('Pick one of the open times.');
        waktu = tgl(b.waktu);
        if (!waktu) gagal('Enter the date and time of the coffee session.');
      }
      if (waktu <= k.now) gagal('That time has already passed.');
      var waBaru = normWa(b.whatsapp);
      if (!teks(o.whatsapp_norm)) {
        if (!waBaru || waBaru.length < 10) gagal('Enter the WhatsApp number first.');
        var dobel = k.tab('Master').some(function (r) { return r !== o && teks(r.whatsapp_norm) === waBaru; });
        if (dobel) gagal('This WhatsApp number is already on the chapter list.');
        k.ubah('Master', o, { whatsapp_norm: waBaru });
      }
      lepasSlot(k, o);
      if (slot) k.ubah('Jadwal_CS', slot, { status: 'Terisi', id_orang: teks(o.id_orang), dipesan_oleh: k.saya.id_orang });
      else k.tambah('Jadwal_CS', { id_slot: idBaru(k.tab('Jadwal_CS'), 'id_slot', 'S', 4), tanggal: isoTanggal(waktu), jam: jamWIB(waktu), PIC: teks(b.pic) || k.saya.id_orang, tempat: teks(b.tempat) || 'Zoom', status: 'Terisi', id_orang: teks(o.id_orang), dipesan_oleh: k.saya.id_orang });
      var ubah = { tahap: 'Coffee_Scheduled', jadwal_cs: waktu.toISOString(), tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() };
      if (!teks(o.PIC)) ubah.PIC = slot ? teks(slot.PIC) : k.saya.id_orang;
      k.ubah('Master', o, ubah);
      k.log('pesanSlot', namaDepan(o) + ' ' + waktu.toISOString());
      return { waktu: waktu.toISOString(), tempat: slot ? (teks(slot.tempat) || 'Zoom') : (teks(b.tempat) || 'Zoom'), pic: namaDepan(k.orang(slot ? slot.PIC : (teks(b.pic) || k.saya.id_orang))) };
    },

    batalSlot: function (k, b) {
      var o = k.orang(b.id_orang);
      if (!o) gagal('Prospect not found.');
      if (!k.isLT() && teks(o.diajukan_oleh) !== k.saya.id_orang) gagal('Only prospects on your own list can be changed.');
      if (teks(o.tahap) !== 'Coffee_Scheduled') gagal('No coffee session is booked.');
      lepasSlot(k, o);
      var adaUndangan = k.tab('Undangan').some(function (u) { return teks(u.id_orang_calon) === teks(o.id_orang); });
      var adaHadir = k.tab('Hadir').some(function (h) { return teks(h.id_orang) === teks(o.id_orang); });
      k.ubah('Master', o, { tahap: adaHadir ? 'Attended' : adaUndangan ? 'Invited' : 'Listed', jadwal_cs: '', terakhir_diubah: k.now.toISOString() });
      return { tahap: teks(o.tahap) };
    },

    daftarAnggota: function (k) {
      var urut = {};
      var lt = k.isLT();
      var bod = {}, nBod = 0, hadirOrang = {};
      if (lt) {
        k.tab('Events').forEach(function (e) {
          var t = tgl(e.tanggal);
          if (teks(e.jenis) === 'BOD' && teks(e.status) !== 'Batal' && t && t <= k.now) { bod[teks(e.id_event)] = true; nBod++; }
        });
        k.tab('Hadir').forEach(function (h) { if (bod[teks(h.id_event)]) hadirOrang[teks(h.id_orang)] = (hadirOrang[teks(h.id_orang)] || 0) + 1; });
      }
      petaKursi(k).forEach(function (b, i) { b.kursi.forEach(function (x, j) { urut[x.id_kursi] = { n: i * 100 + j, x: x }; }); });
      return {
        anggota: k.anggota().map(function (r) {
          var u = urut[teks(r.id_kursi)];
          var s = teks(r.id_sponsor);
          return {
            nama: namaTampil(r), bidang: u ? u.x.bidang : '', sphere: u ? u.x.sphere : '', jenis_anggota: teks(r.jenis_anggota),
            id_orang: lt ? teks(r.id_orang) : undefined, hadir_bod: lt ? (hadirOrang[teks(r.id_orang)] || 0) : undefined, total_bod: lt ? nBod : undefined,
            sponsor: s === 'BNI' ? 'BNI' : namaDepan(k.orang(s)), tanggal_bergabung: tgl(r.tanggal_bergabung) ? tgl(r.tanggal_bergabung).toISOString() : '', _n: u ? u.n : 99999
          };
        }).sort(function (a, b) { return a._n - b._n; }).map(function (a) { delete a._n; return a; })
      };
    },

    ringkas: function (k) {
      wajibLDC(k);
      var a = k.pengaturan();
      var ronde = k.ronde();
      function diRonde(v, n) { var t = tgl(v); return t && nomorRonde(t) === n; }
      var anggota = k.anggota();
      var calon = k.calonAktif();
      var namaBaru = k.tab('Master').filter(function (r) { return teks(r.kategori) === 'Calon' && diRonde(r.tanggal_masuk, ronde); }).length;
      var cs = k.tab('Wawancara').filter(function (w) { return diRonde(w.tanggal, ronde); }).length;
      var undRonde = k.undanganAktif().filter(function (u) { return diRonde(u.tanggal, ronde); });
      var pengundang = {};
      undRonde.forEach(function (u) { pengundang[teks(u.id_pengundang)] = true; });
      var persenMengundang = anggota.length ? Math.round(100 * anggota.filter(function (r) { return pengundang[teks(r.id_orang)]; }).length / anggota.length) : 0;
      var baru = [0, 1].map(function (m) { return anggota.filter(function (r) { return diRonde(r.tanggal_bergabung, ronde - m); }).length; });
      var reg = AKSI.regroup(k);
      var ltKurang = reg.lt.filter(function (x) { return x.peran === 'LT' && x.ronde < 3; }).map(function (x) { return x.nama_depan; });
      var sphere = {};
      calon.forEach(function (r) { var x = kursiById(k, r.id_kursi); if (x) sphere[x.sphere] = (sphere[x.sphere] || 0) + 1; });
      var dominan = Object.keys(sphere).sort(function (x, y) { return sphere[y] - sphere[x]; })[0];
      var porsi = calon.length ? Math.round(100 * (sphere[dominan] || 0) / calon.length) : 0;
      var setelahEsm = a.fase !== 'Pembentukan';
      return {
        angka: {
          anggota: anggota.length, target: misi(k).target, fase: a.fase, calon_aktif: calon.length,
          nama_baru_ronde: namaBaru, cs_ronde: cs, undangan_ronde: undRonde.length,
          persen_mengundang: persenMengundang, anggota_baru_ronde: baru[0], kursi_tanpa_calon: reg.kursi_tanpa_calon
        },
        peringatan: [
          { teks: 'LT with fewer than 3 new names this week: ' + (ltKurang.join(', ') || 'none'), menyala: ltKurang.length > 0 },
          { teks: 'CS this week: ' + cs + ', threshold 5', menyala: cs < 5 },
          { teks: 'Members who invited this week: ' + persenMengundang + '%, threshold 50%', menyala: setelahEsm && persenMengundang < 50 },
          { teks: 'New members in the last two weeks: ' + (baru[0] + baru[1]), menyala: setelahEsm && baru[0] + baru[1] === 0 },
          { teks: 'Most prospects from ' + (dominan || '-') + ', ' + porsi + '% of active prospects', menyala: calon.length >= 10 && porsi > 40 },
          { teks: 'Drivers on the list: ' + reg.driver.jumlah + ', threshold ' + reg.driver.target, menyala: reg.driver.jumlah < reg.driver.target },
          { teks: 'Prospects untouched for over 7 days: ' + reg.calon_diam.length, menyala: reg.calon_diam.length > 0 }
        ]
      };
    }
  };

  var TANPA_LOG = { masuk: 1, kursi: 1, kursiDetail: 1, acara: 1, usulanSaya: 1, undanganSaya: 1, papan: 1, calonSaya: 1, regroup: 1, daftarHadir: 1, anggota: 1, ringkas: 1, tamuPekanIni: 1, jadwalCS: 1, daftarAnggota: 1, slotCS: 1, pengumuman: 1, perluCek: 1, riwayatRonde: 1, kandidatDriver: 1, kontak: 1, orangSemua: 1, orangDetail: 1, acaraCheckin: 1, bacaPengaturan: 1, lihatTab: 1 };

  /* Titik masuk tunggal. db = adaptor; badan = objek dari JSON. */
  function jalankan(db, badan, sekarang) {
    var k = new Konteks(db, sekarang);
    try {
      badan = badan || {};
      var nama = teks(badan.action);
      if (!AKSI[nama]) gagal('Unknown action: ' + nama);
      autentikasi(k, badan.kode);
      var hasil = AKSI[nama](k, badan) || {};
      hasil.ok = true;
      return hasil;
    } catch (e) {
      if (e instanceof Gagal) {
        var r = { ok: false, pesan: e.pesan };
        if (e.tambahan) for (var x in e.tambahan) r[x] = e.tambahan[x];
        return r;
      }
      throw e;
    }
  }

  return {
    jalankan: jalankan,
    normWa: normWa,
    nomorRonde: nomorRonde,
    batasRonde: batasRonde,
    LENCANA: LENCANA,
    TAHAP_LT: TAHAP_LT,
    _tanpaLog: TANPA_LOG
  };
})();
