/* =====================================================================
   API OPTIMA · endpoint JSON untuk PWA di web/
   Pemilik: Claude. Acuan: KONTRAK.md bagian 6. Logika ada di Inti.js.

   Script Properties yang wajib:
   - DATA_SHEET_ID : ID spreadsheet "Optima - Data Chapter"
   Opsional:
   - EMAIL_PERINGATAN : alamat yang diberi tahu saat masuk dikunci
   ===================================================================== */

function doPost(e) {
  var badan;
  try {
    badan = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return api_json_({ ok: false, pesan: 'Request could not be read.' });
  }
  // Pintu alat Lapis (Optima.js) memakai kunci `aksi`, API app memakai `action`. Satu pintu doPost saja.
  if (badan && badan.aksi && typeof alatLapis_ === 'function') return alatLapis_(badan);
  var kunci = LockService.getScriptLock();
  var tulis = !Inti._tanpaLog[badan.action];
  try {
    if (tulis) kunci.waitLock(20000);
    var db = api_adaptor_();
    var hasil = Inti.jalankan(db, badan, new Date());
    db.simpan();
    return api_json_(hasil);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return api_json_({ ok: false, pesan: 'Server error. Try again shortly.' });
  } finally {
    if (tulis) try { kunci.releaseLock(); } catch (x) {}
  }
}

function api_json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Tab dan kolom yang ditambahkan setelah KONTRAK versi awal. Dibuat otomatis kalau belum ada. */
var TAB_BARU_ = {
  Pengumuman: ['id_pengumuman', 'tanggal_tayang', 'tanggal_berakhir', 'judul', 'isi', 'poster', 'dibuat_oleh', 'status']
};
var KOLOM_BARU_ = {
  Events: ['pembicara', 'poster'],
  Master: ['driver']
};

/* Simpanan sementara hasil baca tab (CacheService), supaya permintaan beruntun tidak membaca sheet berulang.
   - Kunci memuat nomor versi per tab. Setiap tulisan lewat app menaikkan versi tab itu, jadi data lama tidak terpakai lagi.
   - Isi hanya hidup 45 detik, sebagai pengaman untuk perubahan di luar app (sheet diedit tangan, Form, otomasi Lapis).
     Kode Lapis yang menulis ke sheet boleh memanggil api_bersihkanCache_() supaya app langsung melihatnya.
   - Spreadsheet baru dibuka bila ada tab yang belum tersimpan atau ada tulisan. Bila semua tab ada di simpanan, tidak ada panggilan ke sheet. */
var CACHE_DETIK_ = 45;
var CACHE_VERSI_DETIK_ = 21600;
var TANPA_CACHE_ = { Log: true, Responses: true };

function api_kemas_(baris) {
  return JSON.stringify(baris.map(function (o) { return { b: o._baris, o: o }; }), function (k, v) {
    var mentah = this[k];
    return mentah instanceof Date ? { __d: mentah.getTime() } : v;
  });
}
function api_pulihkan_(teks) {
  return JSON.parse(teks, function (k, v) {
    return v && typeof v === 'object' && !Array.isArray(v) && v.__d !== undefined && Object.keys(v).length === 1 ? new Date(v.__d) : v;
  }).map(function (x) {
    Object.defineProperty(x.o, '_baris', { value: x.b, writable: true, enumerable: false });
    return x.o;
  });
}
/* Dipanggil dari kode lain di proyek ini setelah menulis ke sheet di luar app, supaya app tidak memakai simpanan lama. */
function api_bersihkanCache_() {
  var cache = CacheService.getScriptCache();
  var nama = ['Pengaturan', 'Klasifikasi', 'Master', 'Undangan', 'Hadir', 'Events', 'Butuh', 'Wawancara', 'Jadwal_CS', 'Akses', 'Lencana', 'Pengumuman'];
  var baru = String(Date.now()) + Math.floor(Math.random() * 1000);
  nama.forEach(function (n) { cache.put('v_' + n, baru, CACHE_VERSI_DETIK_); });
}

