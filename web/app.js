/* BNI Optima · PWA
   Satu berkas, tanpa build. Semua data lewat Api.panggil (lihat KONTRAK.md bagian 6).
   Aturan teks: bahasa app Inggris, tanpa em dash. */
(function () {
  'use strict';

  var S = { kode: '', profil: null, atur: null, cache: {} };
  var $app = document.getElementById('app');
  var $lembar = document.getElementById('lembar');
  var $lembarIsi = $lembar.querySelector('.lembar-isi');
  var $toast = document.getElementById('toast');

  /* ---------- alat ---------- */
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function simpan(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function ambil(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var HARI = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  /* Label tampilan untuk nilai data. Nilai di sheet tidak berubah. */
  var TAHAP_LABEL = { 'Listed': 'Listed', 'Invited': 'Invited', 'Coffee_Scheduled': 'Coffee scheduled', 'Attended': 'Attended', 'Coffee_Session': 'Coffee session done', 'Applied': 'Applied', 'Anggota': 'Joined', 'Joined_Other': 'Joined other chapter', 'Declined': 'Declined', 'Rejected': 'Rejected' };
  var STATUS_UNDANGAN_LABEL = { 'Diundang': 'Invited', 'Terdaftar': 'Registered', 'Hadir': 'Attended', 'Bergabung': 'Joined', 'Batal': 'Cancelled' };
  var JENIS_ANGGOTA_LABEL = { 'Founding': 'Founding', 'Core Group': 'Core Group', 'Anggota': 'Member' };
  var PERAN_LABEL = { 'Visitor': 'Visitor', 'Anggota': 'Member', 'LT': 'LT', 'LDC': 'LDC' };
  function lblTahap(t) { return TAHAP_LABEL[t] || t; }
  function lblStatus(t) { return STATUS_UNDANGAN_LABEL[t] || t; }
  function wib(iso) {
    var d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00+07:00') : new Date(iso);
    return new Date(d.getTime() + 7 * 36e5);
  }
  function tglPendek(iso) { if (!iso) return ''; var w = wib(iso); return w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()]; }
  function tglHari(iso) { if (!iso) return ''; var w = wib(iso); return HARI[w.getUTCDay()] + ', ' + w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()]; }
  function lalu(iso) {
    var m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return m + ' min ago';
    var j = Math.floor(m / 60);
    if (j < 24) return j + ' h ago';
    var h = Math.floor(j / 24);
    return h === 1 ? 'yesterday' : h + ' days ago';
  }
  function inisial(n) { return esc(String(n || '?').trim().charAt(0).toUpperCase()); }
  function jamCS(iso) {
    var w = wib(iso);
    var jam = String(w.getUTCHours()).padStart(2, '0') + ':' + String(w.getUTCMinutes()).padStart(2, '0');
    return { jam: jam, hari: HARI[w.getUTCDay()].slice(0, 3) + ' ' + w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()], pendek: w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()] + ' ' + jam };
  }
  function nilaiLokal(iso) {
    if (!iso) return '';
    var w = wib(iso);
    return w.toISOString().slice(0, 16);
  }
  /* Isian seat baru: dipakai saat menjadikan member, menambah member langsung, mengubah seat member, dan tombol + seat. */
  function barisSeat() {
    return (S.cache.kursi || []).filter(function (b) { return b.nomor <= 9; });
  }
  function isianKursiBaru(opsi) {
    opsi = opsi || {};
    return '<div class="kursi-baru"' + (opsi.tampil ? '' : ' hidden') + '>' +
      '<label class="isian"><span>New classification</span><input name="kb_bidang" maxlength="60" autocomplete="off" value="' + esc(opsi.bidang || '') + '" placeholder="Example: Halal catering"></label>' +
      '<label class="isian"><span>Short name on the seat tile (optional)</span><input name="kb_singkat" maxlength="16" autocomplete="off" placeholder="Up to 16 characters"></label>' +
      '<label class="isian"><span>Contact sphere (row)</span><select name="kb_baris">' + barisSeat().map(function (b) {
        return '<option value="' + b.nomor + '"' + (opsi.baris === b.nomor ? ' selected' : '') + '>' + b.nomor + '. ' + esc(b.sphere) + '</option>';
      }).join('') + '</select></label></div>';
  }
  function bacaKursiBaru(f) { return { bidang: f.kb_bidang.value, singkat: f.kb_singkat.value, baris: f.kb_baris.value }; }
  /* Pilihan seat untuk member: seat kosong, atau "seat baru" bila bisnisnya belum ada di daftar. */
  function pilihKursiAnggota(nama, pilih, bidangUsulan) {
    var opsi = '<option value="">Choose a seat</option>';
    barisSeat().forEach(function (b) { b.kursi.forEach(function (x) { if (x.status !== 'terisi' || x.id_kursi === pilih) opsi += '<option value="' + esc(x.id_kursi) + '"' + (x.id_kursi === pilih ? ' selected' : '') + '>' + esc(x.bidang) + '</option>'; }); });
    opsi += '<option value="__baru">+ New classification (not on the list)</option>';
    return '<label class="isian"><span>Classification seat</span><select name="' + nama + '" data-pilih-seat required>' + opsi + '</select></label>' +
      isianKursiBaru({ bidang: bidangUsulan });
  }
  function pasangKursiBaru(el) {
    var sel = el.querySelector('select[data-pilih-seat]');
    var kotak = el.querySelector('.kursi-baru');
    if (!sel || !kotak) return;
    sel.onchange = function () {
      var baru = sel.value === '__baru';
      kotak.hidden = !baru;
      el.querySelector('[name=kb_bidang]').required = baru;
    };
  }
  /* Bagian seat pada data yang dikirim: id_kursi biasa, atau kursi_baru bila memilih seat baru. */
  function dataSeat(f, namaSelect) {
    var v = f[namaSelect].value;
    return v === '__baru' ? { kursi_baru: bacaKursiBaru(f) } : { id_kursi: v };
  }

  function pilihKursiKosong(nama, wajib) {
    var opsi = [];
    (S.cache.kursi || []).forEach(function (b) { b.kursi.forEach(function (x) { if (x.status !== 'terisi') opsi.push('<option value="' + esc(x.id_kursi) + '">' + esc(x.bidang) + '</option>'); }); });
    return '<label class="isian"><span>' + (wajib ? 'Classification seat' : 'Pick a seat if one fits (optional)') + '</span><select name="' + nama + '"' + (wajib ? ' required' : '') + '><option value="">Choose a seat</option>' + opsi.join('') + '</select></label>';
  }
  function waLink(nomor, teks) { return 'https://wa.me/' + (nomor || '') + (teks ? '?text=' + encodeURIComponent(teks) : ''); }

  /* Nomor yang bisa diketuk: langsung membuka chat WhatsApp ke nomor itu. */
  function nomorWa(no) {
    var n = String(no || '').replace(/\D/g, '');
    return n ? '<a class="nomor-wa" href="' + esc(waLink(n)) + '" target="_blank" rel="noopener">+' + esc(n) + '</a>' : '<span class="kecil">No number yet</span>';
  }
  function ikonWa(no, nama) {
    var n = String(no || '').replace(/\D/g, '');
    return n ? '<a class="wa-ikon" href="' + esc(waLink(n)) + '" target="_blank" rel="noopener" aria-label="WhatsApp ' + esc(nama || '') + '">WA</a>' : '';
  }

  function toast(pesan, rayakan) {
    $toast.textContent = pesan;
    $toast.className = 'toast tampil' + (rayakan ? ' rayakan' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { $toast.className = 'toast'; }, rayakan ? 4200 : 2800);
  }

  function bukaLembar(html, siap) {
    $lembarIsi.innerHTML = html;
    $lembar.hidden = false;
    document.body.style.overflow = 'hidden';
    if (siap) siap($lembarIsi);
  }
  function tutupLembar() { $lembar.hidden = true; document.body.style.overflow = ''; }
  $lembar.addEventListener('click', function (e) { if (e.target.hasAttribute('data-tutup')) tutupLembar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') tutupLembar(); });

  /* Cepat dibuka: jawaban bacaan terakhir langsung dipakai, lalu diperbarui diam-diam di belakang.
     Bila isinya berubah, layar yang sedang terbuka digambar ulang. Aksi tulis mengosongkan simpanan. */
  var BACA_CEPAT = { beranda: 1, kursi: 1, kursiDetail: 1, papan: 1, pengumuman: 1, undanganSaya: 1, calonSaya: 1, usulanSaya: 1, daftarAnggota: 1, riwayatRonde: 1, acara: 1, perluCek: 1, anggota: 1, tamuPekanIni: 1, jadwalCS: 1, slotCS: 1, regroup: 1, kontak: 1, orangSemua: 1, orangDetail: 1, bacaPengaturan: 1, ringkas: 1, kandidatDriver: 1, daftarHadir: 1, lihatTab: 1, acaraCheckin: 1, timPapan: 1, timDaftar: 1 };
  var SEGAR_DETIK = 8, BASI_MENIT = 720;
  var simpanan = {}, sedangMuat = {}, tundaSimpan = 0;
  /* Simpanan juga disimpan di HP supaya app yang dibuka ulang langsung menampilkan data terakhir, lalu diperbarui di belakang. */
  function simpanSimpanan() {
    clearTimeout(tundaSimpan);
    tundaSimpan = setTimeout(function () {
      if (!S.kode) return;
      var teksSimpan = JSON.stringify({ kode: S.kode, data: simpanan });
      if (teksSimpan.length < 1500000) simpan('optima_cache', teksSimpan);
    }, 600);
  }
  function muatSimpanan(kode) {
    try {
      var c = JSON.parse(ambil('optima_cache') || 'null');
      if (c && c.kode === kode && c.data) simpanan = c.data;
    } catch (e) {}
  }
  function bersihkanLokal() { simpan('optima_cache', null); simpan('optima_awal', null); }
  function kosongkanSimpanan() { simpanan = {}; sedangMuat = {}; kosongVersi++; simpan('optima_cache', null); }
  function layarSibuk() {
    var a = document.activeElement;
    return !$lembar.hidden || (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }
  async function api(aksi, data) {
    if (!BACA_CEPAT[aksi]) {
      var w = await Api.panggil(aksi, data);
      if (!w.ok && /Access code not recognized/.test(w.pesan || '') && aksi !== 'masuk') keluar();
      if (w.ok && aksi !== 'masuk') kosongkanSimpanan();
      return w;
    }
    var kunci = aksi + '|' + JSON.stringify(data || {});
    var c = simpanan[kunci], umur = c ? (Date.now() - c.t) / 1000 : Infinity;
    if (c && umur < BASI_MENIT * 60) {
      if (umur > SEGAR_DETIK && !sedangMuat[kunci]) {
        sedangMuat[kunci] = true;
        var versi = kosongVersi;
        Api.panggil(aksi, data).then(function (baru) {
          delete sedangMuat[kunci];
          if (versi !== kosongVersi || !baru.ok) return;
          var beda = JSON.stringify(baru) !== JSON.stringify(c.r);
          simpanan[kunci] = { r: baru, t: Date.now() };
          simpanSimpanan();
          if (beda && S.aktif && !layarSibuk()) S.aktif.fn(S.aktif.isi, S.aktif.sub);
        });
      }
      return JSON.parse(JSON.stringify(c.r));
    }
    var r = await Api.panggil(aksi, data);
    if (!r.ok && /Access code not recognized/.test(r.pesan || '')) keluar();
    if (r.ok) { simpanan[kunci] = { r: JSON.parse(JSON.stringify(r)), t: Date.now() }; simpanSimpanan(); }
    return r;
  }
  var kosongVersi = 0;

  var isLT = function () { return S.profil && (S.profil.peran === 'LT' || S.profil.peran === 'LDC'); };
  var isLDC = function () { return S.profil && S.profil.peran === 'LDC'; };

  /* ---------- ikon ---------- */
  var IK = {
    misi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></svg>',
    kursi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5" fill="currentColor"/></svg>',
    undang: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>',
    papan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 21V11M16 21V7M12 21V3M4 21h16"/></svg>',
    minggu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>',
    tim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .8 3.2 2.5 3.6 5.2"/></svg>',
    L_UNDANGAN_PERTAMA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>',
    L_TAMU_DATANG: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V4a1 1 0 0 1 1-1h9v18"/><path d="M13 3h4a1 1 0 0 1 1 1v17"/><path d="M10 12h.01"/><path d="M2 21h20"/></svg>',
    L_SPONSOR_PERTAMA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>',
    L_TIGA_KURSI: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="16" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>',
    L_RABU_5: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
  };

  /* ---------- kerangka ---------- */
  function menu() {
    var m = [{ id: 'misi', label: 'Home' }];
    m.push({ id: 'undang', label: 'My list' });
    m.push({ id: 'minggu', label: 'This week' });
    m.push({ id: 'kursi', label: 'Seats' });
    if (!isLT()) m.push({ id: 'papan', label: 'Board' });
    if (isLT()) m.push({ id: 'tim', label: 'Team' });
    return m;
  }

  function kerangka(aktif) {
    var nav = menu().map(function (x) {
      return '<a href="#' + x.id + '"' + (x.id === aktif ? ' aria-current="page"' : '') + '>' + IK[x.id] + '<span>' + x.label + '</span></a>';
    }).join('');
    $app.innerHTML =
      '<header class="kepala"><div class="kepala-dalam">' +
        '<div class="merek"><b>BNI</b><span>' + esc(S.atur.nama_chapter) + '</span></div>' +
        '<span class="fase">' + esc(S.profil.peran === 'LDC' ? 'LDC' : S.profil.peran === 'LT' ? 'Launch team' : 'Member') + '</span>' +
        '<button class="keluar" id="keluar" aria-label="Log out">Log out</button>' +
      '</div></header>' +
      '<main class="wadah" id="isi"><div class="muat" style="margin-top:22px"></div><div class="muat"></div></main>' +
      '<nav class="nav" aria-label="Main menu">' + nav + '</nav>';
    document.getElementById('keluar').onclick = function () {
      bukaLembar('<h2>Log out of the app?</h2><p class="kecil" style="margin:6px 0 14px">The access code must be entered again to log in.</p><button class="tombol" id="ya-keluar">Log out</button><div class="baris-tombol"><button class="tombol kedua" data-tutup>Cancel</button></div>', function (el) {
        el.querySelector('#ya-keluar').onclick = function () { tutupLembar(); keluar(); };
        el.querySelector('[data-tutup]').onclick = tutupLembar;
      });
    };
    return document.getElementById('isi');
  }

  function keluar() {
    simpan('optima_kode', null); bersihkanLokal();
    S.kode = ''; S.profil = null; S.atur = null; S.aktif = null; kosongkanSimpanan();
    Api.setKode('');
    location.hash = '';
    layarMasuk();
  }

  /* ---------- masuk ---------- */
  function layarMasuk(pesan) {
    var hias = '';
    // 32 kotak: sebagian terisi (merah), beberapa diundang (merah muda), sisanya kursi kosong
    var pola = [0, 1, 3, 6, 9, 10, 12, 15, 17, 18, 22, 27, 28, 31];
    var diundang = [2, 13, 21, 25];
    for (var i = 0; i < 32; i++) hias += '<i class="' + (pola.indexOf(i) >= 0 ? 'isi' : (diundang.indexOf(i) >= 0 ? 'undang' : '')) + '" style="animation-delay:' + (i * 18) + 'ms"></i>';
    $app.innerHTML =
      '<div class="masuk">' +
        '<div class="merek-besar"><small>BNI CHAPTER</small><span>OPTIMA</span></div>' +
        '<p class="tagline-masuk">Optimal Network, Optimal Profits</p>' +
        '<p class="kecil" style="margin-top:6px">One classification per seat. Fill them together.</p>' +
        '<div class="kisi-hias">' + hias + '</div>' +
        '<form id="f-masuk">' +
          '<label class="isian"><span>Access code</span><input class="kode" name="kode" maxlength="8" autocomplete="one-time-code" autocapitalize="characters" required></label>' +
          (pesan ? '<p class="pesan-salah">' + esc(pesan) + '</p>' : '') +
          '<button class="tombol" type="submit">Log in</button>' +
        '</form>' +
        '<p class="kecil redup" style="margin-top:14px">The access code is shared by Coach Dedy or the launch team.</p>' +
        (Api.tiruan ? '<div class="petunjuk-tiruan"><b>Sample mode.</b> Mock data, not connected to the sheet. Try code <b>LDC001</b> (Coach Dedy), <b>LT0001</b> (launch team), or <b>AGT001</b> (member).</div>' : '') +
      '</div>';
    var f = document.getElementById('f-masuk');
    f.onsubmit = async function (e) {
      e.preventDefault();
      var tombol = f.querySelector('button');
      tombol.disabled = true; tombol.textContent = 'Checking...';
      var ok = await coba(f.kode.value.trim().toUpperCase());
      if (!ok.ok) layarMasuk(ok.pesan);
    };
  }

  /* Memanaskan simpanan: layar lain yang mungkin dibuka berikutnya dimuat diam-diam. */
  function panaskan() {
    if (!S.profil) return;
    ['kursi', 'pengumuman', 'undanganSaya'].concat(isLT() ? ['calonSaya', 'acara'].concat(isLDC() ? ['orangSemua', 'timDaftar', 'anggota'] : []) : ['papan', 'timPapan']).forEach(function (a) { api(a, a === 'calonSaya' ? {} : undefined); });
  }

  async function coba(kode) {
    Api.setKode(kode);
    var r = await Api.panggil('masuk');
    if (!r.ok) { Api.setKode(''); return r; }
    S.kode = kode; S.profil = r.profil; S.atur = r.pengaturan;
    simpan('optima_kode', kode);
    simpan('optima_awal', JSON.stringify({ kode: kode, profil: r.profil, atur: r.pengaturan }));
    if (!location.hash) location.hash = '#misi'; else rute();
    setTimeout(panaskan, 1500);
    return r;
  }

  /* ---------- rute ---------- */
  function rute() {
    if (!S.profil) return;
    var h = (location.hash || '#misi').slice(1).split('-');
    var ada = menu().map(function (x) { return x.id; });
    var layar = ada.indexOf(h[0]) >= 0 ? h[0] : 'misi';
    tutupLembar();
    var isi = kerangka(layar);
    window.scrollTo(0, 0);
    var fn = ({ misi: layarMisi, kursi: layarKursi, undang: layarUndang, minggu: layarMinggu, papan: layarPapan, tim: layarTim })[layar];
    S.aktif = { fn: fn, isi: isi, sub: h[1] };
    fn(isi, h[1]);
  }
  window.addEventListener('hashchange', rute);

  /* ---------- MISI ---------- */
  function grafikMisi(m) {
    var data = m.riwayat && m.riwayat.length ? m.riwayat : [{ selesai: new Date().toISOString(), jumlah: m.anggota }];
    var W = 320, H = 118, kiri = 8, kanan = 62, atas = 12, bawah = 24;
    var ymax = Math.max(m.gerbang[2], m.anggota) * 1.08;
    var n = data.length;
    var x = function (i) { return n === 1 ? kiri + (W - kiri - kanan) : kiri + i * (W - kiri - kanan) / (n - 1); };
    var y = function (v) { return atas + (H - atas - bawah) * (1 - v / ymax); };
    var nama = ['ESM', 'CGT', 'Launch'];
    var garis = m.gerbang.map(function (g, i) {
      var lewat = m.anggota >= g;
      return '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(g) + '" y2="' + y(g) + '" class="g-gerbang' + (lewat ? ' lewat' : '') + '"/>' +
        '<text x="' + (W - kanan + 6) + '" y="' + (y(g) + 4) + '" class="g-label' + (lewat ? ' lewat' : '') + '">' + g + ' ' + nama[i] + '</text>';
    }).join('');
    var titik = data.map(function (d, i) { return x(i).toFixed(1) + ',' + y(d.jumlah).toFixed(1); });
    var area = n > 1 ? '<path class="g-area" d="M' + x(0) + ',' + y(0) + ' L' + titik.join(' L') + ' L' + x(n - 1) + ',' + y(0) + ' Z"/>' : '';
    var jalur = n > 1 ? '<polyline class="g-garis" points="' + titik.join(' ') + '"/>' : '';
    var akhir = data[n - 1];
    var sentuh = data.map(function (d, i) {
      var lebar = n === 1 ? 40 : (W - kiri - kanan) / (n - 1);
      return '<rect class="g-sentuh" x="' + (x(i) - lebar / 2) + '" y="0" width="' + lebar + '" height="' + H + '" data-i="' + i + '"/>';
    }).join('');
    return '<div class="grafik" data-titik="' + esc(JSON.stringify(data)) + '">' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Member growth per week, now ' + akhir.jumlah + ' members">' +
        '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="g-dasar"/>' +
        garis + area + jalur +
        '<line class="g-silang" x1="0" x2="0" y1="' + atas + '" y2="' + y(0) + '" style="display:none"/>' +
        '<circle class="g-ujung" cx="' + x(n - 1) + '" cy="' + y(akhir.jumlah) + '" r="5"/>' +
        '<text class="g-tgl" x="' + kiri + '" y="' + (H - 6) + '">' + esc(tglPendek(data[0].selesai)) + '</text>' +
        (n > 1 ? '<text class="g-tgl" text-anchor="end" x="' + (W - kanan) + '" y="' + (H - 6) + '">' + esc(tglPendek(akhir.selesai)) + '</text>' : '') +
        sentuh +
      '</svg><p class="g-info">Tap the chart for weekly totals.</p></div>';
  }

  function pasangGrafik(akar) {
    var g = akar.querySelector('.grafik');
    if (!g) return;
    var data = JSON.parse(g.dataset.titik);
    var info = g.querySelector('.g-info');
    var silang = g.querySelector('.g-silang');
    g.querySelectorAll('.g-sentuh').forEach(function (r) {
      var tunjuk = function () {
        var d = data[Number(r.dataset.i)];
        var cx = Number(r.getAttribute('x')) + Number(r.getAttribute('width')) / 2;
        silang.setAttribute('x1', cx); silang.setAttribute('x2', cx); silang.style.display = '';
        info.textContent = 'Week ending ' + tglHari(d.selesai) + ': ' + d.jumlah + ' members';
      };
      r.addEventListener('click', tunjuk);
      r.addEventListener('mouseenter', tunjuk);
    });
  }

  function kartuMisi(m, st) {
    var sisa = Math.max(0, m.target - m.anggota);
    var sub = sisa ? sisa + ' more members to reach ' + (m.target === m.gerbang[0] ? 'ESM' : m.target === m.gerbang[1] ? 'Core Group Training' : 'Grand Launch')
                   : 'Target for this phase reached. On to the next gate.';
    var hari = m.hari_ke_esm ? [m.hari_ke_esm, 'days to ESM'] : m.hari_ke_launch ? [m.hari_ke_launch, 'days to Grand Launch'] : null;
    var gold = st ? goldBaris(st) : '';
    return '<section class="kartu misi">' +
      '<div class="label">Chapter Mission</div>' +
      '<div class="angka">' + m.anggota + ' <small>/ ' + m.target + ' members</small></div>' +
      '<div class="sub">' + esc(sub) + '.</div>' +
      '<div class="ubin-misi">' +
        (hari ? '<div><b>' + hari[0] + '</b><span>' + hari[1] + '</span></div>' : '') +
        '<div><b>' + m.anggota_baru_pekan + '</b><span>new members this week</span></div>' +
      '</div>' +
      grafikMisi(m) + gold +
    '</section>';
  }
  function goldBaris(st) {
    var n = st.sponsor, maks = st.target_gold || 6;
    return '<div class="gold-baris"><span>Gold path</span><div class="bilah' + (n >= maks ? ' emas' : '') + '"><i style="width:' + Math.min(100, n / maks * 100) + '%"></i></div><b>' + n + ' / ' + maks + '</b></div>';
  }

  /* ---------- pengumuman, poster, gold ---------- */
  function urlPoster(u) {
    u = String(u || '');
    var m = u.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)/) || u.match(/^https:\/\/drive\.google\.com\/open\?id=([\w-]+)/);
    return m ? 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w800' : u;
  }
  function kartuPoster(u) {
    if (!u) return '';
    var ok = /^https:\/\//i.test(u) || /^data:image\//i.test(u);
    if (!ok) return '';
    return '<a class="poster" href="' + esc(u) + '" target="_blank" rel="noopener"><img class="poster-img" src="' + esc(urlPoster(u)) + '" alt="Poster" loading="lazy"><span class="poster-tautan">Open poster</span></a>';
  }
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t.classList && t.classList.contains('poster-img')) { t.remove(); }
  }, true);

  function kartuPengumuman(daftar) {
    if (!daftar.length) return '';
    function satu(a, buka) {
      return '<details class="pengumuman"' + (buka ? ' open' : '') + '><summary><b>' + esc(a.judul) + '</b><em>' + esc(lalu(a.tanggal_tayang)) + '</em></summary>' +
        '<p>' + esc(a.isi).replace(/\n/g, '<br>') + '</p>' + kartuPoster(a.poster) +
        '<p class="kecil redup">By ' + esc(a.oleh) + (a.tanggal_berakhir ? ' · until ' + esc(tglPendek(a.tanggal_berakhir)) : '') + '</p></details>';
    }
    var lama = daftar.slice(1, 4);
    return '<section class="kartu sorotan-info"><div class="langkah-atas"><span class="chip merah">Announcement</span></div>' + satu(daftar[0], true) +
      (lama.length ? '<details class="lipat-kecil"><summary>' + lama.length + ' earlier</summary>' + lama.map(function (a) { return satu(a, false); }).join('') + '</details>' : '') + '</section>';
  }

  function kartuLangkah(b, pipa, cek) {
    var st = b.saya, min = st.target_nama_min, maks = st.target_nama_maks, n = st.nama_daftar;
    var judul, isi, tombol, href;
    var tunggu = pipa ? pipa.filter(function (c) { return ['Listed', 'Invited', 'Attended'].indexOf(c.tahap) >= 0; }).length : 0;
    var cs = pipa ? pipa.filter(function (c) { return c.tahap === 'Coffee_Scheduled'; }).length : 0;
    if (isLT() && cek) {
      judul = 'Check Form sign-ups'; href = '#tim'; tombol = 'Open interviews';
      isi = cek + ' sign-up' + (cek > 1 ? 's' : '') + ' from the Form need a decision, so guests are matched to the right inviter.';
    } else if (n < min) {
      judul = 'Add prospect names'; href = '#kursi'; tombol = 'Choose a seat';
      isi = (min - n) + ' more names to reach the minimum of ' + min + '. Tap a seat on the board, then add a prospect from that classification.';
    } else if (isLT() && tunggu) {
      judul = 'Set coffee sessions'; href = '#tim'; tombol = 'Open interviews';
      isi = tunggu + ' prospect' + (tunggu > 1 ? 's' : '') + ' waiting for a coffee session date.';
    } else if (isLT() && cs) {
      judul = 'Record coffee session results'; href = '#tim'; tombol = 'Open interviews';
      isi = cs + ' coffee session' + (cs > 1 ? 's' : '') + ' scheduled. After each one, tap Done, then Accepted when the prospect says yes.';
    } else if (b.ronde.acara_berikut && st.undangan_ronde < 1) {
      judul = 'Invite one Visitor'; href = '#undang'; tombol = 'Open my list';
      isi = 'Pick one name from the list and send the invitation via WhatsApp before Wednesday night.';
    } else if (n < maks) {
      judul = 'Keep building the name list'; href = '#kursi'; tombol = 'Add name';
      isi = 'Minimum of ' + min + ' reached. Goal is ' + maks + ' names.';
    } else {
      var adaAcara = !!b.ronde.acara_berikut;
      judul = 'All steps done'; href = adaAcara ? '#minggu' : '#kursi'; tombol = adaAcara ? 'See this week' : 'View seats';
      isi = 'Goal of ' + maks + ' names reached' + (adaAcara ? ' and this Wednesday mission is done.' : '.');
    }
    var api = b.saya.rabu_beruntun > 0 ? '<span class="chip emas">' + b.saya.rabu_beruntun + ' Wednesday streak</span>' : '';
    return '<section class="kartu langkah"><div class="langkah-atas"><span class="chip merah">Next step</span>' + api + '</div>' +
      '<h2>' + esc(judul) + '</h2><p class="kecil">' + esc(isi) + '</p>' +
      '<div class="bilah-ganda"><div class="bilah' + (n >= min ? ' emas' : '') + '"><i style="width:' + Math.min(100, n / maks * 100) + '%"></i></div><span class="tanda-min" style="left:' + (min / maks * 100) + '%"></span></div>' +
      '<p class="kecil redup" style="margin:6px 0 12px">' + n + ' of ' + maks + ' names (minimum ' + min + ')</p>' +
      '<div class="baris-tombol"><a class="tombol" href="' + href + '">' + esc(tombol) + '</a></div></section>';
  }

  function lipat(judul, info, isi, buka) {
    return '<details class="lipat"' + (buka ? ' open' : '') + '><summary><span>' + judul + '</span><em>' + info + '</em></summary>' + isi + '</details>';
  }

  function sorotan(undangan) {
    var dilihat = {};
    try { dilihat = JSON.parse(ambil('optima_dilihat') || '{}'); } catch (e) {}
    return undangan.filter(function (u) {
      return (u.status === 'Hadir' || u.status === 'Bergabung') && !dilihat[u.id_undangan + u.status];
    });
  }
  function tandaiDilihat(daftar) {
    var dilihat = {};
    try { dilihat = JSON.parse(ambil('optima_dilihat') || '{}'); } catch (e) {}
    daftar.forEach(function (u) { dilihat[u.id_undangan + u.status] = 1; });
    simpan('optima_dilihat', JSON.stringify(dilihat));
  }

  async function layarMisi(isi) {
    var tugas = [api('beranda'), isLT() ? api('calonSaya', {}) : Promise.resolve(null), api('pengumuman'), api('undanganSaya'), isLT() ? api('perluCek') : Promise.resolve(null), isLT() ? Promise.resolve(null) : api('timPapan')];
    var h = await Promise.all(tugas);
    var b = h[0], pipa = h[1] && h[1].ok ? h[1].calon : null, pg = h[2], ud = h[3], pcek = h[4] && h[4].ok ? h[4].jumlah : 0, tm = h[5];
    if (!b.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(b.pesan) + '</p>'; return; }
    var html = '<div class="sapa"><h1>Hello, ' + esc(S.profil.nama_depan) + '</h1>' +
      (tm && tm.ok && tm.aktif && tm.saya ? '<p class="kecil">You are in ' + esc(tm.saya.nama) + ', ' + urutan(tm.saya.peringkat) + ' of ' + tm.saya.dari + ' this round.</p>' : '') +
      '</div>';

    var sorot = ud && ud.ok ? sorotan(ud.undangan) : [];
    if (sorot.length) {
      html += '<section class="kartu sorotan"><h3>News from invitations</h3><ul class="kabar">' + sorot.map(function (u) {
        return '<li class="k-' + (u.status === 'Bergabung' ? 'baris' : 'anggota') + '"><span class="titik"></span><div>' + esc(u.nama_depan) + (u.status === 'Bergabung' ? ' has joined the chapter. Congratulations, this came from an invitation.' : ' attended ' + esc(u.acara) + ' ' + esc(tglPendek(u.tanggal)) + '.') + '</div></li>';
      }).join('') + '</ul><div class="baris-tombol"><button class="tombol kecil kedua" id="b-sorot">Mark as read</button></div></section>';
    }

    html += kartuPengumuman(pg && pg.ok ? pg.pengumuman : []);
    html += kartuLangkah(b, pipa, pcek);
    html += kartuMisi(b.misi, isLT() ? null : b.saya);

    var dapat = b.lencana.filter(function (l) { return l.didapat; }).length;
    if (!isLT()) html += lipat('My badges', dapat + ' of 5',
      '<div class="lencana-baris">' + b.lencana.map(function (l) {
        return '<div class="lencana' + (l.didapat ? ' dapat' : '') + (l.baru ? ' baru' : '') + '" title="' + esc(l.ket) + '"><div class="koin">' + IK['L_' + l.kode] + '</div>' + esc(l.nama) + '</div>';
      }).join('') + '</div><p class="catatan-main">A game to cheer each other on, not a ranking.</p>', b.lencana.some(function (l) { return l.baru; }));
    html += lipat('Chapter news', b.kabar.length ? b.kabar.length + ' latest' : 'none yet',
      b.kabar.length ? '<ul class="kabar">' + b.kabar.map(function (k) {
        return '<li class="k-' + esc(k.jenis) + '"><span class="titik"></span><div>' + esc(k.teks) + '<time>' + esc(lalu(k.waktu)) + '</time></div></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">No news yet. The first good news is coming.</p>', false);

    isi.innerHTML = html;
    pasangGrafik(isi);
    var bs = isi.querySelector('#b-sorot');
    if (bs) bs.onclick = function () { tandaiDilihat(sorot); isi.querySelector('.sorotan').remove(); };
    if (sorot.some(function (u) { return u.status === 'Bergabung'; })) toast('An invitation brought in a new member', true);
    var baru = b.lencana.filter(function (l) { return l.baru; })[0];
    if (baru) setTimeout(function () { toast('New badge: ' + baru.nama, true); }, sorot.length ? 4400 : 0);
  }

  /* ---------- KURSI ---------- */
  var saringKursi = 'semua';
  var tabKursi = 'papan';
  async function layarKursi(isi) {
    var tabs = '<div class="tab" role="tablist" style="margin-top:18px"><button role="tab" data-tk="papan" aria-selected="' + (tabKursi === 'papan') + '">Seat Board</button><button role="tab" data-tk="anggota" aria-selected="' + (tabKursi === 'anggota') + '">Member list</button></div>';
    if (tabKursi === 'anggota') return layarAnggota(isi, tabs);
    var r = await api('kursi');
    if (!r.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    S.cache.kursi = r.baris;
    var n = { terisi: 0, ada_calon: 0, kosong: 0 };
    r.baris.forEach(function (b) { b.kursi.forEach(function (x) { n[x.status]++; }); });
    var lengkap = r.baris.filter(function (b) { return b.lengkap; }).length;
    var saring = [['semua', 'All'], ['kosong', 'Empty']];
    if (saringKursi !== 'kosong') saringKursi = 'semua';
    function lolos(x) { return saringKursi === 'semua' || x.status === 'kosong'; }
    isi.innerHTML = tabs +
      '<div class="sapa" style="margin-top:4px"><h1>' + r.baris.reduce(function (a, b) { return a + b.kursi.length; }, 0) + ' Seat Board</h1><p class="kecil">Tap a seat, then add a prospect from that classification.</p></div>' +
      '<div class="ringkas-kursi">' +
        '<span><i style="background:var(--merah)"></i>' + n.terisi + ' filled</span>' +
        '<span><i style="background:var(--merah-muda);border:1.5px solid var(--merah)"></i>' + n.ada_calon + ' with prospects</span>' +
        '<span><i style="border:1.5px dashed var(--abu)"></i>' + n.kosong + ' empty</span>' +
        (lengkap ? '<span><i style="background:var(--emas)"></i>' + lengkap + ' rows complete</span>' : '') +
      '</div>' +
      '<div class="saring" role="group" aria-label="Filter seats">' + saring.map(function (s) {
        return '<button data-saring="' + s[0] + '" aria-pressed="' + (saringKursi === s[0]) + '">' + s[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="papan-kursi">' + r.baris.map(function (b) {
        return '<section class="baris-kursi' + (b.lengkap ? ' lengkap' : '') + '">' +
          '<header><span class="no">' + (b.nomor > 9 ? '+' : b.nomor) + '</span><h3>' + esc(b.sphere) + '</h3><span class="hitung">' + b.terisi + '/' + b.kursi.length + '</span>' + (isLT() && b.nomor <= 9 ? '<button type="button" class="chip tambah-kursi" data-tambah-baris="' + b.nomor + '" aria-label="Add a seat to ' + esc(b.sphere) + '">+ seat</button>' : '') + '</header>' +
          [b.kursi.slice(0, 4), b.kursi.slice(4)].map(function (sep) { return '<div class="kisi">' + sep.map(function (x) {
            var redam = !lolos(x);
            return '<button class="kursi ' + x.status + (redam ? ' redam' : '') + (x.saya_calon ? ' milik' : '') + '" data-kursi="' + esc(x.id_kursi) + '" aria-label="' + esc(x.bidang) + ', ' + (x.status === 'terisi' ? 'filled by ' + x.pemilik : x.status === 'ada_calon' ? x.jumlah_calon + ' prospects' : 'empty') + (x.saya_calon ? ', ' + x.saya_calon + ' from my list' : '') + '">' +
              (x.jumlah_butuh && x.status !== 'terisi' ? '<span class="dicari"></span>' : '') +
              (x.status === 'ada_calon' ? '<span class="badge">' + x.jumlah_calon + '</span>' : '') +
              '<span class="t">' + esc(x.singkat || x.bidang) + '</span></button>';
          }).join('') + '</div>'; }).join('') + '</section>';
      }).join('') + '</div>' +
      '<p class="catatan-main"><span class="titik-emas"></span> member wanted &nbsp; <span class="cincin-saya"></span> from my list</p>' +
      (isLT() && r.tanpa_kursi && r.tanpa_kursi.length ? '<div class="judul-bagian"><h2>Prospects without a seat</h2><span class="kecil">classification not on the list yet</span></div><section class="kartu"><p>' + r.tanpa_kursi.map(function (x) { return '<span class="chip" style="margin:0 6px 6px 0">' + esc(x.bisnis) + ' · ' + x.jumlah + '</span>'; }).join('') + '</p><p class="catatan-main">When one of them joins, the seat can be created while making them a member.</p></section>' : '') +
      '<button class="tombol kedua" id="b-tanpa-kursi" style="margin-top:6px">Name with a classification not on the list</button>';
    isi.querySelectorAll('[data-tk]').forEach(function (t) { t.onclick = function () { tabKursi = t.dataset.tk; layarKursi(isi); }; });
    isi.querySelectorAll('[data-saring]').forEach(function (t) {
      t.onclick = function () { saringKursi = t.dataset.saring; layarKursi(isi); };
    });
    isi.querySelectorAll('[data-kursi]').forEach(function (t) {
      t.onclick = function () { bukaKursi(t.dataset.kursi, function () { layarKursi(isi); }); };
    });
    isi.querySelector('#b-tanpa-kursi').onclick = function () { bukaKursi('', function () { layarKursi(isi); }); };
    isi.querySelectorAll('[data-tambah-baris]').forEach(function (t) {
      t.onclick = function (e) { e.stopPropagation(); lembarTambahKursi(Number(t.dataset.tambahBaris), function () { layarKursi(isi); }); };
    });
  }

  async function layarAnggota(isi, tabs) {
    isi.innerHTML = tabs + '<div class="muat"></div>';
    var r = await api('daftarAnggota');
    if (!r.ok) { isi.innerHTML = tabs + '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var per = {};
    r.anggota.forEach(function (a) { var s = a.sphere || 'Other'; (per[s] = per[s] || []).push(a); });
    isi.innerHTML = tabs +
      '<div class="sapa" style="margin-top:4px"><h1>' + r.anggota.length + ' members</h1><p class="kecil">Each member holds one classification. The classifications below are locked.</p></div>' +
      '<input class="cari" id="cari" placeholder="Search name or classification" type="search">' +
      Object.keys(per).map(function (s) {
        return '<div class="judul-bagian"><h2>' + esc(s) + '</h2><span class="kecil">' + per[s].length + '</span></div><section class="kartu"><ul class="daftar">' + per[s].map(function (a) {
          return '<li data-cari="' + esc((a.nama + ' ' + a.bidang).toLowerCase()) + '"><span class="lambang">' + inisial(a.nama) + '</span><div class="utama"><b>' + esc(a.nama) + '</b><span>' + esc(a.bidang) + (a.sponsor ? ' · sponsor ' + esc(a.sponsor) : '') + '</span></div>' +
            (a.total_bod !== undefined && a.total_bod > 0 ? '<span class="chip' + (a.hadir_bod < a.total_bod ? ' merah' : ' hijau') + '" title="BODs attended">' + a.hadir_bod + '/' + a.total_bod + ' BOD</span>' : '') + '</li>';
        }).join('') + '</ul></section>';
      }).join('');
    isi.querySelectorAll('[data-tk]').forEach(function (t) { t.onclick = function () { tabKursi = t.dataset.tk; layarKursi(isi); }; });
    isi.querySelector('#cari').oninput = function (e) {
      var q = e.target.value.toLowerCase();
      isi.querySelectorAll('[data-cari]').forEach(function (li) { li.hidden = q && li.dataset.cari.indexOf(q) < 0; });
    };
  }

  function ubinKursi(x) { return '<span class="kursi ' + x.status + '"><span class="t">' + esc(x.singkat) + '</span></span>'; }

  async function bukaKursi(id, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var tugas = [id ? api('kursiDetail', { id_kursi: id }) : Promise.resolve({ ok: true, kursi: { id_kursi: '', bidang: 'Undecided classification', singkat: '?', sphere: 'No seat', status: 'kosong', jumlah_calon: 0, jumlah_butuh: 0, saya_butuh: false }, calon: [], calon_saya: [] })];
    tugas.push(api('acara'));
    var h = await Promise.all(tugas);
    var d = h[0], ac = h[1];
    if (!d.ok) { bukaLembar('<p class="kosong-isi">' + esc(d.pesan) + '</p>'); return; }
    var x = d.kursi;
    var html = '<div class="tajuk">' + ubinKursi(x) + '<div><p class="kecil">' + esc(x.sphere) + '</p><h2>' + esc(x.bidang) + '</h2></div></div>';

    if (x.status === 'terisi') {
      html += '<section class="kartu" style="box-shadow:none"><p>This seat belongs to <b>' + esc(x.pemilik) + '</b>.</p><p class="kecil" style="margin-top:6px">Per BNI rules, one classification is for one member only. Prospects from this classification cannot join the chapter.</p></section>';
      if (isLDC() && id) html += '<p class="edit-seat"><button type="button" id="b-edit-seat">Edit seat</button></p>';
      bukaLembar(html, function (el) { var be = el.querySelector('#b-edit-seat'); if (be) be.onclick = function () { lembarEditKursi(x, segarkan); }; });
      return;
    }

    var info = [];
    if (x.jumlah_calon) info.push('<span class="chip merah">' + x.jumlah_calon + ' prospects</span>');
    if (x.jumlah_butuh) info.push('<span class="chip emas">' + x.jumlah_butuh + ' members want this</span>');
    if (info.length) html += '<p style="display:flex;gap:6px;margin:-4px 0 14px">' + info.join('') + '</p>';

    if (!id) html += '<p class="kecil" style="margin:-4px 0 14px">For names with an unclear classification. The launch team will match them to the right seat.</p>';
    if (!isLT() && d.calon_saya && d.calon_saya.length) {
      html += '<section class="kartu" style="box-shadow:none"><h3>From my list</h3><ul class="daftar">' + d.calon_saya.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b></div><span class="chip">' + esc(lblTahap(c.tahap)) + '</span></li>';
      }).join('') + '</ul></section>';
    }
    if (d.calon && d.calon.length) {
      html += '<section class="kartu" style="box-shadow:none"><h3>Prospects for this seat</h3><ul class="daftar">' + d.calon.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>PIC ' + esc(c.pic || 'none yet') + (c.diajukan && c.diajukan !== c.pic ? ' · added by ' + esc(c.diajukan) : '') + '</span></div><span class="chip">' + esc(lblTahap(c.tahap)) + '</span></li>';
      }).join('') + '</ul></section>';
    }

    if (!id && !S.cache.kursi) { var kr0 = await api('kursi'); if (kr0.ok) S.cache.kursi = kr0.baris; }
    var pilihanAcara = (ac && ac.ok ? ac.acara : []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; });
    html += '<form id="f-calon">' +
      '<h3 style="margin:4px 0 10px">' + (id ? 'Add a prospect for ' + esc(x.bidang) : 'Add a name') + '</h3>' +
      '<label class="isian"><span>Full name</span><input name="nama" required autocomplete="off"></label>' +
      (id ? '<label class="isian"><span>Business name or type</span><input name="bisnis" required autocomplete="off"></label>'
        : '<label class="isian"><span>Classification (their type of business)</span><input name="bisnis" required autocomplete="off" placeholder="Example: Halal catering"></label>' +
          '<p class="kecil" style="margin:-6px 0 12px">Not on the seat list? Type it here. The launch team can add the seat once the person joins.</p>' + pilihKursiKosong('id_kursi', false)) +
      '<label class="isian"><span>WhatsApp' + (isLT() ? '' : ' (can be added later)') + '</span><input name="whatsapp" inputmode="tel" autocomplete="off" placeholder="08..."' + (isLT() ? ' required' : '') + '></label>' +
      (pilihanAcara.length ? '<label class="saklar"><input type="checkbox" name="undang"><span>Also invite to a Wednesday event<br><span class="kecil">WhatsApp number is required when inviting.</span></span></label>' +
        '<div id="pil-acara" hidden style="margin:-4px 0 14px"></div>' : '') +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<button class="tombol" type="submit">Add name</button>' +
    '</form>';
    if (id) {
      html += '<div class="baris-tombol"><button class="tombol kedua" id="b-butuh" aria-pressed="' + x.saya_butuh + '">' + (x.saya_butuh ? 'Remove "I need this" mark' : 'I need this classification in the chapter') + '</button></div>';
    }
    if (isLDC() && id) html += '<p class="edit-seat"><button type="button" id="b-edit-seat">Edit seat</button></p>';

    bukaLembar(html, function (el) {
      var f = el.querySelector('#f-calon');
      var cek = f.querySelector('[name=undang]');
      var pil = el.querySelector('#pil-acara');
      if (cek) cek.onchange = function () { pil.hidden = !cek.checked; f.whatsapp.required = cek.checked || isLT(); };
      var evForm = pilihanAcara.length ? pilihanAcara[0].id_event : '';
      if (pil) kalender(pil, pilihanAcara.map(itemAcara), { pilih: evForm, onPick: function (k) { evForm = k; } });
      f.onsubmit = async function (e) {
        e.preventDefault();
        var tombol = f.querySelector('[type=submit]');
        tombol.disabled = true;
        var idEv = cek && cek.checked ? evForm : '';
        var data = { id_kursi: x.id_kursi || (f.id_kursi ? f.id_kursi.value : ''), nama: f.nama.value, bisnis: f.bisnis.value, whatsapp: f.whatsapp.value, id_event: idEv || '' };
        var r = await api('tambahCalon', data);
        tombol.disabled = false;
        var salah = el.querySelector('#salah');
        if (!r.ok) {
          var t = r.pesan;
          if (r.duplikat) t += ' (' + r.duplikat.nama_depan + (r.duplikat.tahap ? ', stage ' + lblTahap(r.duplikat.tahap) + ', PIC ' + (r.duplikat.pic || 'none yet') : '') + ')';
          salah.textContent = t; salah.hidden = false; return;
        }
        if (r.id_undangan) {
          var e2 = pilihanAcara.filter(function (z) { return z.id_event === idEv; })[0];
          lembarKirim(f.nama.value.trim().split(/\s+/)[0], f.whatsapp.value, e2, id ? x.bidang : '', f.bisnis.value);
        } else {
          tutupLembar();
          toast(!id ? 'Name added to the list' : x.status === 'kosong' ? 'The ' + x.bidang + ' seat now has a prospect' : 'Name added to the ' + x.bidang + ' seat', !!id && x.status === 'kosong');
        }
        if (segarkan) segarkan();
      };
      var be2 = el.querySelector('#b-edit-seat');
      if (be2) be2.onclick = function () { lembarEditKursi(x, segarkan); };
      var bb = el.querySelector('#b-butuh');
      if (bb) bb.onclick = async function () {
        var r = await api('butuh', { id_kursi: x.id_kursi });
        if (!r.ok) return toast(r.pesan);
        tutupLembar();
        toast(r.saya_butuh ? 'Mark added. Other members will see a gold dot.' : 'Mark removed.');
        if (segarkan) segarkan();
      };
    });
  }

  /* ---------- kalender pilih (acara Rabu dan jam coffee session) ----------
     items: [{key, tanggal 'YYYY-MM-DD', judul, sub}]. opsi: {pilih, onPick(key), gaya 'kartu'|'chip'} */
  var BULAN_PANJANG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function kalender(wadah, items, opsi) {
    var perTgl = {};
    items.forEach(function (i) { (perTgl[i.tanggal] = perTgl[i.tanggal] || []).push(i); });
    var daftarTgl = Object.keys(perTgl).sort();
    var hariIni = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    var pilihKey = opsi.pilih || '';
    var awal = items.filter(function (i) { return i.key === pilihKey; })[0];
    var pilihTgl = awal ? awal.tanggal : (daftarTgl[0] || '');
    var bulan = (pilihTgl || hariIni).slice(0, 7);
    var bulanAkhir = (daftarTgl[daftarTgl.length - 1] || hariIni).slice(0, 7);
    function geserBulan(b, n) { var y = Number(b.slice(0, 4)), m = Number(b.slice(5, 7)) - 1 + n; y += Math.floor(m / 12); m = ((m % 12) + 12) % 12; return y + '-' + String(m + 1).padStart(2, '0'); }
    function gambar() {
      var y = Number(bulan.slice(0, 4)), m = Number(bulan.slice(5, 7)) - 1;
      var mulai = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;
      var jumlah = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      var sel = '';
      for (var i = 0; i < mulai; i++) sel += '<span></span>';
      for (var d = 1; d <= jumlah; d++) {
        var t = bulan + '-' + String(d).padStart(2, '0'), ada = perTgl[t];
        var kelas = (ada ? 'ada' : '') + (t === pilihTgl ? ' pilih' : '') + (t === hariIni ? ' hari-ini' : '') + (perTgl[t] && perTgl[t].some(function (x) { return x.key === pilihKey; }) ? ' terpilih' : '');
        sel += '<button type="button" class="' + kelas + '" data-tgl="' + t + '"' + (ada ? '' : ' disabled') + ' aria-label="' + esc(tglHari(t)) + (ada ? ', ' + ada.length + ' option' + (ada.length > 1 ? 's' : '') : '') + '">' + d + (ada ? '<i>' + ada.slice(0, 3).map(function () { return '<em></em>'; }).join('') + '</i>' : '') + '</button>';
      }
      var opsiHari = perTgl[pilihTgl] || [];
      wadah.innerHTML = '<div class="kal">' +
        '<div class="kal-kepala"><button type="button" data-geser="-1" aria-label="Previous month"' + (bulan <= hariIni.slice(0, 7) ? ' disabled' : '') + '>&#8249;</button><b>' + BULAN_PANJANG[m] + ' ' + y + '</b><button type="button" data-geser="1" aria-label="Next month"' + (bulan >= bulanAkhir ? ' disabled' : '') + '>&#8250;</button></div>' +
        '<div class="kal-grid">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (h) { return '<abbr>' + h.charAt(0) + '</abbr>'; }).join('') + sel + '</div>' +
        (pilihTgl && pilihTgl.slice(0, 7) === bulan ? '<p class="kal-tgl">' + esc(tglHari(pilihTgl)) + '</p><div class="' + (opsi.gaya === 'chip' ? 'pilihan slot-pilih' : 'kal-opsi') + '">' + opsiHari.map(function (i) {
          return '<button type="button" data-key="' + esc(i.key) + '" aria-pressed="' + (i.key === pilihKey) + '"><b>' + esc(i.judul) + '</b><small>' + esc(i.sub || '') + '</small></button>';
        }).join('') + '</div>' : '<p class="kal-tgl redup">Tap a marked date.</p>') +
        '</div>';
      wadah.querySelectorAll('[data-geser]').forEach(function (b) { b.onclick = function () { bulan = geserBulan(bulan, Number(b.dataset.geser)); var adaDi = daftarTgl.filter(function (t) { return t.slice(0, 7) === bulan; })[0]; if (adaDi && pilihTgl.slice(0, 7) !== bulan) pilihTgl = adaDi; gambar(); }; });
      wadah.querySelectorAll('[data-tgl]').forEach(function (b) { b.onclick = function () { pilihTgl = b.dataset.tgl; if (perTgl[pilihTgl].length === 1) { pilihKey = perTgl[pilihTgl][0].key; if (opsi.onPick) opsi.onPick(pilihKey); } gambar(); }; });
      wadah.querySelectorAll('[data-key]').forEach(function (b) { b.onclick = function () { pilihKey = b.dataset.key; if (opsi.onPick) opsi.onPick(pilihKey); gambar(); }; });
    }
    gambar();
    return { set: function (k) { pilihKey = k; gambar(); } };
  }
  function itemAcara(e) {
    return { key: e.id_event, tanggal: e.tanggal, judul: e.jenis === 'BOD' ? 'BOD ' + e.jam_mulai : 'Lunch Networking ' + e.jam_mulai,
      sub: (e.jam_selesai ? e.jam_mulai + ' to ' + e.jam_selesai + ' · ' : '') + (e.mode === 'Online' ? 'Online, ' + (e.lokasi || 'Zoom') : (e.lokasi || 'Onsite')) };
  }

  /* ---------- templat pesan undangan ----------
     Mengikuti panduan "Let's Invite Visitor": 4 pesan berurutan (pembuka, undangan, daftar, setelah daftar)
     dan balasan untuk keraguan. Gaya bahasa mengikuti kedekatan member dengan tamunya. */
  var HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  var BULAN_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  function tglID(iso) { var w = wib(iso); return HARI_ID[w.getUTCDay()] + ', ' + w.getUTCDate() + ' ' + BULAN_ID[w.getUTCMonth()]; }
  var KEDEKATAN = [['dekat', 'Close friend'], ['teman', 'Friend'], ['kenal', 'Acquaintance']];
  var LANGKAH = [['1', 'Opener'], ['2', 'Invite'], ['3', 'Register'], ['4', 'After sign-up']];
  var PRONOMINA = { dekat: { aku: 'gue', kamu: 'lu' }, teman: { aku: 'aku', kamu: 'kamu' }, kenal: { aku: 'saya', kamu: 'Anda' } };
  var PESAN_ID = {
    dekat: [
      function (d) { return 'Halo ' + d.tamu + ', lu bisnisnya di bidang ' + d.bidang + ' kan ya?\n\nGue mau ngajak lu ketemu teman-teman pebisnis gue, sesama owner, yang menurut gue cocok banget buat bisnis lu. Kita lagi cari pebisnis di bidang ' + d.bidang + ' kayak lu, gue rasa lu bakal nemu banyak peluang di sana. Ikut yuk, gue kenalin.'; },
      function (d) { return d.hari + ' ada pertemuan ' + d.acara + ' ' + d.tempat + ', jam ' + d.jam + ', bareng komunitas owner bisnis Jakarta. Isinya networking dan tukar peluang bisnis antar anggota. Acaranya invitation only, tapi gue ada di sana, jadi bisa ajak lu kalau mau.'; },
      function (d) { return 'Buat daftar jadi visitor, isi form ini ya: ' + d.form + '\nPilih nama gue (' + d.saya + ') di kolom "Diundang oleh" dan pakai nomor WA ini. Nanti gue pastiin lu dapat seat.'; },
      function (d) { return 'Sampai ketemu ya! Nanti di sana gue kenalin ke teman-teman owner lain, semoga nambah network lu dan bantu ' + d.bisnis + ' makin luas jangkauannya!'; }
    ],
    teman: [
      function (d) { return 'Halo ' + d.tamu + ', bisnismu di bidang ' + d.bidang + ' kan ya?\n\nAku mau kenalin kamu sama teman-teman pebisnisku. Mereka circle business owners yang saling support satu sama lain. Kayaknya bisa ada peluang kolaborasi sama kamu.'; },
      function (d) { return d.hari + ' ada pertemuan ' + d.acara + ' ' + d.tempat + ', pukul ' + d.jam + ', bareng komunitas owner bisnis Jakarta. Fokusnya networking dan tukar peluang bisnis antar anggota. Acaranya invitation only, tapi aku ada di sana, jadi bisa ajak kamu kalau mau.'; },
      function (d) { return 'Untuk daftar sebagai visitor, isi form ini ya: ' + d.form + '\nPilih namaku (' + d.saya + ') di kolom "Diundang oleh" dan pakai nomor WhatsApp ini. Nanti aku pastikan kamu dapat seat.'; },
      function (d) { return 'Sampai ketemu ya! Nanti di sana aku kenalin ke teman-teman business owners lain, semoga nambah networkmu dan bantu ' + d.bisnis + ' makin luas jangkauannya!'; }
    ],
    kenal: [
      function (d) { return 'Selamat ' + d.salam + ' ' + d.tamu + ', bisnis Anda di bidang ' + d.bidang + ', benar?\n\nSaya ingin memperkenalkan Anda dengan rekan-rekan pemilik bisnis lintas industri yang saling mendukung. Kami sedang mencari pebisnis di bidang ' + d.bidang + ', dan menurut saya Anda cocok bergabung dalam pertemuan kami.'; },
      function (d) { return 'Pertemuan ' + d.acara + ' kami diadakan ' + d.hari + ', pukul ' + d.jam + ', ' + d.tempat + ', bersama komunitas pemilik bisnis Jakarta. Fokusnya networking dan pertukaran peluang bisnis antar anggota. Acara ini hanya dengan undangan, dan saya dengan senang hati mengajak Anda.'; },
      function (d) { return 'Untuk mendaftar sebagai tamu, mohon isi form berikut: ' + d.form + '\nPada kolom "Diundang oleh", mohon pilih ' + d.saya + ', dan gunakan nomor WhatsApp ini. Saya akan memastikan Anda mendapat tempat.'; },
      function (d) { return 'Terima kasih sudah mendaftar. Sampai bertemu! Di sana saya akan memperkenalkan Anda kepada pemilik bisnis lain, semoga menambah jaringan dan membantu ' + d.bisnis + ' menjangkau lebih luas.'; }
    ]
  };
  var PESAN_EN = {
    santai: [
      function (d) { return 'Hi ' + d.tamu + ', your business is in ' + d.bidang + ', right?\n\nI would love to introduce you to my circle of business owners. We support each other, and I think there is real potential to work together.'; },
      function (d) { return d.hari + ' we have ' + d.acara + ' ' + d.tempat + ', at ' + d.jam + ', with a community of Jakarta business owners. It is about networking and sharing business opportunities. It is invitation only, but I will be there, so I can bring you along.'; },
      function (d) { return 'To register as a visitor, fill in this form: ' + d.form + '\nChoose my name (' + d.saya + ') under "Invited by" and use this WhatsApp number. I will make sure you get a seat.'; },
      function (d) { return 'See you there! I will introduce you to the other business owners, and hopefully it grows your network and helps ' + d.bisnis + ' reach further.'; }
    ],
    formal: [
      function (d) { return 'Good ' + (d.salamEn) + ' ' + d.tamu + ', your business is in ' + d.bidang + ', correct?\n\nI would like to introduce you to a community of business owners across industries who support one another. We are looking for ' + d.bidang + ' professionals, and I believe you would be a good fit.'; },
      function (d) { return 'Our ' + d.acara + ' takes place ' + d.hari + ' at ' + d.jam + ', ' + d.tempat + ', with Jakarta business owners. The focus is networking and exchanging business opportunities. It is by invitation only, and I would be glad to invite you.'; },
      function (d) { return 'To register as a guest, please fill in this form: ' + d.form + '\nUnder "Invited by", please choose ' + d.saya + ', and use this WhatsApp number. I will make sure a seat is reserved for you.'; },
      function (d) { return 'Thank you for registering. I look forward to seeing you. I will introduce you to other business owners, and I hope it widens your network and helps ' + d.bisnis + ' grow.'; }
    ]
  };
  var BALASAN = [
    ['"What is BNI?"',
      'Jadi ini komunitas pemilik bisnis yang isinya pengusaha saling kasih peluang bisnis.\n\n{Aku} bukan orang yang paling tepat jelasin detailnya, takut kurang lengkap. {Aku} kenalin {kamu} langsung ke Coach Dedy Dahlan ya, dia Launch Director yang handle ini dan jauh lebih ngerti. Lebih enak dengar langsung dari dia. {Aku} set waktu ngobrol ya?',
      'Ini komunitas pemilik bisnis tempat para pengusaha saling memberi peluang bisnis.\n\nSaya bukan orang yang paling tepat untuk menjelaskan detailnya, khawatir kurang lengkap. Saya perkenalkan Anda langsung dengan Coach Dedy Dahlan, Launch Director yang menangani ini. Lebih baik mendengar langsung dari beliau. Boleh saya atur waktunya?'],
    ['"Let me think about it"',
      'Santai, nggak ada keharusan apa-apa kok. Ngobrol dulu aja sama dia, dengerin penjelasannya, baru {kamu} putuskan. Nggak cocok ya nggak apa-apa. {Aku} cuma nggak mau {kamu} kelewatan kalau ternyata cocok.\n\n{Aku} kenalin ya, 15 menit aja paling ngobrolnya.',
      'Tidak ada keharusan apa pun. Silakan berbincang dulu dengan beliau, dengarkan penjelasannya, lalu Anda putuskan. Jika tidak cocok, tidak apa-apa. Saya hanya tidak ingin Anda melewatkannya jika ternyata cocok.\n\nBoleh saya perkenalkan? Sekitar 15 menit saja.'],
    ['"I am busy"',
      'Paham, makanya nggak usah lama. Cukup 15 menit ngobrol sama Coach Dedy Dahlan lewat Zoom, kapan {kamu} sempat. {Aku} bantu carikan slot yang paling pas. Lebih enak awal minggu atau akhir minggu?',
      'Mengerti, karena itu tidak perlu lama. Cukup 15 menit berbincang dengan Coach Dedy Dahlan lewat Zoom, kapan pun Anda sempat. Saya bantu carikan slot yang pas. Awal minggu atau akhir minggu lebih nyaman?'],
    ['"Is this MLM?"',
      'Bukan, ini bukan MLM dan nggak ada jual-jualan produk.\n\nIni murni komunitas bisnis buat tukar peluang dan kolaborasi antar pengusaha. Tapi biar {kamu} dapat gambaran yang benar dan lengkap, mending dengar langsung dari Coach Dedy Dahlan ya, dia yang paling ngerti. {Aku} set waktu singkat aja.',
      'Bukan, ini bukan MLM dan tidak ada penjualan produk.\n\nIni murni komunitas bisnis untuk bertukar peluang dan berkolaborasi antar pengusaha. Agar Anda mendapat gambaran yang benar dan lengkap, sebaiknya mendengar langsung dari Coach Dedy Dahlan. Saya atur waktu singkat saja.'],
    ['Asks about fees, commitment, schedule',
      'Pertanyaan bagus, dan justru itu yang paling pas dijawab langsung sama Coach Dedy Dahlan, biar {kamu} dapat info yang akurat, bukan setengah-setengah dari {aku}.\n\n{Aku} set di [waktu] bisa?',
      'Pertanyaan yang baik, dan paling tepat dijawab langsung oleh Coach Dedy Dahlan agar informasinya akurat, bukan setengah-setengah dari saya.\n\nBisakah saya atur di [waktu]?'],
    ['Interested and ready to continue',
      'Sip! {Aku} kenalin {kamu} sama Coach Dedy Dahlan ya. {Aku} kasih kontak {kamu} ke dia sekarang, nanti dia yang follow up.',
      'Baik. Saya perkenalkan Anda dengan Coach Dedy Dahlan. Saya berikan kontak Anda kepada beliau sekarang, nanti beliau yang menindaklanjuti.']
  ];
  function balasanTeks(b, kedekatan) {
    if (kedekatan === 'kenal') return b[2];
    var p = PRONOMINA[kedekatan];
    return b[1].replace(/\{Aku\}/g, p.aku.charAt(0).toUpperCase() + p.aku.slice(1)).replace(/\{aku\}/g, p.aku).replace(/\{kamu\}/g, p.kamu);
  }
  function dataPesan(namaTamu, e, bidang, bisnis) {
    var id = true;
    var jam = Number((e.jam_mulai || '12').split(/[:.]/)[0]);
    return {
      tamu: namaTamu, saya: S.profil.nama_depan, chapter: S.atur.nama_chapter, acara: e.nama_acara,
      bidang: bidang || bisnis || 'bisnis', bisnisNama: bisnis || '',
      salam: jam < 11 ? 'pagi' : jam < 15 ? 'siang' : 'sore', salamEn: jam < 12 ? 'morning' : 'afternoon',
      form: urlFormUndangan(), jam: e.jam_mulai, hariID: tglID(e.tanggal), hariEn: tglHari(e.tanggal),
      tempatID: e.mode === 'Online' ? 'online lewat ' + (e.lokasi || 'Zoom') : 'di ' + (e.lokasi || 'lokasi yang akan dikabari'),
      tempatEn: e.mode === 'Online' ? 'online via ' + (e.lokasi || 'Zoom') : 'at ' + (e.lokasi || 'a location to be confirmed')
    };
  }
  /* Tautan Form dengan nama pengundang sudah terisi, bila kolom Form dan alamat panjangnya sudah diatur di Settings. */
  function urlFormUndangan() {
    var f = S.atur.tautan_form || '', ent = S.atur.form_entry_pengundang, nama = S.profil && S.profil.nama;
    if (!f) return '(form link)';
    if (ent && nama && /^https:\/\/docs\.google\.com\/forms\//.test(f)) return f + (f.indexOf('?') < 0 ? '?' : '&') + 'usp=pp_url&' + ent + '=' + encodeURIComponent(nama);
    return f;
  }
  function buatPesan(bahasa, kedekatan, langkah, namaTamu, e, bidang, bisnis) {
    var d = dataPesan(namaTamu, e, bidang, bisnis);
    d.bisnis = bahasa === 'en' ? (d.bisnisNama || 'your business') : (d.bisnisNama ? 'bisnis ' + d.bisnisNama : (kedekatan === 'kenal' ? 'bisnis Anda' : kedekatan === 'dekat' ? 'bisnis lu' : 'bisnismu'));
    if (bahasa === 'id') { d.hari = d.hariID; d.tempat = d.tempatID; return PESAN_ID[kedekatan][langkah](d); }
    d.hari = d.hariEn; d.tempat = d.tempatEn;
    return PESAN_EN[kedekatan === 'kenal' ? 'formal' : 'santai'][langkah](d);
  }
  function salinTeks(teksnya, ta) {
    function cadangan() { var x = document.createElement('textarea'); x.value = teksnya; x.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy'); } catch (e) {} x.remove(); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(teksnya).catch(cadangan); else cadangan();
  }

  /* Lembar undangan: pilih acara, kedekatan, dan langkah pesan, lalu salin atau kirim.
     opsi: {id, nama, wa, bidang, bisnis, acara[], idEv, tercatat, segarkan} */
  function lembarUndangan(o) {
    var depan = o.nama.split(/\s+/)[0];
    var st = { dekat: 'teman', bahasa: 'id', langkah: 0, balasan: false, idEv: o.idEv || (o.acara[0] && o.acara[0].id_event), tercatat: !!o.tercatat, wa: o.wa || '' };
    var bidang = o.bidang && !/^Undecided/.test(o.bidang) ? o.bidang : '';
    function acaraDipilih() { return o.acara.filter(function (z) { return z.id_event === st.idEv; })[0]; }
    bukaLembar(
      '<h2>Invite ' + esc(depan) + '</h2>' +
      '<p class="kecil" id="u-info" style="margin:4px 0 12px">' + (st.tercatat ? 'Invitation recorded. Send the messages in order, one at a time.' : 'Pick the event and how close you are. The invitation is recorded when a message is copied or sent.') + '</p>' +
      '<p class="kecil" style="margin-bottom:6px">Which Wednesday?</p><div id="u-ev" style="margin-bottom:12px"></div>' +
      (st.wa ? '' : '<label class="isian"><span>WhatsApp ' + esc(depan) + '</span><input id="u-wa" inputmode="tel" placeholder="08..." autocomplete="off"></label>') +
      '<p class="kecil" style="margin-bottom:6px">How close are you to ' + esc(depan) + '?</p><div class="pilihan" id="u-dekat" style="margin-bottom:12px">' + KEDEKATAN.map(function (g) {
        return '<button type="button" data-dekat="' + g[0] + '" aria-pressed="' + (g[0] === st.dekat) + '">' + g[1] + '</button>';
      }).join('') + '<button type="button" id="u-bhs" class="bahasa" aria-label="Switch message language">ID | EN</button></div>' +
      '<div class="seg langkah-seg" id="u-langkah">' + LANGKAH.map(function (g, i) {
        return '<button type="button" data-langkah="' + i + '" aria-selected="' + (i === st.langkah) + '"><b>' + g[0] + '</b><span>' + g[1] + '</span></button>';
      }).join('') + '</div>' +
      '<p class="kecil redup" id="u-petunjuk" style="margin:8px 2px"></p>' +
      '<textarea id="u-pesan" class="pesan-undangan" rows="8"></textarea>' +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<div class="baris-tombol" style="margin-top:10px"><button class="tombol" id="u-wa-buka">Open WhatsApp</button><button class="tombol kedua" id="u-salin">Copy message</button></div>' +
      '<details class="lipat" id="u-balasan" style="margin-top:14px"><summary><span>If they hesitate or ask</span><em>replies</em></summary><div id="u-balasan-isi"></div></details>',
      function (el) {
        var ta = el.querySelector('#u-pesan');
        var petunjuk = ['Start the conversation. Wait for a reply before sending the next one.', 'Share the details of the event.', 'Send the form link. Ask them to choose your name under "Invited by".', 'Send this after they have registered.'];
        function segarPesan() {
          var e = acaraDipilih();
          if (e) ta.value = buatPesan(st.bahasa, st.dekat, st.langkah, depan, e, bidang, o.bisnis);
          el.querySelector('#u-petunjuk').textContent = 'Message ' + (st.langkah + 1) + ' of 4. ' + petunjuk[st.langkah];
          var wadah = el.querySelector('#u-balasan');
          wadah.hidden = st.bahasa !== 'id';
          el.querySelector('#u-balasan-isi').innerHTML = BALASAN.map(function (b, i) {
            return '<div class="balasan"><b>' + esc(b[0]) + '</b><p>' + esc(balasanTeks(b, st.dekat)).replace(/\n/g, '<br>') + '</p><button type="button" class="tombol kecil kedua" data-salin-balasan="' + i + '">Copy</button></div>';
          }).join('');
          el.querySelectorAll('[data-salin-balasan]').forEach(function (b) {
            b.onclick = function () { salinTeks(balasanTeks(BALASAN[Number(b.dataset.salinBalasan)], st.dekat), ta); toast('Reply copied.'); };
          });
        }
        function tanda(wadah, atr, nilai) { el.querySelectorAll(wadah + ' [' + atr + ']').forEach(function (b) { var a = b.hasAttribute('aria-selected') ? 'aria-selected' : 'aria-pressed'; b.setAttribute(a, b.getAttribute(atr) === String(nilai)); }); }
        function gambarAcara() {
          var w = el.querySelector('#u-ev');
          if (st.tercatat) { var e = acaraDipilih(), it = e ? itemAcara(e) : null; w.innerHTML = it ? '<div class="kal-tetap"><b>' + esc(tglHari(e.tanggal)) + ' · ' + esc(it.judul) + '</b><small>' + esc(it.sub) + '</small></div>' : ''; return; }
          kalender(w, o.acara.map(itemAcara), { pilih: st.idEv, onPick: function (k) { st.idEv = k; segarPesan(); } });
        }
        gambarAcara();
        el.querySelectorAll('[data-dekat]').forEach(function (b) { b.onclick = function () { st.dekat = b.dataset.dekat; tanda('#u-dekat', 'data-dekat', st.dekat); segarPesan(); }; });
        el.querySelectorAll('[data-langkah]').forEach(function (b) { b.onclick = function () { st.langkah = Number(b.dataset.langkah); tanda('#u-langkah', 'data-langkah', st.langkah); segarPesan(); }; });
        el.querySelector('#u-bhs').onclick = function () { st.bahasa = st.bahasa === 'id' ? 'en' : 'id'; this.textContent = st.bahasa === 'id' ? 'ID | EN' : 'EN | ID'; segarPesan(); };
        segarPesan();
        async function catat() {
          if (st.tercatat) return true;
          var kolom = el.querySelector('#u-wa'), wa = kolom ? kolom.value : st.wa;
          var s = el.querySelector('#salah');
          if (!wa) { s.textContent = 'Enter the WhatsApp number first.'; s.hidden = false; return false; }
          var r = await api('undang', { id_orang: o.id, id_event: st.idEv, whatsapp: kolom ? wa : '' });
          if (!r.ok) { s.textContent = r.pesan; s.hidden = false; return false; }
          s.hidden = true; st.tercatat = true; st.wa = wa;
          el.querySelector('#u-info').textContent = 'Invitation recorded. Send the messages in order, one at a time.';
          gambarAcara();
          if (o.segarkan) o.segarkan();
          return true;
        }
        el.querySelector('#u-salin').onclick = async function () {
          if (!(await catat())) return;
          salinTeks(ta.value, ta); toast('Message copied. Paste it in WhatsApp.');
        };
        el.querySelector('#u-wa-buka').onclick = async function () {
          // Jendela dibuka sekarang, saat ketukan masih dihitung. Membuka sesudah menunggu server sering diblokir browser HP.
          var jendela = window.open('about:blank', '_blank');
          if (!(await catat())) { if (jendela) jendela.close(); return; }
          var nomor = String(st.wa).replace(/\D/g, '').replace(/^620/, '62').replace(/^0/, '62');
          var url = waLink(nomor, ta.value);
          if (jendela) jendela.location.href = url; else location.href = url;
        };
      });
  }

  function lembarKirim(namaTamu, wa, e, bidang, bisnis) {
    lembarUndangan({ nama: namaTamu, wa: String(wa || ''), acara: [e], idEv: e.id_event, tercatat: true, bidang: bidang, bisnis: bisnis });
  }

  /* ---------- coffee session: templat dan lembar pemesanan ----------
     Dari panduan "Let's Invite Visitor" bagian Coffee Session: 3 pesan (pembuka, ajak waktu, konfirmasi).
     "lain" = pengirim memperkenalkan pewawancara, "diri" = pengirim sendiri yang mewawancara. */
  var LANGKAH_KOPI = [['1', 'Opener'], ['2', 'Ask a time'], ['3', 'Confirm']];
  var KOPI_ID = {
    dekat: {
      rekanLdc: 'rekan gue, Coach Dedy Dahlan. Dia Launch Director Consultant untuk BNI, organisasi pemilik bisnis internasional',
      rekanLt: 'rekan gue, {pic}, dari tim peluncuran chapter BNI baru (organisasi pemilik bisnis internasional)',
      lain: ['Halo {tamu}, lu bisnisnya masih di bidang {bidang} kan?\n\nGue mau ngenalin lu sama {rekan}. Kita lagi ngumpulin pebisnis kredibel lintas industri di Jakarta buat komunitas pengusaha, dan lagi nyari pebisnis {bidang} kayak lu.',
        'Ada waktu nggak kita ngobrol {tempat} sebentar, paling 30 menitan, {hari} jam {jam}? Gue kenalin langsung sama dia.'],
      diri: ['Halo {tamu}, lu bisnisnya masih di bidang {bidang} kan?\n\nGue lagi ngumpulin pebisnis kredibel lintas industri di Jakarta buat chapter BNI baru, organisasi pemilik bisnis internasional. Kita lagi nyari pebisnis {bidang}, dan gue langsung kepikiran lu.',
        'Ada waktu nggak ngobrol sama gue {tempat} sebentar, paling 30 menitan, {hari} jam {jam}? Gue ceritain langsung.'],
      konfirmasi: 'Sip, sampai ketemu {hari} jam {jam} ya! Semoga bermanfaat, nambah network buat bisnis lu.{zoom}'
    },
    teman: {
      rekanLdc: 'Coach Dedy Dahlan, Launch Director Consultant BNI, organisasi pemilik bisnis internasional',
      rekanLt: '{pic}, dari tim peluncuran chapter BNI baru',
      lain: ['Halo {tamu}, kita lagi ngumpulin business owners kredibel lintas industri di Jakarta dan Jabodetabek nih. Aku jadi ingat kamu. Bisnismu masih di bidang {bidang} kan?\n\nAku kenalin sama {rekan} ya, aku rasa kamu cocok.',
        'Ada waktu nggak kita ngobrol {tempat} sebentar, sekitar 30 menit, {hari} pukul {jam}? Aku kenalin langsung.'],
      diri: ['Halo {tamu}, aku lagi ngumpulin business owners kredibel lintas industri di Jakarta dan Jabodetabek untuk chapter BNI baru, organisasi pemilik bisnis internasional. Aku jadi ingat kamu. Bisnismu masih di bidang {bidang} kan? Kayaknya kamu cocok.',
        'Ada waktu nggak kita ngobrol {tempat} sebentar, sekitar 30 menit, {hari} pukul {jam}? Aku ceritakan langsung.'],
      konfirmasi: 'Sip, sampai ketemu {hari} pukul {jam} ya! Semoga bermanfaat dan nambah network buat bisnismu.{zoom}'
    },
    kenal: {
      rekanLdc: 'rekan saya, Coach Dedy Dahlan, Launch Director Consultant BNI, organisasi pemilik bisnis internasional',
      rekanLt: 'rekan saya, {pic}, dari tim peluncuran chapter BNI baru',
      lain: ['Selamat {salam} {tamu}, bisnis Anda di bidang {bidang}, benar?\n\nSaya ingin memperkenalkan Anda dengan {rekan}. Kami sedang mengumpulkan pemilik bisnis kredibel lintas industri di Jakarta, dan sedang mencari pebisnis di bidang {bidang}. Menurut saya Anda cocok.',
        'Apakah Anda ada waktu untuk berbincang {tempat} sekitar 30 menit, {hari} pukul {jam}? Saya akan memperkenalkan Anda langsung kepada beliau.'],
      diri: ['Selamat {salam} {tamu}, bisnis Anda di bidang {bidang}, benar?\n\nSaya sedang mengumpulkan pemilik bisnis kredibel lintas industri di Jakarta untuk chapter BNI baru, organisasi pemilik bisnis internasional. Kami sedang mencari pebisnis di bidang {bidang}, dan menurut saya Anda cocok.',
        'Apakah Anda ada waktu untuk berbincang {tempat} sekitar 30 menit, {hari} pukul {jam}? Saya akan menjelaskan langsung.'],
      konfirmasi: 'Terima kasih, sampai bertemu {hari} pukul {jam}. Semoga perbincangan ini bermanfaat dan menambah jaringan bisnis Anda.{zoom}'
    }
  };
  var KOPI_EN = {
    santai: {
      rekanLdc: 'Coach Dedy Dahlan, Launch Director Consultant for BNI, an international business owners organization',
      rekanLt: '{pic} from the launch team of a new BNI chapter',
      lain: ['Hi {tamu}, your business is still in {bidang}, right?\n\nI would love to introduce you to {rekan}. We are gathering credible business owners across industries in Jakarta, and we are looking for someone in {bidang} like you.',
        'Do you have time for a quick chat {tempat}, about 30 minutes, on {hari} at {jam}? I will introduce you directly.'],
      diri: ['Hi {tamu}, your business is still in {bidang}, right?\n\nI am gathering credible business owners across industries in Jakarta for a new BNI chapter, an international business owners organization. We are looking for someone in {bidang}, and you came to mind.',
        'Do you have time for a quick chat {tempat}, about 30 minutes, on {hari} at {jam}? I will tell you more then.'],
      konfirmasi: 'Great, see you {hari} at {jam}! Hope it is useful and grows your network.{zoom}'
    },
    formal: {
      rekanLdc: 'my colleague, Coach Dedy Dahlan, Launch Director Consultant for BNI, an international business owners organization',
      rekanLt: 'my colleague, {pic}, from the launch team of a new BNI chapter',
      lain: ['Good {salamEn} {tamu}, your business is in {bidang}, correct?\n\nI would like to introduce you to {rekan}. We are bringing together credible business owners across industries in Jakarta and are looking for a {bidang} professional. I believe you would be a good fit.',
        'Would you be available for a 30 minute conversation {tempat} on {hari} at {jam}? I will introduce you personally.'],
      diri: ['Good {salamEn} {tamu}, your business is in {bidang}, correct?\n\nI am bringing together credible business owners across industries in Jakarta for a new BNI chapter, an international business owners organization. We are looking for a {bidang} professional, and I believe you would be a good fit.',
        'Would you be available for a 30 minute conversation {tempat} on {hari} at {jam}? I would be glad to explain more.'],
      konfirmasi: 'Thank you. I look forward to speaking with you on {hari} at {jam}. I hope it will be valuable for your business.{zoom}'
    }
  };
  function isiToken(t, d) { return t.replace(/\{(\w+)\}/g, function (m, k) { return d[k] !== undefined ? d[k] : m; }); }
  function salamSekarang() { var j = wib(new Date().toISOString()).getUTCHours(); return { id: j < 11 ? 'pagi' : j < 15 ? 'siang' : j < 18 ? 'sore' : 'malam', en: j < 12 ? 'morning' : j < 18 ? 'afternoon' : 'evening' }; }
  // w = {waktu, tempat, pic, pic_id, pic_ldc} atau null bila belum ada jam
  function buatPesanKopi(bahasa, kedekatan, langkah, namaTamu, bidang, w) {
    var set = bahasa === 'id' ? KOPI_ID[kedekatan] : KOPI_EN[kedekatan === 'kenal' ? 'formal' : 'santai'];
    var diri = w ? w.pic_id === S.profil.id_orang : isLDC();
    var ldc = w ? w.pic_ldc : true;
    var zoomUrl = S.atur.tautan_zoom_cs;
    var zoom = w && w.tempat === 'Zoom' && zoomUrl ? (bahasa === 'id' ? '\n\nLink Zoom: ' : '\n\nZoom link: ') + zoomUrl : '';
    var s = salamSekarang();
    var d = {
      tamu: namaTamu, bidang: bidang || (bahasa === 'id' ? 'bisnis' : 'business'), pic: w ? w.pic : '', salam: s.id, salamEn: s.en, zoom: zoom,
      hari: w ? (bahasa === 'id' ? tglID(w.waktu) : tglHari(w.waktu)) : (bahasa === 'id' ? '[hari]' : '[day]'),
      jam: w ? jamCS(w.waktu).jam : (bahasa === 'id' ? '[jam]' : '[time]'),
      tempat: !w || w.tempat === 'Zoom' ? (bahasa === 'id' ? (kedekatan === 'kenal' ? 'melalui Zoom' : 'lewat Zoom') : 'over Zoom') : (bahasa === 'id' ? 'di ' : 'at ') + w.tempat
    };
    d.rekan = isiToken(ldc ? set.rekanLdc : set.rekanLt, d);
    if (langkah === 2) return isiToken(set.konfirmasi, d);
    return isiToken(set[diri ? 'diri' : 'lain'][langkah], d);
  }

  function timSlot(z) { return (z.pic_ldc ? 'Coach Dedy' : z.pic) + (z.pendamping && z.pendamping.length ? ' + ' + z.pendamping.join(', ') : ''); }

  /* o: {id_orang, nama, whatsapp, bidang, bisnis, tahap, idSlot?, segarkan} */
  async function lembarKopi(o) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('slotCS');
    if (!r.ok) { bukaLembar('<p class="kosong-isi">' + esc(r.pesan) + '</p>'); return; }
    var depan = o.nama.split(/\s+/)[0];
    var bidang = o.bidang && !/^Undecided/.test(o.bidang) ? o.bidang : (o.bisnis || '');
    var sekarang = Date.now();
    var dipesan = r.slot.filter(function (s) { return s.id_orang === o.id_orang && s.status === 'Terisi' && new Date(s.waktu).getTime() > sekarang; })[0] || null;
    var kosong = r.slot.filter(function (s) { return s.status === 'Kosong' && new Date(s.waktu).getTime() > sekarang; });
    var st = { dekat: 'teman', bahasa: 'id', langkah: dipesan ? 2 : 0, pilih: o.idSlot || (dipesan ? '' : ''), lain: '', wa: o.whatsapp || '' };
    if (!st.pilih && !dipesan && kosong.length) st.pilih = kosong[0].id_slot;
    function waktuDipilih() {
      if (st.pilih === 'lain') return st.lain ? { waktu: new Date(st.lain + ':00+07:00').toISOString(), tempat: 'Zoom', pic: S.profil.nama_depan, pic_id: S.profil.id_orang, pic_ldc: isLDC() } : null;
      var s = kosong.filter(function (z) { return z.id_slot === st.pilih; })[0];
      return s || dipesan;
    }
    var jd = dipesan ? jamCS(dipesan.waktu) : null;
    bukaLembar(
      '<h2>Coffee session with ' + esc(depan) + '</h2>' +
      '<p class="kecil" id="k-info" style="margin:4px 0 12px">' + (dipesan
        ? 'Booked: <b>' + esc(jd.hari + ' ' + jd.jam) + '</b> · ' + esc(dipesan.tempat) + ' · with ' + esc(timSlot(dipesan)) + '. Send message 3 to confirm.'
        : 'A 30 minute chat with Coach Dedy, supported by the launch team. No Wednesday visit needed first. Book the time once ' + esc(depan) + ' says yes.') + '</p>' +
      (dipesan ? '<details class="lipat" style="margin-bottom:12px"><summary><span>Change time</span><em>' + kosong.length + ' open</em></summary>' : '<p class="kecil" style="margin-bottom:6px">Open times</p>') +
      '<div id="k-slot" style="margin-bottom:10px"></div>' +
      (isLT() ? '<div class="pilihan" style="margin-bottom:12px"><button type="button" id="k-lain-tombol" aria-pressed="' + (st.pilih === 'lain') + '">Other time (outside the open slots)</button></div>' : '') +
      (kosong.length ? '' : '<p class="kecil redup" style="margin:-6px 0 12px">' + (isLT() ? 'No open times. Open some in Team, Schedule, or use Other time.' : 'No open times yet. Ask Coach Dedy or the launch team to open some.') + '</p>') +
      '<label class="isian" id="k-lain" hidden><span>Date and time (WIB)</span><input type="datetime-local" id="k-lain-in"></label>' +
      (dipesan ? '<button class="tombol" id="k-pesan-slot">Move booking to this time</button><button class="tombol kedua" id="k-batal" style="margin-top:8px">Cancel booking</button></details>' : '') +
      (st.wa ? '' : '<label class="isian"><span>WhatsApp ' + esc(depan) + '</span><input id="k-wa" inputmode="tel" placeholder="08..." autocomplete="off"></label>') +
      '<p class="kecil" style="margin-bottom:6px">How close are you to ' + esc(depan) + '?</p><div class="pilihan" id="k-dekat" style="margin-bottom:12px">' + KEDEKATAN.map(function (g) {
        return '<button type="button" data-dekat="' + g[0] + '" aria-pressed="' + (g[0] === st.dekat) + '">' + g[1] + '</button>';
      }).join('') + '<button type="button" id="k-bhs" class="bahasa" aria-label="Switch message language">ID | EN</button></div>' +
      '<div class="seg langkah-seg tiga" id="k-langkah">' + LANGKAH_KOPI.map(function (g, i) {
        return '<button type="button" data-langkah="' + i + '" aria-selected="' + (i === st.langkah) + '"><b>' + g[0] + '</b><span>' + g[1] + '</span></button>';
      }).join('') + '</div>' +
      '<p class="kecil redup" id="k-petunjuk" style="margin:8px 2px"></p>' +
      '<textarea id="k-pesan" class="pesan-undangan" rows="7"></textarea>' +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<div class="baris-tombol" style="margin-top:10px"><button class="tombol kedua" id="k-wa-buka">Open WhatsApp</button><button class="tombol kedua" id="k-salin">Copy message</button></div>' +
      (dipesan ? '' : '<div class="baris-tombol" style="margin-top:8px"><button class="tombol" id="k-pesan-slot">They said yes: book this time</button></div>') +
      '<details class="lipat" style="margin-top:14px"><summary><span>If they hesitate or ask</span><em>replies</em></summary><div id="k-balasan"></div></details>',
      function (el) {
        var ta = el.querySelector('#k-pesan');
        var petunjuk = ['Start the conversation. Wait for a reply before the next one.', 'Offer the time you picked above.', 'Send this after the time is booked.'];
        function segar() {
          ta.value = buatPesanKopi(st.bahasa, st.dekat, st.langkah, depan, bidang, waktuDipilih());
          el.querySelector('#k-petunjuk').textContent = 'Message ' + (st.langkah + 1) + ' of 3. ' + petunjuk[st.langkah];
          el.querySelector('#k-lain').hidden = st.pilih !== 'lain';
          var tb = el.querySelector('#k-pesan-slot');
          tb.disabled = !st.pilih || (st.pilih === 'lain' && !st.lain);
          el.querySelector('#k-balasan').innerHTML = BALASAN.map(function (b, i) {
            return '<div class="balasan"><b>' + esc(b[0]) + '</b><p>' + esc(balasanTeks(b, st.dekat)).replace(/\n/g, '<br>') + '</p><button type="button" class="tombol kecil kedua" data-balas="' + i + '">Copy</button></div>';
          }).join('');
          el.querySelectorAll('[data-balas]').forEach(function (b) { b.onclick = function () { salinTeks(balasanTeks(BALASAN[Number(b.dataset.balas)], st.dekat), ta); toast('Reply copied.'); }; });
        }
        function tanda(sel, atr, nilai) { el.querySelectorAll(sel + ' [' + atr + ']').forEach(function (b) { var a = b.hasAttribute('aria-selected') ? 'aria-selected' : 'aria-pressed'; b.setAttribute(a, b.getAttribute(atr) === String(nilai)); }); }
        var kal = kosong.length ? kalender(el.querySelector('#k-slot'), kosong.map(function (z) { return { key: z.id_slot, tanggal: z.tanggal, judul: jamCS(z.waktu).jam, sub: timSlot(z) + (z.tempat !== 'Zoom' ? ', ' + z.tempat : '') }; }), {
          pilih: st.pilih, gaya: 'chip', onPick: function (k) { st.pilih = k; var lt = el.querySelector('#k-lain-tombol'); if (lt) lt.setAttribute('aria-pressed', 'false'); segar(); } }) : null;
        var tl = el.querySelector('#k-lain-tombol');
        if (tl) tl.onclick = function () { st.pilih = 'lain'; tl.setAttribute('aria-pressed', 'true'); if (kal) kal.set(''); segar(); };
        el.querySelector('#k-lain-in').oninput = function () { st.lain = this.value; segar(); };
        el.querySelectorAll('[data-dekat]').forEach(function (b) { b.onclick = function () { st.dekat = b.dataset.dekat; tanda('#k-dekat', 'data-dekat', st.dekat); segar(); }; });
        el.querySelectorAll('[data-langkah]').forEach(function (b) { b.onclick = function () { st.langkah = Number(b.dataset.langkah); tanda('#k-langkah', 'data-langkah', st.langkah); segar(); }; });
        el.querySelector('#k-bhs').onclick = function () { st.bahasa = st.bahasa === 'id' ? 'en' : 'id'; this.textContent = st.bahasa === 'id' ? 'ID | EN' : 'EN | ID'; segar(); };
        segar();
        function salah(p) { var s = el.querySelector('#salah'); s.textContent = p; s.hidden = !p; }
        function nomor() { var k = el.querySelector('#k-wa'); return k ? k.value : st.wa; }
        el.querySelector('#k-salin').onclick = function () { salinTeks(ta.value, ta); toast('Message copied. Paste it in WhatsApp.'); };
        el.querySelector('#k-wa-buka').onclick = function () {
          var n = String(nomor()).replace(/\D/g, '').replace(/^620/, '62').replace(/^0/, '62');
          if (!n) return salah('Enter the WhatsApp number first.');
          window.open(waLink(n, ta.value), '_blank', 'noopener');
        };
        el.querySelector('#k-pesan-slot').onclick = async function () {
          var badan = { id_orang: o.id_orang, whatsapp: el.querySelector('#k-wa') ? nomor() : '' };
          if (st.pilih === 'lain') badan.waktu = new Date(st.lain + ':00+07:00').toISOString(); else badan.id_slot = st.pilih;
          var h = await api('pesanSlot', badan);
          if (!h.ok) return salah(h.pesan);
          if (o.segarkan) o.segarkan();
          toast('Coffee session booked for ' + depan + '. Send message 3.', true);
          lembarKopi({ id_orang: o.id_orang, nama: o.nama, whatsapp: nomor(), bidang: o.bidang, bisnis: o.bisnis, segarkan: o.segarkan });
        };
        var bb = el.querySelector('#k-batal');
        if (bb) bb.onclick = async function () {
          var h = await api('batalSlot', { id_orang: o.id_orang });
          if (!h.ok) return salah(h.pesan);
          tutupLembar(); toast('Booking cancelled. The time is open again.'); if (o.segarkan) o.segarkan();
        };
      });
  }

  /* ---------- Team: Schedule ---------- */
  var JAM_UMUM = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '19:00', '20:00'];
  async function subJadwal(w) {
    var r = await api('slotCS');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var sekarang = Date.now();
    var depan = r.slot.filter(function (s) { return new Date(s.waktu).getTime() > sekarang - 36e5 && s.status !== 'Batal'; });
    var perHari = {};
    depan.forEach(function (s) { (perHari[s.tanggal] = perHari[s.tanggal] || []).push(s); });
    var nTerisi = depan.filter(function (s) { return s.status === 'Terisi'; }).length, nKosong = depan.length - nTerisi;
    function siapa(s) { return timSlot(s); }
    function tombolDampingi(s) {
      if (s.pic_id === S.profil.id_orang) return '';
      return s.saya_dampingi ? '<button class="tombol kecil kedua" data-dampingi="0" data-id="' + esc(s.id_slot) + '" aria-label="Stop supporting">Joined &#10003;</button>'
                             : '<button class="tombol kecil kedua" data-dampingi="1" data-id="' + esc(s.id_slot) + '">Join</button>';
    }
    function baris(s) {
      var j = jamCS(s.waktu).jam;
      if (s.status === 'Terisi') return '<li><button class="ketuk" data-pesanan="' + esc(s.id_slot) + '" style="flex:1;min-width:0"><span class="jam-slot">' + j + '</span><div class="utama"><b>' + esc(s.nama || '') + '</b><span>' + esc(s.bidang || '') + ' · via ' + esc(s.pengundang || '-') + ' · ' + esc(siapa(s)) + ', ' + esc(s.tempat) + '</span></div></button>' + (tombolDampingi(s) || '<span class="chip hijau">Booked</span>') + '</li>';
      return '<li><span class="jam-slot redup">' + j + '</span><div class="utama"><b class="redup">Open</b><span>' + esc(siapa(s)) + ', ' + esc(s.tempat) + '</span></div><button class="tombol kecil" data-isi="' + esc(s.id_slot) + '">Book</button>' + (s.boleh_hapus ? '<button class="tombol kecil kedua" data-hapus="' + esc(s.id_slot) + '" aria-label="Remove this time">&#10005;</button>' : tombolDampingi(s)) + '</li>';
    }
    var hasil = (r.perlu_hasil || []);
    w.innerHTML = '<p class="kecil" style="margin:10px 2px">' + (isLDC() ? 'Open the times you can interview. Members and the team book them for their prospects. LT members tap Join to support.' : 'Coach Dedy leads the interviews. Tap Join on a time to support him, or open a time for an LT pair interview.') + '</p>' +
      '<div class="baris-tombol" style="margin:0 0 12px"><button class="tombol" id="b-buka-jam">' + (isLDC() ? 'Open times' : 'Open an LT pair time') + '</button></div>' +
      (hasil.length ? '<div class="judul-bagian"><h2>Needs an outcome</h2><span class="kecil">' + hasil.length + '</span></div><section class="kartu"><ul class="daftar">' + hasil.map(function (c) {
        var j = jamCS(c.waktu);
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(j.hari + ' ' + j.jam) + ' · PIC ' + esc(c.pic || '-') + '</span></div><button class="tombol kecil" data-selesai="' + esc(c.id_orang) + '">Done</button><button class="tombol kecil kedua" data-absen="' + esc(c.id_orang) + '">No show</button></li>';
      }).join('') + '</ul></section>' : '') +
      '<div class="judul-bagian"><h2>Next 4 weeks</h2><span class="kecil">' + nTerisi + ' booked · ' + nKosong + ' open</span></div>' +
      (Object.keys(perHari).length ? Object.keys(perHari).sort().map(function (t) {
        return '<p class="hari-slot">' + esc(tglHari(t)) + '</p><section class="kartu"><ul class="daftar">' + perHari[t].map(baris).join('') + '</ul></section>';
      }).join('') : '<section class="kartu"><p class="kosong-isi">No times yet. Tap "Open times" to add when Coach Dedy or the team can do a coffee session.</p></section>');
    var segar = function () { subJadwal(w); };
    w.querySelector('#b-buka-jam').onclick = function () { lembarBukaJam(r.pewawancara || [], segar); };
    function slot(id) { return r.slot.filter(function (s) { return s.id_slot === id; })[0]; }
    w.querySelectorAll('[data-pesanan]').forEach(function (b) {
      b.onclick = function () { var s = slot(b.dataset.pesanan); lembarKopi({ id_orang: s.id_orang, nama: s.nama, whatsapp: s.whatsapp, bidang: s.bidang, bisnis: s.bisnis, segarkan: segar }); };
    });
    w.querySelectorAll('[data-isi]').forEach(function (b) { b.onclick = function () { lembarPilihCalon(slot(b.dataset.isi), segar); }; });
    w.querySelectorAll('[data-hapus]').forEach(function (b) {
      b.onclick = async function () { var h = await api('hapusSlot', { id_slot: b.dataset.hapus }); if (!h.ok) return toast(h.pesan); toast('Time removed.'); segar(); };
    });
    w.querySelectorAll('[data-dampingi]').forEach(function (b) {
      b.onclick = async function () { var ikut = b.dataset.dampingi === '1'; var h = await api('dampingiSlot', { id_slot: b.dataset.id, ikut: ikut }); if (!h.ok) return toast(h.pesan); toast(ikut ? 'You are supporting this coffee session.' : 'You are no longer supporting this time.'); segar(); };
    });
    w.querySelectorAll('[data-selesai]').forEach(function (b) {
      b.onclick = async function () { var h = await api('tindakLanjut', { id_orang: b.dataset.selesai, tahap: 'Coffee_Session' }); if (!h.ok) return toast(h.pesan); toast('Moved to Interviewed. Record Applied or Declined in Interviews.'); segar(); };
    });
    w.querySelectorAll('[data-absen]').forEach(function (b) {
      b.onclick = async function () { var h = await api('batalSlot', { id_orang: b.dataset.absen }); if (!h.ok) return toast(h.pesan); toast('Back to To schedule. Book a new time.'); segar(); };
    });
  }

  function lembarBukaJam(pewawancara, segarkan) {
    var besok = new Date(Date.now() + 864e5 + 7 * 36e5).toISOString().slice(0, 10);
    var dipilih = {}, dampingi = {};
    var ldc = isLDC();
    var ltLain = pewawancara.filter(function (p) { return p.peran === 'LT' && p.id_orang !== S.profil.id_orang; });
    bukaLembar(
      '<h2>' + (ldc ? 'Open coffee session times' : 'Open an LT pair time') + '</h2><p class="kecil" style="margin:6px 0 14px">' +
        (ldc ? 'Pick a date and the times you are free. Members can then book them for their prospects.' : 'For an interview by two LT members without Coach Dedy. Coach Dedy opens his own times, and you can Join those to support.') + '</p>' +
      '<form id="f-jam"><label class="isian"><span>Date</span><input type="date" name="tanggal" value="' + besok + '" required></label>' +
      '<p class="kecil" style="margin-bottom:6px">Times (WIB)</p><div class="pilihan" id="j-jam" style="margin-bottom:10px">' + JAM_UMUM.map(function (j) { return '<button type="button" data-jam="' + j + '" aria-pressed="false">' + j + '</button>'; }).join('') + '</div>' +
      '<label class="isian"><span>Another time (optional)</span><input type="time" name="lain" step="900"></label>' +
      (ltLain.length ? '<p class="kecil" style="margin-bottom:6px">' + (ldc ? 'LT support (optional, others can Join later)' : 'Interview partner') + '</p><div class="pilihan" id="j-damping" style="margin-bottom:12px">' + ltLain.map(function (p) {
        return '<button type="button" data-damping="' + esc(p.id_orang) + '" aria-pressed="false">' + esc(p.nama_depan) + '</button>';
      }).join('') + '</div>' : '') +
      '<label class="isian"><span>Place</span><input name="tempat" value="Zoom" placeholder="Zoom or a meeting place"></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save times</button></form>',
      function (el) {
        el.querySelectorAll('[data-jam]').forEach(function (b) { b.onclick = function () { dipilih[b.dataset.jam] = !dipilih[b.dataset.jam]; b.setAttribute('aria-pressed', !!dipilih[b.dataset.jam]); }; });
        el.querySelectorAll('[data-damping]').forEach(function (b) { b.onclick = function () { dampingi[b.dataset.damping] = !dampingi[b.dataset.damping]; b.setAttribute('aria-pressed', !!dampingi[b.dataset.damping]); }; });
        el.querySelector('#f-jam').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, jam = Object.keys(dipilih).filter(function (k) { return dipilih[k]; });
          var pd = Object.keys(dampingi).filter(function (k) { return dampingi[k]; });
          var sl = el.querySelector('#salah');
          if (!ldc && !pd.length) { sl.textContent = 'Choose your interview partner.'; sl.hidden = false; return; }
          if (f.lain.value) jam.push(f.lain.value.slice(0, 5));
          var h = await api('tambahSlot', { tanggal: f.tanggal.value, jam: jam, pendamping: pd, tempat: f.tempat.value.trim() || 'Zoom' });
          if (!h.ok) { sl.textContent = h.pesan; sl.hidden = false; return; }
          tutupLembar(); toast(h.dibuat + (h.dibuat === 1 ? ' time' : ' times') + ' opened.'); segarkan();
        };
      });
  }

  async function lembarPilihCalon(s, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('calonSaya', { semua: isLDC() });
    var calon = (r.calon || []).filter(function (c) { return ['Listed', 'Invited', 'Attended'].indexOf(c.tahap) >= 0; });
    var j = jamCS(s.waktu);
    bukaLembar('<h2>Book ' + esc(j.hari + ' ' + j.jam) + '</h2><p class="kecil" style="margin:6px 0 12px">Choose the prospect. Next you can send the invitation messages.</p>' +
      (calon.length ? '<section class="kartu"><ul class="daftar">' + calon.map(function (c) {
        return '<li><button class="ketuk" data-c="' + esc(c.id_orang) + '" style="flex:1;min-width:0"><span class="lambang">' + inisial(c.nama) + '</span><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(c.bidang) + ' · ' + esc(lblTahap(c.tahap)) + '</span></div></button></li>';
      }).join('') + '</ul></section>' : '<p class="kosong-isi">No prospects waiting for a coffee session.</p>'),
      function (el) {
        el.querySelectorAll('[data-c]').forEach(function (b) {
          b.onclick = function () { var c = calon.filter(function (x) { return x.id_orang === b.dataset.c; })[0]; lembarKopi({ id_orang: c.id_orang, nama: c.nama, whatsapp: c.whatsapp, bidang: c.bidang, bisnis: c.bisnis, idSlot: s.id_slot, segarkan: segarkan }); };
        });
      });
  }

  /* Pilihan undang untuk anggota: kunjungan Rabu atau langsung coffee session */
  function lembarPilihUndang(u, acara, segarkan) {
    var bisaKunjung = !u.status_undangan && u.tahap === 'Listed' && acara.length > 0;
    var bisaKopi = ['Listed', 'Invited', 'Attended', 'Coffee_Scheduled'].indexOf(u.tahap) >= 0;
    var depan = u.nama.split(/\s+/)[0];
    bukaLembar('<h2>Invite ' + esc(depan) + '</h2><p class="kecil" style="margin:6px 0 14px">' + esc(u.bidang) + '</p>' +
      '<div class="pilihan kolom">' +
      (!acara.length && u.tahap === 'Listed' && !u.status_undangan ? '<p class="kecil redup" style="margin-bottom:8px">No Wednesday meetings are open yet, so a coffee session is the way to invite for now.</p>' : '') +
      (bisaKunjung ? '<button type="button" id="p-kunjung"><b>Visit a Wednesday meeting</b><small>BOD or Lunch Networking, then a coffee session</small></button>' : '') +
      (bisaKopi ? '<button type="button" id="p-kopi"><b>' + (u.tahap === 'Coffee_Scheduled' ? 'Coffee session booked' : 'Coffee session straight away') + '</b><small>' + (u.tahap === 'Coffee_Scheduled' ? 'See the time, confirm, or change it' : '30 minutes 1 on 1 with Coach Dedy, no visit needed') + '</small></button>' : '') +
      '</div>',
      function (el) {
        var k = el.querySelector('#p-kunjung');
        if (k) k.onclick = function () { lembarUndang(u.id_orang, u.nama, u.whatsapp, acara, segarkan, u.bidang, u.bisnis); };
        var c = el.querySelector('#p-kopi');
        if (c) c.onclick = function () { lembarKopi({ id_orang: u.id_orang, nama: u.nama, whatsapp: u.whatsapp, bidang: u.bidang, bisnis: u.bisnis, segarkan: segarkan }); };
      });
  }

  /* ---------- UNDANG ---------- */
  function chipUndangan(u) {
    var st = u.status_undangan;
    if (u.tahap === 'Anggota') return '<span class="chip emas">Joined</span>';
    if (u.tahap === 'Coffee_Scheduled') return '<span class="chip hijau">Coffee booked</span>';
    if (u.tahap === 'Coffee_Session' || u.tahap === 'Applied') return '<span class="chip hijau">' + esc(lblTahap(u.tahap)) + '</span>';
    if (['Joined_Other', 'Declined', 'Rejected'].indexOf(u.tahap) >= 0) return '<span class="chip">Closed</span>';
    if (st === 'Hadir') return '<span class="chip hijau">Attended</span>';
    if (st === 'Terdaftar') return '<span class="chip hijau">Registered</span>';
    if (st === 'Diundang') return '<span class="chip merah">Invited, not registered yet</span>';
    return '';
  }

  async function layarUndang(isi) {
    var h = await Promise.all([api('beranda'), api('usulanSaya'), api('acara')]);
    var b = h[0], us = h[1], ac = h[2];
    if (!b.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(b.pesan) + '</p>'; return; }
    var acara = (ac.acara || []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; });
    var st = b.saya;
    var baru = us.usulan.filter(function (u) { return !u.status_undangan && u.tahap === 'Listed'; });
    var sudah = us.usulan.filter(function (u) { return u.status_undangan || u.tahap !== 'Listed'; });
    function baris(u) {
      var bisa = !u.status_undangan && u.tahap === 'Listed';
      var ketuk = !bisa && ['Invited', 'Attended', 'Coffee_Scheduled'].indexOf(u.tahap) >= 0;
      var info = u.tahap === 'Coffee_Scheduled' && u.jadwal_cs ? ' · Coffee ' + jamCS(u.jadwal_cs).hari + ' ' + jamCS(u.jadwal_cs).jam : (u.tanggal_undangan ? ' · ' + esc(u.acara_undangan) + ', ' + esc(tglPendek(u.tanggal_undangan)) : '');
      var isiBaris = '<div class="utama"><b>' + esc(u.nama) + '</b><span>' + esc(u.bidang) + info + '</span></div>';
      return '<li>' + (ketuk ? '<button class="ketuk" data-buka="' + esc(u.id_orang) + '" style="flex:1;min-width:0">' + isiBaris + '</button>' : isiBaris) + ikonWa(u.whatsapp, u.nama) +
        (bisa ? '<button class="tombol kecil" data-undang="' + esc(u.id_orang) + '">Invite</button>' : chipUndangan(u)) + '</li>';
    }
    function cariU(id) { return us.usulan.filter(function (u) { return u.id_orang === id; })[0]; }
    isi.innerHTML = '<div class="sapa"><h1>My list</h1><p class="kecil">Names I want to invite. ' + st.nama_daftar + ' of ' + st.target_nama_maks + ' (minimum ' + st.target_nama_min + ').</p></div>' +
      '<div class="baris-tombol" style="margin:0 0 14px"><button class="tombol" id="b-tambah">Add a name</button></div>' +
      '<div class="judul-bagian"><h2>Ready to invite</h2><span class="kecil">' + baru.length + '</span></div>' +
      '<section class="kartu">' + (baru.length ? '<ul class="daftar">' + baru.map(baris).join('') + '</ul>' : '<p class="kosong-isi">No names waiting. Tap "Add a name" to start.</p>') + '</section>' +
      '<div class="judul-bagian"><h2>Invited</h2><span class="kecil">' + sudah.length + '</span></div>' +
      '<section class="kartu">' + (sudah.length ? '<ul class="daftar">' + sudah.map(baris).join('') + '</ul><p class="catatan-main">A Visitor shows as Registered once the sign-up form is filled in. Tap a name to book or check a coffee session.</p>' : '<p class="kosong-isi">No invitations yet.</p>') + '</section>';
    isi.querySelector('#b-tambah').onclick = function () { bukaKursi('', function () { layarUndang(isi); }); };
    isi.querySelectorAll('[data-undang], [data-buka]').forEach(function (t) {
      t.onclick = function () { lembarPilihUndang(cariU(t.dataset.undang || t.dataset.buka), acara, function () { layarUndang(isi); }); };
    });
  }

  async function layarMinggu(isi) {
    var tm = await api('tamuPekanIni');
    if (!tm.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(tm.pesan) + '</p>'; return; }
    function baris(g) {
      var chip = g.bergabung ? '<span class="chip emas">Joined</span>' : g.status === 'Hadir' ? '<span class="chip hijau">Attended</span>' : '<span class="chip">Registered</span>';
      return '<li><span class="lambang">' + inisial(g.nama) + '</span><div class="utama"><b>' + esc(g.nama) + '</b><span>' + esc(g.bidang) + ' · ' + esc(g.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' ' + esc(g.jam_mulai) + ' · invited by ' + esc(g.saya ? 'me' : (g.pengundang || 'the chapter')) + '</span></div>' + chip + '</li>';
    }
    var saya = tm.tamu.filter(function (g) { return g.saya; });
    var lain = tm.tamu.filter(function (g) { return !g.saya; });
    var prog = (tm.acara_ronde || []).map(function (e) {
      return '<li class="program"><div class="utama"><b>' + esc(e.jenis === 'BOD' ? 'BOD' : e.nama_acara) + ' · ' + esc(e.jam_mulai) + (e.jam_selesai ? ' to ' + esc(e.jam_selesai) : '') + '</b>' +
        '<span>' + esc(e.mode === 'Online' ? 'Online, ' + (e.lokasi || 'Zoom') : (e.lokasi || 'Onsite')) + '</span>' +
        '<span>' + (e.pembicara ? 'Speaker: ' + esc(e.pembicara) : 'Speaker to be announced') + '</span>' + kartuPoster(e.poster) + '</div></li>';
    }).join('');
    isi.innerHTML = '<div class="sapa"><h1>This week</h1><p class="kecil">' + ((tm.acara_ronde || []).length ? 'Visitors registered for Wednesday, with their classification. Phone numbers are not shown.' : 'No Wednesday meetings are scheduled yet. They appear here once the launch team adds them.') + '</p></div>' +
      (prog ? '<div class="judul-bagian"><h2>Wednesday program</h2><span class="kecil">' + tm.acara_ronde.length + ' sessions</span></div><section class="kartu"><ul class="daftar">' + prog + '</ul></section>' : '') +
      '<div class="judul-bagian"><h2>Invited by me</h2><span class="kecil">' + saya.length + '</span></div>' +
      '<section class="kartu">' + (saya.length ? '<ul class="daftar">' + saya.map(baris).join('') + '</ul>' : '<p class="kosong-isi">None of my invitees are registered yet. Check "My list" for who still needs a reminder.</p>') + '</section>' +
      '<div class="judul-bagian"><h2>Other Visitors</h2><span class="kecil">' + lain.length + '</span></div>' +
      '<section class="kartu">' + (lain.length ? '<ul class="daftar">' + lain.map(baris).join('') + '</ul><p class="catatan-main">Know their classification before Wednesday, so you can greet and connect them.</p>' : '<p class="kosong-isi">No other Visitors registered yet.</p>') + '</section>';
  }

  function lembarUndang(id, nama, wa, acara, segarkan, bidang, bisnis) {
    if (!acara.length) return toast('No Wednesday events are open yet.');
    lembarUndangan({ id: id, nama: nama, wa: wa, acara: acara, segarkan: segarkan, bidang: bidang, bisnis: bisnis });
  }

  /* ---------- PAPAN ---------- */
  var tabPapan = 'pengundang';
  var urutDampak = 'bergabung';
  /* ---------- Impact Board: undangan, hadir, bergabung per orang ---------- */
  /* ---------- Tim: satu kartu di Board (ronde ini dan sepanjang waktu) ---------- */
  function urutan(n) { return n + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'); }
  function kartuTim(t, semua) {
    if (!t || !t.ok || !t.aktif) return '';
    var rows = semua ? t.total : t.ronde.tim;
    function sel(x, kunci, nilai) { return '<b class="' + (x.unggul.indexOf(kunci) >= 0 ? 'unggul' : '') + '">' + nilai + '</b>'; }
    var ada = rows.some(function (x) { return x.tamu || x.gabung || x.hadir; });
    return '<div class="judul-bagian"><h2>Teams</h2><span class="kecil">' + (semua ? 'since ' + esc(tglPendek(t.mulai)) : 'this round') + '</span></div>' +
      '<section class="kartu"><div class="dampak"><div class="dampak-baris dampak-judul"><span>Team</span><span class="tengah">Guests</span><span class="tengah">Joined</span><span class="tengah">Present</span></div>' +
      rows.map(function (x) {
        var sub = x.anggota + ' members' + (semua && x.menang ? ' · won ' + x.menang + (x.menang > 1 ? ' rounds' : ' round') : '');
        return '<div class="dampak-baris' + (t.saya && t.saya.tim === x.tim ? ' saya' : '') + '"><span class="dampak-nama">' + esc(x.nama) + '<small class="sub">' + esc(sub) + '</small></span>' +
          sel(x, 'tamu', x.tamu) + sel(x, 'gabung', x.gabung) + sel(x, 'hadir', x.jatah ? x.persen + '%' : '-') + '</div>';
      }).join('') + '</div></section>' +
      '<p class="catatan-main">' + (ada ? 'Red means the team leads that measure. ' : '') + 'Guests who came and members who joined are compared per member, so team size does not decide. Present is BOD attendance.' +
      (!semua && t.riwayat.length && t.riwayat[0].juara ? ' Last round: ' + esc(t.riwayat[0].nama) + '.' : '') + '</p>';
  }

  function tabelDampak(rows) {
    if (!rows || !rows.length) return '<section class="kartu"><p class="kosong-isi">No invitations yet. The first invitation starts the board.</p></section>';
    var urut = rows.slice().sort(function (a, b) {
      return b[urutDampak] - a[urutDampak] || b.bergabung - a.bergabung || b.hadir - a.hadir || b.undangan - a.undangan || (a.nama_depan < b.nama_depan ? -1 : 1);
    });
    function kepala(kunci, label) {
      return '<button class="dampak-kepala' + (urutDampak === kunci ? ' aktif' : '') + '" data-urut="' + kunci + '" aria-pressed="' + (urutDampak === kunci) + '">' + label + '</button>';
    }
    return '<section class="kartu"><div class="dampak"><div class="dampak-baris dampak-judul"><span>Name</span>' + kepala('undangan', 'Invites') + kepala('hadir', 'Attended') + kepala('bergabung', 'Joined') + '</div>' +
      urut.map(function (d) {
        return '<div class="dampak-baris' + (d.saya ? ' saya' : '') + '"><span class="dampak-nama">' + esc(d.nama_depan) + (d.saya ? ' <span class="chip merah">me</span>' : '') + '</span><b>' + d.undangan + '</b><b>' + d.hadir + '</b><b>' + d.bergabung + '</b></div>';
      }).join('') + '</div></section>' +
      '<p class="catatan-main">Since the start. Joined counts members sponsored. Tap a heading to sort.</p>';
  }
  function kartuBelum(nama) {
    if (!nama) return '';
    return '<div class="judul-bagian"><h2>No invitation yet this round</h2><span class="kecil">' + nama.length + '</span></div>' +
      '<section class="kartu">' + (nama.length ? '<p>' + nama.map(esc).join(', ') + '</p><p class="catatan-main">Visible to the launch team only, for a friendly reminder before Wednesday.</p>' : '<p class="kosong-isi">Every member has invited someone this round.</p>') + '</section>';
  }

  /* ---------- Riwayat per ronde ---------- */
  function daftarRiwayat(rw) {
    if (!rw || !rw.ok) return '<p class="kosong-isi">' + esc(rw ? rw.pesan : 'Could not load the history.') + '</p>';
    if (!rw.ronde.length) return '<section class="kartu"><p class="kosong-isi">No history yet.</p></section>';
    function sel(angka, label, rinci) {
      return '<div class="stat"><b>' + angka + '</b><span>' + label + '</span>' + (rinci ? '<small>' + rinci + '</small>' : '') + '</div>';
    }
    return rw.ronde.map(function (r) {
      var daftar = r.pengundang.length ? '<ul class="daftar">' + r.pengundang.map(function (x) {
        return '<li><div class="utama"><b>' + esc(x.nama_depan) + (x.saya ? ' <span class="chip merah">me</span>' : '') + '</b></div><span class="nilai">' + x.jumlah + '</span><span class="kecil">invited</span></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">No invitations in this round.</p>';
      return '<section class="kartu ronde-riwayat"><div class="langkah-atas"><h3>' + esc(tglPendek(r.mulai)) + ' to ' + esc(tglPendek(r.selesai)) + '</h3>' + (r.berjalan ? '<span class="chip merah">Now</span>' : '') + '</div>' +
        '<div class="statistik riwayat">' +
          sel(r.undangan, 'invited') +
          sel(r.tamu_bod + r.tamu_lunch, 'registered', 'BOD ' + r.tamu_bod + '<br>Lunch ' + r.tamu_lunch) +
          sel(r.hadir_bod + r.hadir_lunch, 'attended', 'BOD ' + r.hadir_bod + '<br>Lunch ' + r.hadir_lunch) +
          sel(r.bergabung, 'joined') +
        '</div>' +
        '<details class="lipat-kecil"><summary>Who invited</summary>' + daftar + '</details></section>';
    }).join('') + '<p class="catatan-main">Rounds run Thursday to Wednesday. Nothing is erased when a round ends.</p>';
  }

  async function layarPapan(isi) {
    var h = await Promise.all([api('papan'), api('beranda'), api('timPapan')]);
    var p = h[0], b = h[1], tm = h[2];
    if (!p.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(p.pesan) + '</p>'; return; }
    function daftar(rows, satuan, kosong) {
      if (!rows.length) return '<p class="kosong-isi">' + kosong + '</p>';
      return '<ul class="daftar">' + rows.map(function (r, i) {
        return '<li class="peringkat-' + (i + 1) + (r.saya ? ' saya' : '') + '"><span class="lambang">' + (i + 1) + '</span><div class="utama"><b>' + esc(r.nama_depan) + (r.saya ? ' <span class="chip merah">me</span>' : '') + '</b></div><span class="nilai">' + r.jumlah + '</span><span class="kecil">' + satuan + '</span></li>';
      }).join('') + '</ul>';
    }
    isi.innerHTML = '<div class="sapa"><h1>Board</h1><p class="kecil">A game, not a ranking.</p></div>' +
      '<div class="tab" role="tablist"><button role="tab" data-tab="pengundang" aria-selected="' + (tabPapan !== 'dampak') + '">This round</button><button role="tab" data-tab="dampak" aria-selected="' + (tabPapan === 'dampak') + '">All time</button></div>' +
      (tabPapan === 'pengundang'
        ? kartuTim(tm, false) + '<div class="judul-bagian"><h2>Invitations</h2></div><section class="kartu">' + daftar(p.pengundang, 'invitations', 'No invitations this round yet. Be the first.') + '</section><p class="catatan-main">Round ends ' + esc(tglHari(b.ronde.selesai)) + ' at 23:59. The board resets every Thursday.</p>' + kartuBelum(p.belum_ronde)
        : kartuTim(tm, true) + '<div class="judul-bagian"><h2>Individuals</h2></div>' + tabelDampak(p.dampak));
    isi.querySelectorAll('[data-tab]').forEach(function (t) { t.onclick = function () { tabPapan = t.dataset.tab; layarPapan(isi); }; });
    isi.querySelectorAll('[data-urut]').forEach(function (t) { t.onclick = function () { urutDampak = t.dataset.urut; layarPapan(isi); }; });
  }

  /* ---------- TIM (LT dan LDC) ---------- */
  function layarTim(isi, sub) {
    var tabs = [['calon', 'Interviews'], ['jadwal', 'Schedule'], ['rabu', 'Check-in'], ['lainnya', 'More']];
    var dalamMore = ['info', 'wawasan', 'kontak', 'orang', 'atur', 'data'];
    var subAktif = ['calon', 'jadwal', 'rabu', 'lainnya'].concat(dalamMore).indexOf(sub) >= 0 && (['orang', 'atur', 'data'].indexOf(sub) < 0 || isLDC()) ? sub : 'calon';
    var aktif = dalamMore.indexOf(subAktif) >= 0 ? 'lainnya' : subAktif;
    isi.innerHTML = '<div class="tab" role="tablist">' + tabs.map(function (t) {
      return '<button role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === aktif) + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="sub"><div class="muat"></div></div>';
    isi.querySelectorAll('[data-sub]').forEach(function (t) { t.onclick = function () { location.hash = '#tim-' + t.dataset.sub; }; });
    var wadah = isi.querySelector('#sub');
    if (dalamMore.indexOf(subAktif) >= 0) wadah.insertAdjacentHTML('beforebegin', '<a class="kembali" href="#tim-lainnya">&#8249; More</a>');
    ({ calon: subCalon, jadwal: subJadwal, rabu: subRabu, lainnya: subLainnya, info: subInfo, wawasan: subWawasan, kontak: subKontak, orang: subOrang, atur: subAtur, data: subData })[subAktif](wadah);
  }

  /* ---------- pendaftar Form yang perlu diputuskan ---------- */
  function kartuCek(pc) {
    if (!pc || !pc.ok || !pc.jumlah) return '';
    var bagian = [];
    if (pc.perlu_cek.length) bagian.push(pc.perlu_cek.length + ' to match');
    if (pc.tanpa_pengundang.length) bagian.push(pc.tanpa_pengundang.length + ' without inviter');
    return '<section class="kartu sorotan"><div class="langkah-atas"><span class="chip merah">Form sign-ups</span></div>' +
      '<h3>' + pc.jumlah + ' sign-up' + (pc.jumlah > 1 ? 's' : '') + ' need a decision</h3><p class="kecil">' + esc(bagian.join(', ')) + '.</p>' +
      '<div class="baris-tombol"><button class="tombol" id="b-cek">Review</button></div></section>';
  }
  function labelAcaraCek(a) {
    return a ? (a.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' ' + tglPendek(a.tanggal) + ' ' + a.jam_mulai : 'event not found';
  }
  async function lembarCek(segarkan) {
    bukaLembar('<div class="muat"></div>');
    var h = await Promise.all([api('perluCek'), api('anggota')]);
    var pc = h[0], ang = h[1];
    if (!pc.ok) { bukaLembar('<p class="kosong-isi">' + esc(pc.pesan) + '</p>'); return; }
    var semuaPeng = (ang.anggota || []).concat(ang.pendiri || []).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
    function opsiPeng(pilih) { return semuaPeng.map(function (a) { return '<option value="' + esc(a.id_orang) + '"' + (a.id_orang === pilih ? ' selected' : '') + '>' + esc(a.nama) + '</option>'; }).join(''); }
    var html = '<h2>Form sign-ups</h2><p class="kecil" style="margin:6px 0 12px">Decide each one to keep the guest list accurate.</p>';
    if (!pc.jumlah) html += '<p class="kosong-isi">All sign-ups are handled.</p>';
    if (pc.perlu_cek.length) {
      html += '<div class="judul-bagian"><h2>Is it the same person?</h2><span class="kecil">' + pc.perlu_cek.length + '</span></div>' + pc.perlu_cek.map(function (c) {
        var k = c.kandidat;
        return '<section class="kartu" data-resp="' + esc(c.id_response) + '" style="box-shadow:none"><h3>' + esc(c.nama) + '</h3>' +
          '<p class="kecil">Signed up for ' + esc(labelAcaraCek(c.acara)) + (c.pengundang ? ' · invited by ' + esc(c.pengundang) : ' · no inviter chosen') + '</p>' +
          '<p class="kecil redup">Form: ' + esc(c.whatsapp || 'no number') + (c.bisnis ? ' · ' + esc(c.bisnis) : '') + '</p>' +
          (k ? '<p class="kecil" style="margin-top:8px"><b>Possible match</b> on the list: ' + esc(k.nama) + (k.bidang ? ' · ' + esc(k.bidang) : '') + ' · ' + esc(lblTahap(k.tahap)) + '</p>'
             : '<p class="kecil" style="margin-top:8px">No suggested match.</p>') +
          '<p class="pesan-salah" hidden></p>' +
          '<div class="baris-tombol">' + (k ? '<button class="tombol kecil" data-k="sama">Same person</button>' : '') + '<button class="tombol kecil kedua" data-k="beda">Different person</button></div>' +
          '<p class="kecil redup" style="margin-top:6px">' + (k ? 'Same person saves the new number on ' + esc(k.nama.split(/\s+/)[0]) + ' and registers them. ' : '') + 'Different person adds ' + esc(c.nama.split(/\s+/)[0]) + ' as a new prospect.</p></section>';
      }).join('');
    }
    if (pc.tanpa_pengundang.length) {
      html += '<div class="judul-bagian"><h2>No inviter</h2><span class="kecil">' + pc.tanpa_pengundang.length + '</span></div>' + pc.tanpa_pengundang.map(function (t) {
        return '<section class="kartu" data-und="' + esc(t.id_undangan) + '" style="box-shadow:none"><h3>' + esc(t.nama) + '</h3>' +
          '<p class="kecil">' + (t.bidang ? esc(t.bidang) + ' · ' : '') + esc(labelAcaraCek(t.acara)) + ' · signed up with "No one" as inviter</p>' +
          '<label class="isian"><span>Who invited them?</span><select name="peng"><option value="">Choose a person</option>' + opsiPeng(t.saran ? t.saran.id_orang : '') + '</select></label>' +
          (t.saran ? '<p class="kecil redup" style="margin-top:-6px">Suggested from an earlier invitation: ' + esc(t.saran.nama) + '.</p>' : '') +
          '<p class="pesan-salah" hidden></p>' +
          '<div class="baris-tombol"><button class="tombol kecil" data-p="set">Set inviter</button><button class="tombol kecil kedua" data-p="walkin">Walk-in, no inviter</button></div></section>';
      }).join('');
    }
    bukaLembar(html, function (el) {
      async function selesai(r, kartu, pesan) {
        if (!r.ok) { var sl = kartu.querySelector('.pesan-salah'); sl.textContent = r.pesan; sl.hidden = false; return; }
        toast(pesan); segarkan(); lembarCek(segarkan);
      }
      el.querySelectorAll('[data-resp] [data-k]').forEach(function (b) {
        b.onclick = async function () {
          var kartu = b.closest('[data-resp]');
          b.disabled = true;
          var r = await api('selesaikanCek', { id_response: kartu.dataset.resp, keputusan: b.dataset.k });
          b.disabled = false;
          selesai(r, kartu, b.dataset.k === 'sama' ? 'Matched and registered.' : 'Added as a new prospect.');
        };
      });
      el.querySelectorAll('[data-und] [data-p]').forEach(function (b) {
        b.onclick = async function () {
          var kartu = b.closest('[data-und]');
          var sl = kartu.querySelector('.pesan-salah');
          var id = b.dataset.p === 'walkin' ? 'Walk-in' : kartu.querySelector('[name=peng]').value;
          if (!id) { sl.textContent = 'Choose who invited them.'; sl.hidden = false; return; }
          b.disabled = true;
          var r = await api('tetapkanPengundang', { id_undangan: kartu.dataset.und, id_pengundang: id });
          b.disabled = false;
          selesai(r, kartu, id === 'Walk-in' ? 'Marked as walk-in.' : 'Inviter set.');
        };
      });
    });
  }

  var semuaCalon = false;
  var segCalon = 'todo';
  var SEG = { todo: ['To schedule', ['Listed', 'Invited', 'Attended']], cs: ['Coffee set', ['Coffee_Scheduled']], done: ['Interviewed', ['Coffee_Session', 'Applied']], hold: ['Closed', ['Joined_Other', 'Declined', 'Rejected']] };
  async function subCalon(w) {
    var hh = await Promise.all([api('calonSaya', { semua: semuaCalon }), api('perluCek')]);
    var r = hh[0], pc = hh[1];
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var per = { todo: [], cs: [], done: [], hold: [] };
    r.calon.forEach(function (c) { Object.keys(SEG).forEach(function (k) { if (SEG[k][1].indexOf(c.tahap) >= 0) per[k].push(c); }); });
    per.cs.sort(function (a, b) { return (a.jadwal_cs || '') < (b.jadwal_cs || '') ? -1 : 1; });
    var info = {
      todo: 'Step 1. Book a coffee session time. Visitors and direct invitations both start here.',
      cs: 'Step 2. After the coffee session, tap Done.',
      done: 'Step 3. Interview went well: tap Applied. Payment received: tap Joined. Not a fit: open the name and mark Declined or Rejected.',
      hold: 'Joined another chapter, declined, or rejected. Reopen anyone who is ready again.'
    };
    function aksi(c) {
      if (segCalon === 'todo') return '<button class="tombol kecil" data-aksi="jadwal" data-id="' + esc(c.id_orang) + '">Set coffee</button>';
      if (segCalon === 'cs') return '<button class="tombol kecil" data-aksi="selesai" data-id="' + esc(c.id_orang) + '">Done</button>';
      if (segCalon === 'done') return c.tahap === 'Applied' ? '<button class="tombol kecil" data-aksi="terima" data-id="' + esc(c.id_orang) + '">Joined</button>' : '<button class="tombol kecil" data-aksi="apply" data-id="' + esc(c.id_orang) + '">Applied</button>';
      return '<button class="tombol kecil kedua" data-aksi="buka" data-id="' + esc(c.id_orang) + '">Reopen</button>';
    }
    function sub(c) {
      if (segCalon === 'cs' && c.jadwal_cs) return jamCS(c.jadwal_cs).hari + ' ' + jamCS(c.jadwal_cs).jam;
      if (segCalon === 'done') return c.tahap === 'Applied' ? 'Applied, waiting for payment' : 'Interviewed';
      if (segCalon === 'done') return lblTahap(c.tahap);
      if (segCalon === 'hold') return lblTahap(c.tahap) + (c.alasan ? ': ' + c.alasan : '');
      if (c.tahap === 'Attended') return 'Attended, ' + (c.hari_diam ? c.hari_diam + ' days idle' : 'today');
      return (c.hari_diam ? c.hari_diam + ' days idle' : 'today') + (semuaCalon ? ' · PIC ' + c.pic : '');
    }
    var daftar = per[segCalon];
    w.innerHTML = kartuCek(pc) + '<div class="seg" role="tablist">' + Object.keys(SEG).map(function (k, i) {
        return '<button role="tab" data-seg="' + k + '" aria-selected="' + (k === segCalon) + '"><b>' + per[k].length + '</b><span>' + SEG[k][0] + '</span></button>';
      }).join('') + '</div>' +
      '<p class="kecil" style="margin:10px 2px">' + info[segCalon] + '</p>' +
      '<div class="baris-tombol" style="margin:0 0 10px"><button class="tombol kedua" id="b-tambah">Add a prospect</button>' + (isLDC() ? '<button class="tombol kedua" id="b-semua">' + (semuaCalon ? 'Only mine' : 'Show everyone') + '</button>' : '') + '</div>' +
      '<section class="kartu">' + (daftar.length ? '<ul class="daftar">' + daftar.map(function (c) {
        return '<li><button class="ketuk" data-calon="' + esc(c.id_orang) + '" style="flex:1;min-width:0"><span class="lambang">' + inisial(c.nama) + '</span><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(c.bidang) + ' · ' + esc(sub(c)) + '</span></div></button>' + ikonWa(c.whatsapp, c.nama) + aksi(c) + '</li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Nothing here.</p>') + '</section>';
    w.querySelectorAll('[data-seg]').forEach(function (t) { t.onclick = function () { segCalon = t.dataset.seg; subCalon(w); }; });
    var bc = w.querySelector('#b-cek');
    if (bc) bc.onclick = function () { lembarCek(function () { subCalon(w); }); };
    var bs = w.querySelector('#b-semua');
    if (bs) bs.onclick = function () { semuaCalon = !semuaCalon; subCalon(w); };
    w.querySelector('#b-tambah').onclick = function () { bukaKursi('', function () { subCalon(w); }); };
    function cari(id) { return r.calon.filter(function (c) { return c.id_orang === id; })[0]; }
    w.querySelectorAll('[data-calon]').forEach(function (t) {
      t.onclick = function () { lembarCalon(cari(t.dataset.calon), function () { subCalon(w); }); };
    });
    w.querySelectorAll('[data-aksi]').forEach(function (t) {
      t.onclick = async function () {
        var c = cari(t.dataset.id);
        if (t.dataset.aksi === 'jadwal') return lembarKopi({ id_orang: c.id_orang, nama: c.nama, whatsapp: c.whatsapp, bidang: c.bidang, bisnis: c.bisnis, segarkan: function () { segCalon = 'cs'; subCalon(w); } });
        if (t.dataset.aksi === 'apply') {
          var ha = await api('tindakLanjut', { id_orang: c.id_orang, tahap: 'Applied' });
          if (!ha.ok) return toast(ha.pesan);
          toast(c.nama.split(/\s+/)[0] + ' applied. Tap Joined once payment is in.'); return subCalon(w);
        }
        if (t.dataset.aksi === 'terima') return lembarAnggota(c, function () { subCalon(w); });
        var tujuan = t.dataset.aksi === 'selesai' ? 'Coffee_Session' : 'Invited';
        var h = await api('tindakLanjut', { id_orang: c.id_orang, tahap: tujuan });
        if (!h.ok) return toast(h.pesan);
        segCalon = tujuan === 'Coffee_Session' ? 'done' : 'todo';
        toast(c.nama.split(/\s+/)[0] + (tujuan === 'Coffee_Session' ? ' moved to Interviewed' : ' is back in To schedule')); subCalon(w);
      };
    });
  }

  async function lembarCalon(c, segarkan) {
    var tahap = ['Invited', 'Coffee_Scheduled', 'Attended', 'Coffee_Session', 'Applied', 'Joined_Other', 'Declined', 'Rejected'];
    if (!c.id_kursi && !S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    bukaLembar(
      '<div class="tajuk"><span class="lambang" style="width:52px;height:52px;font-size:20px">' + inisial(c.nama) + '</span><div><p class="kecil">' + esc(c.bidang) + '</p><h2>' + esc(c.nama) + '</h2>' + (c.bisnis ? '<p class="kecil">' + esc(c.bisnis) + '</p>' : '') + '</div></div>' +
      (c.whatsapp ? '<a class="tombol kedua" target="_blank" rel="noopener" href="' + esc(waLink(c.whatsapp)) + '" style="margin-bottom:14px">Chat on WhatsApp</a>' : '') +
      '<form id="f-tl"><p class="kecil" style="margin-bottom:4px">Current stage: <b>' + esc(lblTahap(c.tahap)) + '</b>. Change to:</p><p class="kecil redup" style="margin-bottom:8px">Flow: Invited, Attended, Coffee session, Applied, Joined. Exit: Declined, Rejected.</p>' +
      '<div class="pilihan" style="margin-bottom:14px">' + tahap.map(function (t) {
        return '<button type="button" data-tahap="' + t + '" aria-pressed="' + (t === c.tahap) + '">' + esc(lblTahap(t)) + '</button>';
      }).join('') + '</div>' +
      '<label class="isian" id="isi-cs"' + (c.tahap === 'Coffee_Scheduled' ? '' : ' hidden') + '><span>Coffee session schedule</span><input type="datetime-local" name="jadwal_cs" value="' + esc(nilaiLokal(c.jadwal_cs)) + '"></label>' +
      (c.id_kursi ? '' : pilihKursiKosong('id_kursi', false)) +
      '<label class="isian"><span>Short note or reason (optional)</span><textarea name="catatan" placeholder="Example: asked to be contacted after the 15th"></textarea></label>' +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<button class="tombol" type="submit">Save follow-up</button></form>' +
      '<div class="baris-tombol"><button class="tombol kedua" id="b-anggota">Make a member</button></div>',
      function (el) {
        var pilih = c.tahap;
        el.querySelectorAll('[data-tahap]').forEach(function (b) {
          b.onclick = function () {
            pilih = b.dataset.tahap;
            el.querySelectorAll('[data-tahap]').forEach(function (z) { z.setAttribute('aria-pressed', z === b); });
            el.querySelector('#isi-cs').hidden = pilih !== 'Coffee_Scheduled';
          };
        });
        el.querySelector('#f-tl').onsubmit = async function (e) {
          e.preventDefault();
          if (TAHAP_VALID.indexOf(pilih) < 0) { var s0 = el.querySelector('#salah'); s0.textContent = 'Choose the new stage.'; s0.hidden = false; return; }
          var jcs = e.target.jadwal_cs.value;
          var r = await api('tindakLanjut', { id_orang: c.id_orang, tahap: pilih, catatan: e.target.catatan.value, jadwal_cs: jcs ? new Date(jcs).toISOString() : '', id_kursi: e.target.id_kursi ? e.target.id_kursi.value : '' });
          if (!r.ok) { var s = el.querySelector('#salah'); s.textContent = r.pesan; s.hidden = false; return; }
          tutupLembar(); toast(c.nama.split(/\s+/)[0] + ' is now ' + lblTahap(r.tahap)); S.cache.kursi = null; segarkan();
        };
        el.querySelector('#b-anggota').onclick = function () { lembarAnggota(c, segarkan); };
      });
  }
  var TAHAP_VALID = ['Listed', 'Invited', 'Coffee_Scheduled', 'Attended', 'Coffee_Session', 'Applied', 'Joined_Other', 'Declined', 'Rejected'];

  /* ---------- pilihan sponsor: member, LDC dan LT, BNI Indonesia, atau nama bebas ---------- */
  function pilihSponsor(r, nilai, opsi) {
    opsi = opsi || {};
    var manual = /^Luar: /.test(nilai || '');
    function o(v, t) { return '<option value="' + esc(v) + '"' + (v === (manual ? '__manual' : nilai) ? ' selected' : '') + '>' + esc(t) + '</option>'; }
    var anggota = (r.anggota || []).filter(function (m) { return m.id_orang !== opsi.kecuali; });
    return '<label class="isian"><span>Sponsor</span><select name="id_sponsor" data-sponsor>' +
      (opsi.kosong ? '<option value="">' + esc(opsi.kosong) + '</option>' : '') +
      (anggota.length ? '<optgroup label="Members">' + anggota.map(function (m) { return o(m.id_orang, m.nama); }).join('') + '</optgroup>' : '') +
      ((r.pendiri || []).length ? '<optgroup label="LDC and launch team">' + r.pendiri.filter(function (m) { return m.id_orang !== opsi.kecuali; }).map(function (m) { return o(m.id_orang, m.nama); }).join('') + '</optgroup>' : '') +
      '<optgroup label="Other">' + o('BNI', 'BNI Indonesia (no one known personally)') + o('__manual', 'Someone else (type the name)') + '</optgroup>' +
      '</select></label>' +
      '<label class="isian" data-sponsor-manual' + (manual ? '' : ' hidden') + '><span>Sponsor name</span><input name="sponsor_manual" maxlength="60" autocomplete="off" placeholder="Name, and chapter if known" value="' + esc(manual ? nilai.replace(/^Luar: /, '') : '') + '"></label>';
  }
  function pasangSponsor(el) {
    var sel = el.querySelector('[data-sponsor]'), box = el.querySelector('[data-sponsor-manual]');
    if (!sel) return;
    sel.onchange = function () { box.hidden = sel.value !== '__manual'; if (!box.hidden) box.querySelector('input').focus(); };
  }
  /* Nilai yang dikirim ke server, atau null bila nama bebas masih kosong. */
  function ambilSponsor(f) {
    if (f.id_sponsor.value !== '__manual') return f.id_sponsor.value;
    var t = f.sponsor_manual.value.trim();
    return t.length >= 2 ? 'Luar: ' + t : null;
  }

  async function lembarAnggota(c, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('anggota');
    if (!S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    bukaLembar(
      '<h2>' + esc(c.nama.split(/\s+/)[0]) + ' joined</h2><p class="kecil" style="margin:4px 0 0">Confirm once the membership payment is in.</p><p class="kecil" style="margin:6px 0 14px">Seat: <b>' + esc(c.bidang) + '</b>. Type: ' + (S.atur.fase === 'Pembentukan' ? 'Founding' : 'Core Group') + '.</p>' +
      '<form id="f-ang">' + pilihKursiAnggota('id_kursi', c.id_kursi, c.bisnis) + '' + pilihSponsor(r, '', { kosong: 'Choose a sponsor' }) +
      '<p class="kecil" style="margin:-4px 0 14px">BNI rule: the sponsor is the member who invited the prospect and is known to them personally. If there is none, choose BNI Indonesia, unless the prospect names a specific person. Someone outside the list can be typed in.</p>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Confirm</button></form>',
      function (el) {
        pasangKursiBaru(el); pasangSponsor(el);
        el.querySelector('#f-ang').onsubmit = async function (e) {
          e.preventDefault();
          var sp = ambilSponsor(e.target);
          if (!sp) { var s1 = el.querySelector('#salah'); s1.textContent = 'Choose the sponsor, or type a name.'; s1.hidden = false; return; }
          var h = await api('jadikanAnggota', Object.assign({ id_orang: c.id_orang, id_sponsor: sp }, dataSeat(e.target, 'id_kursi')));
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          S.cache.kursi = null; segarkan();
          var nd = c.nama.split(/\s+/)[0];
          bukaLembar('<h2>' + esc(nd) + ' officially took the ' + esc(h.kursi) + ' seat</h2><p class="kecil" style="margin:4px 0 12px">' + esc(h.jenis_anggota) + ' member.</p>' +
            kartuKode(nd, h.whatsapp, h.akses, h.akses.aktif ? 'Send it now. The code works right away.' : 'Active after ESM. The LDC turns on member codes then.') +
            '<div class="baris-tombol"><button class="tombol kedua" id="t-tutup">Done</button></div>', function (el2) { pasangSalinKode(el2); el2.querySelector('#t-tutup').onclick = tutupLembar; });
          toast(nd + ' officially took the ' + h.kursi + ' seat', true);
        };
      });
  }

  var acaraRabu = '', saringAbsen = 'semua';
  function labelAbsen(e) { return (e.jenis === 'BOD' ? 'BOD' : e.jenis === 'Lunch Networking' ? 'Lunch' : e.nama_acara) + ' · ' + tglHari(e.tanggal) + ' ' + e.jam_mulai; }
  async function subRabu(w) {
    var ac = await api('acaraCheckin');
    if (!ac.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(ac.pesan) + '</p>'; return; }
    var daftarAc = ac.acara || [];
    if (!daftarAc.length) { w.innerHTML = '<p class="kosong-isi">No events in the last three weeks or the next two. Add them in More, Announcements, Add event.</p>'; return; }
    if (!daftarAc.some(function (e) { return e.id_event === acaraRabu; })) {
      // acara hari ini, kalau tidak ada yang terdekat berikutnya, kalau tidak ada yang terakhir
      var pilihan = daftarAc.filter(function (e) { return e.tanggal === ac.hari_ini; })[0] || daftarAc.filter(function (e) { return e.tanggal > ac.hari_ini; })[0] || daftarAc[daftarAc.length - 1];
      acaraRabu = pilihan.id_event;
    }
    var r = await api('daftarHadir', { id_event: acaraRabu });
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var urut = { Visitor: 0, Anggota: 1, LT: 2, LDC: 2 };
    r.orang.sort(function (a, b) { return urut[a.peran] - urut[b.peran] || (a.nama < b.nama ? -1 : 1); });
    var hadirN = r.orang.filter(function (o) { return o.hadir; }).length;
    var anggotaOrang = r.orang.filter(function (o) { return o.peran === 'Anggota'; });
    var anggotaHadir = anggotaOrang.filter(function (o) { return o.hadir; }).length;
    var lampau = daftarAc.filter(function (e) { return e.id_event === acaraRabu; })[0].tanggal < ac.hari_ini;
    w.innerHTML = '<label class="isian"><span>Event</span><select id="pil-ev">' + daftarAc.map(function (e) {
        return '<option value="' + esc(e.id_event) + '"' + (e.id_event === acaraRabu ? ' selected' : '') + '>' + esc(labelAbsen(e)) + (e.tanggal < ac.hari_ini ? ' (past)' : '') + '</option>';
      }).join('') + '</select></label>' +
      '<div class="ringkas-absen"><span><b id="jml">' + hadirN + '</b> present</span><span><b id="jml-ang">' + anggotaHadir + '</b> of ' + anggotaOrang.length + ' members</span><span><b id="jml-absen">' + (anggotaOrang.length - anggotaHadir) + '</b> members absent</span></div>' +
      (lampau ? '<p class="kecil" style="margin:0 2px 8px">This event is over. Late entries are still saved.</p>' : '') +
      '<div class="saring" role="group" aria-label="Filter">' + [['semua', 'Everyone'], ['absen', 'Not present'], ['hadir', 'Present']].map(function (f) {
        return '<button data-saring-absen="' + f[0] + '" aria-pressed="' + (saringAbsen === f[0]) + '">' + f[1] + '</button>';
      }).join('') + '</div>' +
      '<input class="cari" id="cari" placeholder="Search name" type="search">' +
      '<section class="kartu"><ul class="daftar">' + r.orang.map(function (o) {
        return '<li data-cari="' + esc(o.nama.toLowerCase()) + '" data-hadir="' + o.hadir + '" data-peran="' + esc(o.peran) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(o.peran === 'Visitor' ? 'Visitor' + (o.pengundang ? ', invited by ' + o.pengundang : '') : (PERAN_LABEL[o.peran] || o.peran)) + '</span></div>' + (o.peran === 'Visitor' && o.status === 'Terdaftar' && o.whatsapp ? '<button class="tombol kecil kedua" data-konfirm="' + esc(o.id_orang) + '" type="button">' + (sudahKonfirm(r.acara.id_event, o.id_orang) ? 'Sent' : 'Confirm') + '</button>' : '') + '<button class="hadir-saklar" data-o="' + esc(o.id_orang) + '" aria-pressed="' + o.hadir + '" aria-label="Present: ' + esc(o.nama) + '"></button></li>';
      }).join('') + '</ul></section>';
    function terapkan() {
      var q = w.querySelector('#cari').value.toLowerCase();
      w.querySelectorAll('[data-cari]').forEach(function (li) {
        var h = li.dataset.hadir === 'true';
        li.hidden = (q && li.dataset.cari.indexOf(q) < 0) || (saringAbsen === 'absen' && h) || (saringAbsen === 'hadir' && !h);
      });
    }
    function hitung() {
      var lis = w.querySelectorAll('[data-cari]');
      var h = 0, a = 0, ang = 0;
      lis.forEach(function (li) { var ya = li.dataset.hadir === 'true'; if (ya) h++; if (li.dataset.peran === 'Anggota') { ang++; if (ya) a++; } });
      w.querySelector('#jml').textContent = h; w.querySelector('#jml-ang').textContent = a; w.querySelector('#jml-absen').textContent = ang - a;
    }
    terapkan();
    w.querySelector('#pil-ev').onchange = function (e) { acaraRabu = e.target.value; subRabu(w); };
    w.querySelector('#cari').oninput = terapkan;
    w.querySelectorAll('[data-saring-absen]').forEach(function (t) {
      t.onclick = function () { saringAbsen = t.dataset.saringAbsen; w.querySelectorAll('[data-saring-absen]').forEach(function (z) { z.setAttribute('aria-pressed', z === t); }); terapkan(); };
    });
    w.querySelectorAll('[data-konfirm]').forEach(function (b) {
      b.onclick = function () {
        var o = r.orang.filter(function (z) { return z.id_orang === b.dataset.konfirm; })[0];
        lembarKonfirmasi(o, r.acara, function () { b.textContent = 'Sent'; });
      };
    });
    w.querySelectorAll('[data-o]').forEach(function (t) {
      t.onclick = async function () {
        var jadi = t.getAttribute('aria-pressed') !== 'true';
        var li = t.closest('li');
        t.setAttribute('aria-pressed', jadi); li.dataset.hadir = String(jadi); hitung();
        var h = await api('checkin', { id_event: acaraRabu, id_orang: t.dataset.o, hadir: jadi });
        if (!h.ok) { t.setAttribute('aria-pressed', !jadi); li.dataset.hadir = String(!jadi); hitung(); return toast(h.pesan); }
      };
    });
  }

  /* ---------- Konfirmasi H-1 untuk visitor yang sudah mendaftar (LT dan LDC) ---------- */
  function kunciKonfirm(idEv, idOrang) { return 'optima_konf_' + idEv + '_' + idOrang; }
  function sudahKonfirm(idEv, idOrang) { return ambil(kunciKonfirm(idEv, idOrang)) === '1'; }
  function tglIDPenuh(iso) { var d = wib(iso); return HARI_ID[d.getUTCDay()] + ', ' + d.getUTCDate() + ' ' + BULAN_ID[d.getUTCMonth()] + ' ' + d.getUTCFullYear(); }
  function selisihHari(iso) {
    var n = wib(new Date().toISOString());
    return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate())) / 864e5);
  }
  function pesanKonfirmasi(o, e) {
    var A = S.atur, P = S.profil, depan = o.nama.split(/\s+/)[0];
    var judul = e.jenis === 'BOD' ? 'Exclusive Business Opportunity Day' : (e.nama_acara || 'acara');
    var sel = selisihHari(e.tanggal), rel = sel === 1 ? 'besok' : sel === 0 ? 'hari ini' : 'pada ' + tglID(e.tanggal);
    var jam = e.jam_mulai + (e.jam_selesai ? ' - ' + e.jam_selesai : '');
    var online = e.mode === 'Online';
    var zoom = '';
    if (online) {
      zoom = '\n\n' + (A.tautan_zoom_bod || '[link Zoom belum diisi di Settings]');
      if (A.zoom_bod_id) zoom += '\n\nMeeting ID: ' + A.zoom_bod_id;
      if (A.zoom_bod_kode) zoom += '\nPasscode: ' + A.zoom_bod_kode;
    }
    var chapter = 'BNI ' + (A.nama_chapter || 'Optima');
    return 'Selamat ' + salamSekarang().id + ' Bapak/Ibu ' + o.nama + ',\n\n' +
      (o.pengundang_lengkap ? 'Anda diundang oleh teman Anda, *' + o.pengundang_lengkap + '* untuk acara *' + judul + '*.' : 'Anda diundang untuk acara *' + judul + '*.') + '\n\n' +
      (online ? 'Berikut adalah link Zoom untuk mengikuti acara Business Owners Meeting and Networking bersama ' + chapter + ' ' + rel + ':' : 'Berikut adalah detail acara Business Owners Meeting and Networking bersama ' + chapter + ' ' + rel + ':') + '\n\n' +
      'Tanggal *' + tglIDPenuh(e.tanggal) + '*\nPukul *' + jam + '* WIB ' + (online ? 'via ' + (e.lokasi || 'Zoom') : 'di ' + (e.lokasi || 'lokasi yang akan dikabari')) + '\n\n' +
      'Mohon datang tepat waktu supaya Anda bisa mendapatkan experience networking optimal, dalam acara networking antar founders, serta sesi sharing tentang bisnis Anda, bersama member kami dan visitor lainnya.\n\n' +
      'Sampai ketemu ' + rel + ' Bapak/Ibu ' + depan + ' 🙏🏻' + zoom + '\n\nSalam Hangat,\n\n' + P.nama + '\n' +
      (P.usaha ? 'CEO ' + P.usaha + ',\n' : '') + (isLDC() ? 'Director Consultant' : 'Launch Team') + ' ' + chapter + '.';
  }
  function lembarKonfirmasi(o, e, tandai) {
    var A = S.atur, kurang = e.mode === 'Online' && !A.tautan_zoom_bod;
    bukaLembar('<h2>Confirm ' + esc(o.nama.split(/\s+/)[0]) + '</h2><p class="kecil" style="margin:4px 0 12px">Send this the day before, with the Zoom details. You can edit the text first.</p>' +
      (kurang ? '<p class="pesan-salah">The Wednesday Zoom link is not set yet.' + (isLDC() ? ' Add it in More, Settings.' : ' Ask Coach Dedy to add it in Settings.') + '</p>' : '') +
      '<textarea id="k-pesan" class="pesan-undangan" rows="14"></textarea>' +
      '<div class="baris-tombol" style="margin-top:10px"><button class="tombol" id="k-wa" type="button">Open WhatsApp</button><button class="tombol kedua" id="k-salin" type="button">Copy message</button></div>',
      function (el) {
        var ta = el.querySelector('#k-pesan');
        ta.value = pesanKonfirmasi(o, e);
        function catat() { simpan(kunciKonfirm(e.id_event, o.id_orang), '1'); if (tandai) tandai(); }
        el.querySelector('#k-salin').onclick = function () { salinTeks(ta.value, ta); catat(); toast('Message copied. Paste it in WhatsApp.'); };
        el.querySelector('#k-wa').onclick = function () {
          var url = waLink(String(o.whatsapp).replace(/\D/g, '').replace(/^620/, '62').replace(/^0/, '62'), ta.value);
          var j = window.open(url, '_blank');
          if (!j) location.href = url;
          catat();
        };
      });
  }

  /* ---------- Announce: pengumuman dan info acara ---------- */
  async function subInfo(w) {
    var h = await Promise.all([api('pengumuman'), api('acara')]);
    var pg = h[0], ac = h[1];
    if (!pg.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(pg.pesan) + '</p>'; return; }
    var acara = (ac.acara || []).slice(0, 12);
    w.innerHTML =
      '<div class="judul-bagian"><h2>Announcements</h2><button class="tombol kecil" id="p-baru">New</button></div>' +
      '<section class="kartu">' + (pg.pengumuman.length ? '<ul class="daftar">' + pg.pengumuman.map(function (a) {
        return '<li><div class="utama"><b>' + esc(a.judul) + '</b><span>' + esc(lalu(a.tanggal_tayang)) + ' · by ' + esc(a.oleh) + (a.tanggal_berakhir ? ' · until ' + esc(tglPendek(a.tanggal_berakhir)) : '') + '</span></div>' +
          '<button class="tombol kecil kedua" data-ubah="' + esc(a.id_pengumuman) + '">Edit</button><button class="tombol kecil kedua" data-hapus="' + esc(a.id_pengumuman) + '">Remove</button></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">No active announcements. Members see announcements on Home.</p>') + '</section>' +
      '<div class="judul-bagian"><h2>Events</h2>' + (isLDC() ? '<button class="tombol kecil kedua" id="a-geser" type="button">Shift dates</button>' : '') + '<button class="tombol kecil" id="a-baru">Add event</button></div>' +
      '<p class="kecil" style="margin:-4px 2px 10px">The sign-up Form shows only the next Wednesday events (BOD and Lunch Networking). The list updates by itself.</p>' +
      '<section class="kartu">' + (acara.length ? '<ul class="daftar">' + acara.map(function (e) {
        return '<li><div class="utama"><b>' + esc(tglHari(e.tanggal)) + ' · ' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' ' + esc(e.jam_mulai) + '</b><span>' + (e.pembicara ? esc(e.pembicara) : 'No speaker yet') + (e.poster ? ' · poster set' : '') + '</span></div>' +
          '<button class="tombol kecil kedua" data-acara="' + esc(e.id_event) + '">Edit</button></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">No upcoming events in the sheet yet.</p>') + '</section>' +
      '<p class="catatan-main">Poster: paste a share link (Google Drive set to "Anyone with the link", or any https image link).</p>';
    var segar = function () { subInfo(w); };
    w.querySelector('#p-baru').onclick = function () { lembarPengumuman(null, segar); };
    w.querySelector('#a-baru').onclick = function () { lembarTambahAcara(segar); };
    var ag = w.querySelector('#a-geser');
    if (ag) ag.onclick = function () { lembarGeserAcara(segar); };
    w.querySelectorAll('[data-ubah]').forEach(function (b) { b.onclick = function () { lembarPengumuman(pg.pengumuman.filter(function (a) { return a.id_pengumuman === b.dataset.ubah; })[0], segar); }; });
    w.querySelectorAll('[data-hapus]').forEach(function (b) {
      b.onclick = async function () {
        if (!confirm('Remove this announcement for everyone?')) return;
        var r = await api('hapusPengumuman', { id_pengumuman: b.dataset.hapus });
        if (!r.ok) return toast(r.pesan);
        toast('Announcement removed.'); segar();
      };
    });
    w.querySelectorAll('[data-acara]').forEach(function (b) { b.onclick = function () { lembarAcara(acara.filter(function (e) { return e.id_event === b.dataset.acara; })[0], segar); }; });
  }

  function lembarPengumuman(a, segarkan) {
    var hariIni = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    bukaLembar('<h2>' + (a ? 'Edit announcement' : 'New announcement') + '</h2><p class="kecil" style="margin:6px 0 14px">Everyone with the app sees it on Home until the end date.</p>' +
      '<form id="f-p"><label class="isian"><span>Title</span><input name="judul" maxlength="80" required value="' + esc(a ? a.judul : '') + '"></label>' +
      '<label class="isian"><span>Text</span><textarea name="isi" rows="5" maxlength="1000" required>' + esc(a ? a.isi : '') + '</textarea></label>' +
      '<label class="isian"><span>Poster link (optional)</span><input name="poster" type="url" placeholder="https://" value="' + esc(a ? a.poster : '') + '"></label>' +
      '<label class="isian"><span>Show until (optional)</span><input type="date" name="akhir" min="' + hariIni + '" value="' + esc(a ? a.tanggal_berakhir : '') + '"></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">' + (a ? 'Save changes' : 'Publish') + '</button></form>',
      function (el) {
        el.querySelector('#f-p').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, sl = el.querySelector('#salah');
          var r = await api('tulisPengumuman', { id_pengumuman: a ? a.id_pengumuman : '', judul: f.judul.value, isi: f.isi.value, poster: f.poster.value.trim(), tanggal_berakhir: f.akhir.value });
          if (!r.ok) { sl.textContent = r.pesan; sl.hidden = false; return; }
          tutupLembar(); toast(a ? 'Announcement updated.' : 'Announcement published.'); segarkan();
        };
      });
  }

  function lembarAcara(e, segarkan) {
    bukaLembar('<h2>' + esc(e.nama_acara) + '</h2><p class="kecil" style="margin:6px 0 14px">' + esc(tglHari(e.tanggal)) + ' · ' + esc(e.jam_mulai) + '</p>' +
      '<form id="f-a"><label class="isian"><span>Date</span><input name="tanggal" type="date" required value="' + esc(e.tanggal) + '"></label>' +
      '<div class="dua-kolom"><label class="isian"><span>Start</span><input name="jam_mulai" type="time" required value="' + esc(e.jam_mulai) + '"></label>' +
      '<label class="isian"><span>End</span><input name="jam_selesai" type="time" value="' + esc(e.jam_selesai) + '"></label></div>' +
      '<label class="isian"><span>Format</span><select name="mode"><option' + (e.mode !== 'Online' ? ' selected' : '') + '>Onsite</option><option' + (e.mode === 'Online' ? ' selected' : '') + '>Online</option></select></label>' +
      '<label class="isian"><span>Location or link</span><input name="lokasi" maxlength="120" value="' + esc(e.lokasi) + '" placeholder="Venue name or Zoom"></label>' +
      '<label class="isian"><span>Speaker and topic</span><input name="pembicara" maxlength="120" value="' + esc(e.pembicara) + '" placeholder="Name: topic"></label>' +
      '<label class="isian"><span>Poster link (optional)</span><input name="poster" type="url" placeholder="https://" value="' + esc(e.poster) + '"></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save</button></form>' +
      '<div class="baris-tombol"><button class="tombol kedua" id="a-batal">Cancel this event</button></div>',
      function (el) {
        el.querySelector('#f-a').onsubmit = async function (ev) {
          ev.preventDefault();
          var f = ev.target, sl = el.querySelector('#salah');
          var r = await api('ubahAcara', { id_event: e.id_event, tanggal: f.tanggal.value, jam_mulai: f.jam_mulai.value, jam_selesai: f.jam_selesai.value, mode: f.mode.value, lokasi: f.lokasi.value, pembicara: f.pembicara.value, poster: f.poster.value.trim() });
          if (!r.ok) { sl.textContent = r.pesan; sl.hidden = false; return; }
          tutupLembar(); toast('Event saved.'); segarkan();
        };
        el.querySelector('#a-batal').onclick = async function () {
          if (!confirm('Cancel this event? It disappears for everyone, and registered guests are not notified.')) return;
          var r = await api('ubahAcara', { id_event: e.id_event, status: 'Batal' });
          if (!r.ok) return toast(r.pesan);
          tutupLembar(); toast('Event cancelled.'); segarkan();
        };
      });
  }

  /* Tambah jadwal: BOD, Lunch Networking, ESM, atau lainnya; bisa diulang tiap pekan. */
  /* LDC: geser semua acara yang belum lewat, mis. saat ESM maju atau mundur. */
  function lembarGeserAcara(segarkan) {
    var hariIni = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    bukaLembar('<h2>Shift dates</h2><p class="kecil" style="margin:4px 0 12px">Moves every event on or after the chosen date by the same number of days. If the ESM event moves, the ESM date in Settings follows. Guests who already signed up stay attached to their event, so send them a new confirmation.</p>' +
      '<form id="f-geser"><label class="isian"><span>From this date</span><input type="date" name="dari" value="' + hariIni + '" required></label>' +
      '<label class="isian"><span>Move by how many days (negative moves earlier, 7 = one week later)</span><input name="hari" inputmode="numeric" required placeholder="7"></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Shift dates</button></form>',
      function (el) {
        el.querySelector('#f-geser').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, n = parseInt(f.hari.value, 10);
          if (!confirm('Move all events from ' + f.dari.value + ' by ' + n + ' days?')) return;
          var h = await api('geserAcara', { dari: f.dari.value, hari: n });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          var m = await api('masuk'); if (m.ok) S.atur = m.pengaturan;
          tutupLembar(); toast(h.digeser + ' events moved.'); if (segarkan) segarkan();
        };
      });
  }

  function lembarTambahAcara(segarkan) {
    var PRESET = { 'BOD': ['07:00', '09:00', 'Online', 'Zoom'], 'Lunch Networking': ['12:00', '14:00', 'Onsite', ''], 'ESM': ['', '', 'Onsite', ''], 'Other': ['', '', 'Onsite', ''] };
    var jenis = 'BOD';
    var hariIni = new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10);
    bukaLembar('<h2>Add an event</h2><p class="kecil" style="margin:4px 0 12px">Add the BOD and Lunch Networking for the coming weeks in one go. Members can invite guests to any event that appears here.</p>' +
      '<div class="pilihan" style="margin-bottom:12px">' + Object.keys(PRESET).map(function (j) { return '<button type="button" data-j="' + j + '" aria-pressed="' + (j === jenis) + '">' + (j === 'Other' ? 'Other' : j) + '</button>'; }).join('') + '</div>' +
      '<form id="f-ta"><label class="isian" id="l-nama" hidden><span>Event name</span><input name="nama_acara" maxlength="80"></label>' +
      '<label class="isian"><span>First date</span><input name="tanggal" type="date" required min="' + hariIni + '"></label>' +
      '<div class="dua-kolom"><label class="isian"><span>Start</span><input name="jam_mulai" type="time" required></label><label class="isian"><span>End</span><input name="jam_selesai" type="time"></label></div>' +
      '<label class="isian"><span>Format</span><select name="mode"><option>Onsite</option><option>Online</option></select></label>' +
      '<label class="isian"><span>Location or link</span><input name="lokasi" maxlength="120" placeholder="Venue name or Zoom"></label>' +
      '<label class="isian"><span>Repeat every week for</span><select name="ulang"><option value="1">Just this date</option><option value="4">4 weeks</option><option value="8">8 weeks</option><option value="12">12 weeks</option></select></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Add</button></form>',
      function (el) {
        var f = el.querySelector('#f-ta');
        function isiPreset() {
          var p = PRESET[jenis];
          f.jam_mulai.value = p[0]; f.jam_selesai.value = p[1]; f.mode.value = p[2]; f.lokasi.value = p[3];
          el.querySelector('#l-nama').hidden = jenis !== 'Other';
          f.nama_acara.required = jenis === 'Other';
        }
        isiPreset();
        el.querySelectorAll('[data-j]').forEach(function (b) {
          b.onclick = function () { jenis = b.dataset.j; el.querySelectorAll('[data-j]').forEach(function (z) { z.setAttribute('aria-pressed', z === b); }); isiPreset(); };
        });
        f.onsubmit = async function (e) {
          e.preventDefault();
          var sl = el.querySelector('#salah');
          var r = await api('tambahAcara', { jenis: jenis, nama_acara: f.nama_acara.value, tanggal: f.tanggal.value, jam_mulai: f.jam_mulai.value, jam_selesai: f.jam_selesai.value, mode: f.mode.value, lokasi: f.lokasi.value, ulang: f.ulang.value });
          if (!r.ok) { sl.textContent = r.pesan; sl.hidden = false; return; }
          tutupLembar();
          toast(r.dibuat + ' event' + (r.dibuat === 1 ? '' : 's') + ' added' + (r.dilewati ? ', ' + r.dilewati + ' already existed' : '') + '.', r.dibuat > 0);
          segarkan();
        };
      });
  }

  function subLainnya(w) {
    var item = [['info', 'Announcements', 'Write announcements, set speaker and poster'], ['wawasan', 'Insights', isLDC() ? 'Summary, regroup, round history' : 'Regroup and round history']];
    if (isLDC()) item.unshift(['orang', 'People', 'Everyone since the start, teams, codes, add launch team or a member']);
    else item.unshift(['kontak', 'Contacts', 'Name, classification and phone of members and prospects']);
    if (isLDC()) item.push(['atur', 'Settings', 'Phase, dates, targets, teams, driver rules']);
    w.innerHTML = '<section class="kartu"><ul class="daftar">' + item.map(function (x) {
      return '<li><a class="ketuk" href="#tim-' + x[0] + '" style="flex:1;min-width:0;display:block"><div class="utama"><b>' + x[1] + '</b><span>' + x[2] + '</span></div></a></li>';
    }).join('') + '</ul></section>';
  }
  /* ---------- Insights: Summary (LDC), Regroup, Rounds dalam satu tempat ---------- */
  var tabWawasan = 'regroup';
  function subWawasan(w) {
    var tabs = (isLDC() ? [['ringkas', 'Summary']] : []).concat([['regroup', 'Regroup'], ['riwayat', 'Rounds']]);
    if (!tabs.some(function (t) { return t[0] === tabWawasan; })) tabWawasan = tabs[0][0];
    w.innerHTML = '<div class="tab" role="tablist" style="margin-top:0">' + tabs.map(function (t) {
      return '<button role="tab" data-w="' + t[0] + '" aria-selected="' + (t[0] === tabWawasan) + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="isi-wawasan"><div class="muat"></div></div>';
    w.querySelectorAll('[data-w]').forEach(function (t) { t.onclick = function () { tabWawasan = t.dataset.w; subWawasan(w); }; });
    ({ ringkas: subRingkas, regroup: subRegroup, riwayat: subRiwayat })[tabWawasan](w.querySelector('#isi-wawasan'));
  }

  /* ---------- Contacts: nama, klasifikasi, nomor (hanya LT dan LDC) ---------- */
  async function subKontak(w) {
    w.innerHTML = '<div class="muat"></div>';
    var r = await api('kontak');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    function baris(o) {
      var no = o.whatsapp;
      return '<li data-nama="' + esc((o.nama + ' ' + o.bidang).toLowerCase()) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(o.bidang || 'Undecided classification') + (o.jenis === 'Prospect' ? ' · ' + esc(lblTahap(o.tahap)) : '') + '</span>' +
        '<span>' + nomorWa(no) + '</span></div>' +
        (no ? '<a class="tombol kecil kedua" href="' + esc(waLink(no)) + '" target="_blank" rel="noopener">WhatsApp</a>' : '') + '</li>';
    }
    function bagian(judul, daftar, kosong) {
      return '<div class="judul-bagian"><h2>' + judul + '</h2><span class="kecil">' + daftar.length + '</span></div><section class="kartu">' +
        (daftar.length ? '<ul class="daftar">' + daftar.map(baris).join('') + '</ul>' : '<p class="kosong-isi">' + kosong + '</p>') + '</section>';
    }
    w.innerHTML = '<label class="isian"><span>Search by name or classification</span><input id="cari-kontak" autocomplete="off"></label>' +
      bagian('Members', r.anggota, 'No members yet.') + bagian('Prospects', r.calon, 'No active prospects.') +
      '<p class="catatan-main">Visible to the launch team only. Please use these numbers only for chapter business.</p>';
    var cari = w.querySelector('#cari-kontak');
    cari.oninput = function () {
      var q = cari.value.trim().toLowerCase();
      w.querySelectorAll('li[data-nama]').forEach(function (li) { li.hidden = q && li.dataset.nama.indexOf(q) < 0; });
    };
  }

  /* ---------- Tim (LDC): mulai, seimbangkan, tukar anggota ---------- */
  function kartuKelolaTim(t) {
    if (!t || !t.ok) return '';
    var ukuran = t.tim.map(function (x) { return x.anggota.length; });
    var ket = t.aktif ? t.tim.length + ' teams: ' + ukuran.join(', ') + ' members' + (t.belum.length ? '. ' + t.belum.length + ' without a team' : '') : (t.jumlah_anggota ? t.jumlah_anggota + ' members can be split into teams' : 'Teams start once there are members');
    return '<section class="kartu" style="margin-bottom:10px"><div class="langkah-atas"><span class="chip merah">Teams</span></div><p class="kecil">' + esc(ket) + '</p>' +
      '<div class="baris-tombol"><button class="tombol kecil' + (t.aktif ? ' kedua' : '') + '" id="b-tim" type="button">' + (t.aktif ? 'Manage teams' : 'Set up teams') + '</button></div></section>';
  }
  async function lembarTim(segarkan) {
    bukaLembar('<div class="muat"></div>');
    var t = await api('timDaftar');
    if (!t.ok) { $lembarIsi.innerHTML = '<p class="kosong-isi">' + esc(t.pesan) + '</p>'; return; }
    var banyak = t.tim.length;
    var depan = Math.max(3, Math.ceil(t.jumlah_anggota / t.tim_maks));
    function opsi(pilih) {
      var o = '';
      for (var i = 1; i <= banyak + 1; i++) o += '<option value="' + i + '"' + (i === pilih ? ' selected' : '') + '>Team ' + i + (i > banyak ? ' (new)' : '') + '</option>';
      return o;
    }
    function barisAnggota(a, tim) {
      return '<li><div class="utama"><b>' + esc(a.nama) + '</b><span>' + esc(a.bidang || '') + '</span></div><select class="pilih-tim" data-id="' + esc(a.id_orang) + '" aria-label="Team for ' + esc(a.nama) + '">' + opsi(tim) + '</select></li>';
    }
    var html = '<h2>Teams</h2>';
    if (!t.aktif) {
      html += '<p class="kecil" style="margin:4px 0 12px">' + (t.jumlah_anggota
        ? 'Splits the ' + t.jumlah_anggota + ' members who have joined into ' + depan + ' teams of equal size, in joining order. New members join the smallest team. A new team opens when every team has ' + t.tim_maks + ' members.'
        : 'No member has joined yet. Teams are formed from members, not from the launch team.') + '</p>' +
        (t.jumlah_anggota ? '<button class="tombol" id="t-mulai" type="button">Split into ' + depan + ' teams</button>' : '');
    } else {
      html += '<p class="kecil" style="margin:4px 0 12px">Teams started ' + esc(tglPendek(t.mulai)) + '. New members join the smallest team automatically. Move someone with the menu next to the name.</p>' +
        t.tim.map(function (x) {
          return '<div class="judul-bagian"><h2>' + esc(x.nama) + '</h2><span class="kecil">' + x.anggota.length + ' members</span></div><section class="kartu">' +
            (x.anggota.length ? '<ul class="daftar">' + x.anggota.map(function (a) { return barisAnggota(a, x.tim); }).join('') + '</ul>' : '<p class="kosong-isi">Empty.</p>') + '</section>';
        }).join('') +
        (t.belum.length ? '<div class="judul-bagian"><h2>No team yet</h2></div><section class="kartu"><ul class="daftar">' + t.belum.map(function (a) { return barisAnggota(a, 0); }).join('') + '</ul></section>' : '') +
        '<div class="baris-tombol" style="margin-top:14px"><button class="tombol kedua" id="t-ulang" type="button">Rebalance everyone</button></div><p class="catatan-main">Rebalancing resets all swaps and splits members evenly again.</p>';
    }
    $lembarIsi.innerHTML = html + '<button class="tombol kedua" data-tutup type="button" style="margin-top:12px">Close</button>';
    async function atur(data, pesan) {
      var h = await api('timAtur', data);
      if (!h.ok) return toast(h.pesan);
      toast(pesan);
      lembarTim(segarkan);
      if (segarkan) segarkan();
    }
    var mulai = $lembarIsi.querySelector('#t-mulai');
    if (mulai) mulai.onclick = function () { atur({ tindakan: 'seimbangkan' }, 'Teams are set.'); };
    var ulang = $lembarIsi.querySelector('#t-ulang');
    if (ulang) ulang.onclick = function () { if (confirm('Rebalance all teams? Every swap you made is reset.')) atur({ tindakan: 'seimbangkan' }, 'Teams rebalanced.'); };
    $lembarIsi.querySelectorAll('.pilih-tim').forEach(function (sl) {
      sl.onchange = function () { atur({ tindakan: 'pindah', id_orang: sl.dataset.id, tim: sl.value }, 'Moved.'); };
    });
  }

  /* ---------- People, Settings, Data (hanya LDC) ---------- */
  function urlApp() { return location.href.split('#')[0].split('?')[0]; }
  function pesanKode(nama, kode) {
    return 'Halo ' + nama + ', ini kode akses BNI Optima Anda: ' + kode + '\n\nBuka ' + urlApp() + ' lalu masukkan kode itu di kotak masuk. Setelah itu app mengingat Anda di perangkat ini.\n\nKode ini pribadi, mohon tidak dibagikan.\n\nSalam,\nCoach Dedy';
  }
  function kartuKode(nama, wa, akses, catatan) {
    return '<section class="kartu kode-kartu"><p class="kecil">Access code' + (akses.aktif ? '' : ' (not active yet)') + '</p><p class="kode-besar">' + esc(akses.kode) + '</p>' +
      (catatan ? '<p class="kecil">' + esc(catatan) + '</p>' : '') +
      '<div class="baris-tombol">' + (wa ? '<a class="tombol" target="_blank" rel="noopener" href="' + esc(waLink(wa, pesanKode(nama, akses.kode))) + '">Send code on WhatsApp</a>' : '') +
      '<button class="tombol kedua" type="button" data-salin-kode="' + esc(akses.kode) + '">Copy code</button></div></section>';
  }
  function pasangSalinKode(el) {
    el.querySelectorAll('[data-salin-kode]').forEach(function (b) {
      b.onclick = function () { salinTeks(b.dataset.salinKode); toast('Code copied.'); };
    });
  }
  /* Edit seat (LDC): nama klasifikasi, nama kotak, baris. Tombolnya hanya ada di dalam lembar seat, bukan di papan. */
  async function lembarEditKursi(x, segarkan) {
    if (!S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    var baris = (S.cache.kursi || []).filter(function (b) { return b.nomor <= 9; });
    var asal = baris.filter(function (b) { return b.kursi.some(function (z) { return z.id_kursi === x.id_kursi; }); })[0];
    var kosong = x.status === 'kosong';
    bukaLembar('<h2>Edit seat</h2><p class="kecil" style="margin:4px 0 12px">The name changes everywhere right away. Members and prospects keep their seat.</p>' +
      '<form id="f-eks"><label class="isian"><span>Classification</span><input name="bidang" maxlength="60" required value="' + esc(x.bidang) + '"></label>' +
      '<label class="isian"><span>Name on the seat tile (up to 16 characters)</span><input name="singkat" maxlength="16" value="' + esc(x.singkat) + '"></label>' +
      '<label class="isian"><span>Contact sphere (row)</span><select name="baris">' + baris.map(function (b) { return '<option value="' + b.nomor + '"' + (asal && asal.nomor === b.nomor ? ' selected' : '') + '>' + b.nomor + '. ' + esc(b.sphere) + '</option>'; }).join('') + '</select></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save</button></form>' +
      (kosong ? '<p class="edit-seat"><button type="button" id="b-hapus-seat">Remove this seat</button></p>' : ''),
      function (el) {
        el.querySelector('#f-eks').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, s = el.querySelector('#salah');
          var h = await api('ubahKursi', { id_kursi: x.id_kursi, bidang: f.bidang.value, singkat: f.singkat.value, baris: f.baris.value });
          if (!h.ok) { s.textContent = h.pesan; s.hidden = false; return; }
          S.cache.kursi = null; tutupLembar(); toast('Seat saved.'); if (segarkan) segarkan();
        };
        var bh = el.querySelector('#b-hapus-seat');
        if (bh) bh.onclick = async function () {
          if (!confirm('Remove the ' + x.bidang + ' seat from the board? Only an empty seat without prospects can be removed.')) return;
          var h = await api('ubahKursi', { id_kursi: x.id_kursi, matikan: true });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          S.cache.kursi = null; tutupLembar(); toast('Seat removed.'); if (segarkan) segarkan();
        };
      });
  }

  /* Tombol + seat di halaman Seats: hanya untuk member yang sudah join. Member pindah ke seat baru. */
  async function lembarTambahKursi(baris, segarkan) {
    bukaLembar('<div class="muat"></div>');
    if (!S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    var r = await api('anggota');
    if (!r.ok) { bukaLembar('<p class="kosong-isi">' + esc(r.pesan) + '</p>'); return; }
    var opsi = '<option value="">Choose a member</option>' + (r.anggota || []).map(function (a) { return '<option value="' + esc(a.id_orang) + '">' + esc(a.nama) + '</option>'; }).join('');
    bukaLembar(
      '<h2>Add a seat</h2><p class="kecil" style="margin:4px 0 12px">Only for a member who has already joined and whose business is not on the list. The member moves to the new seat, and the old seat becomes empty again. For a prospect, add the seat when making them a member.</p>' +
      '<form id="f-kb"><label class="isian"><span>Member</span><select name="id_orang" required>' + opsi + '</select></label>' +
      isianKursiBaru({ tampil: true, baris: baris }).replace(' maxlength="60"', ' maxlength="60" required') +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Add seat</button></form>',
      function (el) {
        el.querySelector('#f-kb').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target;
          var h = await api('tambahKursi', { id_orang: f.id_orang.value, kursi_baru: bacaKursiBaru(f) });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          S.cache.kursi = null; tutupLembar(); toast('Seat added: ' + h.kursi, true); segarkan();
        };
      });
  }

  var JENIS_ORANG = { LDC: 'LDC', LT: 'Launch team', Member: 'Member', Prospect: 'Prospect', Closed: 'Closed' };
  var saringOrang = 'all', cariOrang = '';


  function kodeAcak() {
    var h = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = '';
    var a = new Uint32Array(8);
    (window.crypto || window.msCrypto).getRandomValues(a);
    for (var i = 0; i < 8; i++) r += h.charAt(a[i] % h.length);
    return r;
  }
  function lembarGantiKode() {
    var saran = kodeAcak();
    bukaLembar(
      '<h2>Change my code</h2><p class="kecil" style="margin:4px 0 12px">The new code works right away on every device. Devices that are already logged in stay logged in until the next login.</p>' +
      '<form id="f-ganti"><label class="isian"><span>Current code</span><input name="lama" autocomplete="off" autocapitalize="characters" maxlength="8" required></label>' +
      '<label class="isian"><span>New code (6 to 8 letters or digits)</span><input name="baru" class="kode" autocomplete="off" autocapitalize="characters" maxlength="8" required></label>' +
      '<p class="kecil" style="margin:-6px 0 12px">8 characters is safest. <button type="button" class="tombol kecil kedua" id="g-saran">Suggest one</button></p>' +
      '<label class="isian"><span>Repeat new code</span><input name="ulang" autocomplete="off" autocapitalize="characters" maxlength="8" required></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save new code</button></form>',
      function (el) {
        el.querySelector('#g-saran').onclick = function () { var f = el.querySelector('#f-ganti'); f.baru.value = saran; f.ulang.value = saran; toast('Suggested code filled in. Write it down before saving.'); saran = kodeAcak(); };
        el.querySelector('#f-ganti').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, s = el.querySelector('#salah');
          var baru = f.baru.value.trim().toUpperCase();
          if (baru !== f.ulang.value.trim().toUpperCase()) { s.textContent = 'The two new codes do not match.'; s.hidden = false; return; }
          var r = await api('gantiKodeSaya', { kode_lama: f.lama.value.trim(), kode_baru: baru });
          if (!r.ok) { s.textContent = r.pesan; s.hidden = false; return; }
          Api.setKode(baru); S.kode = baru; simpan('optima_kode', baru); bersihkanLokal();
          tutupLembar(); toast('Your code was changed.');
        };
      });
  }
  function lembarUlangSemua(segarkan) {
    bukaLembar(
      '<h2>Reset all codes</h2><p class="kecil" style="margin:4px 0 12px">Every launch team and member code is replaced with a new one. All old codes stop working at once. Your own code stays. Use this only if codes were leaked or many people lost theirs. For one person, use New code on their profile.</p>' +
      '<form id="f-reset"><label class="isian"><span>Type RESET to confirm</span><input name="k" autocomplete="off" autocapitalize="characters" required></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Reset all codes</button></form>',
      function (el) {
        el.querySelector('#f-reset').onsubmit = async function (e) {
          e.preventDefault();
          var s = el.querySelector('#salah');
          var r = await api('ulangSemuaKode', { konfirmasi: e.target.k.value });
          if (!r.ok) { s.textContent = r.pesan; s.hidden = false; return; }
          segarkan();
          bukaLembar('<h2>' + r.daftar.length + ' new codes</h2><p class="kecil" style="margin:4px 0 12px">Send each person their new code. This list is not saved here, but each code also shows on the person\'s profile in People.</p>' +
            '<section class="kartu"><ul class="daftar">' + r.daftar.map(function (d) {
              return '<li><div class="utama"><b>' + esc(d.nama) + '</b><span>' + esc(PERAN_LABEL[d.peran] || d.peran) + (d.aktif ? '' : ' · code off until ESM') + ' · <span class="kode-kecil">' + esc(d.kode) + '</span></span></div>' +
                (d.whatsapp ? '<a class="tombol kecil" target="_blank" rel="noopener" href="' + esc(waLink(d.whatsapp, pesanKode(d.nama_depan || d.nama, d.kode))) + '">Send</a>' : '<span class="kecil">no number</span>') + '</li>';
            }).join('') + '</ul></section><div class="baris-tombol"><button class="tombol kedua" id="t-tutup">Done</button></div>',
            function (el2) { el2.querySelector('#t-tutup').onclick = tutupLembar; });
        };
      });
  }

  async function subOrang(w) {
    w.innerHTML = '<div class="muat"></div>';
    var dua = await Promise.all([api('orangSemua'), api('timDaftar')]);
    var r = dua[0], tmk = dua[1];
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var orang = r.orang;
    var saring = [['all', 'All'], ['Member', 'Members'], ['Prospect', 'Prospects'], ['team', 'Launch team'], ['Closed', 'Closed']];
    var tanpaKode = orang.filter(function (o) { return o.jenis === 'Member' && o.kode !== 'aktif'; }).length;
    function cocok(o) {
      if (saringOrang === 'team' ? (o.jenis !== 'LT' && o.jenis !== 'LDC') : (saringOrang !== 'all' && o.jenis !== saringOrang)) return false;
      var q = cariOrang.trim().toLowerCase();
      return !q || (o.nama + ' ' + o.bidang + ' ' + o.whatsapp).toLowerCase().indexOf(q) >= 0;
    }
    function barisOrang(o) {
      var lencanaKode = o.kode === 'aktif' ? '' : (o.kode === 'belum' ? '<span class="chip">no code</span> ' : (o.kode === 'nonaktif' ? '<span class="chip">code off</span> ' : ''));
      var sub = (o.jenis === 'Prospect' || o.jenis === 'Closed') ? lblTahap(o.tahap) + (o.bidang ? ' · ' + o.bidang : '') : (o.bidang || JENIS_ORANG[o.jenis]);
      return '<li class="ketuk" data-o="' + esc(o.id_orang) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(sub) + '</span></div>' + lencanaKode + '<span class="chip' + (o.jenis === 'Member' ? ' merah' : '') + '">' + esc(JENIS_ORANG[o.jenis] || o.jenis) + '</span></li>';
    }
    function gambar() {
      var tampil = orang.filter(cocok).sort(function (a, b) { return a.nama < b.nama ? -1 : 1; });
      w.querySelector('#daftar-orang').innerHTML = tampil.length ? '<ul class="daftar">' + tampil.map(barisOrang).join('') + '</ul>' : '<p class="kosong-isi">No one matches.</p>';
      w.querySelectorAll('[data-o]').forEach(function (li) { li.onclick = function () { lembarOrang(li.dataset.o, function () { subOrang(w); }); }; });
      w.querySelector('#jml-orang').textContent = tampil.length;
    }
    w.innerHTML = '<div class="judul-bagian"><h2>People</h2><span class="kecil"><b id="jml-orang"></b> of ' + orang.length + '</span><button class="tombol kecil" id="o-baru">Add</button></div>' +
      (r.setelah_esm && tanpaKode ? '<section class="kartu sorotan"><h3>' + tanpaKode + ' member' + (tanpaKode > 1 ? 's' : '') + ' cannot log in yet</h3><p class="kecil">Turn on every member code, then send the codes from each profile.</p><div class="baris-tombol"><button class="tombol" id="o-aktif">Turn on member codes</button></div></section>'
        : (!r.setelah_esm && tanpaKode ? '<p class="catatan-main">Member codes stay off until ESM is done. After the phase changes in Settings, turn them on here.</p>' : '')) +
      kartuKelolaTim(tmk) +
      '<div class="pilihan" style="margin-bottom:10px">' + saring.map(function (f) { return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (f[0] === saringOrang) + '">' + f[1] + '</button>'; }).join('') + '</div>' +
      '<input class="cari" id="cari-orang" placeholder="Search name, classification or number" type="search" value="' + esc(cariOrang) + '">' +
      '<section class="kartu" id="daftar-orang"></section>' +
      '<p class="catatan-main">Everyone ever recorded, from before ESM on. Nothing here is deleted when a round ends.</p>' +
      '<div class="judul-bagian"><h2>My access</h2></div><section class="kartu"><div class="baris-tombol" style="margin:0"><button class="tombol kedua" id="o-ganti">Change my code</button><button class="tombol kedua" id="o-reset">Reset all codes</button></div>' +
      '<p class="kecil" style="margin-top:10px">Someone forgot their code? Open their profile and tap New code, then send it on WhatsApp.</p></section>';
    gambar();
    w.querySelectorAll('[data-f]').forEach(function (b) {
      b.onclick = function () { saringOrang = b.dataset.f; w.querySelectorAll('[data-f]').forEach(function (z) { z.setAttribute('aria-pressed', z === b); }); gambar(); };
    });
    w.querySelector('#cari-orang').oninput = function (e) { cariOrang = e.target.value; gambar(); };
    w.querySelector('#o-baru').onclick = function () { lembarTambahOrang(function () { subOrang(w); }); };
    var bt = w.querySelector('#b-tim');
    if (bt) bt.onclick = function () { lembarTim(function () { subOrang(w); }); };
    w.querySelector('#o-ganti').onclick = lembarGantiKode;
    w.querySelector('#o-reset').onclick = function () { lembarUlangSemua(function () { subOrang(w); }); };
    var ba = w.querySelector('#o-aktif');
    if (ba) ba.onclick = async function () {
      ba.disabled = true;
      var h = await api('aktifkanKodeAnggota');
      if (!h.ok) { ba.disabled = false; return toast(h.pesan); }
      toast(h.jumlah + ' member code' + (h.jumlah === 1 ? '' : 's') + ' turned on.'); subOrang(w);
    };
  }

  async function lembarOrang(id, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var d = await api('orangDetail', { id_orang: id });
    if (!d.ok) { bukaLembar('<p class="kosong-isi">' + esc(d.pesan) + '</p>'); return; }
    var o = d.orang, a = d.akses, saya = o.id_orang === S.profil.id_orang;
    if (!S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    var anggotaR = o.jenis === 'Member' ? await api('anggota') : { anggota: [] };
    function baris(k, v) { return v ? '<li><div class="utama"><b>' + esc(k) + '</b><span>' + esc(v) + '</span></div></li>' : ''; }
    function barisHtml(k, h) { return '<li><div class="utama"><b>' + esc(k) + '</b><span>' + h + '</span></div></li>'; }
    function jejak(judul, daftar, f) {
      return daftar.length ? '<div class="judul-bagian"><h2>' + judul + '</h2><span class="kecil">' + daftar.length + '</span></div><section class="kartu"><ul class="daftar">' + daftar.map(f).join('') + '</ul></section>' : '';
    }
    var kursiOpsi = '';
    (S.cache.kursi || []).forEach(function (b) { b.kursi.forEach(function (x) { if (x.status !== 'terisi' || x.id_kursi === o.id_kursi) kursiOpsi += '<option value="' + esc(x.id_kursi) + '"' + (x.id_kursi === o.id_kursi ? ' selected' : '') + '>' + esc(x.bidang) + '</option>'; }); });
    var akun = '';
    if (d.bisa_akses && !saya) {
      akun = a.ada
        ? kartuKode(o.nama_depan, o.whatsapp, a, a.aktif ? (a.terakhir_masuk ? 'Last login ' + lalu(a.terakhir_masuk) + '.' : 'Not used yet.') : 'Login stays blocked until the code is turned on.') +
          '<div class="baris-tombol"><button class="tombol kecil kedua" data-akses="' + (a.aktif ? 'matikan' : 'hidupkan') + '">' + (a.aktif ? 'Turn off' : 'Turn on') + '</button><button class="tombol kecil kedua" data-akses="ulang">New code</button></div>'
        : '<section class="kartu"><p class="kecil">No access code yet.</p><div class="baris-tombol"><button class="tombol kecil" data-akses="buat">Create code</button></div></section>';
    }
    bukaLembar(
      '<div class="tajuk"><span class="lambang" style="width:52px;height:52px;font-size:20px">' + inisial(o.nama) + '</span><div><p class="kecil">' + esc(JENIS_ORANG[o.jenis] || o.jenis) + (o.jenis === 'Prospect' ? ' · ' + esc(lblTahap(o.tahap)) : '') + '</p><h2>' + esc(o.nama) + '</h2>' + (o.bidang || o.bisnis ? '<p class="kecil">' + esc(o.bidang || o.bisnis) + '</p>' : '') + '</div></div>' +
      (o.whatsapp ? '<a class="tombol kedua" target="_blank" rel="noopener" href="' + esc(waLink(o.whatsapp)) + '" style="margin-bottom:14px">Chat on WhatsApp</a>' : '') +
      '<section class="kartu"><ul class="daftar">' + barisHtml('WhatsApp', nomorWa(o.whatsapp)) + baris('Source', o.sumber) + baris('Added', o.masuk ? tglPendek(o.masuk) : '') +
        (o.jenis === 'Member' ? baris('Sponsor', o.sponsor) + baris('Joined', (o.bergabung ? tglPendek(o.bergabung) : '') + (o.jenis_anggota ? ' · ' + o.jenis_anggota : '')) : '') +
        baris('Registered by', o.diajukan) + baris('Handled by', o.pic) + baris('Coffee session', o.jadwal_cs ? tglPendek(o.jadwal_cs) : '') + baris('Notes', o.catatan) + baris('Why not continued', o.alasan) + '</ul></section>' +
      akun +
      (d.kehadiran ? '<section class="kartu"><p class="kecil">BOD attendance since joining: <b>' + d.kehadiran.bod + ' of ' + d.kehadiran.total_bod + '</b>' + (d.kehadiran.total_lunch ? ' · Lunch Networking: <b>' + d.kehadiran.lunch + ' of ' + d.kehadiran.total_lunch + '</b>' : '') + '</p>' +
        (d.kehadiran.absen.length ? '<p class="kecil" style="margin-top:6px">Missed BOD: ' + d.kehadiran.absen.map(function (t) { return esc(tglPendek(t)); }).join(', ') + '</p>' : '') + '</section>' : '') +
      (d.mengundang.jumlah ? '<section class="kartu"><p class="kecil">Invited <b>' + d.mengundang.jumlah + '</b> guest' + (d.mengundang.jumlah > 1 ? 's' : '') + ', <b>' + d.mengundang.tamu_hadir + '</b> attended.</p></section>' : '') +
      jejak('Invited to', d.diundang_ke, function (u) { return '<li><div class="utama"><b>' + esc(u.acara) + '</b><span>' + esc(lblStatus(u.status)) + ' · by ' + esc(u.oleh) + '</span></div></li>'; }) +
      jejak('Attended', d.hadir, function (h) { return '<li><div class="utama"><b>' + esc(h.acara) + '</b><span>' + esc(PERAN_LABEL[h.peran] || h.peran) + '</span></div></li>'; }) +
      jejak('Interviews', d.wawancara, function (x) { return '<li><div class="utama"><b>' + esc(tglPendek(x.tanggal)) + (x.kanal ? ' · ' + esc(x.kanal) : '') + '</b><span>' + esc(x.hasil || 'No result noted') + (x.pic ? ' · with ' + esc(x.pic) : '') + '</span></div></li>'; }) +
      '<div class="judul-bagian"><h2>Edit</h2></div>' +
      '<form id="f-edit"><label class="isian"><span>Name</span><input name="nama" value="' + esc(o.nama.replace(/ \(LDC\)$/, '')) + '" required></label>' +
      '<label class="isian"><span>WhatsApp</span><input name="whatsapp" inputmode="tel" value="' + esc(o.whatsapp) + '"></label>' +
      '<label class="isian"><span>Business</span><input name="bisnis" value="' + esc(o.bisnis) + '"></label>' +
      (o.jenis === 'Member' ? '<label class="isian"><span>Classification seat</span><select name="id_kursi" data-pilih-seat>' + kursiOpsi + '<option value="__baru">+ New classification (not on the list)</option></select></label>' + isianKursiBaru({}) + pilihSponsor(anggotaR, o.id_sponsor, { kecuali: o.id_orang }) : '') +
      '<label class="isian"><span>Notes</span><textarea name="catatan">' + esc(o.catatan) + '</textarea></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save changes</button></form>' +
      (o.jenis === 'Prospect' || o.jenis === 'Closed' ? '<div class="baris-tombol"><button class="tombol kedua" id="o-tahap">Update stage or make a member</button></div>' : ''),
      function (el) {
        pasangSalinKode(el);
        pasangKursiBaru(el);
        el.querySelectorAll('[data-akses]').forEach(function (b) {
          b.onclick = async function () {
            if (b.dataset.akses === 'ulang' && !confirm('Make a new code? The old code stops working right away.')) return;
            b.disabled = true;
            var h = await api('aturAkses', { id_orang: o.id_orang, tindakan: b.dataset.akses });
            if (!h.ok) { b.disabled = false; return toast(h.pesan); }
            toast('Done.'); segarkan(); lembarOrang(id, segarkan);
          };
        });
        el.querySelector('#f-edit').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target;
          var data = { id_orang: o.id_orang, nama: f.nama.value, whatsapp: f.whatsapp.value, bisnis: f.bisnis.value, catatan: f.catatan.value };
          if (f.id_kursi) {
            Object.assign(data, dataSeat(f, 'id_kursi'));
            data.id_sponsor = ambilSponsor(f);
            if (!data.id_sponsor) { var s2 = el.querySelector('#salah'); s2.textContent = 'Choose the sponsor, or type a name.'; s2.hidden = false; return; }
          }
          var h = await api('ubahOrang', data);
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          S.cache.kursi = null; toast('Saved.'); segarkan(); lembarOrang(id, segarkan);
        };
        var bt = el.querySelector('#o-tahap');
        if (bt) bt.onclick = function () {
          lembarCalon({ id_orang: o.id_orang, nama: o.nama, bidang: o.bidang || 'Undecided classification', bisnis: o.bisnis, whatsapp: o.whatsapp, tahap: o.tahap, jadwal_cs: o.jadwal_cs, id_kursi: o.id_kursi }, function () { S.cache.kursi = null; segarkan(); });
        };
      });
  }

  async function lembarTambahOrang(segarkan) {
    bukaLembar('<div class="muat"></div>');
    var h = await Promise.all([api('anggota'), S.cache.kursi ? { ok: true, baris: S.cache.kursi } : api('kursi')]);
    if (h[1].ok) S.cache.kursi = h[1].baris;
    var jenis = 'Anggota';
    bukaLembar(
      '<h2>Add a person</h2><p class="kecil" style="margin:4px 0 12px">For people who did not come through an interview: new launch team members, or a member joining from outside the chapter.</p>' +
      '<div class="pilihan" style="margin-bottom:14px"><button type="button" data-j="Anggota" aria-pressed="true">Member</button><button type="button" data-j="LT" aria-pressed="false">Launch team</button></div>' +
      '<form id="f-tambah"><label class="isian"><span>Full name</span><input name="nama" required></label><label class="isian"><span>WhatsApp</span><input name="whatsapp" inputmode="tel" required placeholder="0812..."></label>' +
      '<label class="isian"><span>Business</span><input name="bisnis"></label>' +
      '<div id="bag-member">' + pilihKursiAnggota('id_kursi', '', '') + pilihSponsor(h[0], 'BNI') +
      '<p class="kecil" style="margin:-4px 0 14px">A member from outside the chapter has no inviter here. Keep BNI Indonesia unless someone brought them in: pick a member, the LDC or a launch team member, or type a name.</p></div>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Add and create code</button></form>',
      function (el) {
        pasangKursiBaru(el); pasangSponsor(el);
        el.querySelectorAll('[data-j]').forEach(function (b) {
          b.onclick = function () {
            jenis = b.dataset.j;
            el.querySelectorAll('[data-j]').forEach(function (z) { z.setAttribute('aria-pressed', z === b); });
            el.querySelector('#bag-member').hidden = jenis !== 'Anggota';
            el.querySelector('select[data-pilih-seat]').required = jenis === 'Anggota';
          };
        });
        el.querySelector('#f-tambah').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target;
          if (jenis === 'Anggota' && !f.id_kursi.value) { var s0 = el.querySelector('#salah'); s0.textContent = 'Choose the classification seat.'; s0.hidden = false; return; }
          var sp = jenis === 'Anggota' ? ambilSponsor(f) : '';
          if (jenis === 'Anggota' && !sp) { var s3 = el.querySelector('#salah'); s3.textContent = 'Choose the sponsor, or type a name.'; s3.hidden = false; return; }
          var r = await api('tambahOrang', Object.assign({ jenis: jenis, nama: f.nama.value, whatsapp: f.whatsapp.value, bisnis: f.bisnis.value, id_sponsor: sp }, jenis === 'Anggota' ? dataSeat(f, 'id_kursi') : {}));
          if (!r.ok) { var s = el.querySelector('#salah'); s.textContent = r.pesan; s.hidden = false; return; }
          S.cache.kursi = null; segarkan();
          bukaLembar('<h2>' + esc(r.nama_depan) + ' added</h2><p class="kecil" style="margin:4px 0 12px">' + (jenis === 'LT' ? 'Launch team member.' : 'Member from outside the chapter.') + '</p>' +
            kartuKode(r.nama_depan, r.whatsapp, r.akses, r.akses.aktif ? 'Send it now. The code works right away.' : 'Active after ESM. Turn on member codes in People then.') +
            '<div class="baris-tombol"><button class="tombol kedua" id="t-tutup">Done</button></div>', function (el2) { pasangSalinKode(el2); el2.querySelector('#t-tutup').onclick = tutupLembar; });
        };
      });
  }

  var LABEL_ATUR = {
    fase: 'Phase', tanggal_esm: 'ESM date', tanggal_grand_launch: 'Grand Launch date', tautan_zoom_cs: 'Coffee session Zoom link', tautan_form: 'Guest Form link (use the long docs.google.com link to prefill the inviter)', tautan_zoom_bod: 'Wednesday Zoom link', zoom_bod_id: 'Wednesday Zoom meeting ID', zoom_bod_kode: 'Wednesday Zoom passcode', form_entry_pengundang: 'Form field code for Invited by (entry.123...)',
    target_founding: 'Founding target', target_cgt: 'CGT target', target_launch: 'Launch target', target_nama_min: 'Names per person, minimum', target_nama_maks: 'Names per person, maximum',
    target_gold: 'Gold path (new members)', target_driver: 'Drivers wanted', driver_ronde_min: 'Driver: rounds since joining', driver_hadir_bod: 'Driver: BOD attendance %',
    driver_undang: 'Driver: invited in % of rounds', driver_tamu_hadir: 'Driver: guests who came %', driver_konversi: 'Driver: guests who joined %', driver_lunch: 'Driver: Lunch Networking %', driver_aktif_ronde: 'Driver: active rounds', tim_maks: 'Team size, maximum members'
  };
  async function subAtur(w) {
    w.innerHTML = '<div class="muat"></div>';
    var r = await api('bacaPengaturan');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    function kelompok(judul, kunciAwal) {
      var isi = r.pengaturan.filter(function (x) { return kunciAwal.test(x.kunci); });
      return '<div class="judul-bagian"><h2>' + judul + '</h2></div><section class="kartu"><ul class="daftar">' + isi.map(function (x) {
        var kontrol = x.kunci === 'fase'
          ? '<select name="nilai">' + r.fase_boleh.map(function (f) { return '<option' + (f === x.nilai ? ' selected' : '') + '>' + esc(f) + '</option>'; }).join('') + '</select>'
          : '<input name="nilai" value="' + esc(x.nilai) + '"' + (x.contoh ? ' placeholder="' + esc(x.contoh) + '"' : '') + (/^(target_|driver_|tim_)/.test(x.kunci) ? ' inputmode="numeric"' : '') + '>';
        return '<li><form class="atur-baris" data-kunci="' + esc(x.kunci) + '"><label class="isian" style="margin:0;flex:1"><span>' + esc(LABEL_ATUR[x.kunci] || x.kunci) + '</span>' + kontrol + '</label><button class="tombol kecil kedua" type="submit">Save</button></form></li>';
      }).join('') + '</ul></section>';
    }
    w.innerHTML = kelompok('Chapter', /^(fase|tanggal_|tautan_(zoom_cs|form))/) + kelompok('Wednesday guests: Zoom and Form', /^(tautan_zoom_bod|zoom_bod_|form_entry_)/) + kelompok('Targets', /^target_/) + kelompok('Teams', /^tim_maks$/) + kelompok('Driver recommendation', /^driver_/) +
      '<p class="catatan-main"><a href="#tim-data" class="tautan">View sheet data (read only)</a></p><p class="catatan-main">Changing the phase changes the Chapter Mission target and the Founding or Core Group label for new members. Member codes stay off until ESM: after switching the phase, turn them on in People.</p>';
    w.querySelectorAll('form.atur-baris').forEach(function (f) {
      f.onsubmit = async function (e) {
        e.preventDefault();
        var h = await api('ubahPengaturan', { kunci: f.dataset.kunci, nilai: f.nilai.value });
        if (!h.ok) return toast(h.pesan);
        toast('Saved.');
        if (f.dataset.kunci === 'fase') { var m = await api('masuk'); if (m.ok) S.atur = m.pengaturan; }
      };
    });
  }

  var tabData = 'Undangan';
  async function subData(w) {
    w.innerHTML = '<div class="muat"></div>';
    var r = await api('lihatTab', { tab: tabData });
    var TAB = ['Undangan', 'Hadir', 'Events', 'Wawancara', 'Jadwal_CS', 'Responses', 'Butuh', 'Lencana', 'Pengumuman', 'Log'];
    var pilih = '<label class="isian"><span>Table</span><select id="pil-tab">' + TAB.map(function (t) { return '<option' + (t === tabData ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></label>';
    if (!r.ok) { w.innerHTML = pilih + '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; }
    else {
      w.innerHTML = pilih + '<p class="kecil" style="margin:0 2px 8px">' + r.total + ' rows' + (r.total > r.baris.length ? ', newest ' + r.baris.length + ' shown' : '') + '. Read only.</p>' +
        (r.baris.length ? '<div class="tabel-gulir"><table class="tabel-data"><thead><tr>' + r.kolom.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          r.baris.map(function (b) { return '<tr>' + b.map(function (v) { return '<td>' + esc(v) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' : '<p class="kosong-isi">This table is empty.</p>') +
        '<p class="catatan-main">People and access codes are managed in People. To correct something here, ask Lapis or edit the sheet.</p>';
    }
    w.querySelector('#pil-tab').onchange = function (e) { tabData = e.target.value; subData(w); };
  }

  async function subRiwayat(w) {
    w.innerHTML = '<div class="muat"></div>';
    var h = await Promise.all([api('riwayatRonde'), api('papan')]);
    w.innerHTML = (h[1].ok ? kartuBelum(h[1].belum_ronde) : '') + daftarRiwayat(h[0]);
  }

  /* ---------- driver: hanya terlihat LT dan LDC ---------- */
  function kartuDriver(d) {
    var cukup = d.jumlah >= d.target;
    return '<section class="kartu"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Drivers</h3><b style="font-family:var(--huruf-judul);font-size:22px">' + d.jumlah + '<span class="redup" style="font-size:14px"> / ' + d.target + '</span></b></div>' +
      '<div class="bilah' + (cukup ? ' emas' : '') + '" style="margin:10px 0 8px"><i style="width:' + Math.min(100, d.jumlah / d.target * 100) + '%"></i></div>' +
      '<p class="kecil">People with a network, influence, activity and commitment.' + (cukup ? '' : ' At least ' + d.target + ' are needed.') + '</p>' +
      kartuRekomendasi(d) +
      (d.daftar.length ? '<ul class="daftar" style="margin-top:8px">' + d.daftar.map(function (x) {
        return '<li><div class="utama"><b>' + esc(x.nama) + '</b><span>' + esc(x.bidang) + ' · ' + esc(lblTahap(x.tahap)) + '</span></div><button class="tombol kecil kedua" data-lepas-driver="' + esc(x.id_orang) + '">Remove</button></li>';
      }).join('') + '</ul>' : '') +
      '<div class="baris-tombol"><button class="tombol kecil" id="b-driver">Add a driver</button></div></section>';
  }
  function kartuRekomendasi(d) {
    function ikon(ok) { return '<i>' + (ok === true ? '&#10003;' : ok === false ? '&#10005;' : '&ndash;') + '</i>'; }
    function kls(ok) { return ok === true ? 'ya' : ok === false ? 'tidak' : 'belum'; }
    function baris(c) {
      return '<li class="' + kls(c.ok) + '">' + ikon(c.ok) + '<div><b>' + esc(c.label) + '</b><span>' + esc(c.teks) + (c.ok === null ? ' (not enough data yet)' : '') + '</span></div></li>';
    }
    function satu(x, tombol) {
      var peta = {}; x.kriteria.forEach(function (c) { peta[c.kode] = c; });
      var chips = x.pilar.map(function (q) { return '<span class="chip ' + (q.ok ? 'hijau' : '') + '">' + (q.ok ? '&#10003; ' : '') + ({ komit: 'Committed', network: 'Network', pengaruh: 'Influence' })[q.kode] + '</span>'; }).join('');
      return '<details class="rekom"><summary><span><b>' + esc(x.nama) + '</b><em>' + esc(x.bidang) + ' · ' + x.minggu + ' weeks</em></span></summary>' +
        '<div class="pilar-chips">' + chips + '</div>' +
        x.pilar.map(function (q) {
          return '<p class="pilar-judul ' + kls(q.ok) + '">' + ikon(q.ok) + esc(q.label) + '</p><ul class="syarat">' + q.kriteria.map(function (kd) { return baris(peta[kd]); }).join('') + '</ul>';
        }).join('') +
        '<p class="pilar-judul bonus"><i>+</i>Bonus, voluntary</p><ul class="syarat">' + baris(peta.lunch) + '</ul>' +
        (tombol ? '<div class="baris-tombol"><button class="tombol kecil" data-tandai-rek="' + esc(x.id_orang) + '">Mark as driver</button></div>' : '') + '</details>';
    }
    if (!d.rekomendasi.length && !d.hampir.length) return '<p class="kecil redup" style="margin-top:8px">Suggestions appear automatically once members have a few weeks of activity.</p>';
    return '<div class="rekom-blok"><p class="kecil"><b>Suggested</b> · committed, has a network, and has influence</p>' +
      (d.rekomendasi.length ? d.rekomendasi.map(function (x) { return satu(x, true); }).join('') : '<p class="kecil redup">No one yet.</p>') +
      (d.hampir.length ? '<details class="lipat-kecil"><summary>Almost there (' + d.hampir.length + ')</summary>' + d.hampir.map(function (x) { return satu(x, false); }).join('') + '</details>' : '') +
      '<p class="kecil redup" style="margin-top:6px">A starting point for the regroup, not a verdict. Lunch Networking is voluntary and never counts as mandatory attendance.</p></div>';
  }
  async function lembarDriver(segarkan) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('kandidatDriver');
    if (!r.ok) { bukaLembar('<p class="kosong-isi">' + esc(r.pesan) + '</p>'); return; }
    function baris(o) {
      return '<li data-nama="' + esc(o.nama.toLowerCase()) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(o.bidang) + ' · ' + esc(lblTahap(o.tahap)) + '</span></div>' +
        (o.driver ? '<span class="chip emas">Driver</span>' : '<button class="tombol kecil" data-pilih="' + esc(o.id_orang) + '">Add</button>') + '</li>';
    }
    bukaLembar('<h2>Add a driver</h2><p class="kecil" style="margin:6px 0 10px">Members and active prospects. Only the launch team sees this.</p>' +
      '<label class="isian"><span>Search by name</span><input id="cari-driver" autocomplete="off"></label>' +
      '<section class="kartu" style="box-shadow:none"><ul class="daftar" id="daftar-driver">' + r.orang.map(baris).join('') + '</ul></section><p class="pesan-salah" id="salah" hidden></p>',
      function (el) {
        var cari = el.querySelector('#cari-driver');
        cari.oninput = function () {
          var q = cari.value.trim().toLowerCase();
          el.querySelectorAll('#daftar-driver li').forEach(function (li) { li.hidden = q && li.dataset.nama.indexOf(q) < 0; });
        };
        el.querySelectorAll('[data-pilih]').forEach(function (b) {
          b.onclick = async function () {
            var h = await api('tandaiDriver', { id_orang: b.dataset.pilih, driver: true });
            if (!h.ok) { var sl = el.querySelector('#salah'); sl.textContent = h.pesan; sl.hidden = false; return; }
            tutupLembar(); toast('Marked as a driver.'); segarkan();
          };
        });
      });
  }

  async function subRegroup(w) {
    var r = await api('regroup');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    w.innerHTML =
      '<section class="kartu"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Founding member</h3><b style="font-family:var(--huruf-judul);font-size:22px">' + r.founding.jumlah + '<span class="redup" style="font-size:14px"> / ' + r.founding.target + '</span></b></div>' +
      '<div class="bilah' + (r.founding.jumlah >= r.founding.target ? ' emas' : '') + '" style="margin-top:10px"><i style="width:' + Math.min(100, r.founding.jumlah / r.founding.target * 100) + '%"></i></div></section>' +
      (r.driver ? kartuDriver(r.driver) : '') +
      '<div class="judul-bagian"><h2>Names per launch team member</h2><span class="kecil">target ' + (r.lt[0] ? r.lt[0].target : 20) + '</span></div>' +
      '<section class="kartu">' + r.lt.map(function (x) {
        return '<div class="baris-bilah' + (x.nama_depan === S.profil.nama_depan ? ' saya' : '') + '"><span>' + esc(x.nama_depan) + '</span><div class="bilah' + (x.total >= x.target ? ' emas' : '') + '"><i style="width:' + Math.min(100, x.total / x.target * 100) + '%"></i></div><b>' + x.total + '<span class="redup" style="font-weight:400;font-size:12px"> +' + x.ronde + '</span></b></div>';
      }).join('') + '<p class="catatan-main">Small number: new names this week. Healthy threshold is at least 3 per week.</p></section>' +
      '<section class="kartu" style="display:flex;align-items:center;gap:14px"><b style="font-family:var(--huruf-judul);font-size:34px">' + r.kursi_tanpa_calon + '</b><div><h3>Seats without prospects</h3><p class="kecil">Filter by "Empty" on the Seat Board to see them.</p></div><a href="#kursi" class="tombol kecil kedua" style="margin-left:auto">Open</a></section>' +
      '<div class="judul-bagian"><h2>Prospects idle over 7 days</h2><span class="kecil">' + r.calon_diam.length + '</span></div>' +
      '<section class="kartu">' + (r.calon_diam.length ? '<ul class="daftar">' + r.calon_diam.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>PIC ' + esc(c.pic) + '</span></div><span class="chip merah">' + c.hari + ' days</span></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">All prospects were touched in the last week.</p>') + '</section>';
    var segar = function () { subRegroup(w); };
    w.querySelectorAll('[data-tandai-rek]').forEach(function (b) {
      b.onclick = async function () {
        var h = await api('tandaiDriver', { id_orang: b.dataset.tandaiRek, driver: true });
        if (!h.ok) return toast(h.pesan);
        toast('Marked as a driver.'); segar();
      };
    });
    var bd = w.querySelector('#b-driver');
    if (bd) bd.onclick = function () { lembarDriver(segar); };
    w.querySelectorAll('[data-lepas-driver]').forEach(function (b) {
      b.onclick = async function () {
        var h = await api('tandaiDriver', { id_orang: b.dataset.lepasDriver, driver: false });
        if (!h.ok) return toast(h.pesan);
        toast('Removed from drivers.'); segar();
      };
    });
  }

  async function subRingkas(w) {
    var r = await api('ringkas');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var a = r.angka;
    var sel = [
      [a.anggota + '/' + a.target, 'members toward phase target'], [a.calon_aktif, 'active prospects'],
      [a.nama_baru_ronde, 'new names this week'], [a.cs_ronde, 'CS this week'],
      [a.undangan_ronde, 'invitations this week'], [a.persen_mengundang + '%', 'members who invited'],
      [a.anggota_baru_ronde, 'new members this week'], [a.kursi_tanpa_calon, 'seats without prospects']
    ];
    var nyala = r.peringatan.filter(function (p) { return p.menyala; }).length;
    w.innerHTML = '<div class="kisi-angka">' + sel.map(function (s) { return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="judul-bagian"><h2>Warning lights</h2><span class="kecil">' + nyala + ' on</span></div>' +
      '<section class="kartu"><ul class="peringatan">' + r.peringatan.map(function (p) {
        return '<li class="' + (p.menyala ? 'menyala' : '') + '"><span class="lampu"></span><span>' + esc(p.teks) + '</span></li>';
      }).join('') + '</ul><p class="catatan-main">Lights that are on are material for Regroup, not for fixing alone.</p></section>';
  }

  /* ---------- mulai ---------- */
  (async function mulai() {
    var k = ambil('optima_kode');
    var awal = null;
    try { awal = JSON.parse(ambil('optima_awal') || 'null'); } catch (e) {}
    if (k && awal && awal.kode === k && awal.profil) {
      // Buka langsung dengan data terakhir. Kode dicek di belakang.
      Api.setKode(k); S.kode = k; S.profil = awal.profil; S.atur = awal.atur;
      muatSimpanan(k);
      if (!location.hash) location.hash = '#misi'; else rute();
      setTimeout(panaskan, 1500);
      Api.panggil('masuk').then(function (r) {
        if (r.ok) {
          var beda = JSON.stringify(r.profil) !== JSON.stringify(S.profil);
          S.profil = r.profil; S.atur = r.pengaturan;
          simpan('optima_awal', JSON.stringify({ kode: k, profil: r.profil, atur: r.pengaturan }));
          if (beda && S.aktif && !layarSibuk()) S.aktif.fn(S.aktif.isi, S.aktif.sub);
        } else if (/Access code not recognized/.test(r.pesan || '')) keluar();
      });
    } else if (k) {
      $app.innerHTML = '<div class="splash"><b>BNI OPTIMA</b><p>Optimal Network, Optimal Profits</p><i></i></div>';
      var r = await coba(k);
      if (!r.ok) { simpan('optima_kode', null); layarMasuk(); }
    } else layarMasuk();
  })();
})();
