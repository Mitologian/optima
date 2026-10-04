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
  var PERAN_LABEL = { 'Visitor': 'Visitor', 'Anggota': 'Member', 'LT': 'LT' };
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
  function pilihKursiKosong(nama, wajib) {
    var opsi = [];
    (S.cache.kursi || []).forEach(function (b) { b.kursi.forEach(function (x) { if (x.status !== 'terisi') opsi.push('<option value="' + esc(x.id_kursi) + '">' + esc(x.bidang) + '</option>'); }); });
    return '<label class="isian"><span>Classification seat' + (wajib ? '' : ' (optional)') + '</span><select name="' + nama + '"' + (wajib ? ' required' : '') + '><option value="">Choose a seat</option>' + opsi.join('') + '</select></label>';
  }
  function waLink(nomor, teks) { return 'https://wa.me/' + (nomor || '') + (teks ? '?text=' + encodeURIComponent(teks) : ''); }

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

  async function api(aksi, data) {
    var r = await Api.panggil(aksi, data);
    if (!r.ok && /Access code not recognized/.test(r.pesan || '') && aksi !== 'masuk') keluar();
    return r;
  }

  var fasePra = function () { return S.atur && S.atur.fase === 'Pembentukan'; };
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
    if (!fasePra()) { m.push({ id: 'undang', label: 'My list' }); m.push({ id: 'minggu', label: 'This week' }); }
    m.push({ id: 'kursi', label: 'Seats' });
    if (!fasePra()) m.push({ id: 'papan', label: 'Board' });
    if (isLT()) m.push({ id: 'tim', label: fasePra() ? 'Interviews' : 'Team' });
    return m;
  }

  function kerangka(aktif) {
    var nav = menu().map(function (x) {
      return '<a href="#' + x.id + '"' + (x.id === aktif ? ' aria-current="page"' : '') + '>' + IK[x.id] + '<span>' + x.label + '</span></a>';
    }).join('');
    $app.innerHTML =
      '<header class="kepala"><div class="kepala-dalam">' +
        '<div class="merek"><b>BNI</b><span>' + esc(S.atur.nama_chapter) + '</span></div>' +
        (Api.tiruan ? '<button class="fase ganti" id="ganti-fase" aria-label="Switch preview phase">' + esc(S.atur.fase === 'Pembentukan' ? 'Pre-ESM' : 'Post-ESM') + ' &#9662;</button>'
                    : '<span class="fase">' + esc(S.atur.fase === 'Pembentukan' ? 'Pre-ESM' : 'Post-ESM') + '</span>') +
        '<button class="keluar" id="keluar" aria-label="Log out">Log out</button>' +
      '</div></header>' +
      '<main class="wadah" id="isi"><div class="muat" style="margin-top:22px"></div><div class="muat"></div></main>' +
      '<nav class="nav" aria-label="Main menu">' + nav + '</nav>';
    var gf = document.getElementById('ganti-fase');
    if (gf) gf.onclick = function () {
      bukaLembar('<h2>Preview phase</h2><p class="kecil" style="margin:6px 0 14px">Sample data only. Switch to see how the app looks before and after ESM.</p>' +
        '<div class="pilihan" style="flex-direction:column"><button type="button" data-f="Pembentukan" aria-pressed="' + (S.atur.fase === 'Pembentukan') + '">Pre-ESM (Coach Dedy and launch team only)</button>' +
        '<button type="button" data-f="BOD" aria-pressed="' + (S.atur.fase !== 'Pembentukan') + '">Post-ESM (all members, weekly BOD era)</button></div>' +
        '<p class="kecil redup" style="margin-top:12px">Member code AGT001 only works post-ESM.</p>', function (el) {
        el.querySelectorAll('[data-f]').forEach(function (b) {
          b.onclick = async function () {
            await Tiruan.setFase(b.dataset.f);
            var r = await Api.panggil('masuk');
            tutupLembar();
            if (!r.ok) { keluar(); return; }
            S.atur = r.pengaturan; S.profil = r.profil; S.cache = {};
            location.hash = '#misi'; rute();
          };
        });
      });
    };
    document.getElementById('keluar').onclick = function () {
      bukaLembar('<h2>Log out of the app?</h2><p class="kecil" style="margin:6px 0 14px">The access code must be entered again to log in.</p><button class="tombol" id="ya-keluar">Log out</button><div class="baris-tombol"><button class="tombol kedua" data-tutup>Cancel</button></div>', function (el) {
        el.querySelector('#ya-keluar').onclick = function () { tutupLembar(); keluar(); };
        el.querySelector('[data-tutup]').onclick = tutupLembar;
      });
    };
    return document.getElementById('isi');
  }

  function keluar() {
    simpan('optima_kode', null);
    S.kode = ''; S.profil = null; S.atur = null;
    Api.setKode('');
    location.hash = '';
    layarMasuk();
  }

  /* ---------- masuk ---------- */
  function layarMasuk(pesan) {
    var hias = '';
    var pola = [0, 1, 3, 6, 9, 10, 12, 15, 17, 18, 22, 27, 28, 31];
    for (var i = 0; i < 32; i++) hias += '<i class="' + (pola.indexOf(i) >= 0 ? 'isi' : '') + '" style="animation-delay:' + (i * 18) + 'ms"></i>';
    $app.innerHTML =
      '<div class="masuk">' +
        '<div class="merek-besar"><small>BNI CHAPTER</small><span>Optima</span></div>' +
        '<p class="kecil" style="margin-top:10px">64 seats. One classification per seat. Fill them together.</p>' +
        '<div class="kisi-hias">' + hias + '</div>' +
        '<form id="f-masuk">' +
          '<label class="isian"><span>Access code</span><input class="kode" name="kode" maxlength="8" autocomplete="one-time-code" autocapitalize="characters" required></label>' +
          (pesan ? '<p class="pesan-salah">' + esc(pesan) + '</p>' : '') +
          '<button class="tombol" type="submit">Log in</button>' +
        '</form>' +
        '<p class="kecil redup" style="margin-top:14px">The access code is shared by Coach Dedy or the launch team.</p>' +
        (Api.tiruan ? '<div class="petunjuk-tiruan"><b>Sample mode.</b> Mock data, not connected to the sheet. Try code <b>LDC001</b> (Coach Dedy), <b>LT0001</b> (launch team), or <b>AGT001</b> (member, post-ESM only).' +
          '<p style="margin:10px 0 6px">View the app in phase:</p><div class="pilihan" id="pil-fase"><button type="button" data-fase="Pembentukan">Pre-ESM</button><button type="button" data-fase="BOD">Post-ESM</button></div></div>' : '') +
      '</div>';
    var pf = document.getElementById('pil-fase');
    if (pf) {
      Tiruan.fase().then(function (now) { pf.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.fase === now); }); });
      pf.querySelectorAll('button').forEach(function (b) {
        b.onclick = async function () { await Tiruan.setFase(b.dataset.fase); pf.querySelectorAll('button').forEach(function (z) { z.setAttribute('aria-pressed', z === b); }); };
      });
    }
    var f = document.getElementById('f-masuk');
    f.onsubmit = async function (e) {
      e.preventDefault();
      var tombol = f.querySelector('button');
      tombol.disabled = true; tombol.textContent = 'Checking...';
      var ok = await coba(f.kode.value.trim().toUpperCase());
      if (!ok.ok) layarMasuk(ok.pesan);
    };
  }

  async function coba(kode) {
    Api.setKode(kode);
    var r = await Api.panggil('masuk');
    if (!r.ok) { Api.setKode(''); return r; }
    S.kode = kode; S.profil = r.profil; S.atur = r.pengaturan;
    simpan('optima_kode', kode);
    if (!location.hash) location.hash = '#misi'; else rute();
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
    ({ misi: layarMisi, kursi: layarKursi, undang: layarUndang, minggu: layarMinggu, papan: layarPapan, tim: layarTim })[layar](isi, h[1]);
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

  function kartuMisi(m) {
    var sisa = Math.max(0, m.target - m.anggota);
    var sub = sisa ? sisa + ' more members to reach ' + (m.target === m.gerbang[0] ? 'ESM' : m.target === m.gerbang[1] ? 'Core Group Training' : 'Grand Launch')
                   : 'Target for this phase reached. On to the next gate.';
    return '<section class="kartu misi">' +
      '<div class="label">Chapter Mission</div>' +
      '<div class="angka">' + m.anggota + ' <small>/ ' + m.target + ' members</small></div>' +
      '<div class="sub">' + esc(sub) + '. Final target ' + m.gerbang[2] + '.</div>' +
      '<div class="ubin-misi">' +
        (m.hari_ke_esm ? '<div><b>' + m.hari_ke_esm + '</b><span>days to ESM</span></div>' : '') +
        (m.hari_ke_launch ? '<div><b>' + m.hari_ke_launch + '</b><span>days to Grand Launch</span></div>' : '') +
        '<div><b>' + m.tamu_pekan + '</b><span>Visitors this week</span></div>' +
        '<div><b>' + m.anggota_baru_pekan + '</b><span>new members this week</span></div>' +
      '</div>' +
      grafikMisi(m) +
    '</section>';
  }

  function kartuDaftar(st) {
    var min = st.target_nama_min, maks = st.target_nama_maks, n = st.nama_daftar;
    var pesan = n >= maks ? 'Goal of ' + maks + ' names reached.' : n >= min ? 'Minimum of ' + min + ' reached. Keep going toward ' + maks + '.' : (min - n) + ' more names to reach the minimum of ' + min + '.';
    return '<section class="kartu"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>My name list</h3><b style="font-family:var(--huruf-judul);font-size:22px">' + n + '<span class="redup" style="font-size:14px"> / ' + maks + '</span></b></div>' +
      '<div class="bilah-ganda"><div class="bilah' + (n >= min ? ' emas' : '') + '"><i style="width:' + Math.min(100, n / maks * 100) + '%"></i></div><span class="tanda-min" style="left:' + (min / maks * 100) + '%"></span></div>' +
      '<p class="kecil">' + esc(pesan) + ' Each name is tied to one seat on the Seat Board.</p>' +
      '<div class="baris-tombol"><a class="tombol kecil" href="#kursi">Add name</a>' + (isLT() ? '<a class="tombol kecil kedua" href="#tim">My prospects</a>' : fasePra() ? '' : '<a class="tombol kecil kedua" href="#undang">View list</a>') + '</div></section>';
  }


  function kartuLangkah(b, pipa) {
    var st = b.saya, min = st.target_nama_min, maks = st.target_nama_maks, n = st.nama_daftar;
    var judul, isi, tombol, href;
    var tunggu = pipa ? pipa.filter(function (c) { return ['Listed', 'Invited', 'Attended'].indexOf(c.tahap) >= 0; }).length : 0;
    var cs = pipa ? pipa.filter(function (c) { return c.tahap === 'Coffee_Scheduled'; }).length : 0;
    if (n < min) {
      judul = 'Add prospect names'; href = '#kursi'; tombol = 'Choose a seat';
      isi = (min - n) + ' more names to reach the minimum of ' + min + '. Tap a seat on the board, then add a prospect from that classification.';
    } else if (isLT() && tunggu) {
      judul = 'Set coffee sessions'; href = '#tim'; tombol = 'Open interviews';
      isi = tunggu + ' prospect' + (tunggu > 1 ? 's' : '') + ' waiting for a coffee session date.';
    } else if (isLT() && cs) {
      judul = 'Record coffee session results'; href = '#tim'; tombol = 'Open interviews';
      isi = cs + ' coffee session' + (cs > 1 ? 's' : '') + ' scheduled. After each one, tap Done, then Accepted when the prospect says yes.';
    } else if (!fasePra() && st.undangan_ronde < 1) {
      judul = 'Invite one Visitor'; href = '#undang'; tombol = 'Open my list';
      isi = 'Pick one name from the list and send the invitation via WhatsApp before Wednesday night.';
    } else if (n < maks) {
      judul = 'Keep building the name list'; href = '#kursi'; tombol = 'Add name';
      isi = 'Minimum of ' + min + ' reached. Goal is ' + maks + ' names.';
    } else {
      judul = 'All steps done'; href = fasePra() ? '#kursi' : '#minggu'; tombol = fasePra() ? 'View seats' : 'See this week';
      isi = 'Goal of ' + maks + ' names reached' + (fasePra() ? '.' : ' and this Wednesday mission is done.');
    }
    var api = !fasePra() ? '<span class="chip emas">' + b.saya.rabu_beruntun + ' Wednesday streak</span>' : '';
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

  function kartuTamu(tm) {
    var isi = tm.tamu.length ? '<ul class="daftar">' + tm.tamu.map(function (g) {
      var chip = g.bergabung ? '<span class="chip emas">Joined</span>' : g.status === 'Hadir' ? '<span class="chip hijau">Attended</span>' : '<span class="chip">' + esc(g.jenis === 'BOD' ? 'BOD' : 'Lunch') + '</span>';
      return '<li><span class="lambang">' + inisial(g.nama) + '</span><div class="utama"><b>' + esc(g.nama) + '</b><span>' + esc(g.bidang) + ' · invited by ' + esc(g.pengundang || 'chapter') + '</span></div>' + chip + '</li>';
    }).join('') + '</ul>' : '<p class="kosong-isi">No Visitors registered for this Wednesday yet.</p>';
    return '<div class="judul-bagian"><h2>Visitors this Wednesday</h2><span class="kecil">' + tm.tamu.length + ' registered</span></div>' +
      '<section class="kartu">' + isi + '<p class="catatan-main">Know their classification before Wednesday, to greet them and make connections.</p></section>';
  }

  function kartuRonde(b) {
    var st = b.saya;
    var selesai = st.undangan_ronde > 0;
    var akhir = b.ronde.selesai;
    var ac = b.ronde.acara_berikut;
    return '<section class="kartu ronde' + (selesai ? ' selesai' : '') + '">' +
      '<div class="tanda">' + (selesai ? '&#10003;' : '1') + '</div>' +
      '<div class="teks"><h3>Wednesday Round ' + esc(tglPendek(akhir)) + '</h3>' +
        '<p class="kecil">' + (selesai ? 'Round mission done: ' + st.undangan_ronde + ' invitations.' : 'Mission: one invitation before Wednesday night.') + '</p>' +
        (ac ? '<p class="kecil redup">Next: ' + esc(ac.nama_acara) + ', ' + esc(tglHari(ac.tanggal)) + ' ' + esc(ac.jam_mulai) + '</p>' : '') +
      '</div>' +
      '<div class="api"><b>' + st.rabu_beruntun + '</b><span>Wednesday streak</span></div>' +
    '</section>';
  }

  async function layarMisi(isi) {
    var tugas = [api('beranda'), isLT() ? api('calonSaya', {}) : Promise.resolve(null)];
    if (!fasePra()) { tugas.push(api('undanganSaya')); tugas.push(api('tamuPekanIni')); }
    var h = await Promise.all(tugas);
    var b = h[0], pipa = h[1] && h[1].ok ? h[1].calon : null, ud = h[2], tm = h[3];
    if (!b.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(b.pesan) + '</p>'; return; }
    var html = '<div class="sapa"><h1>Hello, ' + esc(S.profil.nama_depan) + '</h1>' +
      '</div>';

    var sorot = ud && ud.ok ? sorotan(ud.undangan) : [];
    if (sorot.length) {
      html += '<section class="kartu sorotan"><h3>News from invitations</h3><ul class="kabar">' + sorot.map(function (u) {
        return '<li class="k-' + (u.status === 'Bergabung' ? 'baris' : 'anggota') + '"><span class="titik"></span><div>' + esc(u.nama_depan) + (u.status === 'Bergabung' ? ' has joined the chapter. Congratulations, this came from an invitation.' : ' attended ' + esc(u.acara) + ' ' + esc(tglPendek(u.tanggal)) + '.') + '</div></li>';
      }).join('') + '</ul><div class="baris-tombol"><button class="tombol kecil kedua" id="b-sorot">Mark as read</button></div></section>';
    }

    html += kartuLangkah(b, pipa);
    html += kartuMisi(b.misi);

    if (!fasePra()) {
      html += '<section class="kartu"><div class="statistik">' +
        '<div class="stat"><b>' + b.saya.undangan_total + '</b><span>invitations</span></div>' +
        '<div class="stat"><b>' + b.saya.tamu_hadir + '</b><span>Visitors attended</span></div>' +
        '<div class="stat"><b>' + b.saya.sponsor + '</b><span>sponsored</span></div>' +
      '</div></section>';
      if (tm && tm.ok) {
        var mine = tm.tamu.filter(function (g) { return g.saya; }).length;
        html += '<section class="kartu ronde"><div class="tanda" style="border-style:solid">' + tm.tamu.length + '</div><div class="teks"><h3>This Wednesday</h3><p class="kecil">' +
          (tm.tamu.length ? tm.tamu.length + ' Visitor' + (tm.tamu.length > 1 ? 's' : '') + ' registered' + (mine ? ', ' + mine + ' invited by me' : '') + '.' : 'No Visitors registered yet.') +
          '</p></div><a class="tombol kecil kedua" href="#minggu">See all</a></section>';
      }
    }
    var dapat = b.lencana.filter(function (l) { return l.didapat; }).length;
    html += lipat('My badges', dapat + ' of 5',
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
    var milik = 0;
    r.baris.forEach(function (b) { b.kursi.forEach(function (x) { n[x.status]++; milik += x.saya_calon; }); });
    var lengkap = r.baris.filter(function (b) { return b.lengkap; }).length;
    var saring = [['semua', 'All'], ['saya', 'My list' + (milik ? ' (' + milik + ')' : '')], ['kosong', 'Empty'], ['dicari', 'Wanted']];
    function lolos(x) {
      if (saringKursi === 'semua') return true;
      if (saringKursi === 'saya') return x.saya_calon > 0;
      if (saringKursi === 'dicari') return x.jumlah_butuh > 0 && x.status !== 'terisi';
      return saringKursi === x.status;
    }
    isi.innerHTML = tabs +
      '<div class="sapa" style="margin-top:4px"><h1>64 Seat Board</h1><p class="kecil">Tap a seat, then add a prospect from that classification.</p></div>' +
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
          '<header><span class="no">' + (b.nomor > 8 ? '+' : b.nomor) + '</span><h3>' + esc(b.sphere) + '</h3><span class="hitung">' + b.terisi + '/' + b.kursi.length + '</span></header>' +
          [b.kursi.slice(0, 4), b.kursi.slice(4)].map(function (sep) { return '<div class="kisi">' + sep.map(function (x) {
            var redam = !lolos(x);
            return '<button class="kursi ' + x.status + (redam ? ' redam' : '') + (x.saya_calon ? ' milik' : '') + '" data-kursi="' + esc(x.id_kursi) + '" aria-label="' + esc(x.bidang) + ', ' + (x.status === 'terisi' ? 'filled by ' + x.pemilik : x.status === 'ada_calon' ? x.jumlah_calon + ' prospects' : 'empty') + (x.saya_calon ? ', ' + x.saya_calon + ' from my list' : '') + '">' +
              (x.jumlah_butuh && x.status !== 'terisi' ? '<span class="dicari"></span>' : '') +
              (x.status === 'ada_calon' ? '<span class="badge">' + x.jumlah_calon + '</span>' : '') +
              '<span class="t">' + esc(x.bidang) + '</span></button>';
          }).join('') + '</div>'; }).join('') + '</section>';
      }).join('') + '</div>' +
      '<p class="catatan-main"><span class="titik-emas"></span> member wanted &nbsp; <span class="cincin-saya"></span> from my list</p>' +
      '<button class="tombol kedua" id="b-tanpa-kursi" style="margin-top:6px">Name with undecided classification</button>';
    isi.querySelectorAll('[data-tk]').forEach(function (t) { t.onclick = function () { tabKursi = t.dataset.tk; layarKursi(isi); }; });
    isi.querySelectorAll('[data-saring]').forEach(function (t) {
      t.onclick = function () { saringKursi = t.dataset.saring; layarKursi(isi); };
    });
    isi.querySelectorAll('[data-kursi]').forEach(function (t) {
      t.onclick = function () { bukaKursi(t.dataset.kursi, function () { layarKursi(isi); }); };
    });
    isi.querySelector('#b-tanpa-kursi').onclick = function () { bukaKursi('', function () { layarKursi(isi); }); };
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
          return '<li data-cari="' + esc((a.nama + ' ' + a.bidang).toLowerCase()) + '"><span class="lambang">' + inisial(a.nama) + '</span><div class="utama"><b>' + esc(a.nama) + '</b><span>' + esc(a.bidang) + (a.sponsor ? ' · sponsor ' + esc(a.sponsor) : '') + '</span></div><span class="chip' + (a.jenis_anggota === 'Founding' ? ' merah' : '') + '">' + esc(JENIS_ANGGOTA_LABEL[a.jenis_anggota] || a.jenis_anggota || 'Member') + '</span>' +
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
    if (!fasePra()) tugas.push(api('acara'));
    var h = await Promise.all(tugas);
    var d = h[0], ac = h[1];
    if (!d.ok) { bukaLembar('<p class="kosong-isi">' + esc(d.pesan) + '</p>'); return; }
    var x = d.kursi;
    var html = '<div class="tajuk">' + ubinKursi(x) + '<div><p class="kecil">' + esc(x.sphere) + '</p><h2>' + esc(x.bidang) + '</h2></div></div>';

    if (x.status === 'terisi') {
      html += '<section class="kartu" style="box-shadow:none"><p>This seat belongs to <b>' + esc(x.pemilik) + '</b>.</p><p class="kecil" style="margin-top:6px">Per BNI rules, one classification is for one member only. Prospects from this classification cannot join the chapter.</p></section>';
      bukaLembar(html);
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
    var pilihanAcara = (ac && ac.ok ? ac.acara : []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; }).slice(0, 4);
    html += '<form id="f-calon">' +
      '<h3 style="margin:4px 0 10px">' + (id ? 'Add a prospect for ' + esc(x.bidang) : 'Add a name') + '</h3>' +
      '<label class="isian"><span>Full name</span><input name="nama" required autocomplete="off"></label>' +
      '<label class="isian"><span>Business name or type</span><input name="bisnis" required autocomplete="off"></label>' +
      (id ? '' : pilihKursiKosong('id_kursi', false)) +
      '<label class="isian"><span>WhatsApp' + (isLT() ? '' : ' (can be added later)') + '</span><input name="whatsapp" inputmode="tel" autocomplete="off" placeholder="08..."' + (isLT() ? ' required' : '') + '></label>' +
      (pilihanAcara.length ? '<label class="saklar"><input type="checkbox" name="undang"><span>Also invite to a Wednesday event<br><span class="kecil">WhatsApp number is required when inviting.</span></span></label>' +
        '<div class="pilihan" id="pil-acara" hidden style="margin:-4px 0 14px">' + pilihanAcara.map(function (e, i) {
          return '<button type="button" data-ev="' + esc(e.id_event) + '" aria-pressed="' + (i === 0) + '">' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' · ' + esc(tglPendek(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</button>';
        }).join('') + '</div>' : '') +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<button class="tombol" type="submit">Add name</button>' +
    '</form>';
    if (id && (!isLT() || !fasePra())) {
      html += '<div class="baris-tombol"><button class="tombol kedua" id="b-butuh" aria-pressed="' + x.saya_butuh + '">' + (x.saya_butuh ? 'Remove "I need this" mark' : 'I need this classification in the chapter') + '</button></div>';
    }

    bukaLembar(html, function (el) {
      var f = el.querySelector('#f-calon');
      var cek = f.querySelector('[name=undang]');
      var pil = el.querySelector('#pil-acara');
      if (cek) cek.onchange = function () { pil.hidden = !cek.checked; f.whatsapp.required = cek.checked || isLT(); };
      if (pil) pil.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () { pil.querySelectorAll('button').forEach(function (z) { z.setAttribute('aria-pressed', z === b); }); };
      });
      f.onsubmit = async function (e) {
        e.preventDefault();
        var tombol = f.querySelector('[type=submit]');
        tombol.disabled = true;
        var idEv = cek && cek.checked ? (pil.querySelector('[aria-pressed=true]') || {}).dataset.ev : '';
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
      form: S.atur.tautan_form || '(form link)', jam: e.jam_mulai, hariID: tglID(e.tanggal), hariEn: tglHari(e.tanggal),
      tempatID: e.mode === 'Online' ? 'online lewat ' + (e.lokasi || 'Zoom') : 'di ' + (e.lokasi || 'lokasi yang akan dikabari'),
      tempatEn: e.mode === 'Online' ? 'online via ' + (e.lokasi || 'Zoom') : 'at ' + (e.lokasi || 'a location to be confirmed')
    };
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
      '<p class="kecil" style="margin-bottom:6px">Event</p><div class="pilihan" id="u-ev" style="margin-bottom:12px">' + o.acara.map(function (e) {
        return '<button type="button" data-ev="' + esc(e.id_event) + '" aria-pressed="' + (e.id_event === st.idEv) + '">' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch Networking') + ' · ' + esc(tglPendek(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</button>';
      }).join('') + '</div>' +
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
        el.querySelectorAll('[data-ev]').forEach(function (b) {
          b.onclick = function () { if (st.tercatat) return; st.idEv = b.dataset.ev; tanda('#u-ev', 'data-ev', st.idEv); segarPesan(); };
        });
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
          el.querySelectorAll('[data-ev]').forEach(function (b) { b.disabled = b.dataset.ev !== st.idEv; });
          if (o.segarkan) o.segarkan();
          return true;
        }
        el.querySelector('#u-salin').onclick = async function () {
          if (!(await catat())) return;
          salinTeks(ta.value, ta); toast('Message copied. Paste it in WhatsApp.');
        };
        el.querySelector('#u-wa-buka').onclick = async function () {
          if (!(await catat())) return;
          var nomor = String(st.wa).replace(/\D/g, '').replace(/^0/, '62');
          window.open(waLink(nomor, ta.value), '_blank', 'noopener');
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

  /* o: {id_orang, nama, whatsapp, bidang, bisnis, tahap, idSlot?, segarkan} */
  async function lembarKopi(o) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('slotCS');
    if (!r.ok) { bukaLembar('<p class="kosong-isi">' + esc(r.pesan) + '</p>'); return; }
    var depan = o.nama.split(/\s+/)[0];
    var bidang = o.bidang && !/^Undecided/.test(o.bidang) ? o.bidang : (o.bisnis || '');
    var sekarang = Date.now();
    var dipesan = r.slot.filter(function (s) { return s.id_orang === o.id_orang && s.status === 'Terisi' && new Date(s.waktu).getTime() > sekarang; })[0] || null;
    var kosong = r.slot.filter(function (s) { return s.status === 'Kosong' && new Date(s.waktu).getTime() > sekarang; }).slice(0, 8);
    var st = { dekat: 'teman', bahasa: 'id', langkah: dipesan ? 2 : 0, pilih: o.idSlot || (dipesan ? '' : ''), lain: '', wa: o.whatsapp || '' };
    if (!st.pilih && !dipesan && kosong.length) st.pilih = kosong[0].id_slot;
    function waktuDipilih() {
      if (st.pilih === 'lain') return st.lain ? { waktu: new Date(st.lain + ':00+07:00').toISOString(), tempat: 'Zoom', pic: S.profil.nama_depan, pic_id: S.profil.id_orang, pic_ldc: isLDC() } : null;
      var s = kosong.filter(function (z) { return z.id_slot === st.pilih; })[0];
      return s || dipesan;
    }
    function chipSlot(s) { var j = jamCS(s.waktu); return '<button type="button" data-slot="' + esc(s.id_slot) + '" aria-pressed="' + (s.id_slot === st.pilih) + '">' + esc(j.hari) + ' · ' + esc(j.jam) + '<small> ' + esc(s.pic_ldc ? 'Coach Dedy' : s.pic) + '</small>' + '</button>'; }
    var jd = dipesan ? jamCS(dipesan.waktu) : null;
    bukaLembar(
      '<h2>Coffee session with ' + esc(depan) + '</h2>' +
      '<p class="kecil" id="k-info" style="margin:4px 0 12px">' + (dipesan
        ? 'Booked: <b>' + esc(jd.hari + ' ' + jd.jam) + '</b> · ' + esc(dipesan.tempat) + ' · with ' + esc(dipesan.pic_ldc ? 'Coach Dedy' : dipesan.pic) + '. Send message 3 to confirm.'
        : 'A 30 minute 1 on 1 with Coach Dedy or the launch team. No Wednesday visit needed first. Book the time once ' + esc(depan) + ' says yes.') + '</p>' +
      (dipesan ? '<details class="lipat" style="margin-bottom:12px"><summary><span>Change time</span><em>' + kosong.length + ' open</em></summary>' : '<p class="kecil" style="margin-bottom:6px">Open times</p>') +
      '<div class="pilihan slot-pilih" id="k-slot" style="margin-bottom:12px">' + kosong.map(chipSlot).join('') +
        (isLT() ? '<button type="button" data-slot="lain" aria-pressed="' + (st.pilih === 'lain') + '">Other time</button>' : '') + '</div>' +
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
        el.querySelectorAll('[data-slot]').forEach(function (b) { b.onclick = function () { st.pilih = st.pilih === b.dataset.slot && dipesan ? '' : b.dataset.slot; tanda('#k-slot', 'data-slot', st.pilih); segar(); }; });
        el.querySelector('#k-lain-in').oninput = function () { st.lain = this.value; segar(); };
        el.querySelectorAll('[data-dekat]').forEach(function (b) { b.onclick = function () { st.dekat = b.dataset.dekat; tanda('#k-dekat', 'data-dekat', st.dekat); segar(); }; });
        el.querySelectorAll('[data-langkah]').forEach(function (b) { b.onclick = function () { st.langkah = Number(b.dataset.langkah); tanda('#k-langkah', 'data-langkah', st.langkah); segar(); }; });
        el.querySelector('#k-bhs').onclick = function () { st.bahasa = st.bahasa === 'id' ? 'en' : 'id'; this.textContent = st.bahasa === 'id' ? 'ID | EN' : 'EN | ID'; segar(); };
        segar();
        function salah(p) { var s = el.querySelector('#salah'); s.textContent = p; s.hidden = !p; }
        function nomor() { var k = el.querySelector('#k-wa'); return k ? k.value : st.wa; }
        el.querySelector('#k-salin').onclick = function () { salinTeks(ta.value, ta); toast('Message copied. Paste it in WhatsApp.'); };
        el.querySelector('#k-wa-buka').onclick = function () {
          var n = String(nomor()).replace(/\D/g, '').replace(/^0/, '62');
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
    function siapa(s) { return s.pic_ldc ? 'Coach Dedy' : s.pic; }
    function baris(s) {
      var j = jamCS(s.waktu).jam;
      if (s.status === 'Terisi') return '<li><button class="ketuk" data-pesanan="' + esc(s.id_slot) + '" style="flex:1;min-width:0"><span class="jam-slot">' + j + '</span><div class="utama"><b>' + esc(s.nama || '') + '</b><span>' + esc(s.bidang || '') + ' · via ' + esc(s.pengundang || '-') + ' · ' + esc(siapa(s)) + ', ' + esc(s.tempat) + '</span></div></button><span class="chip hijau">Booked</span></li>';
      return '<li><span class="jam-slot redup">' + j + '</span><div class="utama"><b class="redup">Open</b><span>' + esc(siapa(s)) + ', ' + esc(s.tempat) + '</span></div><button class="tombol kecil" data-isi="' + esc(s.id_slot) + '">Book</button><button class="tombol kecil kedua" data-hapus="' + esc(s.id_slot) + '" aria-label="Remove this time">&#10005;</button></li>';
    }
    var hasil = (r.perlu_hasil || []);
    w.innerHTML = '<p class="kecil" style="margin:10px 2px">Coffee sessions are 30 minute interviews. Open times here; members and the team book them for their prospects.</p>' +
      '<div class="baris-tombol" style="margin:0 0 12px"><button class="tombol" id="b-buka-jam">Open times</button></div>' +
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
    w.querySelectorAll('[data-selesai]').forEach(function (b) {
      b.onclick = async function () { var h = await api('tindakLanjut', { id_orang: b.dataset.selesai, tahap: 'Coffee_Session' }); if (!h.ok) return toast(h.pesan); toast('Moved to Interviewed. Record Applied or Declined in Interviews.'); segar(); };
    });
    w.querySelectorAll('[data-absen]').forEach(function (b) {
      b.onclick = async function () { var h = await api('batalSlot', { id_orang: b.dataset.absen }); if (!h.ok) return toast(h.pesan); toast('Back to To schedule. Book a new time.'); segar(); };
    });
  }

  function lembarBukaJam(pewawancara, segarkan) {
    var besok = new Date(Date.now() + 864e5 + 7 * 36e5).toISOString().slice(0, 10);
    var dipilih = {};
    bukaLembar(
      '<h2>Open coffee session times</h2><p class="kecil" style="margin:6px 0 14px">Pick a date and the times that are free. Members can then book them for their prospects.</p>' +
      '<form id="f-jam"><label class="isian"><span>Date</span><input type="date" name="tanggal" value="' + besok + '" required></label>' +
      '<p class="kecil" style="margin-bottom:6px">Times (WIB)</p><div class="pilihan" id="j-jam" style="margin-bottom:10px">' + JAM_UMUM.map(function (j) { return '<button type="button" data-jam="' + j + '" aria-pressed="false">' + j + '</button>'; }).join('') + '</div>' +
      '<label class="isian"><span>Another time (optional)</span><input type="time" name="lain" step="900"></label>' +
      (isLDC() && pewawancara.length ? '<label class="isian"><span>Interviewer</span><select name="pic">' + pewawancara.map(function (p) {
        return '<option value="' + esc(p.id_orang) + '"' + (p.id_orang === S.profil.id_orang ? ' selected' : '') + '>' + esc(p.peran === 'LDC' ? 'Coach Dedy' : p.nama_depan) + '</option>';
      }).join('') + '</select></label>' : '') +
      '<label class="isian"><span>Place</span><input name="tempat" value="Zoom" placeholder="Zoom or a meeting place"></label>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save times</button></form>',
      function (el) {
        el.querySelectorAll('[data-jam]').forEach(function (b) { b.onclick = function () { dipilih[b.dataset.jam] = !dipilih[b.dataset.jam]; b.setAttribute('aria-pressed', !!dipilih[b.dataset.jam]); }; });
        el.querySelector('#f-jam').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target, jam = Object.keys(dipilih).filter(function (k) { return dipilih[k]; });
          if (f.lain.value) jam.push(f.lain.value.slice(0, 5));
          var h = await api('tambahSlot', { tanggal: f.tanggal.value, jam: jam, pic: f.pic ? f.pic.value : '', tempat: f.tempat.value.trim() || 'Zoom' });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
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
    var bisaKunjung = !u.status_undangan && u.tahap === 'Listed';
    var bisaKopi = ['Listed', 'Invited', 'Attended', 'Coffee_Scheduled'].indexOf(u.tahap) >= 0;
    var depan = u.nama.split(/\s+/)[0];
    bukaLembar('<h2>Invite ' + esc(depan) + '</h2><p class="kecil" style="margin:6px 0 14px">' + esc(u.bidang) + '</p>' +
      '<div class="pilihan kolom">' +
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
    var acara = (ac.acara || []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; }).slice(0, 4);
    var st = b.saya;
    var baru = us.usulan.filter(function (u) { return !u.status_undangan && u.tahap === 'Listed'; });
    var sudah = us.usulan.filter(function (u) { return u.status_undangan || u.tahap !== 'Listed'; });
    function baris(u) {
      var bisa = !u.status_undangan && u.tahap === 'Listed';
      var ketuk = !bisa && ['Invited', 'Attended', 'Coffee_Scheduled'].indexOf(u.tahap) >= 0;
      var info = u.tahap === 'Coffee_Scheduled' && u.jadwal_cs ? ' · Coffee ' + jamCS(u.jadwal_cs).hari + ' ' + jamCS(u.jadwal_cs).jam : (u.tanggal_undangan ? ' · ' + esc(u.acara_undangan) + ', ' + esc(tglPendek(u.tanggal_undangan)) : '');
      var isiBaris = '<div class="utama"><b>' + esc(u.nama) + '</b><span>' + esc(u.bidang) + info + '</span></div>';
      return '<li>' + (ketuk ? '<button class="ketuk" data-buka="' + esc(u.id_orang) + '" style="flex:1;min-width:0">' + isiBaris + '</button>' : isiBaris) +
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
    isi.innerHTML = '<div class="sapa"><h1>This week</h1><p class="kecil">Visitors registered for Wednesday, with their classification. Phone numbers are not shown.</p></div>' +
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
  async function layarPapan(isi) {
    var h = await Promise.all([api('papan'), api('beranda')]);
    var p = h[0], b = h[1];
    if (!p.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(p.pesan) + '</p>'; return; }
    function daftar(rows, satuan, kosong) {
      if (!rows.length) return '<p class="kosong-isi">' + kosong + '</p>';
      return '<ul class="daftar">' + rows.map(function (r, i) {
        return '<li class="peringkat-' + (i + 1) + (r.saya ? ' saya' : '') + '"><span class="lambang">' + (i + 1) + '</span><div class="utama"><b>' + esc(r.nama_depan) + (r.saya ? ' <span class="chip merah">me</span>' : '') + '</b></div><span class="nilai">' + r.jumlah + '</span><span class="kecil">' + satuan + '</span></li>';
      }).join('') + '</ul>';
    }
    isi.innerHTML = '<div class="sapa"><h1>Board</h1><p class="kecil">A game, not a ranking. Attendance is not a contest because it is a requirement.</p></div>' +
      '<div class="tab" role="tablist"><button role="tab" data-tab="pengundang" aria-selected="' + (tabPapan === 'pengundang') + '">Inviters this round</button><button role="tab" data-tab="sponsor" aria-selected="' + (tabPapan === 'sponsor') + '">Sponsor wall</button></div>' +
      (tabPapan === 'pengundang'
        ? '<section class="kartu">' + daftar(p.pengundang, 'invitations', 'No invitations this round yet. Be the first.') + '</section><p class="catatan-main">Round ends ' + esc(tglHari(b.ronde.selesai)) + ' at 23:59. The board resets every Thursday.</p>'
        : '<section class="kartu">' + daftar(p.sponsor, 'members', 'No sponsors yet. Members who bring in new members are listed here permanently.') + '</section><p class="catatan-main">The sponsor wall is never reset.</p>');
    isi.querySelectorAll('[data-tab]').forEach(function (t) { t.onclick = function () { tabPapan = t.dataset.tab; layarPapan(isi); }; });
  }

  /* ---------- TIM (LT dan LDC) ---------- */
  function layarTim(isi, sub) {
    var tabs = [['calon', 'Interviews'], ['jadwal', 'Schedule']];
    if (!fasePra()) tabs.push(['rabu', 'Check-in']);
    tabs.push(['regroup', 'Regroup']);
    if (isLDC()) tabs.push(['ringkas', 'Summary']);
    var aktif = tabs.some(function (t) { return t[0] === sub; }) ? sub : 'calon';
    isi.innerHTML = '<div class="tab" role="tablist">' + tabs.map(function (t) {
      return '<button role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === aktif) + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="sub"><div class="muat"></div></div>';
    isi.querySelectorAll('[data-sub]').forEach(function (t) { t.onclick = function () { location.hash = '#tim-' + t.dataset.sub; }; });
    var wadah = isi.querySelector('#sub');
    ({ calon: subCalon, jadwal: subJadwal, rabu: subRabu, regroup: subRegroup, ringkas: subRingkas })[aktif](wadah);
  }

  var semuaCalon = false;
  var segCalon = 'todo';
  var SEG = { todo: ['To schedule', ['Listed', 'Invited', 'Attended']], cs: ['Coffee set', ['Coffee_Scheduled']], done: ['Interviewed', ['Coffee_Session', 'Applied']], hold: ['Closed', ['Joined_Other', 'Declined', 'Rejected']] };
  async function subCalon(w) {
    var r = await api('calonSaya', { semua: semuaCalon });
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
    w.innerHTML = '<div class="seg" role="tablist">' + Object.keys(SEG).map(function (k, i) {
        return '<button role="tab" data-seg="' + k + '" aria-selected="' + (k === segCalon) + '"><b>' + per[k].length + '</b><span>' + SEG[k][0] + '</span></button>';
      }).join('') + '</div>' +
      '<p class="kecil" style="margin:10px 2px">' + info[segCalon] + '</p>' +
      '<div class="baris-tombol" style="margin:0 0 10px"><button class="tombol kedua" id="b-tambah">Add a prospect</button>' + (isLDC() ? '<button class="tombol kedua" id="b-semua">' + (semuaCalon ? 'Only mine' : 'Show everyone') + '</button>' : '') + '</div>' +
      '<section class="kartu">' + (daftar.length ? '<ul class="daftar">' + daftar.map(function (c) {
        return '<li><button class="ketuk" data-calon="' + esc(c.id_orang) + '" style="flex:1;min-width:0"><span class="lambang">' + inisial(c.nama) + '</span><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(c.bidang) + ' · ' + esc(sub(c)) + '</span></div></button>' + aksi(c) + '</li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Nothing here.</p>') + '</section>';
    w.querySelectorAll('[data-seg]').forEach(function (t) { t.onclick = function () { segCalon = t.dataset.seg; subCalon(w); }; });
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

  async function lembarAnggota(c, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('anggota');
    if (!c.id_kursi && !S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    var opsi = '<option value="">Choose a sponsor</option><option value="BNI">BNI (no member known personally)</option>' +
      (r.anggota || []).map(function (a) { return '<option value="' + esc(a.id_orang) + '">' + esc(a.nama) + '</option>'; }).join('');
    bukaLembar(
      '<h2>' + esc(c.nama.split(/\s+/)[0]) + ' joined</h2><p class="kecil" style="margin:4px 0 0">Confirm once the membership payment is in.</p><p class="kecil" style="margin:6px 0 14px">Seat: <b>' + esc(c.bidang) + '</b>. Type: ' + (fasePra() ? 'Founding' : 'Core Group') + '.</p>' +
      '<form id="f-ang">' + (c.id_kursi ? '' : pilihKursiKosong('id_kursi', true)) + '<label class="isian"><span>Sponsor</span><select name="sponsor" required>' + opsi + '</select></label>' +
      '<p class="kecil" style="margin:-4px 0 14px">BNI rule: the sponsor is the member who invited the prospect and is known to them personally. If there is none, choose BNI, unless the prospect names a specific member.</p>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Confirm</button></form>',
      function (el) {
        el.querySelector('#f-ang').onsubmit = async function (e) {
          e.preventDefault();
          var h = await api('jadikanAnggota', { id_orang: c.id_orang, id_sponsor: e.target.sponsor.value, id_kursi: e.target.id_kursi ? e.target.id_kursi.value : c.id_kursi });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          tutupLembar(); toast(c.nama.split(/\s+/)[0] + ' officially took the ' + h.kursi + ' seat', true); segarkan();
        };
      });
  }

  var acaraRabu = '';
  async function subRabu(w) {
    var ac = await api('acara');
    var daftarAc = (ac.acara || []);
    if (!daftarAc.length) { w.innerHTML = '<p class="kosong-isi">No open events in the Events tab.</p>'; return; }
    if (!daftarAc.some(function (e) { return e.id_event === acaraRabu; })) acaraRabu = daftarAc[0].id_event;
    var r = await api('daftarHadir', { id_event: acaraRabu });
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var urut = { Visitor: 0, Anggota: 1, LT: 2 };
    r.orang.sort(function (a, b) { return urut[a.peran] - urut[b.peran] || (a.nama < b.nama ? -1 : 1); });
    var jumlah = r.orang.filter(function (o) { return o.hadir; }).length;
    w.innerHTML = '<label class="isian"><span>Event</span><select id="pil-ev">' + daftarAc.slice(0, 8).map(function (e) {
        return '<option value="' + esc(e.id_event) + '"' + (e.id_event === acaraRabu ? ' selected' : '') + '>' + esc(e.nama_acara) + ' · ' + esc(tglHari(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</option>';
      }).join('') + '</select></label>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:4px 2px 10px"><h2>Attendance</h2><span class="kecil"><b id="jml">' + jumlah + '</b> present</span></div>' +
      '<input class="cari" id="cari" placeholder="Search name" type="search">' +
      '<section class="kartu"><ul class="daftar">' + r.orang.map(function (o) {
        return '<li data-cari="' + esc(o.nama.toLowerCase()) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(o.peran === 'Visitor' ? 'Visitor' + (o.pengundang ? ', invited by ' + o.pengundang : '') : (PERAN_LABEL[o.peran] || o.peran)) + '</span></div><button class="hadir-saklar" data-o="' + esc(o.id_orang) + '" aria-pressed="' + o.hadir + '" aria-label="Present: ' + esc(o.nama) + '"></button></li>';
      }).join('') + '</ul></section>';
    w.querySelector('#pil-ev').onchange = function (e) { acaraRabu = e.target.value; subRabu(w); };
    w.querySelector('#cari').oninput = function (e) {
      var q = e.target.value.toLowerCase();
      w.querySelectorAll('[data-cari]').forEach(function (li) { li.hidden = q && li.dataset.cari.indexOf(q) < 0; });
    };
    w.querySelectorAll('[data-o]').forEach(function (t) {
      t.onclick = async function () {
        var jadi = t.getAttribute('aria-pressed') !== 'true';
        t.setAttribute('aria-pressed', jadi);
        var h = await api('checkin', { id_event: acaraRabu, id_orang: t.dataset.o, hadir: jadi });
        if (!h.ok) { t.setAttribute('aria-pressed', !jadi); return toast(h.pesan); }
        var j = w.querySelector('#jml'); j.textContent = Number(j.textContent) + (jadi ? 1 : -1);
      };
    });
  }

  async function subRegroup(w) {
    var r = await api('regroup');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    w.innerHTML =
      '<section class="kartu"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Founding member</h3><b style="font-family:var(--huruf-judul);font-size:22px">' + r.founding.jumlah + '<span class="redup" style="font-size:14px"> / ' + r.founding.target + '</span></b></div>' +
      '<div class="bilah' + (r.founding.jumlah >= r.founding.target ? ' emas' : '') + '" style="margin-top:10px"><i style="width:' + Math.min(100, r.founding.jumlah / r.founding.target * 100) + '%"></i></div></section>' +
      '<div class="judul-bagian"><h2>Names per launch team member</h2><span class="kecil">target ' + (r.lt[0] ? r.lt[0].target : 20) + '</span></div>' +
      '<section class="kartu">' + r.lt.map(function (x) {
        return '<div class="baris-bilah' + (x.nama_depan === S.profil.nama_depan ? ' saya' : '') + '"><span>' + esc(x.nama_depan) + '</span><div class="bilah' + (x.total >= x.target ? ' emas' : '') + '"><i style="width:' + Math.min(100, x.total / x.target * 100) + '%"></i></div><b>' + x.total + '<span class="redup" style="font-weight:400;font-size:12px"> +' + x.ronde + '</span></b></div>';
      }).join('') + '<p class="catatan-main">Small number: new names this week. Healthy threshold is at least 3 per week.</p></section>' +
      '<section class="kartu" style="display:flex;align-items:center;gap:14px"><b style="font-family:var(--huruf-judul);font-size:34px">' + r.kursi_tanpa_calon + '</b><div><h3>Seats without prospects</h3><p class="kecil">Filter by "Empty" on the Seat Board to see them.</p></div><a href="#kursi" class="tombol kecil kedua" style="margin-left:auto">Open</a></section>' +
      '<div class="judul-bagian"><h2>Prospects idle over 7 days</h2><span class="kecil">' + r.calon_diam.length + '</span></div>' +
      '<section class="kartu">' + (r.calon_diam.length ? '<ul class="daftar">' + r.calon_diam.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>PIC ' + esc(c.pic) + '</span></div><span class="chip merah">' + c.hari + ' days</span></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">All prospects were touched in the last week.</p>') + '</section>';
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
    if (k) {
      $app.innerHTML = '<div class="masuk"><div class="muat"></div></div>';
      var r = await coba(k);
      if (!r.ok) { simpan('optima_kode', null); layarMasuk(); }
    } else layarMasuk();
  })();
})();