/* Adaptor sheet: baca tab (dengan simpanan sementara), tulis per baris. */
function api_adaptor_() {
  var props = PropertiesService.getScriptProperties();
  var idSheet = props.getProperty('DATA_SHEET_ID');
  if (!idSheet) throw new Error('DATA_SHEET_ID belum diisi di Script Properties');
  var ss = null;
  function buka() { if (!ss) ss = SpreadsheetApp.openById(idSheet); return ss; }
  var cache = CacheService.getScriptCache();
  var info = {}; // nama tab -> {sheet, kepala}
  var versi = {}; // nama tab -> nomor versi simpanan

  function versiTab(nama) {
    if (versi[nama]) return versi[nama];
    var v = cache.get('v_' + nama);
    if (!v) { v = String(Date.now()) + Math.floor(Math.random() * 1000); cache.put('v_' + nama, v, CACHE_VERSI_DETIK_); }
    versi[nama] = v;
    return v;
  }
  function naikkanVersi(nama) {
    var v = String(Date.now()) + Math.floor(Math.random() * 1000);
    cache.put('v_' + nama, v, CACHE_VERSI_DETIK_);
    versi[nama] = v;
  }

  function siapkan(nama) {
    if (info[nama]) return info[nama];
    var buku = buka();
    var sh = buku.getSheetByName(nama);
    if (!sh && TAB_BARU_[nama]) {
      // tab yang ditambahkan setelah sheet dibuat: dibuat otomatis supaya deploy tidak menunggu pekerjaan manual
      sh = buku.insertSheet(nama);
      sh.getRange(1, 1, 1, TAB_BARU_[nama].length).setValues([TAB_BARU_[nama]]);
      sh.getRange(2, 1, sh.getMaxRows() - 1, TAB_BARU_[nama].length).setNumberFormat('@');
    }
    if (!sh) throw new Error('Tab tidak ada: ' + nama);
    var lebar = sh.getLastColumn();
    var kepala = lebar ? sh.getRange(1, 1, 1, lebar).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
    (KOLOM_BARU_[nama] || []).forEach(function (h) {
      if (kepala.indexOf(h) < 0) { sh.getRange(1, kepala.length + 1).setValue(h); kepala.push(h); }
    });
    info[nama] = { sheet: sh, kepala: kepala };
    return info[nama];
  }

  return {
    baca: function (nama) {
      var kunci = null;
      if (!TANPA_CACHE_[nama]) {
        kunci = 'd_' + nama + '_' + versiTab(nama);
        var isi = cache.get(kunci);
        if (isi) { try { return api_pulihkan_(isi); } catch (err) { /* simpanan rusak, baca ulang dari sheet */ } }
      }
      var t = siapkan(nama);
      var akhir = t.sheet.getLastRow();
      var hasil = [];
      if (akhir >= 2 && t.kepala.length) {
        var nilai = t.sheet.getRange(2, 1, akhir - 1, t.kepala.length).getValues();
        nilai.forEach(function (baris, i) {
          if (baris.every(function (v) { return v === '' || v === null; })) return;
          var o = {};
          t.kepala.forEach(function (h, j) { if (h) o[h] = baris[j]; });
          Object.defineProperty(o, '_baris', { value: i + 2, writable: true, enumerable: false });
          hasil.push(o);
        });
      }
      if (kunci) { try { cache.put(kunci, api_kemas_(hasil), CACHE_DETIK_); } catch (err) { /* terlalu besar untuk simpanan: dilewati */ } }
      return hasil;
    },
    tambah: function (nama, obj) {
      var t = siapkan(nama);
      var baris = t.kepala.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
      t.sheet.appendRow(baris);
      Object.defineProperty(obj, '_baris', { value: t.sheet.getLastRow(), writable: true, enumerable: false });
      naikkanVersi(nama);
    },
    ubah: function (nama, obj, perubahan) {
      var t = siapkan(nama);
      if (!obj._baris) throw new Error('Baris tidak diketahui di ' + nama);
      Object.keys(perubahan).forEach(function (k) {
        var j = t.kepala.indexOf(k);
        if (j >= 0) t.sheet.getRange(obj._baris, j + 1).setValue(perubahan[k]);
      });
      naikkanVersi(nama);
    },
    hapus: function (nama, obj) {
      var t = siapkan(nama);
      if (obj._baris) t.sheet.deleteRow(obj._baris);
      naikkanVersi(nama);
    },
    terkunci: function () {
      return cache.get('optima_kunci_masuk') === '1';
    },
    catatGagal: function () {
      var n = Number(cache.get('optima_gagal') || 0) + 1;
      cache.put('optima_gagal', String(n), 600);
      if (n >= 20) {
        cache.put('optima_kunci_masuk', '1', 600);
        cache.remove('optima_gagal');
        var surel = props.getProperty('EMAIL_PERINGATAN');
        if (surel) MailApp.sendEmail(surel, 'Optima: masuk dikunci 10 menit', '20 percobaan kode akses salah dalam 10 menit. Semua masuk dikunci 10 menit.');
      }
    },
    simpan: function () { if (ss) SpreadsheetApp.flush(); }
  };
}

/* Uji cepat dari editor: isi kode akses LDC lalu jalankan. */
function api_ujiMasuk() {
  var kode = PropertiesService.getScriptProperties().getProperty('UJI_KODE');
  var hasil = Inti.jalankan(api_adaptor_(), { action: 'beranda', kode: kode }, new Date());
  console.log(JSON.stringify(hasil, null, 2));
}
