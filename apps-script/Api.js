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
    api_sesudahTulis_(badan.action, hasil);
    return api_json_(hasil);
  } catch (err) {
    console.error(err && err.stack ? err.stack : err);
    return api_json_({ ok: false, pesan: 'Server error. Try again shortly.' });
  } finally {
    if (tulis) try { kunci.releaseLock(); } catch (x) {}
  }
}

/* Aksi yang mengubah jadwal acara menyegarkan pilihan acara di Google Form (fungsi sinkronPilihan milik Lapis), supaya langsung terlihat.
   Gagalnya sinkron tidak boleh menggagalkan aksi: pemicu tiap jam milik Lapis tetap menjadi jaring pengaman. */
/* Aksi yang mengubah isi pilihan Form: acara dan daftar orang pada "Diundang oleh". */
var AKSI_JADWAL_ = { tambahAcara: true, ubahAcara: true, geserAcara: true, tambahOrang: true, jadikanAnggota: true, ubahOrang: true };
function api_sesudahTulis_(aksi, hasil) {
  if (!AKSI_JADWAL_[aksi] || !hasil || hasil.ok !== true) return;
  try { api_segarkanJendelaForm_(); } catch (err) { console.warn('jendela Form gagal setelah ' + aksi + ': ' + err); }
  try {
    if (typeof sinkronPilihan === 'function') sinkronPilihan();
  } catch (err) {
    console.warn('sinkronPilihan gagal setelah ' + aksi + ': ' + err);
  }
}

/* Pilihan acara di Form hanya memuat acara terdekat (BOD pagi dan Lunch Networking siang Rabu berikutnya), bukan seluruh jadwal.
   Fungsi ini mengatur kolom Events.tampil_di_form menurut jam sekarang. Dipanggil tiap 5 menit dan setelah jadwal berubah.
   Mengembalikan true bila ada baris yang berubah. Acara jenis lain disembunyikan dari Form. */
function api_segarkanJendelaForm_() {
  var db = api_adaptor_({ paksa: true });
  var ev = db.baca('Events');
  var buka = Inti.jendelaForm(ev, new Date());
  var berubah = false;
  ev.forEach(function (e) {
    // Acara yang bukan BOD, Lunch Networking, atau ESM tidak pernah tampil di Form.
    var mau = Inti.JENIS_FORM.indexOf(String(e.jenis).trim()) >= 0 && !!buka[String(e.id_event).trim()];
    var kini = e.tampil_di_form === true || String(e.tampil_di_form).toUpperCase() === 'TRUE';
    if (mau !== kini) { db.ubah('Events', e, { tampil_di_form: mau ? 'TRUE' : 'FALSE' }); berubah = true; }
  });
  return berubah;
}

function api_json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* Tab dan kolom yang ditambahkan setelah KONTRAK versi awal. Dibuat otomatis kalau belum ada. */
var TAB_BARU_ = {
  Pengumuman: ['id_pengumuman', 'tanggal_tayang', 'tanggal_berakhir', 'judul', 'isi', 'poster', 'dibuat_oleh', 'status']
};
var KOLOM_BARU_ = {
  Events: ['pembicara', 'poster', 'pembuka', 'judul_topik', 'biaya', 'tautan_lokasi'],
  Master: ['driver', 'tim', 'kode_ajak'],
  Undangan: ['konfirmasi_oleh', 'konfirmasi_waktu', 'konfirmasi_acara']
};

/* Simpanan sementara hasil baca tab (CacheService), supaya permintaan beruntun tidak membaca sheet berulang.
   - Kunci memuat nomor versi per tab. Setiap tulisan lewat app menaikkan versi tab itu, jadi data lama tidak terpakai lagi.
   - Isi hidup 10 menit sebagai pengaman. Perubahan di luar app dibersihkan lewat: pemicu onEdit (edit tangan di sheet),
     api_bersihkanCache_() yang dipanggil kode Lapis setelah menulis (Form, otomasi), dan tulisan app sendiri.
     Edit lewat API Sheets atau skrip tidak memicu onEdit, jadi baru terlihat setelah paling lama 10 menit atau setelah api_bersihkanCache_().
   - Pemicu waktu api_panaskan_ (tiap 5 menit) memuat ulang semua tab, jadi simpanan selalu hangat dan tidak ada permintaan pertama yang lambat.
     Pasang kedua pemicu sekali dengan menjalankan api_pasangPemicu_() dari editor.
   - Spreadsheet baru dibuka bila ada tab yang belum tersimpan atau ada tulisan. Bila semua tab ada di simpanan, tidak ada panggilan ke sheet. */
