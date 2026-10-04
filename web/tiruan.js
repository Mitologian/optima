/* Mode tiruan: data contoh di memori browser, memakai Inti.js yang sama dengan server.
   Aktif saat CONFIG.API_URL kosong. Kode contoh: LDC001, LT0001, AGT001.
   Tambahkan ?fase=BOD di alamat untuk melihat layar setelah ESM. Tambahkan ?reset=1 untuk mengulang data. */
var Tiruan = (function () {
  var KUNCI = 'optima_tiruan_v3';
  var HARI = 864e5;
  var data = null;

  function simpanLokal() { try { localStorage.setItem(KUNCI, JSON.stringify(data)); } catch (e) {} }
  function bacaLokal() { try { return JSON.parse(localStorage.getItem(KUNCI) || 'null'); } catch (e) { return null; } }

  function parseCsv(teks) {
    var baris = teks.trim().split(/\r?\n/);
    var kepala = baris.shift().split(',');
    return baris.map(function (b) {
      var sel = [], cur = '', kutip = false;
      for (var i = 0; i < b.length; i++) {
        var c = b[i];
        if (c === '"') kutip = !kutip;
        else if (c === ',' && !kutip) { sel.push(cur); cur = ''; }
        else cur += c;
      }
      sel.push(cur);
      var o = {};
      kepala.forEach(function (h, j) { o[h] = sel[j]; });
      o.aktif = 'TRUE';
      return o;
    });
  }

  function iso(d) { return d.toISOString(); }
  function tanggal(d) { return new Date(d.getTime() + 7 * 36e5).toISOString().slice(0, 10); }
  function rabuBerikut(dari, ke) {
    var w = new Date(dari.getTime() + 7 * 36e5);
    var selisih = (3 - w.getUTCDay() + 7) % 7;
    return new Date(dari.getTime() + (selisih + 7 * ke) * HARI);
  }

  function benih(klasifikasi) {
    var now = new Date();
    var lalu = function (h) { return iso(new Date(now.getTime() - h * HARI)); };
    var M = [];
    var no = 0;
    function orang(nama, kat, tahap, kursi, ext) {
      no++;
      var o = {
        id_orang: 'P' + String(no).padStart(4, '0'), nama: nama, nama_depan: nama.split(' ')[0],
        whatsapp_norm: '62812' + String(1000000 + no * 7919).slice(0, 7), email: '', perusahaan: '', bisnis: '',
        id_kursi: kursi || '', kota: 'Jakarta', sumber: 'contoh', kategori: kat, tahap: tahap, jenis_anggota: '',
        tanggal_bergabung: '', id_sponsor: '', PIC: '', diajukan_oleh: '', tanggal_masuk: lalu(20), tanggal_sentuh: lalu(3),
        alasan_tidak_lanjut: '', catatan: '', terakhir_diubah: lalu(1)
      };
      for (var k in ext || {}) o[k] = ext[k];
      M.push(o);
      return o;
    }
    var dedy = orang('Dedy Dahlan', 'LDC', 'Anggota', 'K33', { jenis_anggota: 'Founding', tanggal_bergabung: lalu(30), id_sponsor: 'BNI', bisnis: 'Mitologi Inspira' });
    var agung = orang('Agung Pratama', 'LT', 'Anggota', 'K11', { jenis_anggota: 'Founding', tanggal_bergabung: lalu(28), id_sponsor: dedy.id_orang, bisnis: 'Notary Office' });
    var dhika = orang('Dhika Ramadhan', 'LT', 'Anggota', 'K19', { jenis_anggota: 'Founding', tanggal_bergabung: lalu(28), id_sponsor: dedy.id_orang, bisnis: 'Photo Studio' });
    var iman = orang('Iman Santoso', 'LT', 'Anggota', 'K49', { jenis_anggota: 'Founding', tanggal_bergabung: lalu(25), id_sponsor: dedy.id_orang, bisnis: 'IT Support' });
    var sari = orang('Sari Wulandari', 'LT', 'Anggota', 'K27', { jenis_anggota: 'Founding', tanggal_bergabung: lalu(25), id_sponsor: agung.id_orang, bisnis: 'Home Catering' });
    var lt = [dedy, agung, dhika, iman, sari];

    var anggotaContoh = [
      ['Budi Hartono', 'K01', agung, 18], ['Citra Lestari', 'K04', agung, 15], ['Eko Saputra', 'K02', dhika, 14],
      ['Fajar Nugroho', 'K10', iman, 12], ['Gita Permata', 'K17', dhika, 9], ['Hendra Wijaya', 'K25', sari, 6],
      ['Indah Kusuma', 'K41', dedy, 4], ['Joko Susilo', 'K57', agung, 2], ['Kartika Sari', 'K03', dedy, 1]
    ];
    var anggota = anggotaContoh.map(function (a) {
      return orang(a[0], 'Calon', 'Anggota', a[1], { jenis_anggota: 'Founding', tanggal_bergabung: lalu(a[3]), id_sponsor: a[2].id_orang, PIC: a[2].id_orang, diajukan_oleh: a[2].id_orang, bisnis: '' });
    });

    var calonContoh = [
      ['Lukman Hakim', 'K05', 'Tertarik', agung, 2], ['Maya Anggraini', 'K06', 'Baru', agung, 9], ['Nanda Putra', 'K07', 'Dihubungi', agung, 4],
      ['Oki Setiawan', 'K09', 'CS', iman, 1], ['Putri Ayu', 'K12', 'Bimbang', iman, 11], ['Rudi Hermawan', 'K13', 'Baru', iman, 3],
      ['Sinta Dewi', 'K18', 'Tertarik', dhika, 5], ['Taufik Hidayat', 'K20', 'Baru', dhika, 8], ['Umar Said', 'K26', 'Dihubungi', sari, 2],
      ['Vina Melati', 'K28', 'Baru', sari, 12], ['Wawan Kurnia', 'K29', 'CS', sari, 1], ['Yuni Astuti', 'K43', 'Tertarik', dedy, 0],
      ['Zaki Mubarak', 'K50', 'Baru', iman, 6], ['Arif Rahman', 'K51', 'Dihubungi', iman, 3], ['Bella Safitri', 'K21', 'Baru', dhika, 7],
      ['Candra Wibowo', 'K60', 'Tertarik', agung, 2], ['Dian Novita', 'K36', 'Baru', dedy, 1], ['Erwin Gunawan', 'K05', 'Baru', dhika, 10]
    ];
    calonContoh.forEach(function (c) {
      var o = orang(c[0], 'Calon', c[2], c[1], { PIC: c[3].id_orang, diajukan_oleh: c[3].id_orang, tanggal_masuk: lalu(c[4] + 1), tanggal_sentuh: lalu(c[4]), bisnis: '' });
      if (c[2] === 'CS') { var h = new Date(now.getTime() + (calonContoh.indexOf(c) % 3 + 1) * HARI); o.jadwal_cs = tanggal(h) + 'T' + (calonContoh.indexOf(c) % 2 ? '14:00' : '10:00') + ':00+07:00'; }
    });

    var akses = [
      { id_orang: dedy.id_orang, kode_akses: 'LDC001', peran: 'LDC', aktif: 'TRUE', terakhir_masuk: '' },
      { id_orang: agung.id_orang, kode_akses: 'LT0001', peran: 'LT', aktif: 'TRUE', terakhir_masuk: '' },
      { id_orang: dhika.id_orang, kode_akses: 'LT0002', peran: 'LT', aktif: 'TRUE', terakhir_masuk: '' },
      { id_orang: iman.id_orang, kode_akses: 'LT0003', peran: 'LT', aktif: 'TRUE', terakhir_masuk: '' },
      { id_orang: sari.id_orang, kode_akses: 'LT0004', peran: 'LT', aktif: 'TRUE', terakhir_masuk: '' },
      { id_orang: anggota[0].id_orang, kode_akses: 'AGT001', peran: 'Anggota', aktif: 'TRUE', terakhir_masuk: '' }
    ];

    var ev = [];
    for (var i = 0; i < 4; i++) {
      var r = rabuBerikut(now, i);
      ev.push({ id_event: 'E' + (i * 2 + 1), tanggal: tanggal(r), jam_mulai: '07:00', jam_selesai: '09:00', nama_acara: 'Wednesday BOD', jenis: 'BOD', mode: i % 3 === 2 ? 'Onsite' : 'Online', lokasi: i % 3 === 2 ? 'South Jakarta' : 'Zoom', kapasitas: 60, status: 'Terbuka', tampil_di_form: 'TRUE' });
      ev.push({ id_event: 'E' + (i * 2 + 2), tanggal: tanggal(r), jam_mulai: '12:00', jam_selesai: '13:30', nama_acara: 'Lunch Networking', jenis: 'Lunch Networking', mode: 'Onsite', lokasi: 'South Jakarta', kapasitas: 20, status: 'Terbuka', tampil_di_form: 'TRUE' });
    }
    var lewat = new Date(rabuBerikut(now, 0).getTime() - 7 * HARI);
    ev.push({ id_event: 'E0', tanggal: tanggal(lewat), jam_mulai: '07:00', jam_selesai: '09:00', nama_acara: 'Wednesday BOD', jenis: 'BOD', mode: 'Online', lokasi: 'Zoom', kapasitas: 60, status: 'Selesai', tampil_di_form: 'FALSE' });

    var und = [], hadir = [];
    var a0 = anggota[0];
    var calonA0 = orang('Rika Amalia', 'Calon', 'Tertarik', 'K08', { PIC: agung.id_orang, diajukan_oleh: a0.id_orang, tanggal_masuk: lalu(9) });
    und.push({ id_undangan: 'U0001', tanggal: lalu(9), id_pengundang: a0.id_orang, id_orang_calon: calonA0.id_orang, id_event: 'E0', status: 'Hadir', sumber: 'app' });
    hadir.push({ id_hadir: 'H00001', id_event: 'E0', id_orang: calonA0.id_orang, peran: 'Visitor', waktu_checkin: iso(lewat), dicatat_oleh: agung.id_orang });
    [[agung, 'P0010'], [dhika, 'P0013'], [sari, 'P0016']].forEach(function (p, i) {
      und.push({ id_undangan: 'U000' + (i + 2), tanggal: lalu(i), id_pengundang: p[0].id_orang, id_orang_calon: M[14 + i * 3].id_orang, id_event: 'E1', status: i < 2 ? 'Terdaftar' : 'Diundang', sumber: i < 2 ? 'form' : 'app' });
    });

    return {
      Pengaturan: [
        ['nama_chapter', 'Optima'], ['fase', 'Pembentukan'], ['target_founding', 20], ['target_cgt', 37], ['target_launch', 52],
        ['target_nama_min', 20], ['target_nama_maks', 40], ['hari_bod', 'Rabu'], ['tanggal_esm', '2027-05-24'], ['tanggal_grand_launch', '2027-08-02'],
        ['tautan_form', 'https://forms.gle/contoh-optima']
      ].map(function (x) { return { kunci: x[0], nilai: x[1] }; }),
      Klasifikasi: klasifikasi,
      Master: M,
      Akses: akses,
      Events: ev,
      Undangan: und,
      Hadir: hadir,
      Butuh: [{ id_kursi: 'K15', id_orang: anggota[1].id_orang, tanggal: lalu(2) }, { id_kursi: 'K15', id_orang: anggota[3].id_orang, tanggal: lalu(1) }, { id_kursi: 'K12', id_orang: anggota[2].id_orang, tanggal: lalu(1) }],
      Wawancara: [{ id_wawancara: 'W1', tanggal: lalu(1), id_orang: 'P0015', kanal: 'Online', PIC: dedy.id_orang, hasil: 'Tertarik' }],
      Jadwal_CS: [], Responses: [], Lencana: [], Log: []
    };
  }

  var db = {
    baca: function (nama) { return (data[nama] || []).slice(); },
    tambah: function (nama, obj) { (data[nama] = data[nama] || []).push(obj); simpanLokal(); },
    ubah: function (nama, obj, perubahan) {
      for (var k in perubahan) obj[k] = perubahan[k];
      simpanLokal();
    },
    hapus: function (nama, obj) { data[nama] = (data[nama] || []).filter(function (r) { return r !== obj; }); simpanLokal(); },
    terkunci: function () { return false; },
    catatGagal: function () {}
  };

  async function siapkan() {
    if (data) return;
    var q = new URLSearchParams(location.search);
    if (!q.get('reset')) data = bacaLokal();
    if (!data) {
      var csv = CONFIG.CSV_TEKS || await (await fetch(CONFIG.CSV_TIRUAN || '../data/klasifikasi-awal.csv')).text();
      data = benih(parseCsv(csv));
    }
    var fase = q.get('fase');
    if (fase) data.Pengaturan.forEach(function (r) { if (r.kunci === 'fase') r.nilai = fase; });
    simpanLokal();
  }

  async function panggil(badan) {
    await siapkan();
    await new Promise(function (r) { setTimeout(r, 120); });
    // salinan dalam supaya perilaku sama dengan server (objek tidak berbagi rujukan dengan UI)
    return JSON.parse(JSON.stringify(Inti.jalankan(db, badan, new Date())));
  }

  async function setFase(f) {
    await siapkan();
    data.Pengaturan.forEach(function (r) { if (r.kunci === 'fase') r.nilai = f; });
    simpanLokal();
  }
  async function fase() { await siapkan(); return data.Pengaturan.filter(function (r) { return r.kunci === 'fase'; })[0].nilai; }

  return { panggil: panggil, setFase: setFase, fase: fase };
})();
