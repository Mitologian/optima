/* Mode tiruan: data contoh di memori browser, memakai Inti.js yang sama dengan server.
   Aktif saat CONFIG.API_URL kosong. Kode contoh: LDC001, LT0001, AGT001.
   Tambahkan ?fase=BOD di alamat untuk target Misi dan label anggota seperti setelah ESM. Tambahkan ?reset=1 untuk mengulang data. */
var Tiruan = (function () {
  var KUNCI = 'optima_tiruan_v8';
  var HARI = 864e5;
  var POSTER_CONTOH = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#C8102E"/><text x="32" y="92" font-family="Arial" font-size="22" fill="#fff" opacity=".8">BNI OPTIMA · BUSINESS OPPORTUNITY DAY</text><text x="32" y="190" font-family="Arial" font-weight="700" font-size="44" fill="#fff">One seat per</text><text x="32" y="244" font-family="Arial" font-weight="700" font-size="44" fill="#fff">classification</text><text x="32" y="316" font-family="Arial" font-size="20" fill="#fff">Wednesday 07:00 to 09:00</text></svg>');
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
      ['Lukman Hakim', 'K05', 'Invited', agung, 2], ['Maya Anggraini', 'K06', 'Listed', agung, 9], ['Nanda Putra', 'K07', 'Invited', agung, 4],
      ['Oki Setiawan', 'K09', 'Coffee_Scheduled', iman, 1], ['Putri Ayu', 'K12', 'Coffee_Session', iman, 11], ['Rudi Hermawan', 'K13', 'Listed', iman, 3],
      ['Sinta Dewi', 'K18', 'Applied', dhika, 5], ['Taufik Hidayat', 'K20', 'Listed', dhika, 8], ['Umar Said', 'K26', 'Attended', sari, 2],
      ['Vina Melati', 'K28', 'Listed', sari, 12], ['Wawan Kurnia', 'K29', 'Coffee_Scheduled', sari, 1], ['Yuni Astuti', 'K43', 'Coffee_Session', dedy, 0],
      ['Zaki Mubarak', 'K50', 'Listed', iman, 6], ['Arif Rahman', 'K51', 'Declined', iman, 3], ['Bella Safitri', 'K21', 'Listed', dhika, 7],
      ['Candra Wibowo', 'K60', 'Joined_Other', agung, 2], ['Dian Novita', 'K36', 'Listed', dedy, 1], ['Erwin Gunawan', 'K05', 'Listed', dhika, 10]
    ];
    var slot = [];
    [[1, '13:00'], [2, '11:00'], [2, '16:00'], [3, '11:00'], [5, '19:00'], [6, '10:00']].forEach(function (x) {
      slot.push({ id_slot: 'S' + String(slot.length + 1).padStart(4, '0'), tanggal: tanggal(new Date(now.getTime() + x[0] * HARI)), jam: x[1], PIC: dedy.id_orang, tempat: 'Zoom', status: 'Kosong', id_orang: '', dipesan_oleh: '', pendamping: slot.length === 1 ? agung.id_orang : '' });
    });
    slot.push({ id_slot: 'S' + String(slot.length + 1).padStart(4, '0'), tanggal: tanggal(new Date(now.getTime() + 4 * HARI)), jam: '19:00', PIC: iman.id_orang, tempat: 'Zoom', status: 'Kosong', id_orang: '', dipesan_oleh: '', pendamping: sari.id_orang });
    calonContoh.forEach(function (c) {
      var o = orang(c[0], 'Calon', c[2], c[1], { PIC: c[3].id_orang, diajukan_oleh: c[3].id_orang, tanggal_masuk: lalu(c[4] + 1), tanggal_sentuh: lalu(c[4]), bisnis: '' });
      if (c[2] === 'Coffee_Scheduled') {
        var h = new Date(now.getTime() + (calonContoh.indexOf(c) % 3 + 1) * HARI), jm = calonContoh.indexOf(c) % 2 ? '14:00' : '10:00';
        o.jadwal_cs = tanggal(h) + 'T' + jm + ':00+07:00';
        slot.push({ id_slot: 'S' + String(slot.length + 1).padStart(4, '0'), tanggal: tanggal(h), jam: jm, PIC: dedy.id_orang, tempat: 'Zoom', status: 'Terisi', id_orang: o.id_orang, dipesan_oleh: c[3].id_orang, pendamping: c[3] === dedy ? '' : c[3].id_orang });
      }
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
    for (var i = 0; i < 8; i++) {
      var r = rabuBerikut(now, i);
      ev.push({ id_event: 'E' + (i * 2 + 1), tanggal: tanggal(r), jam_mulai: '07:00', jam_selesai: '09:00', nama_acara: 'Wednesday BOD', jenis: 'BOD', mode: i % 3 === 2 ? 'Onsite' : 'Online', lokasi: i % 3 === 2 ? 'South Jakarta' : 'Zoom', kapasitas: 60, status: 'Terbuka', tampil_di_form: 'TRUE',
        pembicara: i === 0 ? 'Coach Dedy Dahlan: Why one seat per classification matters' : '', poster: i === 0 ? POSTER_CONTOH : '' });
      ev.push({ id_event: 'E' + (i * 2 + 2), tanggal: tanggal(r), jam_mulai: '12:00', jam_selesai: '13:30', nama_acara: 'Lunch Networking', jenis: 'Lunch Networking', mode: 'Onsite', lokasi: 'South Jakarta', kapasitas: 20, status: 'Terbuka', tampil_di_form: 'TRUE' });
    }
    var lewat = new Date(rabuBerikut(now, 0).getTime() - 7 * HARI);
    ev.push({ id_event: 'E0', tanggal: tanggal(lewat), jam_mulai: '07:00', jam_selesai: '09:00', nama_acara: 'Wednesday BOD', jenis: 'BOD', mode: 'Online', lokasi: 'Zoom', kapasitas: 60, status: 'Selesai', tampil_di_form: 'FALSE' });

    var und = [], hadir = [];
    var a0 = anggota[0];
    var calonA0 = orang('Rika Amalia', 'Calon', 'Attended', 'K08', { PIC: agung.id_orang, diajukan_oleh: a0.id_orang, tanggal_masuk: lalu(9) });
    und.push({ id_undangan: 'U0001', tanggal: lalu(9), id_pengundang: a0.id_orang, id_orang_calon: calonA0.id_orang, id_event: 'E0', status: 'Hadir', sumber: 'app' });
    hadir.push({ id_hadir: 'H00001', id_event: 'E0', id_orang: calonA0.id_orang, peran: 'Visitor', waktu_checkin: iso(lewat), dicatat_oleh: agung.id_orang });
    [[agung, 'P0010'], [dhika, 'P0013'], [sari, 'P0016']].forEach(function (p, i) {
      und.push({ id_undangan: 'U000' + (i + 2), tanggal: lalu(i), id_pengundang: p[0].id_orang, id_orang_calon: M[14 + i * 3].id_orang, id_event: 'E1', status: i < 2 ? 'Terdaftar' : 'Diundang', sumber: i < 2 ? 'form' : 'app' });
    });

    // pendaftar Form contoh: dua perlu dicek (nomor baru, nama mirip) dan satu tanpa pengundang
    var maya = M.filter(function (m) { return m.nama === 'Maya Anggraini'; })[0];
    var taufik = M.filter(function (m) { return m.nama === 'Taufik Hidayat'; })[0];
    var hesti = orang('Hesti Rahayu', 'Calon', 'Invited', 'K22', { sumber: 'form', bisnis: 'Interior design', diajukan_oleh: '', PIC: '' });
    und.push({ id_undangan: 'U0010', tanggal: lalu(1), id_pengundang: '', id_orang_calon: hesti.id_orang, id_event: 'E1', status: 'Terdaftar', sumber: 'form' });
    var responses = [
      { id_response: 'R0001', timestamp: lalu(1), nama: 'Maya Anggrayni', whatsapp: '0812-5550-1234', email: 'maya@example.com', perusahaan: 'Maya Material', bisnis: 'Building materials', kota: 'Jakarta', id_event: 'E1', slot_cs: '', diundang_oleh: 'Agung Pratama', catatan: '', status_cocok: 'Perlu_Cek', id_pengundang: agung.id_orang, id_kandidat: maya.id_orang, id_orang_hasil: '' },
      { id_response: 'R0002', timestamp: lalu(0.3), nama: 'Taufik H.', whatsapp: '+62 813 7777 8888', email: '', perusahaan: '', bisnis: 'Printing', kota: 'Bekasi', id_event: 'E2', slot_cs: '', diundang_oleh: 'Dhika Ramadhan', catatan: '', status_cocok: 'Perlu_Cek', id_pengundang: dhika.id_orang, id_kandidat: taufik.id_orang, id_orang_hasil: '' }
    ];

    return {
      Pengaturan: [
        ['nama_chapter', 'Optima'], ['fase', 'Pembentukan'], ['target_founding', 20], ['target_cgt', 37], ['target_launch', 52],
        ['target_nama_min', 20], ['target_nama_maks', 40], ['hari_bod', 'Rabu'], ['tanggal_esm', '2027-05-24'], ['tanggal_grand_launch', '2027-08-02'],
        ['tautan_form', 'https://forms.gle/contoh-optima'], ['tautan_zoom_cs', 'https://zoom.us/j/contoh-coffee']
      ].map(function (x) { return { kunci: x[0], nilai: x[1] }; }),
      Klasifikasi: klasifikasi,
      Master: M,
      Akses: akses,
      Events: ev,
      Undangan: und,
      Hadir: hadir,
      Butuh: [{ id_kursi: 'K15', id_orang: anggota[1].id_orang, tanggal: lalu(2) }, { id_kursi: 'K15', id_orang: anggota[3].id_orang, tanggal: lalu(1) }, { id_kursi: 'K12', id_orang: anggota[2].id_orang, tanggal: lalu(1) }],
      Wawancara: [{ id_wawancara: 'W1', tanggal: lalu(1), id_orang: 'P0015', kanal: 'Online', PIC: dedy.id_orang, hasil: 'Tertarik' }],
      Jadwal_CS: slot, Responses: responses, Lencana: [], Log: [],
      Pengumuman: [
        { id_pengumuman: 'A0001', tanggal_tayang: lalu(1), tanggal_berakhir: '', judul: 'Bring one guest this Wednesday', isi: 'Every member invites one business owner before Wednesday night. Check "This week" for who is already registered, and use the ready messages in My list.', poster: '', dibuat_oleh: dedy.id_orang, status: 'Aktif' },
        { id_pengumuman: 'A0002', tanggal_tayang: lalu(3), tanggal_berakhir: '', judul: 'Lunch Networking starts at 12:00', isi: 'Guests who cannot make the morning BOD are welcome at lunch. Pay your own lunch.', poster: '', dibuat_oleh: agung.id_orang, status: 'Aktif' }
      ]
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
