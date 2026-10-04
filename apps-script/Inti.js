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

  var TAHAP_AKTIF = ['Baru', 'Dihubungi', 'Tertarik', 'CS', 'Bimbang'];
  var TAHAP_LT = ['Dihubungi', 'Tertarik', 'CS', 'Bimbang', 'Tidak Lanjut', 'Parkir'];
  var JAM = 3600 * 1000;
  var HARI = 24 * JAM;
  var WIB = 7 * JAM;

  var LENCANA = [
    { kode: 'UNDANGAN_PERTAMA', nama: 'Undangan Pertama', ket: 'Mengundang satu orang' },
    { kode: 'TAMU_DATANG', nama: 'Tamu Datang', ket: 'Satu undangan hadir di acara' },
    { kode: 'SPONSOR_PERTAMA', nama: 'Sponsor Pertama', ket: 'Mensponsori satu anggota' },
    { kode: 'TIGA_KURSI', nama: 'Pembuka Tiga Kursi', ket: 'Mensponsori tiga anggota' },
    { kode: 'RABU_5', nama: 'Lima Rabu Beruntun', ket: 'Mengundang lima ronde berturut-turut' }
  ];

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
  function namaDepan(o) {
    if (!o) return '';
    return teks(o.nama_depan) || teks(o.nama).split(/\s+/)[0] || '';
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
    ['target_founding', 'target_cgt', 'target_launch', 'target_nama_min', 'target_nama_maks'].forEach(function (k) { a[k] = Number(a[k]) || 0; });
    a.target_founding = a.target_founding || 20;
    a.target_cgt = a.target_cgt || 37;
    a.target_launch = a.target_launch || 52;
    a.target_nama_min = a.target_nama_min || 20;
    a.target_nama_maks = a.target_nama_maks || 40;
    a.fase = teks(a.fase) || 'Pembentukan';
    a.nama_chapter = teks(a.nama_chapter) || 'Optima';
    a.hari_bod = teks(a.hari_bod) || 'Rabu';
    a.tautan_form = teks(a.tautan_form);
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
    return this.tab('Master').filter(function (r) { return teks(r.tahap) === 'Anggota'; });
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
    if (db.terkunci && db.terkunci()) gagal('Terlalu banyak percobaan masuk. Coba lagi 10 menit lagi.');
    var bersih = teks(kode).toUpperCase();
    var akses = bersih && k.tab('Akses').filter(function (a) {
      return teks(a.kode_akses).toUpperCase() === bersih && benar(a.aktif);
    })[0];
    if (!akses) {
      if (db.catatGagal) db.catatGagal();
      gagal('Kode akses tidak dikenal.');
    }
    var o = k.orang(akses.id_orang);
    k.saya = {
      id_orang: teks(akses.id_orang),
      nama: o ? teks(o.nama) : '',
      nama_depan: namaDepan(o),
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
        id_event: teks(e.id_event), tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: teks(e.jam_mulai),
        nama_acara: teks(e.nama_acara), jenis: teks(e.jenis), mode: teks(e.mode), lokasi: teks(e.lokasi)
      };
    }).sort(function (a, b) { return (a.tanggal + a.jam_mulai) < (b.tanggal + b.jam_mulai) ? -1 : 1; });
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
    return { anggota: jumlah, gerbang: [a.target_founding, a.target_cgt, a.target_launch], fase: a.fase, target: target, riwayat: riwayat };
  }

  function kabar(k) {
    var hasil = [];
    k.anggota().forEach(function (r) {
      var t = tgl(r.tanggal_bergabung);
      if (!t) return;
      var s = teks(r.id_sponsor) && teks(r.id_sponsor) !== 'BNI' ? k.orang(r.id_sponsor) : null;
      var kursi = kursiById(k, r.id_kursi);
      hasil.push({ jenis: 'anggota', waktu: t.toISOString(), teks: namaDepan(r) + ' mengisi kursi ' + (kursi ? kursi.bidang : 'baru') + (s ? ', disponsori ' + namaDepan(s) : '') });
    });
    k.tab('Hadir').forEach(function (h) {
      if (teks(h.peran) !== 'Visitor') return;
      var o = k.orang(h.id_orang), t = tgl(h.waktu_checkin);
      if (o && t) hasil.push({ jenis: 'tamu', waktu: t.toISOString(), teks: namaDepan(o) + ' hadir sebagai tamu' });
    });
    k.tab('Lencana').forEach(function (l) {
      var o = k.orang(l.id_orang), t = tgl(l.tanggal);
      var L = LENCANA.filter(function (x) { return x.kode === teks(l.lencana); })[0];
      if (o && t && L) hasil.push({ jenis: 'lencana', waktu: t.toISOString(), teks: namaDepan(o) + ' meraih ' + L.nama });
    });
    petaKursi(k).forEach(function (b) {
      if (!b.lengkap) return;
      var akhir = null;
      k.anggota().forEach(function (r) {
        var x = kursiById(k, r.id_kursi);
        var t = tgl(r.tanggal_bergabung);
        if (x && x.sphere === b.sphere && t && (!akhir || t > akhir)) akhir = t;
      });
      if (akhir) hasil.push({ jenis: 'baris', waktu: akhir.toISOString(), teks: 'Baris ' + b.sphere + ' lengkap, 8 dari 8 kursi terisi' });
    });
    return hasil.sort(function (a, b) { return a.waktu < b.waktu ? 1 : -1; }).slice(0, 12);
  }

  function wajibLT(k) { if (!k.isLT()) gagal('Fitur ini khusus launch team.'); }
  function wajibLDC(k) { if (!k.isLDC()) gagal('Fitur ini khusus LDC.'); }

  function buatUndangan(k, idCalon, idEvent) {
    var calon = k.orang(idCalon);
    if (!calon) gagal('Calon tidak ditemukan.');
    if (teks(calon.tahap) === 'Anggota') gagal(namaDepan(calon) + ' sudah menjadi anggota.');
    if (!teks(calon.whatsapp_norm)) gagal('Nomor WhatsApp calon wajib diisi sebelum diundang.');
    var acara = acaraBerikut(k).filter(function (e) { return e.id_event === teks(idEvent); })[0];
    if (!acara) gagal('Acara tidak ditemukan atau sudah lewat.');
    var milikCalon = k.undanganAktif().filter(function (u) { return teks(u.id_orang_calon) === teks(idCalon); });
    if (milikCalon.some(function (u) { return teks(u.id_event) === acara.id_event; })) gagal(namaDepan(calon) + ' sudah diundang ke acara ini.');
    if (milikCalon.length >= 2) gagal('Sesuai aturan BNI, satu orang hanya bisa diundang sebagai tamu dua kali. ' + namaDepan(calon) + ' sudah dua kali diundang.');
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
          nama_chapter: a.nama_chapter, fase: a.fase, hari_bod: a.hari_bod, tautan_form: a.tautan_form,
          target_founding: a.target_founding, target_cgt: a.target_cgt, target_launch: a.target_launch,
          target_nama_min: a.target_nama_min, target_nama_maks: a.target_nama_maks, tanggal_esm: teks(a.tanggal_esm), tanggal_grand_launch: teks(a.tanggal_grand_launch)
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
      var r = batasRonde(k.ronde());
      var berikut = acaraBerikut(k);
      return {
        misi: misi(k),
        ronde: { mulai: r.mulai.toISOString(), selesai: r.selesai.toISOString(), acara_berikut: berikut[0] || null },
        saya: st,
        lencana: lencana(k, id, st),
        kabar: kabar(k)
      };
    },

    kursi: function (k) { return { baris: petaKursi(k) }; },

    kursiDetail: function (k, b) {
      var x = kursiById(k, b.id_kursi);
      if (!x) gagal('Kursi tidak ditemukan.');
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
      if (teks(b.id_kursi) && !x) gagal('Kursi tidak ditemukan.');
      if (x && x.status === 'terisi') gagal('Kursi ' + x.bidang + ' sudah terisi oleh ' + x.pemilik + '. Satu klasifikasi hanya untuk satu anggota.');
      var nama = teks(b.nama), bisnis = teks(b.bisnis), wa = normWa(b.whatsapp);
      if (nama.length < 2) gagal('Nama wajib diisi.');
      if (!bisnis) gagal('Nama atau jenis bisnis wajib diisi.');
      if (k.isLT() && !wa) gagal('Nomor WhatsApp wajib diisi untuk calon dari launch team.');
      if (b.id_event && !wa) gagal('Nomor WhatsApp wajib diisi untuk mengundang.');
      if (wa && wa.length < 10) gagal('Nomor WhatsApp terlalu pendek.');
      var ada = k.tab('Master').filter(function (r) {
        return (wa && teks(r.whatsapp_norm) === wa) || (x && sama(r.nama, nama) && teks(r.id_kursi) === x.id_kursi);
      })[0];
      if (ada) {
        var info = { nama_depan: namaDepan(ada) };
        if (k.isLT()) { info.tahap = teks(ada.tahap); info.pic = namaDepan(k.orang(ada.PIC)); info.id_orang = teks(ada.id_orang); }
        gagal('Nama ini sudah ada di daftar chapter.', { duplikat: info });
      }
      var bagian = nama.split(/\s+/);
      var o = {
        id_orang: idBaru(k.tab('Master'), 'id_orang', 'P', 4),
        nama: nama, nama_depan: bagian[0], whatsapp_norm: wa, email: '', perusahaan: teks(b.perusahaan), bisnis: bisnis,
        id_kursi: x ? x.id_kursi : '', kota: '', sumber: 'app', kategori: 'Calon', tahap: 'Baru', jenis_anggota: '',
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
      if (!x) gagal('Kursi tidak ditemukan.');
      var ada = k.tab('Butuh').filter(function (r) { return teks(r.id_kursi) === x.id_kursi && teks(r.id_orang) === k.saya.id_orang; })[0];
      if (ada) { k.hapus('Butuh', ada); return { saya_butuh: false }; }
      k.tambah('Butuh', { id_kursi: x.id_kursi, id_orang: k.saya.id_orang, tanggal: k.now.toISOString() });
      return { saya_butuh: true };
    },

    acara: function (k) { return { acara: acaraBerikut(k) }; },

    undang: function (k, b) {
      var calon = k.orang(b.id_orang);
      if (!k.isLT() && calon && teks(calon.diajukan_oleh) !== k.saya.id_orang) gagal('Hanya bisa mengundang nama yang diajukan sendiri.');
      var wa = normWa(b.whatsapp);
      if (calon && wa && !teks(calon.whatsapp_norm)) {
        if (wa.length < 10) gagal('Nomor WhatsApp terlalu pendek.');
        var kembar = k.tab('Master').filter(function (r) { return teks(r.whatsapp_norm) === wa; })[0];
        if (kembar) gagal('Nomor ini sudah dipakai ' + namaDepan(kembar) + ' di daftar chapter.');
        k.ubah('Master', calon, { whatsapp_norm: wa, terakhir_diubah: k.now.toISOString() });
      }
      return { id_undangan: buatUndangan(k, b.id_orang, b.id_event).id_undangan };
    },

    usulanSaya: function (k) {
      var id = k.saya.id_orang;
      var hitung = {};
      k.undanganAktif().forEach(function (u) { hitung[teks(u.id_orang_calon)] = (hitung[teks(u.id_orang_calon)] || 0) + 1; });
      return {
        usulan: k.tab('Master').filter(function (r) { return teks(r.diajukan_oleh) === id && teks(r.kategori) === 'Calon'; }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bidang: x ? x.bidang : 'Bidang belum pasti', tahap: teks(r.tahap), punya_wa: !!teks(r.whatsapp_norm), jumlah_undangan: hitung[teks(r.id_orang)] || 0 };
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
        if (t && nomorRonde(t) === ronde) hitung[teks(u.id_pengundang)] = (hitung[teks(u.id_pengundang)] || 0) + 1;
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
      return { pengundang: urut(hitung).slice(0, 15), sponsor: urut(sp) };
    },

    calonSaya: function (k, b) {
      wajibLT(k);
      var semua = k.isLDC() && b.semua;
      var id = k.saya.id_orang;
      return {
        calon: k.calonAktif().filter(function (r) { return semua || teks(r.PIC) === id || (!teks(r.PIC) && k.isLDC()); }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bisnis: teks(r.bisnis), id_kursi: x ? x.id_kursi : '', bidang: x ? x.bidang : 'Bidang belum pasti', tahap: teks(r.tahap), whatsapp: teks(r.whatsapp_norm), hari_diam: k.hariDiam(r), pic: namaDepan(k.orang(r.PIC)) || 'Belum ada', jadwal_cs: tgl(r.jadwal_cs) ? tgl(r.jadwal_cs).toISOString() : '' };
        }).sort(function (a, b) { return b.hari_diam - a.hari_diam; })
      };
    },

    tindakLanjut: function (k, b) {
      wajibLT(k);
      var o = k.orang(b.id_orang);
      if (!o || teks(o.kategori) !== 'Calon') gagal('Calon tidak ditemukan.');
      var tahap = teks(b.tahap);
      if (TAHAP_LT.indexOf(tahap) < 0) gagal('Tahap tidak dikenal.');
      if (!k.isLDC() && teks(o.PIC) && teks(o.PIC) !== k.saya.id_orang) gagal('Calon ini dipegang ' + namaDepan(k.orang(o.PIC)) + '.');
      var ubah = { tahap: tahap, tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() };
      if (!teks(o.PIC)) ubah.PIC = k.saya.id_orang;
      if (tahap === 'CS') {
        var j = tgl(b.jadwal_cs);
        if (!j) gagal('Isi tanggal dan jam coffee session.');
        ubah.jadwal_cs = j.toISOString();
      }
      if (teks(b.id_kursi) && teks(b.id_kursi) !== teks(o.id_kursi)) {
        var kx = kursiById(k, b.id_kursi);
        if (!kx) gagal('Kursi tidak ditemukan.');
        if (kx.status === 'terisi') gagal('Kursi ' + kx.bidang + ' sudah terisi oleh ' + kx.pemilik + '.');
        ubah.id_kursi = kx.id_kursi;
      }
      if (teks(b.catatan)) ubah.catatan = (teks(o.catatan) ? teks(o.catatan) + '\n' : '') + isoTanggal(k.now) + ' ' + k.saya.nama_depan + ': ' + teks(b.catatan);
      if (tahap === 'Tidak Lanjut' && teks(b.catatan)) ubah.alasan_tidak_lanjut = teks(b.catatan);
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
      return {
        founding: { jumlah: founding, target: a.target_founding },
        lt: lt,
        kursi_tanpa_calon: kosong,
        calon_diam: k.calonAktif().map(function (r) { return { nama: teks(r.nama), pic: namaDepan(k.orang(r.PIC)) || 'Belum ada', hari: k.hariDiam(r) }; })
          .filter(function (r) { return r.hari >= 7; }).sort(function (x, y) { return y.hari - x.hari; }).slice(0, 10)
      };
    },

    daftarHadir: function (k, b) {
      wajibLT(k);
      var idEv = teks(b.id_event);
      var ev = k.tab('Events').filter(function (e) { return teks(e.id_event) === idEv; })[0];
      if (!ev) gagal('Acara tidak ditemukan.');
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
          orang.push({ id_orang: teks(r.id_orang), nama: teks(r.nama), peran: (kat === 'LT' || kat === 'LDC') ? 'LT' : 'Anggota', pengundang: '', hadir: !!hadir[teks(r.id_orang)] });
        }
      });
      return { acara: { id_event: idEv, nama_acara: teks(ev.nama_acara), tanggal: tgl(ev.tanggal) ? isoTanggal(tgl(ev.tanggal)) : '' }, orang: orang };
    },

    checkin: function (k, b) {
      wajibLT(k);
      var idEv = teks(b.id_event), idO = teks(b.id_orang);
      var o = k.orang(idO);
      if (!o) gagal('Orang tidak ditemukan.');
      var ada = k.tab('Hadir').filter(function (h) { return teks(h.id_event) === idEv && teks(h.id_orang) === idO; })[0];
      var und = k.undanganAktif().filter(function (u) { return teks(u.id_event) === idEv && teks(u.id_orang_calon) === idO; });
      if (b.hadir && !ada) {
        var kat = teks(o.kategori);
        var peran = (kat === 'LT' || kat === 'LDC') ? 'LT' : (teks(o.tahap) === 'Anggota' ? 'Anggota' : 'Visitor');
        k.tambah('Hadir', { id_hadir: idBaru(k.tab('Hadir'), 'id_hadir', 'H', 5), id_event: idEv, id_orang: idO, peran: peran, waktu_checkin: k.now.toISOString(), dicatat_oleh: k.saya.id_orang });
        und.forEach(function (u) { k.ubah('Undangan', u, { status: 'Hadir' }); });
      } else if (!b.hadir && ada) {
        k.hapus('Hadir', ada);
        und.forEach(function (u) { k.ubah('Undangan', u, { status: 'Diundang' }); });
      }
      k.log('checkin', namaDepan(o) + (b.hadir ? ' hadir' : ' batal hadir') + ' di ' + idEv);
      return { hadir: !!b.hadir };
    },

    anggota: function (k) {
      wajibLT(k);
      return { anggota: k.anggota().map(function (r) { return { id_orang: teks(r.id_orang), nama: teks(r.nama) }; }).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; }) };
    },

    jadikanAnggota: function (k, b) {
      wajibLT(k);
      var o = k.orang(b.id_orang);
      if (!o) gagal('Orang tidak ditemukan.');
      if (teks(o.tahap) === 'Anggota') gagal(namaDepan(o) + ' sudah anggota.');
      var x = kursiById(k, b.id_kursi || o.id_kursi);
      if (!x) gagal('Pilih kursi klasifikasinya.');
      if (x.status === 'terisi') gagal('Kursi ' + x.bidang + ' sudah terisi oleh ' + x.pemilik + '.');
      var sp = teks(b.id_sponsor);
      if (!sp) gagal('Pilih sponsor. Kalau tidak ada member yang dikenal secara pribadi, pilih BNI.');
      if (sp !== 'BNI') {
        var so = k.orang(sp);
        if (!so || teks(so.tahap) !== 'Anggota') gagal('Sponsor harus anggota chapter, atau BNI.');
      }
      var jenis = k.pengaturan().fase === 'Pembentukan' ? 'Founding' : 'Core Group';
      k.ubah('Master', o, { tahap: 'Anggota', id_kursi: x.id_kursi, id_sponsor: sp, jenis_anggota: jenis, tanggal_bergabung: k.now.toISOString(), tanggal_sentuh: k.now.toISOString(), terakhir_diubah: k.now.toISOString() });
      k.log('jadikanAnggota', namaDepan(o) + ' di kursi ' + x.bidang + ', sponsor ' + sp);
      return { jenis_anggota: jenis, kursi: x.bidang };
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
          nama: teks(o.nama), bidang: x ? x.bidang : (teks(o.bisnis) || 'Bidang belum pasti'), sphere: x ? x.sphere : '',
          pengundang: namaDepan(k.orang(u.id_pengundang)), acara: teks(e.nama_acara), jenis: teks(e.jenis),
          tanggal: isoTanggal(tgl(e.tanggal)), jam_mulai: teks(e.jam_mulai), status: st, bergabung: teks(o.tahap) === 'Anggota'
        });
      });
      var r = batasRonde(n);
      return { ronde: { mulai: r.mulai.toISOString(), selesai: r.selesai.toISOString() }, tamu: tamu.sort(function (a, b) { return (a.tanggal + a.jam_mulai + a.nama) < (b.tanggal + b.jam_mulai + b.nama) ? -1 : 1; }) };
    },

    jadwalCS: function (k) {
      wajibLT(k);
      var batas = new Date(k.now.getTime() - 12 * JAM);
      return {
        cs: k.tab('Master').filter(function (r) { var j = tgl(r.jadwal_cs); return teks(r.tahap) === 'CS' && j && j >= batas; }).map(function (r) {
          var x = kursiById(k, r.id_kursi);
          return { id_orang: teks(r.id_orang), nama: teks(r.nama), bidang: x ? x.bidang : 'Bidang belum pasti', pic: namaDepan(k.orang(r.PIC)) || 'Belum ada', jadwal_cs: tgl(r.jadwal_cs).toISOString(), whatsapp: teks(r.whatsapp_norm) };
        }).sort(function (a, b) { return a.jadwal_cs < b.jadwal_cs ? -1 : 1; })
      };
    },

    daftarAnggota: function (k) {
      var urut = {};
      petaKursi(k).forEach(function (b, i) { b.kursi.forEach(function (x, j) { urut[x.id_kursi] = { n: i * 100 + j, x: x }; }); });
      return {
        anggota: k.anggota().map(function (r) {
          var u = urut[teks(r.id_kursi)];
          var s = teks(r.id_sponsor);
          return {
            nama: teks(r.nama), bidang: u ? u.x.bidang : '', sphere: u ? u.x.sphere : '', jenis_anggota: teks(r.jenis_anggota),
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
          { teks: 'LT dengan kurang dari 3 nama baru pekan ini: ' + (ltKurang.join(', ') || 'tidak ada'), menyala: ltKurang.length > 0 },
          { teks: 'CS pekan ini ' + cs + ', ambang 5', menyala: cs < 5 },
          { teks: 'Member yang mengundang pekan ini ' + persenMengundang + ' persen, ambang 50 persen', menyala: setelahEsm && persenMengundang < 50 },
          { teks: 'Anggota baru dua pekan terakhir: ' + (baru[0] + baru[1]), menyala: setelahEsm && baru[0] + baru[1] === 0 },
          { teks: 'Calon terbanyak dari ' + (dominan || '-') + ', ' + porsi + ' persen dari calon aktif', menyala: calon.length >= 10 && porsi > 40 },
          { teks: 'Calon yang lebih dari 7 hari tidak disentuh: ' + reg.calon_diam.length, menyala: reg.calon_diam.length > 0 }
        ]
      };
    }
  };

  var TANPA_LOG = { masuk: 1, kursi: 1, kursiDetail: 1, acara: 1, usulanSaya: 1, undanganSaya: 1, papan: 1, calonSaya: 1, regroup: 1, daftarHadir: 1, anggota: 1, ringkas: 1, tamuPekanIni: 1, jadwalCS: 1, daftarAnggota: 1 };

  /* Titik masuk tunggal. db = adaptor; badan = objek dari JSON. */
  function jalankan(db, badan, sekarang) {
    var k = new Konteks(db, sekarang);
    try {
      badan = badan || {};
      var nama = teks(badan.action);
      if (!AKSI[nama]) gagal('Aksi tidak dikenal: ' + nama);
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
