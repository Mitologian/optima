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

/* Adaptor sheet: baca seluruh tab sekali per permintaan, tulis per baris. */
function api_adaptor_() {
  var props = PropertiesService.getScriptProperties();
  var idSheet = props.getProperty('DATA_SHEET_ID');
  if (!idSheet) throw new Error('DATA_SHEET_ID belum diisi di Script Properties');
  var ss = SpreadsheetApp.openById(idSheet);
  var cache = CacheService.getScriptCache();
  var info = {}; // nama tab -> {sheet, kepala}

  function siapkan(nama) {
    if (info[nama]) return info[nama];
    var sh = ss.getSheetByName(nama);
    if (!sh) throw new Error('Tab tidak ada: ' + nama);
    var lebar = sh.getLastColumn();
    var kepala = lebar ? sh.getRange(1, 1, 1, lebar).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
    info[nama] = { sheet: sh, kepala: kepala };
    return info[nama];
  }

  return {
    baca: function (nama) {
      var t = siapkan(nama);
      var akhir = t.sheet.getLastRow();
      if (akhir < 2 || !t.kepala.length) return [];
      var nilai = t.sheet.getRange(2, 1, akhir - 1, t.kepala.length).getValues();
      var hasil = [];
      nilai.forEach(function (baris, i) {
        if (baris.every(function (v) { return v === '' || v === null; })) return;
        var o = {};
        t.kepala.forEach(function (h, j) { if (h) o[h] = baris[j]; });
        Object.defineProperty(o, '_baris', { value: i + 2, writable: true, enumerable: false });
        hasil.push(o);
      });
      return hasil;
    },
    tambah: function (nama, obj) {
      var t = siapkan(nama);
      var baris = t.kepala.map(function (h) { return obj[h] === undefined ? '' : obj[h]; });
      t.sheet.appendRow(baris);
      Object.defineProperty(obj, '_baris', { value: t.sheet.getLastRow(), writable: true, enumerable: false });
    },
    ubah: function (nama, obj, perubahan) {
      var t = siapkan(nama);
      if (!obj._baris) throw new Error('Baris tidak diketahui di ' + nama);
      Object.keys(perubahan).forEach(function (k) {
        var j = t.kepala.indexOf(k);
        if (j >= 0) t.sheet.getRange(obj._baris, j + 1).setValue(perubahan[k]);
      });
    },
    hapus: function (nama, obj) {
      var t = siapkan(nama);
      if (obj._baris) t.sheet.deleteRow(obj._baris);
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
    simpan: function () { SpreadsheetApp.flush(); }
  };
}

/* Uji cepat dari editor: isi kode akses LDC lalu jalankan. */
function api_ujiMasuk() {
  var kode = PropertiesService.getScriptProperties().getProperty('UJI_KODE');
  var hasil = Inti.jalankan(api_adaptor_(), { action: 'beranda', kode: kode }, new Date());
  console.log(JSON.stringify(hasil, null, 2));
}
