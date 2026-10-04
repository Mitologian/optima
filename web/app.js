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
    html += lipat('Badges', dapat + ' of 5',
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
          lembarKirim(f.nama.value.trim().split(/\s+/)[0], f.whatsapp.value, e2);
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

  function teksUndangan(namaTamu, e) {
    var tempat = e.mode === 'Online' ? 'online via ' + (e.lokasi || 'Zoom') : 'at ' + (e.lokasi || 'a location to be confirmed');
    return 'Hello ' + namaTamu + ', this is ' + S.profil.nama_depan + ' from BNI ' + S.atur.nama_chapter + '. ' +
      'I would like to invite you to ' + e.nama_acara + ' on ' + tglHari(e.tanggal) + ' at ' + e.jam_mulai + ', ' + tempat + '. ' +
      'It is a forum of business owners who open doors for each other. ' +
      (S.atur.tautan_form ? 'Registration is quick, here: ' + S.atur.tautan_form : '');
  }

  function lembarKirim(namaTamu, wa, e) {
    var norm = String(wa || '').replace(/\D/g, '').replace(/^0/, '62');
    bukaLembar(
      '<div style="text-align:center;padding:8px 0 4px"><div class="lencana dapat" style="font-size:13px"><div class="koin">' + IK.L_UNDANGAN_PERTAMA + '</div></div>' +
      '<h2>Invitation recorded</h2><p class="kecil" style="margin:6px 0 16px">Last step: send the message to ' + esc(namaTamu) + '.</p></div>' +
      '<a class="tombol" target="_blank" rel="noopener" href="' + esc(waLink(norm, teksUndangan(namaTamu, e))) + '">Send via WhatsApp</a>' +
      '<div class="baris-tombol"><button class="tombol kedua" data-tutup>Later</button></div>',
      function (el) { el.querySelector('[data-tutup]').onclick = tutupLembar; }
    );
  }

  /* ---------- UNDANG ---------- */
  function chipUndangan(u) {
    var st = u.status_undangan;
    if (u.tahap === 'Anggota') return '<span class="chip emas">Joined</span>';
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
    var baru = us.usulan.filter(function (u) { return !u.status_undangan && u.tahap !== 'Anggota'; });
    var sudah = us.usulan.filter(function (u) { return u.status_undangan || u.tahap === 'Anggota'; });
    function baris(u) {
      var bisa = !u.status_undangan && u.tahap !== 'Anggota';
      return '<li><div class="utama"><b>' + esc(u.nama) + '</b><span>' + esc(u.bidang) + (u.tanggal_undangan ? ' · ' + esc(u.acara_undangan) + ', ' + esc(tglPendek(u.tanggal_undangan)) : '') + '</span></div>' +
        (bisa ? '<button class="tombol kecil" data-undang="' + esc(u.id_orang) + '" data-wa="' + (u.punya_wa ? 1 : 0) + '" data-nama="' + esc(u.nama) + '">Invite</button>' : chipUndangan(u)) + '</li>';
    }
    isi.innerHTML = '<div class="sapa"><h1>My list</h1><p class="kecil">Names I want to invite. ' + st.nama_daftar + ' of ' + st.target_nama_maks + ' (minimum ' + st.target_nama_min + ').</p></div>' +
      '<div class="baris-tombol" style="margin:0 0 14px"><button class="tombol" id="b-tambah">Add a name</button></div>' +
      '<div class="judul-bagian"><h2>Ready to invite</h2><span class="kecil">' + baru.length + '</span></div>' +
      '<section class="kartu">' + (baru.length ? '<ul class="daftar">' + baru.map(baris).join('') + '</ul>' : '<p class="kosong-isi">No names waiting. Tap "Add a name" to start.</p>') + '</section>' +
      '<div class="judul-bagian"><h2>Invited</h2><span class="kecil">' + sudah.length + '</span></div>' +
      '<section class="kartu">' + (sudah.length ? '<ul class="daftar">' + sudah.map(baris).join('') + '</ul><p class="catatan-main">A Visitor shows as Registered once the sign-up form is filled in. Attendance is recorded by the launch team on Wednesday.</p>' : '<p class="kosong-isi">No invitations yet.</p>') + '</section>';
    isi.querySelector('#b-tambah').onclick = function () { bukaKursi('', function () { layarUndang(isi); }); };
    isi.querySelectorAll('[data-undang]').forEach(function (t) {
      t.onclick = function () { lembarUndang(t.dataset.undang, t.dataset.nama, t.dataset.wa === '1', acara, function () { layarUndang(isi); }); };
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

  function lembarUndang(id, nama, punyaWa, acara, segarkan) {
    if (!acara.length) return toast('No Wednesday events are open yet.');
    bukaLembar(
      '<h2 style="margin-bottom:12px">Invite ' + esc(nama.split(/\s+/)[0]) + '</h2>' +
      '<form id="f-und"><p class="kecil" style="margin-bottom:8px">Register for (no date typing needed)</p><div class="pilihan" style="margin-bottom:14px">' + acara.map(function (e, i) {
        return '<button type="button" data-ev="' + esc(e.id_event) + '" aria-pressed="' + (i === 0) + '">' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' · ' + esc(tglPendek(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</button>';
      }).join('') + '</div>' +
      (punyaWa ? '' : '<label class="isian"><span>WhatsApp ' + esc(nama.split(/\s+/)[0]) + '</span><input name="whatsapp" inputmode="tel" required placeholder="08..."></label>') +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Record invitation</button></form>',
      function (el) {
        var pil = el.querySelectorAll('[data-ev]');
        pil.forEach(function (b) { b.onclick = function () { pil.forEach(function (z) { z.setAttribute('aria-pressed', z === b); }); }; });
        var f = el.querySelector('#f-und');
        f.onsubmit = async function (e) {
          e.preventDefault();
          var idEv = el.querySelector('[data-ev][aria-pressed=true]').dataset.ev;
          var wa = f.whatsapp ? f.whatsapp.value : '';
          var r = await api('undang', { id_orang: id, id_event: idEv, whatsapp: wa });
          if (!r.ok) { var s = el.querySelector('#salah'); s.textContent = r.pesan; s.hidden = false; return; }
          lembarKirim(nama.split(/\s+/)[0], wa, acara.filter(function (z) { return z.id_event === idEv; })[0]);
          if (segarkan) segarkan();
        };
      });
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
    var tabs = [['calon', 'Interviews']];
    if (!fasePra()) tabs.push(['rabu', 'Attendance']);
    tabs.push(['regroup', 'Regroup']);
    if (isLDC()) tabs.push(['ringkas', 'Summary']);
    var aktif = tabs.some(function (t) { return t[0] === sub; }) ? sub : 'calon';
    isi.innerHTML = '<div class="tab" role="tablist">' + tabs.map(function (t) {
      return '<button role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === aktif) + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="sub"><div class="muat"></div></div>';
    isi.querySelectorAll('[data-sub]').forEach(function (t) { t.onclick = function () { location.hash = '#tim-' + t.dataset.sub; }; });
    var wadah = isi.querySelector('#sub');
    ({ calon: subCalon, rabu: subRabu, regroup: subRegroup, ringkas: subRingkas })[aktif](wadah);
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
      todo: 'Step 1. Pick a date and time for the coffee session.',
      cs: 'Step 2. After the coffee session, tap Done.',
      done: 'Step 3. Tap Accepted when the prospect says yes. This makes them a member.',
      hold: 'Joined another chapter, declined, or rejected. Reopen anyone who is ready again.'
    };
    function aksi(c) {
      if (segCalon === 'todo') return '<button class="tombol kecil" data-aksi="jadwal" data-id="' + esc(c.id_orang) + '">Set coffee</button>';
      if (segCalon === 'cs') return '<button class="tombol kecil" data-aksi="selesai" data-id="' + esc(c.id_orang) + '">Done</button>';
      if (segCalon === 'done') return '<button class="tombol kecil" data-aksi="terima" data-id="' + esc(c.id_orang) + '">Accepted</button>';
      return '<button class="tombol kecil kedua" data-aksi="buka" data-id="' + esc(c.id_orang) + '">Reopen</button>';
    }
    function sub(c) {
      if (segCalon === 'cs' && c.jadwal_cs) return jamCS(c.jadwal_cs).hari + ' ' + jamCS(c.jadwal_cs).jam;
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
        if (t.dataset.aksi === 'jadwal') return lembarJadwal(c, function () { segCalon = 'cs'; subCalon(w); });
        if (t.dataset.aksi === 'terima') return lembarAnggota(c, function () { subCalon(w); });
        var tujuan = t.dataset.aksi === 'selesai' ? 'Coffee_Session' : 'Invited';
        var h = await api('tindakLanjut', { id_orang: c.id_orang, tahap: tujuan });
        if (!h.ok) return toast(h.pesan);
        segCalon = tujuan === 'Coffee_Session' ? 'done' : 'todo';
        toast(c.nama.split(/\s+/)[0] + (tujuan === 'Coffee_Session' ? ' moved to Interviewed' : ' is back in To schedule')); subCalon(w);
      };
    });
  }

  async function lembarJadwal(c, segarkan) {
    if (!c.id_kursi && !S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    bukaLembar(
      '<h2>Coffee session with ' + esc(c.nama.split(/\s+/)[0]) + '</h2><p class="kecil" style="margin:6px 0 14px">' + esc(c.bidang) + '</p>' +
      '<form id="f-jd"><label class="isian"><span>Date and time</span><input type="datetime-local" name="jadwal_cs" required></label>' +
      (c.id_kursi ? '' : pilihKursiKosong('id_kursi', false)) +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Save coffee session</button></form>',
      function (el) {
        el.querySelector('#f-jd').onsubmit = async function (e) {
          e.preventDefault();
          var f = e.target;
          var r = await api('tindakLanjut', { id_orang: c.id_orang, tahap: 'Coffee_Scheduled', jadwal_cs: new Date(f.jadwal_cs.value).toISOString(), id_kursi: f.id_kursi ? f.id_kursi.value : '' });
          if (!r.ok) { var s = el.querySelector('#salah'); s.textContent = r.pesan; s.hidden = false; return; }
          tutupLembar(); toast('Coffee session set for ' + c.nama.split(/\s+/)[0]); S.cache.kursi = null; segarkan();
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
      '<h2>Make ' + esc(c.nama.split(/\s+/)[0]) + ' a member</h2><p class="kecil" style="margin:6px 0 14px">Seat: <b>' + esc(c.bidang) + '</b>. Type: ' + (fasePra() ? 'Founding' : 'Core Group') + '.</p>' +
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