var CACHE_DETIK_ = 600;
var CACHE_VERSI_DETIK_ = 21600;
var TANPA_CACHE_ = { Log: true, Responses: true };
/* Kolom yang harus tersimpan sebagai teks (Sheets suka mengubah '07:00' dan '2027-05-24' menjadi waktu atau tanggal). */
var KOLOM_TEKS_ = { Events: ['tanggal', 'jam_mulai', 'jam_selesai'] };
var TAB_CACHE_ = ['Pengaturan', 'Klasifikasi', 'Master', 'Undangan', 'Hadir', 'Events', 'Butuh', 'Wawancara', 'Jadwal_CS', 'Akses', 'Lencana', 'Pengumuman'];

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
  var nama = TAB_CACHE_;
  var baru = String(Date.now()) + Math.floor(Math.random() * 1000);
  nama.forEach(function (n) { cache.put('v_' + n, baru, CACHE_VERSI_DETIK_); });
}

/* Pemicu waktu: muat ulang semua tab ke simpanan supaya selalu hangat. */
function api_panaskan_() {
  var db = api_adaptor_({ paksa: true });
  TAB_CACHE_.forEach(function (n) {
    try { db.baca(n); } catch (err) { console.warn('api_panaskan_ ' + n + ': ' + err); }
  });
  try {
    if (api_segarkanJendelaForm_() && typeof sinkronPilihan === 'function') sinkronPilihan();
  } catch (err) { console.warn('api_panaskan_ jendela Form: ' + err); }
}
/* Pemicu onEdit terpasang: edit tangan di sheet langsung membersihkan simpanan. */
function api_saatEdit_() { api_bersihkanCache_(); }
/* Jalankan sekali dari editor Apps Script (aman diulang): memasang pemicu waktu 5 menit dan pemicu onEdit. */
function api_pasangPemicu_() {
  var id = PropertiesService.getScriptProperties().getProperty('DATA_SHEET_ID');
  if (!id) throw new Error('DATA_SHEET_ID belum diisi di Script Properties');
  var ada = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { ada[t.getHandlerFunction()] = true; });
  if (!ada.api_panaskan_) ScriptApp.newTrigger('api_panaskan_').timeBased().everyMinutes(5).create();
  if (!ada.api_saatEdit_) ScriptApp.newTrigger('api_saatEdit_').forSpreadsheet(id).onEdit().create();
  api_panaskan_();
  console.log('Pemicu api_panaskan_ (5 menit) dan api_saatEdit_ (onEdit) terpasang.');
}

/* Adaptor sheet: baca tab (dengan simpanan sementara), tulis per baris. opsi.paksa: lewati simpanan dan isi ulang. */
function api_adaptor_(opsi) {
  opsi = opsi || {};
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
        var isi = opsi.paksa ? null : cache.get(kunci);
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
      var nomor = t.sheet.getLastRow();
      (KOLOM_TEKS_[nama] || []).forEach(function (h) {
        var j = t.kepala.indexOf(h);
        if (j >= 0 && obj[h] !== undefined && obj[h] !== '') t.sheet.getRange(nomor, j + 1).setNumberFormat('@').setValue(String(obj[h]));
      });
      Object.defineProperty(obj, '_baris', { value: nomor, writable: true, enumerable: false });
      naikkanVersi(nama);
    },
    ubah: function (nama, obj, perubahan) {
      var t = siapkan(nama);
      if (!obj._baris) throw new Error('Baris tidak diketahui di ' + nama);
      Object.keys(perubahan).forEach(function (k) {
        var j = t.kepala.indexOf(k);
        if (j < 0) return;
        var sel = t.sheet.getRange(obj._baris, j + 1);
        if ((KOLOM_TEKS_[nama] || []).indexOf(k) >= 0 && perubahan[k] !== '') sel.setNumberFormat('@').setValue(String(perubahan[k]));
        else sel.setValue(perubahan[k]);
      });
      naikkanVersi(nama);
    },
    hapus: function (nama, obj) {
      var t = siapkan(nama);
      if (obj._baris) t.sheet.deleteRow(obj._baris);
      naikkanVersi(nama);
    },
    /* Pembatas laju untuk aksi publik: true bila masih boleh, false bila sudah melewati batas dalam jendela waktunya. */
    batasi: function (kunci, maks, detik) {
      var kk = 'optima_bts_' + kunci, n = Number(cache.get(kk) || 0);
      if (n >= maks) return false;
      cache.put(kk, String(n + 1), detik);
      return true;
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
