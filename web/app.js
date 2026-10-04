/* BNI Optima · PWA
   Satu berkas, tanpa build. Semua data lewat Api.panggil (lihat KONTRAK.md bagian 6).
   Aturan teks: tanpa em dash, tanpa kata ganti orang kedua informal. */
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
  var BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  function wib(iso) {
    var d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T00:00:00+07:00') : new Date(iso);
    return new Date(d.getTime() + 7 * 36e5);
  }
  function tglPendek(iso) { if (!iso) return ''; var w = wib(iso); return w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()]; }
  function tglHari(iso) { if (!iso) return ''; var w = wib(iso); return HARI[w.getUTCDay()] + ', ' + w.getUTCDate() + ' ' + BULAN[w.getUTCMonth()]; }
  function lalu(iso) {
    var m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 2) return 'baru saja';
    if (m < 60) return m + ' menit lalu';
    var j = Math.floor(m / 60);
    if (j < 24) return j + ' jam lalu';
    var h = Math.floor(j / 24);
    return h === 1 ? 'kemarin' : h + ' hari lalu';
  }
  function inisial(n) { return esc(String(n || '?').trim().charAt(0).toUpperCase()); }
  function jamCS(iso) {
    var w = wib(iso);
    var jam = String(w.getUTCHours()).padStart(2, '0') + '.' + String(w.getUTCMinutes()).padStart(2, '0');
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
    return '<label class="isian"><span>Kursi klasifikasi' + (wajib ? '' : ' (opsional)') + '</span><select name="' + nama + '"' + (wajib ? ' required' : '') + '><option value="">Pilih kursi</option>' + opsi.join('') + '</select></label>';
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
    if (!r.ok && /Kode akses tidak dikenal/.test(r.pesan || '') && aksi !== 'masuk') keluar();
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
    tim: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .8 3.2 2.5 3.6 5.2"/></svg>',
    L_UNDANGAN_PERTAMA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4z"/></svg>',
    L_TAMU_DATANG: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V4a1 1 0 0 1 1-1h9v18"/><path d="M13 3h4a1 1 0 0 1 1 1v17"/><path d="M10 12h.01"/><path d="M2 21h20"/></svg>',
    L_SPONSOR_PERTAMA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>',
    L_TIGA_KURSI: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor"/><rect x="16" y="9" width="6" height="6" rx="1" fill="currentColor"/></svg>',
    L_RABU_5: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>'
  };

  /* ---------- kerangka ---------- */
  function menu() {
    var m = [{ id: 'misi', label: 'Misi' }, { id: 'kursi', label: 'Kursi' }];
    if (!fasePra()) { m.push({ id: 'undang', label: 'Undang' }); m.push({ id: 'papan', label: 'Papan' }); }
    if (isLT()) m.push({ id: 'tim', label: isLDC() ? 'LDC' : 'Tim' });
    return m;
  }

  function kerangka(aktif) {
    var nav = menu().map(function (x) {
      return '<a href="#' + x.id + '"' + (x.id === aktif ? ' aria-current="page"' : '') + '>' + IK[x.id] + '<span>' + x.label + '</span></a>';
    }).join('');
    $app.innerHTML =
      '<header class="kepala"><div class="kepala-dalam">' +
        '<div class="merek"><b>BNI</b><span>' + esc(S.atur.nama_chapter) + '</span></div>' +
        '<span class="fase">' + esc(S.atur.fase === 'Pembentukan' ? 'Pembentukan' : 'Fase ' + S.atur.fase) + '</span>' +
        '<button class="keluar" id="keluar" aria-label="Keluar">Keluar</button>' +
      '</div></header>' +
      '<main class="wadah" id="isi"><div class="muat" style="margin-top:22px"></div><div class="muat"></div></main>' +
      '<nav class="nav" aria-label="Menu utama">' + nav + '</nav>';
    document.getElementById('keluar').onclick = function () {
      bukaLembar('<h2>Keluar dari app?</h2><p class="kecil" style="margin:6px 0 14px">Kode akses perlu dimasukkan lagi saat masuk.</p><button class="tombol" id="ya-keluar">Keluar</button><div class="baris-tombol"><button class="tombol kedua" data-tutup>Batal</button></div>', function (el) {
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
        '<p class="kecil" style="margin-top:10px">64 kursi. Satu bidang satu kursi. Mari isi bersama.</p>' +
        '<div class="kisi-hias">' + hias + '</div>' +
        '<form id="f-masuk">' +
          '<label class="isian"><span>Kode akses</span><input class="kode" name="kode" maxlength="8" autocomplete="one-time-code" autocapitalize="characters" required></label>' +
          (pesan ? '<p class="pesan-salah">' + esc(pesan) + '</p>' : '') +
          '<button class="tombol" type="submit">Masuk</button>' +
        '</form>' +
        '<p class="kecil redup" style="margin-top:14px">Kode akses dibagikan oleh Coach Dedy atau launch team.</p>' +
        (Api.tiruan ? '<div class="petunjuk-tiruan"><b>Mode contoh.</b> Data tiruan, tidak tersambung ke sheet. Coba kode <b>LDC001</b> (Coach Dedy), <b>LT0001</b> (launch team), atau <b>AGT001</b> (anggota, hanya setelah ESM).' +
          '<p style="margin:10px 0 6px">Lihat app pada fase:</p><div class="pilihan" id="pil-fase"><button type="button" data-fase="Pembentukan">Pembentukan</button><button type="button" data-fase="BOD">Setelah ESM</button></div></div>' : '') +
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
      tombol.disabled = true; tombol.textContent = 'Memeriksa...';
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
    ({ misi: layarMisi, kursi: layarKursi, undang: layarUndang, papan: layarPapan, tim: layarTim })[layar](isi, h[1]);
  }
  window.addEventListener('hashchange', rute);

  /* ---------- MISI ---------- */
  function grafikMisi(m) {
    var data = m.riwayat && m.riwayat.length ? m.riwayat : [{ selesai: new Date().toISOString(), jumlah: m.anggota }];
    var W = 320, H = 160, kiri = 8, kanan = 62, atas = 12, bawah = 24;
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
      '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Pertumbuhan anggota per pekan, sekarang ' + akhir.jumlah + ' anggota">' +
        '<line x1="' + kiri + '" x2="' + (W - kanan) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="g-dasar"/>' +
        garis + area + jalur +
        '<line class="g-silang" x1="0" x2="0" y1="' + atas + '" y2="' + y(0) + '" style="display:none"/>' +
        '<circle class="g-ujung" cx="' + x(n - 1) + '" cy="' + y(akhir.jumlah) + '" r="5"/>' +
        '<text class="g-tgl" x="' + kiri + '" y="' + (H - 6) + '">' + esc(tglPendek(data[0].selesai)) + '</text>' +
        (n > 1 ? '<text class="g-tgl" text-anchor="end" x="' + (W - kanan) + '" y="' + (H - 6) + '">' + esc(tglPendek(akhir.selesai)) + '</text>' : '') +
        sentuh +
      '</svg><p class="g-info">Ketuk grafik untuk melihat jumlah per pekan.</p></div>';
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
        info.textContent = 'Pekan sampai ' + tglHari(d.selesai) + ': ' + d.jumlah + ' anggota';
      };
      r.addEventListener('click', tunjuk);
      r.addEventListener('mouseenter', tunjuk);
    });
  }

  function kartuMisi(m) {
    var sisa = Math.max(0, m.target - m.anggota);
    var sub = sisa ? sisa + ' anggota lagi menuju ' + (m.target === m.gerbang[0] ? 'ESM' : m.target === m.gerbang[1] ? 'Core Group Training' : 'Grand Launch')
                   : 'Target fase ini tercapai. Saatnya gerbang berikutnya.';
    return '<section class="kartu misi">' +
      '<div class="label">Misi Chapter</div>' +
      '<div class="angka">' + m.anggota + ' <small>/ ' + m.target + ' anggota</small></div>' +
      '<div class="sub">' + esc(sub) + '. Target akhir ' + m.gerbang[2] + '.</div>' +
      grafikMisi(m) +
    '</section>';
  }

  function kartuDaftar(st) {
    var min = st.target_nama_min, maks = st.target_nama_maks, n = st.nama_daftar;
    var pesan = n >= maks ? 'Sasaran ' + maks + ' nama tercapai.' : n >= min ? 'Minimal ' + min + ' tercapai. Lanjut menuju ' + maks + '.' : (min - n) + ' nama lagi menuju minimal ' + min + '.';
    return '<section class="kartu"><div style="display:flex;justify-content:space-between;align-items:baseline"><h3>Daftar nama saya</h3><b style="font-family:var(--huruf-judul);font-size:22px">' + n + '<span class="redup" style="font-size:14px"> / ' + maks + '</span></b></div>' +
      '<div class="bilah-ganda"><div class="bilah' + (n >= min ? ' emas' : '') + '"><i style="width:' + Math.min(100, n / maks * 100) + '%"></i></div><span class="tanda-min" style="left:' + (min / maks * 100) + '%"></span></div>' +
      '<p class="kecil">' + esc(pesan) + ' Setiap nama terikat ke satu kursi di Papan Kursi.</p>' +
      '<div class="baris-tombol"><a class="tombol kecil" href="#kursi">Tambah nama</a>' + (isLT() ? '<a class="tombol kecil kedua" href="#tim">Calon saya</a>' : fasePra() ? '' : '<a class="tombol kecil kedua" href="#undang">Lihat daftar</a>') + '</div></section>';
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
      var chip = g.bergabung ? '<span class="chip emas">Bergabung</span>' : g.status === 'Hadir' ? '<span class="chip hijau">Hadir</span>' : '<span class="chip">' + esc(g.jenis === 'BOD' ? 'BOD' : 'Lunch') + '</span>';
      return '<li><span class="lambang">' + inisial(g.nama) + '</span><div class="utama"><b>' + esc(g.nama) + '</b><span>' + esc(g.bidang) + ' · diundang ' + esc(g.pengundang || 'chapter') + '</span></div>' + chip + '</li>';
    }).join('') + '</ul>' : '<p class="kosong-isi">Belum ada tamu yang mendaftar untuk Rabu ini.</p>';
    return '<div class="judul-bagian"><h2>Tamu Rabu ini</h2><span class="kecil">' + tm.tamu.length + ' terdaftar</span></div>' +
      '<section class="kartu">' + isi + '<p class="catatan-main">Kenali bidangnya sebelum Rabu, supaya bisa menyapa dan menyambungkan.</p></section>';
  }

  function kartuRonde(b) {
    var st = b.saya;
    var selesai = st.undangan_ronde > 0;
    var akhir = b.ronde.selesai;
    var ac = b.ronde.acara_berikut;
    return '<section class="kartu ronde' + (selesai ? ' selesai' : '') + '">' +
      '<div class="tanda">' + (selesai ? '&#10003;' : '1') + '</div>' +
      '<div class="teks"><h3>Ronde Rabu ' + esc(tglPendek(akhir)) + '</h3>' +
        '<p class="kecil">' + (selesai ? 'Misi ronde ini beres: ' + st.undangan_ronde + ' undangan.' : 'Misi: satu undangan sebelum Rabu malam.') + '</p>' +
        (ac ? '<p class="kecil redup">Berikutnya: ' + esc(ac.nama_acara) + ', ' + esc(tglHari(ac.tanggal)) + ' ' + esc(ac.jam_mulai) + '</p>' : '') +
      '</div>' +
      '<div class="api"><b>' + st.rabu_beruntun + '</b><span>Rabu beruntun</span></div>' +
    '</section>';
  }

  async function layarMisi(isi) {
    var tugas = [api('beranda')];
    if (!fasePra()) { tugas.push(api('undanganSaya')); tugas.push(api('tamuPekanIni')); }
    var h = await Promise.all(tugas);
    var b = h[0], ud = h[1], tm = h[2];
    if (!b.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(b.pesan) + '</p>'; return; }
    var html = '<div class="sapa"><h1>Halo, ' + esc(S.profil.nama_depan) + '</h1>' +
      '<p class="kecil">' + (fasePra() ? 'Masa pembentukan. Setiap nama yang masuk membawa chapter lebih dekat ke ESM.' : 'Satu undangan setiap pekan sudah cukup untuk menggerakkan chapter.') + '</p></div>';

    var sorot = ud && ud.ok ? sorotan(ud.undangan) : [];
    if (sorot.length) {
      html += '<section class="kartu sorotan"><h3>Kabar dari undangan</h3><ul class="kabar">' + sorot.map(function (u) {
        return '<li class="k-' + (u.status === 'Bergabung' ? 'baris' : 'anggota') + '"><span class="titik"></span><div>' + esc(u.nama_depan) + (u.status === 'Bergabung' ? ' sudah bergabung dengan chapter. Selamat, ini hasil undangan.' : ' hadir di ' + esc(u.acara) + ' ' + esc(tglPendek(u.tanggal)) + '.') + '</div></li>';
      }).join('') + '</ul><div class="baris-tombol"><button class="tombol kecil kedua" id="b-sorot">Tandai sudah dibaca</button></div></section>';
    }

    html += kartuMisi(b.misi);
    html += kartuDaftar(b.saya);

    if (!fasePra()) {
      html += kartuRonde(b);
      html += '<section class="kartu"><div class="statistik">' +
        '<div class="stat"><b>' + b.saya.undangan_total + '</b><span>undangan</span></div>' +
        '<div class="stat"><b>' + b.saya.tamu_hadir + '</b><span>tamu hadir</span></div>' +
        '<div class="stat"><b>' + b.saya.sponsor + '</b><span>disponsori</span></div>' +
      '</div></section>';
      if (tm && tm.ok) html += kartuTamu(tm);
    }
    html += '<div class="judul-bagian"><h2>Lencana</h2><span class="kecil">' + b.lencana.filter(function (l) { return l.didapat; }).length + ' dari 5</span></div>' +
      '<section class="kartu"><div class="lencana-baris">' + b.lencana.map(function (l) {
        return '<div class="lencana' + (l.didapat ? ' dapat' : '') + (l.baru ? ' baru' : '') + '" title="' + esc(l.ket) + '"><div class="koin">' + IK['L_' + l.kode] + '</div>' + esc(l.nama) + '</div>';
      }).join('') + '</div><p class="catatan-main">Ini permainan untuk saling menyemangati, bukan tingkatan.</p></section>';

    html += '<div class="judul-bagian"><h2>Kabar chapter</h2></div><section class="kartu">' +
      (b.kabar.length ? '<ul class="kabar">' + b.kabar.map(function (k) {
        return '<li class="k-' + esc(k.jenis) + '"><span class="titik"></span><div>' + esc(k.teks) + '<time>' + esc(lalu(k.waktu)) + '</time></div></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Belum ada kabar. Kabar baik pertama segera datang.</p>') + '</section>';

    isi.innerHTML = html;
    pasangGrafik(isi);
    var bs = isi.querySelector('#b-sorot');
    if (bs) bs.onclick = function () { tandaiDilihat(sorot); isi.querySelector('.sorotan').remove(); };
    if (sorot.some(function (u) { return u.status === 'Bergabung'; })) toast('Undangan Anda membawa anggota baru', true);
    var baru = b.lencana.filter(function (l) { return l.baru; })[0];
    if (baru) setTimeout(function () { toast('Lencana baru: ' + baru.nama, true); }, sorot.length ? 4400 : 0);
  }

  /* ---------- KURSI ---------- */
  var saringKursi = 'semua';
  var tabKursi = 'papan';
  async function layarKursi(isi) {
    var tabs = '<div class="tab" role="tablist" style="margin-top:18px"><button role="tab" data-tk="papan" aria-selected="' + (tabKursi === 'papan') + '">Papan Kursi</button><button role="tab" data-tk="anggota" aria-selected="' + (tabKursi === 'anggota') + '">Daftar anggota</button></div>';
    if (tabKursi === 'anggota') return layarAnggota(isi, tabs);
    var r = await api('kursi');
    if (!r.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    S.cache.kursi = r.baris;
    var n = { terisi: 0, ada_calon: 0, kosong: 0 };
    var milik = 0;
    r.baris.forEach(function (b) { b.kursi.forEach(function (x) { n[x.status]++; milik += x.saya_calon; }); });
    var lengkap = r.baris.filter(function (b) { return b.lengkap; }).length;
    var saring = [['semua', 'Semua'], ['saya', 'Daftar saya' + (milik ? ' (' + milik + ')' : '')], ['kosong', 'Kosong'], ['ada_calon', 'Ada calon'], ['dicari', 'Dicari anggota']];
    function lolos(x) {
      if (saringKursi === 'semua') return true;
      if (saringKursi === 'saya') return x.saya_calon > 0;
      if (saringKursi === 'dicari') return x.jumlah_butuh > 0 && x.status !== 'terisi';
      return saringKursi === x.status;
    }
    isi.innerHTML = tabs +
      '<div class="sapa" style="margin-top:4px"><h1>Papan 64 Kursi</h1><p class="kecil">Satu bidang bisnis, satu kursi. Ketuk kursi untuk memasukkan nama calon dari bidang itu.</p></div>' +
      '<div class="ringkas-kursi">' +
        '<span><i style="background:var(--merah)"></i>' + n.terisi + ' terisi</span>' +
        '<span><i style="background:var(--merah-muda);border:1.5px solid var(--merah)"></i>' + n.ada_calon + ' ada calon</span>' +
        '<span><i style="border:1.5px dashed var(--abu)"></i>' + n.kosong + ' kosong</span>' +
        (lengkap ? '<span><i style="background:var(--emas)"></i>' + lengkap + ' baris lengkap</span>' : '') +
      '</div>' +
      '<div class="saring" role="group" aria-label="Saring kursi">' + saring.map(function (s) {
        return '<button data-saring="' + s[0] + '" aria-pressed="' + (saringKursi === s[0]) + '">' + s[1] + '</button>';
      }).join('') + '</div>' +
      '<div class="papan-kursi">' + r.baris.map(function (b) {
        return '<section class="baris-kursi' + (b.lengkap ? ' lengkap' : '') + '">' +
          '<header><span class="no">' + (b.nomor > 8 ? '+' : b.nomor) + '</span><h3>' + esc(b.sphere) + '</h3><span class="hitung">' + b.terisi + '/' + b.kursi.length + '</span></header>' +
          '<div class="kisi">' + b.kursi.map(function (x) {
            var redam = !lolos(x);
            return '<button class="kursi ' + x.status + (redam ? ' redam' : '') + (x.saya_calon ? ' milik' : '') + '" data-kursi="' + esc(x.id_kursi) + '" aria-label="' + esc(x.bidang) + ', ' + (x.status === 'terisi' ? 'terisi ' + x.pemilik : x.status === 'ada_calon' ? x.jumlah_calon + ' calon' : 'kosong') + (x.saya_calon ? ', ' + x.saya_calon + ' dari daftar saya' : '') + '">' +
              (x.jumlah_butuh && x.status !== 'terisi' ? '<span class="dicari"></span>' : '') +
              (x.status === 'ada_calon' ? '<span class="badge">' + x.jumlah_calon + '</span>' : '') +
              '<span class="t">' + esc(x.singkat) + '</span></button>';
          }).join('') + '</div></section>';
      }).join('') + '</div>' +
      '<p class="catatan-main"><span class="titik-emas"></span> bidang yang sedang dicari anggota &nbsp; <span class="cincin-saya"></span> ada nama dari daftar saya</p>' +
      '<button class="tombol kedua" id="b-tanpa-kursi" style="margin-top:6px">Tambah nama, bidang belum pasti</button>';
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
    r.anggota.forEach(function (a) { var s = a.sphere || 'Lainnya'; (per[s] = per[s] || []).push(a); });
    isi.innerHTML = tabs +
      '<div class="sapa" style="margin-top:4px"><h1>' + r.anggota.length + ' anggota</h1><p class="kecil">Setiap anggota memegang satu klasifikasi. Bidang di bawah sudah terkunci.</p></div>' +
      '<input class="cari" id="cari" placeholder="Cari nama atau bidang" type="search">' +
      Object.keys(per).map(function (s) {
        return '<div class="judul-bagian"><h2>' + esc(s) + '</h2><span class="kecil">' + per[s].length + '</span></div><section class="kartu"><ul class="daftar">' + per[s].map(function (a) {
          return '<li data-cari="' + esc((a.nama + ' ' + a.bidang).toLowerCase()) + '"><span class="lambang">' + inisial(a.nama) + '</span><div class="utama"><b>' + esc(a.nama) + '</b><span>' + esc(a.bidang) + (a.sponsor ? ' · sponsor ' + esc(a.sponsor) : '') + '</span></div><span class="chip' + (a.jenis_anggota === 'Founding' ? ' merah' : '') + '">' + esc(a.jenis_anggota || 'Anggota') + '</span></li>';
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
    var tugas = [id ? api('kursiDetail', { id_kursi: id }) : Promise.resolve({ ok: true, kursi: { id_kursi: '', bidang: 'Bidang belum pasti', singkat: '?', sphere: 'Tanpa kursi', status: 'kosong', jumlah_calon: 0, jumlah_butuh: 0, saya_butuh: false }, calon: [], calon_saya: [] })];
    if (!fasePra()) tugas.push(api('acara'));
    var h = await Promise.all(tugas);
    var d = h[0], ac = h[1];
    if (!d.ok) { bukaLembar('<p class="kosong-isi">' + esc(d.pesan) + '</p>'); return; }
    var x = d.kursi;
    var html = '<div class="tajuk">' + ubinKursi(x) + '<div><p class="kecil">' + esc(x.sphere) + '</p><h2>' + esc(x.bidang) + '</h2></div></div>';

    if (x.status === 'terisi') {
      html += '<section class="kartu" style="box-shadow:none"><p>Kursi ini milik <b>' + esc(x.pemilik) + '</b>.</p><p class="kecil" style="margin-top:6px">Sesuai aturan BNI, satu klasifikasi hanya untuk satu anggota. Calon dari bidang ini tidak bisa masuk chapter.</p></section>';
      bukaLembar(html);
      return;
    }

    var info = [];
    if (x.jumlah_calon) info.push('<span class="chip merah">' + x.jumlah_calon + ' calon</span>');
    if (x.jumlah_butuh) info.push('<span class="chip emas">dicari ' + x.jumlah_butuh + ' anggota</span>');
    if (info.length) html += '<p style="display:flex;gap:6px;margin:-4px 0 14px">' + info.join('') + '</p>';

    if (!id) html += '<p class="kecil" style="margin:-4px 0 14px">Untuk nama yang bidangnya belum jelas. Launch team akan memasangkannya ke kursi yang tepat.</p>';
    if (!isLT() && d.calon_saya && d.calon_saya.length) {
      html += '<section class="kartu" style="box-shadow:none"><h3>Dari daftar saya</h3><ul class="daftar">' + d.calon_saya.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b></div><span class="chip">' + esc(c.tahap) + '</span></li>';
      }).join('') + '</ul></section>';
    }
    if (d.calon && d.calon.length) {
      html += '<section class="kartu" style="box-shadow:none"><h3>Calon di kursi ini</h3><ul class="daftar">' + d.calon.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>PIC ' + esc(c.pic || 'belum ada') + (c.diajukan && c.diajukan !== c.pic ? ' · diajukan ' + esc(c.diajukan) : '') + '</span></div><span class="chip">' + esc(c.tahap) + '</span></li>';
      }).join('') + '</ul></section>';
    }

    var pilihanAcara = (ac && ac.ok ? ac.acara : []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; }).slice(0, 4);
    html += '<form id="f-calon">' +
      '<h3 style="margin:4px 0 10px">' + (id ? 'Masukkan calon ' + esc(x.bidang.toLowerCase()) : 'Masukkan nama') + '</h3>' +
      '<label class="isian"><span>Nama lengkap</span><input name="nama" required autocomplete="off"></label>' +
      '<label class="isian"><span>Nama atau jenis bisnis</span><input name="bisnis" required autocomplete="off"></label>' +
      '<label class="isian"><span>WhatsApp' + (isLT() ? '' : ' (boleh menyusul)') + '</span><input name="whatsapp" inputmode="tel" autocomplete="off" placeholder="08..."' + (isLT() ? ' required' : '') + '></label>' +
      (pilihanAcara.length ? '<label class="saklar"><input type="checkbox" name="undang"><span>Sekalian undang ke acara Rabu<br><span class="kecil">Nomor WhatsApp wajib kalau diundang.</span></span></label>' +
        '<div class="pilihan" id="pil-acara" hidden style="margin:-4px 0 14px">' + pilihanAcara.map(function (e, i) {
          return '<button type="button" data-ev="' + esc(e.id_event) + '" aria-pressed="' + (i === 0) + '">' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' · ' + esc(tglPendek(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</button>';
        }).join('') + '</div>' : '') +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<button class="tombol" type="submit">Masukkan nama</button>' +
    '</form>';
    if (id && (!isLT() || !fasePra())) {
      html += '<div class="baris-tombol"><button class="tombol kedua" id="b-butuh" aria-pressed="' + x.saya_butuh + '">' + (x.saya_butuh ? 'Batalkan tanda butuh' : 'Saya butuh bidang ini di chapter') + '</button></div>';
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
        var data = { id_kursi: x.id_kursi, nama: f.nama.value, bisnis: f.bisnis.value, whatsapp: f.whatsapp.value, id_event: idEv || '' };
        var r = await api('tambahCalon', data);
        tombol.disabled = false;
        var salah = el.querySelector('#salah');
        if (!r.ok) {
          var t = r.pesan;
          if (r.duplikat) t += ' (' + r.duplikat.nama_depan + (r.duplikat.tahap ? ', tahap ' + r.duplikat.tahap + ', PIC ' + (r.duplikat.pic || 'belum ada') : '') + ')';
          salah.textContent = t; salah.hidden = false; return;
        }
        if (r.id_undangan) {
          var e2 = pilihanAcara.filter(function (z) { return z.id_event === idEv; })[0];
          lembarKirim(f.nama.value.trim().split(/\s+/)[0], f.whatsapp.value, e2);
        } else {
          tutupLembar();
          toast(!id ? 'Nama masuk ke daftar' : x.status === 'kosong' ? 'Kursi ' + x.bidang + ' kini punya calon' : 'Nama masuk ke kursi ' + x.bidang, !!id && x.status === 'kosong');
        }
        if (segarkan) segarkan();
      };
      var bb = el.querySelector('#b-butuh');
      if (bb) bb.onclick = async function () {
        var r = await api('butuh', { id_kursi: x.id_kursi });
        if (!r.ok) return toast(r.pesan);
        tutupLembar();
        toast(r.saya_butuh ? 'Tanda butuh terpasang. Anggota lain akan melihat titik emas.' : 'Tanda butuh dilepas.');
        if (segarkan) segarkan();
      };
    });
  }

  function teksUndangan(namaTamu, e) {
    var tempat = e.mode === 'Online' ? 'secara online lewat ' + (e.lokasi || 'Zoom') : 'di ' + (e.lokasi || 'lokasi yang akan dikabari');
    return 'Halo ' + namaTamu + ', saya ' + S.profil.nama_depan + ' dari BNI ' + S.atur.nama_chapter + '. ' +
      'Saya ingin mengundang ke ' + e.nama_acara + ' hari ' + tglHari(e.tanggal) + ' pukul ' + e.jam_mulai + ', ' + tempat + '. ' +
      'Ini forum pemilik bisnis yang saling membuka peluang. ' +
      (S.atur.tautan_form ? 'Pendaftarannya singkat, di sini: ' + S.atur.tautan_form : '');
  }

  function lembarKirim(namaTamu, wa, e) {
    var norm = String(wa || '').replace(/\D/g, '').replace(/^0/, '62');
    bukaLembar(
      '<div style="text-align:center;padding:8px 0 4px"><div class="lencana dapat" style="font-size:13px"><div class="koin">' + IK.L_UNDANGAN_PERTAMA + '</div></div>' +
      '<h2>Undangan tercatat</h2><p class="kecil" style="margin:6px 0 16px">Langkah terakhir: kirim pesannya ke ' + esc(namaTamu) + '.</p></div>' +
      '<a class="tombol" target="_blank" rel="noopener" href="' + esc(waLink(norm, teksUndangan(namaTamu, e))) + '">Kirim lewat WhatsApp</a>' +
      '<div class="baris-tombol"><button class="tombol kedua" data-tutup>Nanti saja</button></div>',
      function (el) { el.querySelector('[data-tutup]').onclick = tutupLembar; }
    );
  }

  /* ---------- UNDANG ---------- */
  async function layarUndang(isi) {
    var h = await Promise.all([api('beranda'), api('usulanSaya'), api('undanganSaya'), api('acara')]);
    var b = h[0], us = h[1], ud = h[2], ac = h[3];
    if (!b.ok) { isi.innerHTML = '<p class="kosong-isi">' + esc(b.pesan) + '</p>'; return; }
    var acara = (ac.acara || []).filter(function (e) { return e.jenis === 'BOD' || e.jenis === 'Lunch Networking'; }).slice(0, 4);
    var html = '<div class="sapa"><h1>Undang</h1><p class="kecil">Satu undangan per pekan. Tamu boleh diundang paling banyak dua kali.</p></div>' +
      kartuRonde(b) + kartuDaftar(b.saya) +
      '<div class="judul-bagian"><h2>Nama usulan saya</h2><span class="kecil">' + us.usulan.length + '</span></div>' +
      '<section class="kartu">' + (us.usulan.length ? '<ul class="daftar">' + us.usulan.map(function (u) {
        var bisa = u.jumlah_undangan < 2 && u.tahap !== 'Anggota';
        return '<li><div class="utama"><b>' + esc(u.nama) + '</b><span>' + esc(u.bidang) + ' · diundang ' + u.jumlah_undangan + '/2</span></div>' +
          (bisa ? '<button class="tombol kecil" data-undang="' + esc(u.id_orang) + '" data-wa="' + (u.punya_wa ? 1 : 0) + '" data-nama="' + esc(u.nama) + '">Undang</button>' : '<span class="chip">' + esc(u.tahap === 'Anggota' ? 'Anggota' : 'Batas 2 kali') + '</span>') + '</li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Belum ada nama. Mulai dari Papan Kursi: ketuk kursi kosong dan masukkan satu nama.</p>') + '</section>' +
      '<div class="judul-bagian"><h2>Undangan saya</h2></div>' +
      '<section class="kartu">' + (ud.undangan.length ? '<ul class="daftar">' + ud.undangan.map(function (u) {
        var warna = u.status === 'Bergabung' ? 'emas' : u.status === 'Hadir' ? 'hijau' : u.status === 'Batal' ? '' : 'merah';
        return '<li><div class="utama"><b>' + esc(u.nama_depan) + '</b><span>' + esc(u.acara) + ' · ' + esc(tglPendek(u.tanggal)) + '</span></div><span class="chip ' + warna + '">' + esc(u.status) + '</span></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Belum ada undangan.</p>') + '</section>';
    isi.innerHTML = html;
    isi.querySelectorAll('[data-undang]').forEach(function (t) {
      t.onclick = function () { lembarUndang(t.dataset.undang, t.dataset.nama, t.dataset.wa === '1', acara, function () { layarUndang(isi); }); };
    });
  }

  function lembarUndang(id, nama, punyaWa, acara, segarkan) {
    if (!acara.length) return toast('Belum ada acara Rabu yang terbuka.');
    bukaLembar(
      '<h2 style="margin-bottom:12px">Undang ' + esc(nama.split(/\s+/)[0]) + '</h2>' +
      '<form id="f-und"><p class="kecil" style="margin-bottom:8px">Pilih acara</p><div class="pilihan" style="margin-bottom:14px">' + acara.map(function (e, i) {
        return '<button type="button" data-ev="' + esc(e.id_event) + '" aria-pressed="' + (i === 0) + '">' + esc(e.jenis === 'BOD' ? 'BOD' : 'Lunch') + ' · ' + esc(tglPendek(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</button>';
      }).join('') + '</div>' +
      (punyaWa ? '' : '<label class="isian"><span>WhatsApp ' + esc(nama.split(/\s+/)[0]) + '</span><input name="whatsapp" inputmode="tel" required placeholder="08..."></label>') +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Catat undangan</button></form>',
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
        return '<li class="peringkat-' + (i + 1) + (r.saya ? ' saya' : '') + '"><span class="lambang">' + (i + 1) + '</span><div class="utama"><b>' + esc(r.nama_depan) + (r.saya ? ' <span class="chip merah">saya</span>' : '') + '</b></div><span class="nilai">' + r.jumlah + '</span><span class="kecil">' + satuan + '</span></li>';
      }).join('') + '</ul>';
    }
    isi.innerHTML = '<div class="sapa"><h1>Papan</h1><p class="kecil">Ini permainan, bukan tingkatan. Kehadiran tidak dilombakan karena itu syarat.</p></div>' +
      '<div class="tab" role="tablist"><button role="tab" data-tab="pengundang" aria-selected="' + (tabPapan === 'pengundang') + '">Pengundang ronde ini</button><button role="tab" data-tab="sponsor" aria-selected="' + (tabPapan === 'sponsor') + '">Dinding sponsor</button></div>' +
      (tabPapan === 'pengundang'
        ? '<section class="kartu">' + daftar(p.pengundang, 'undangan', 'Belum ada undangan di ronde ini. Peluang terbuka untuk jadi yang pertama.') + '</section><p class="catatan-main">Ronde berakhir ' + esc(tglHari(b.ronde.selesai)) + ' pukul 23.59. Papan mulai dari nol setiap Kamis.</p>'
        : '<section class="kartu">' + daftar(p.sponsor, 'anggota', 'Belum ada sponsor. Anggota yang membawa anggota baru tercatat di sini selamanya.') + '</section><p class="catatan-main">Dinding sponsor tidak pernah direset.</p>');
    isi.querySelectorAll('[data-tab]').forEach(function (t) { t.onclick = function () { tabPapan = t.dataset.tab; layarPapan(isi); }; });
  }

  /* ---------- TIM (LT dan LDC) ---------- */
  function layarTim(isi, sub) {
    var tabs = [['calon', 'Calon']];
    if (!fasePra()) tabs.push(['rabu', 'Check-in']);
    tabs.push(['regroup', 'Regroup']);
    if (isLDC()) tabs.push(['ringkas', 'Ringkas']);
    var aktif = tabs.some(function (t) { return t[0] === sub; }) ? sub : 'calon';
    isi.innerHTML = '<div class="tab" role="tablist">' + tabs.map(function (t) {
      return '<button role="tab" data-sub="' + t[0] + '" aria-selected="' + (t[0] === aktif) + '">' + t[1] + '</button>';
    }).join('') + '</div><div id="sub"><div class="muat"></div></div>';
    isi.querySelectorAll('[data-sub]').forEach(function (t) { t.onclick = function () { location.hash = '#tim-' + t.dataset.sub; }; });
    var wadah = isi.querySelector('#sub');
    ({ calon: subCalon, rabu: subRabu, regroup: subRegroup, ringkas: subRingkas })[aktif](wadah);
  }

  var semuaCalon = false;
  async function subCalon(w) {
    var h = await Promise.all([api('calonSaya', { semua: semuaCalon }), api('jadwalCS')]);
    var r = h[0], cs = h[1];
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var html = '';
    if (cs.ok && cs.cs.length) {
      html += '<div class="judul-bagian" style="margin-top:4px"><h2>Coffee session mendatang</h2><span class="kecil">' + cs.cs.length + '</span></div><section class="kartu"><ul class="daftar">' + cs.cs.map(function (c) {
        return '<li><div class="jam-cs"><b>' + esc(jamCS(c.jadwal_cs).jam) + '</b><span>' + esc(jamCS(c.jadwal_cs).hari) + '</span></div><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(c.bidang) + ' · PIC ' + esc(c.pic) + '</span></div>' +
          (c.whatsapp ? '<a class="tombol kecil kedua" target="_blank" rel="noopener" href="' + esc(waLink(c.whatsapp)) + '">WA</a>' : '') + '</li>';
      }).join('') + '</ul></section>';
    }
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px"><h2>' + (semuaCalon ? 'Semua calon' : 'Calon saya') + ' <span class="redup">' + r.calon.length + '</span></h2>' +
      (isLDC() ? '<button class="tombol teks" id="b-semua">' + (semuaCalon ? 'Hanya milik saya' : 'Lihat semua') + '</button>' : '') + '</div>' +
      '<input class="cari" id="cari" placeholder="Cari nama atau bidang" type="search">' +
      '<section class="kartu">' + (r.calon.length ? '<ul class="daftar" id="dc">' + r.calon.map(function (c) {
        return '<li data-cari="' + esc((c.nama + ' ' + c.bidang).toLowerCase()) + '"><button class="ketuk" data-calon="' + esc(c.id_orang) + '"><span class="lambang">' + inisial(c.nama) + '</span><div class="utama"><b>' + esc(c.nama) + '</b><span>' + esc(c.bidang) + (semuaCalon ? ' · PIC ' + esc(c.pic) : '') + '</span></div>' +
          '<span style="text-align:right"><span class="chip' + (c.tahap === 'CS' ? ' emas' : '') + '">' + esc(c.tahap === 'CS' && c.jadwal_cs ? 'CS ' + jamCS(c.jadwal_cs).pendek : c.tahap) + '</span><br><span class="kecil ' + (c.hari_diam >= 7 ? '' : 'redup') + '" style="' + (c.hari_diam >= 7 ? 'color:var(--merah);font-weight:700' : '') + '">' + (c.hari_diam ? c.hari_diam + ' hari diam' : 'hari ini') + '</span></span></button></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Belum ada calon. Tambahkan dari Papan Kursi.</p>') + '</section>';
    w.innerHTML = html;
    var bs = w.querySelector('#b-semua');
    if (bs) bs.onclick = function () { semuaCalon = !semuaCalon; subCalon(w); };
    w.querySelector('#cari').oninput = function (e) {
      var q = e.target.value.toLowerCase();
      w.querySelectorAll('[data-cari]').forEach(function (li) { li.hidden = q && li.dataset.cari.indexOf(q) < 0; });
    };
    w.querySelectorAll('[data-calon]').forEach(function (t) {
      t.onclick = function () { lembarCalon(r.calon.filter(function (c) { return c.id_orang === t.dataset.calon; })[0], function () { subCalon(w); }); };
    });
  }

  async function lembarCalon(c, segarkan) {
    var tahap = ['Dihubungi', 'Tertarik', 'CS', 'Bimbang', 'Tidak Lanjut', 'Parkir'];
    if (!c.id_kursi && !S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    bukaLembar(
      '<div class="tajuk"><span class="lambang" style="width:52px;height:52px;font-size:20px">' + inisial(c.nama) + '</span><div><p class="kecil">' + esc(c.bidang) + '</p><h2>' + esc(c.nama) + '</h2>' + (c.bisnis ? '<p class="kecil">' + esc(c.bisnis) + '</p>' : '') + '</div></div>' +
      (c.whatsapp ? '<a class="tombol kedua" target="_blank" rel="noopener" href="' + esc(waLink(c.whatsapp)) + '" style="margin-bottom:14px">Chat WhatsApp</a>' : '') +
      '<form id="f-tl"><p class="kecil" style="margin-bottom:8px">Tahap sekarang: <b>' + esc(c.tahap) + '</b>. Ubah menjadi:</p>' +
      '<div class="pilihan" style="margin-bottom:14px">' + tahap.map(function (t) {
        return '<button type="button" data-tahap="' + t + '" aria-pressed="' + (t === c.tahap) + '">' + t + '</button>';
      }).join('') + '</div>' +
      '<label class="isian" id="isi-cs"' + (c.tahap === 'CS' ? '' : ' hidden') + '><span>Jadwal coffee session</span><input type="datetime-local" name="jadwal_cs" value="' + esc(nilaiLokal(c.jadwal_cs)) + '"></label>' +
      (c.id_kursi ? '' : pilihKursiKosong('id_kursi', false)) +
      '<label class="isian"><span>Catatan singkat (opsional)</span><textarea name="catatan" placeholder="Contoh: minta dihubungi lagi setelah tanggal 15"></textarea></label>' +
      '<p class="pesan-salah" id="salah" hidden></p>' +
      '<button class="tombol" type="submit">Simpan tindak lanjut</button></form>' +
      '<div class="baris-tombol"><button class="tombol kedua" id="b-anggota">Jadikan anggota</button></div>',
      function (el) {
        var pilih = c.tahap;
        el.querySelectorAll('[data-tahap]').forEach(function (b) {
          b.onclick = function () {
            pilih = b.dataset.tahap;
            el.querySelectorAll('[data-tahap]').forEach(function (z) { z.setAttribute('aria-pressed', z === b); });
            el.querySelector('#isi-cs').hidden = pilih !== 'CS';
          };
        });
        el.querySelector('#f-tl').onsubmit = async function (e) {
          e.preventDefault();
          if (TAHAP_VALID.indexOf(pilih) < 0) { var s0 = el.querySelector('#salah'); s0.textContent = 'Pilih tahap barunya.'; s0.hidden = false; return; }
          var jcs = e.target.jadwal_cs.value;
          var r = await api('tindakLanjut', { id_orang: c.id_orang, tahap: pilih, catatan: e.target.catatan.value, jadwal_cs: jcs ? new Date(jcs).toISOString() : '', id_kursi: e.target.id_kursi ? e.target.id_kursi.value : '' });
          if (!r.ok) { var s = el.querySelector('#salah'); s.textContent = r.pesan; s.hidden = false; return; }
          tutupLembar(); toast(c.nama.split(/\s+/)[0] + ' sekarang ' + r.tahap); S.cache.kursi = null; segarkan();
        };
        el.querySelector('#b-anggota').onclick = function () { lembarAnggota(c, segarkan); };
      });
  }
  var TAHAP_VALID = ['Dihubungi', 'Tertarik', 'CS', 'Bimbang', 'Tidak Lanjut', 'Parkir'];

  async function lembarAnggota(c, segarkan) {
    bukaLembar('<div class="muat"></div>');
    var r = await api('anggota');
    if (!c.id_kursi && !S.cache.kursi) { var kr = await api('kursi'); if (kr.ok) S.cache.kursi = kr.baris; }
    var opsi = '<option value="">Pilih sponsor</option><option value="BNI">BNI (tidak ada member yang dikenal secara pribadi)</option>' +
      (r.anggota || []).map(function (a) { return '<option value="' + esc(a.id_orang) + '">' + esc(a.nama) + '</option>'; }).join('');
    bukaLembar(
      '<h2>Jadikan ' + esc(c.nama.split(/\s+/)[0]) + ' anggota</h2><p class="kecil" style="margin:6px 0 14px">Kursi: <b>' + esc(c.bidang) + '</b>. Jenis: ' + (fasePra() ? 'Founding' : 'Core Group') + '.</p>' +
      '<form id="f-ang">' + (c.id_kursi ? '' : pilihKursiKosong('id_kursi', true)) + '<label class="isian"><span>Sponsor</span><select name="sponsor" required>' + opsi + '</select></label>' +
      '<p class="kecil" style="margin:-4px 0 14px">Aturan BNI: sponsor adalah member yang mengundang dan dikenal calon secara pribadi. Kalau tidak ada, pilih BNI, kecuali calon sendiri menunjuk member tertentu.</p>' +
      '<p class="pesan-salah" id="salah" hidden></p><button class="tombol" type="submit">Resmikan</button></form>',
      function (el) {
        el.querySelector('#f-ang').onsubmit = async function (e) {
          e.preventDefault();
          var h = await api('jadikanAnggota', { id_orang: c.id_orang, id_sponsor: e.target.sponsor.value, id_kursi: e.target.id_kursi ? e.target.id_kursi.value : c.id_kursi });
          if (!h.ok) { var s = el.querySelector('#salah'); s.textContent = h.pesan; s.hidden = false; return; }
          tutupLembar(); toast(c.nama.split(/\s+/)[0] + ' resmi mengisi kursi ' + h.kursi, true); segarkan();
        };
      });
  }

  var acaraRabu = '';
  async function subRabu(w) {
    var ac = await api('acara');
    var daftarAc = (ac.acara || []);
    if (!daftarAc.length) { w.innerHTML = '<p class="kosong-isi">Belum ada acara terbuka di tab Events.</p>'; return; }
    if (!daftarAc.some(function (e) { return e.id_event === acaraRabu; })) acaraRabu = daftarAc[0].id_event;
    var r = await api('daftarHadir', { id_event: acaraRabu });
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var urut = { Visitor: 0, Anggota: 1, LT: 2 };
    r.orang.sort(function (a, b) { return urut[a.peran] - urut[b.peran] || (a.nama < b.nama ? -1 : 1); });
    var jumlah = r.orang.filter(function (o) { return o.hadir; }).length;
    w.innerHTML = '<label class="isian"><span>Acara</span><select id="pil-ev">' + daftarAc.slice(0, 8).map(function (e) {
        return '<option value="' + esc(e.id_event) + '"' + (e.id_event === acaraRabu ? ' selected' : '') + '>' + esc(e.nama_acara) + ' · ' + esc(tglHari(e.tanggal)) + ' ' + esc(e.jam_mulai) + '</option>';
      }).join('') + '</select></label>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin:4px 2px 10px"><h2>Daftar hadir</h2><span class="kecil"><b id="jml">' + jumlah + '</b> hadir</span></div>' +
      '<input class="cari" id="cari" placeholder="Cari nama" type="search">' +
      '<section class="kartu"><ul class="daftar">' + r.orang.map(function (o) {
        return '<li data-cari="' + esc(o.nama.toLowerCase()) + '"><div class="utama"><b>' + esc(o.nama) + '</b><span>' + esc(o.peran === 'Visitor' ? 'Tamu' + (o.pengundang ? ', diundang ' + o.pengundang : '') : o.peran) + '</span></div><button class="hadir-saklar" data-o="' + esc(o.id_orang) + '" aria-pressed="' + o.hadir + '" aria-label="Hadir ' + esc(o.nama) + '"></button></li>';
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
      '<div class="judul-bagian"><h2>Nama per launch team</h2><span class="kecil">target ' + (r.lt[0] ? r.lt[0].target : 20) + '</span></div>' +
      '<section class="kartu">' + r.lt.map(function (x) {
        return '<div class="baris-bilah' + (x.nama_depan === S.profil.nama_depan ? ' saya' : '') + '"><span>' + esc(x.nama_depan) + '</span><div class="bilah' + (x.total >= x.target ? ' emas' : '') + '"><i style="width:' + Math.min(100, x.total / x.target * 100) + '%"></i></div><b>' + x.total + '<span class="redup" style="font-weight:400;font-size:12px"> +' + x.ronde + '</span></b></div>';
      }).join('') + '<p class="catatan-main">Angka kecil: nama baru pekan ini. Ambang sehat minimal 3 per pekan.</p></section>' +
      '<section class="kartu" style="display:flex;align-items:center;gap:14px"><b style="font-family:var(--huruf-judul);font-size:34px">' + r.kursi_tanpa_calon + '</b><div><h3>Kursi tanpa calon</h3><p class="kecil">Saring "Kosong" di Papan Kursi untuk melihatnya.</p></div><a href="#kursi" class="tombol kecil kedua" style="margin-left:auto">Buka</a></section>' +
      '<div class="judul-bagian"><h2>Calon diam 7 hari lebih</h2><span class="kecil">' + r.calon_diam.length + '</span></div>' +
      '<section class="kartu">' + (r.calon_diam.length ? '<ul class="daftar">' + r.calon_diam.map(function (c) {
        return '<li><div class="utama"><b>' + esc(c.nama) + '</b><span>PIC ' + esc(c.pic) + '</span></div><span class="chip merah">' + c.hari + ' hari</span></li>';
      }).join('') + '</ul>' : '<p class="kosong-isi">Semua calon tersentuh dalam sepekan terakhir.</p>') + '</section>';
  }

  async function subRingkas(w) {
    var r = await api('ringkas');
    if (!r.ok) { w.innerHTML = '<p class="kosong-isi">' + esc(r.pesan) + '</p>'; return; }
    var a = r.angka;
    var sel = [
      [a.anggota + '/' + a.target, 'anggota menuju target fase'], [a.calon_aktif, 'calon aktif'],
      [a.nama_baru_ronde, 'nama baru pekan ini'], [a.cs_ronde, 'CS pekan ini'],
      [a.undangan_ronde, 'undangan pekan ini'], [a.persen_mengundang + '%', 'anggota yang mengundang'],
      [a.anggota_baru_ronde, 'anggota baru pekan ini'], [a.kursi_tanpa_calon, 'kursi tanpa calon']
    ];
    var nyala = r.peringatan.filter(function (p) { return p.menyala; }).length;
    w.innerHTML = '<div class="kisi-angka">' + sel.map(function (s) { return '<div class="stat"><b>' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join('') + '</div>' +
      '<div class="judul-bagian"><h2>Lampu peringatan</h2><span class="kecil">' + nyala + ' menyala</span></div>' +
      '<section class="kartu"><ul class="peringatan">' + r.peringatan.map(function (p) {
        return '<li class="' + (p.menyala ? 'menyala' : '') + '"><span class="lampu"></span><span>' + esc(p.teks) + '</span></li>';
      }).join('') + '</ul><p class="catatan-main">Lampu yang menyala adalah bahan regroup, bukan untuk dirapikan sendiri.</p></section>';
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
