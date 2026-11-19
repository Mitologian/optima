// Uji sponsor rencana (pengundang berbeda dari sponsor, khusus LDC) dengan adaptor memori dari web/tiruan.js.
// Jalankan dari akar repo: node tests/uji-sponsor.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const akar = path.join(__dirname, '..');
const ctx = { console, setTimeout, localStorage: { getItem() { return null; }, setItem() {} }, location: { search: '' }, URLSearchParams, fetch: undefined,
  CONFIG: { CSV_TEKS: fs.readFileSync(path.join(akar, 'data/klasifikasi-awal.csv'), 'utf8') } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'apps-script/Inti.js'), 'utf8') + '\nthis.Inti = Inti;', ctx);
vm.runInContext(fs.readFileSync(path.join(akar, 'web/tiruan.js'), 'utf8') + '\nthis.Tiruan = Tiruan;', ctx);
(async () => {
  const T = ctx.Tiruan, call = (kode, action, extra) => T.panggil(Object.assign({ action, kode }, extra || {}));
  let ok = 0, gagal = 0;
  const cek = (nama, kondisi, info) => { if (kondisi) ok++; else { gagal++; console.log('GAGAL', nama, info || ''); } };
  const kursi = (await call('LDC001', 'kursi')).baris.flatMap(b => b.kursi || b).filter(k => k.status === 'kosong');
  const idKursi = i => kursi[i].id_kursi;
  const ang = (await call('LDC001', 'anggota'));
  const idMember = ang.anggota[0].id_orang;

  let r = await call('LDC001', 'tambahCalon', { nama: 'Calon Satu', bisnis: 'Katering', whatsapp: '0813 9000 0001', id_kursi: idKursi(0), sponsor_rencana: 'Luar: Budi Santoso (BNI Garuda)' });
  cek('LDC menambah calon dengan sponsor orang luar dan chapter', r.ok, JSON.stringify(r));
  const id1 = r.id_orang;
  r = await call('LDC001', 'calonSaya', { semua: true });
  let c1 = r.calon.find(c => c.id_orang === id1);
  cek('calonSaya membawa nama sponsor dan isian awal', c1 && c1.sponsor_nama === 'Budi Santoso (BNI Garuda)' && c1.sponsor_default === 'Luar: Budi Santoso (BNI Garuda)', JSON.stringify(c1));

  r = await call('AGT001', 'tambahCalon', { nama: 'Calon Anggota', bisnis: 'Foto', whatsapp: '0813 9000 0002', sponsor_rencana: 'BNI' });
  cek('anggota tidak boleh mengatur sponsor berbeda', !r.ok && /LDC/.test(r.pesan), JSON.stringify(r));
  r = await call('LT0001', 'tambahCalon', { nama: 'Calon LT', bisnis: 'Foto', whatsapp: '0813 9000 0003', sponsor_rencana: 'BNI' });
  cek('LT tidak boleh mengatur sponsor berbeda', !r.ok && /LDC/.test(r.pesan), JSON.stringify(r));
  r = await call('LDC001', 'tambahCalon', { nama: 'Calon Salah', bisnis: 'X', whatsapp: '0813 9000 0004', sponsor_rencana: 'P9999' });
  cek('sponsor yang bukan member ditolak', !r.ok, JSON.stringify(r));

  r = await call('LDC001', 'tambahCalon', { nama: 'Calon Dua', bisnis: 'Desain', whatsapp: '0813 9000 0005', sponsor_rencana: 'BNI' });
  cek('sponsor BNI Indonesia diterima', r.ok);
  const id2 = r.id_orang;
  r = await call('LDC001', 'tambahCalon', { nama: 'Calon Tiga', bisnis: 'Kopi', whatsapp: '0813 9000 0006', sponsor_rencana: idMember });
  cek('sponsor member chapter diterima', r.ok);
  r = await call('LDC001', 'tambahCalon', { nama: 'Calon Empat', bisnis: 'Roti', whatsapp: '0813 9000 0007' });
  const id4 = r.id_orang;
  r = await call('LDC001', 'calonSaya', { semua: true });
  const c4 = r.calon.find(c => c.id_orang === id4);
  cek('tanpa sponsor berbeda: isian awal mengikuti pengundang', c4 && c4.sponsor_nama === '' && c4.sponsor_default === c4.diajukan_id && c4.diajukan_id, JSON.stringify(c4));

  r = await call('LDC001', 'ubahCalonSaya', { id_orang: id4, sponsor_rencana: 'Luar: Sari (BNI Pelita)' });
  cek('LDC mengubah sponsor calon yang ada', r.ok && r.sponsor_rencana === 'Luar: Sari (BNI Pelita)', JSON.stringify(r));
  r = await call('LDC001', 'ubahCalonSaya', { id_orang: id4, sponsor_rencana: '' });
  cek('LDC mengosongkan sponsor berbeda', r.ok && r.sponsor_rencana === '', JSON.stringify(r));
  r = await call('LT0001', 'ubahCalonSaya', { id_orang: id4, sponsor_rencana: 'BNI' });
  cek('LT tidak boleh mengubah sponsor', !r.ok && /LDC/.test(r.pesan), JSON.stringify(r));

  let tv = await T.tampilan();
  const v1 = tv.visitor.baris.find(b => b[0] === 'Calon Satu'), v4 = tv.visitor.baris.find(b => b[0] === 'Calon Empat');
  const iSp = tv.visitor.kolom.indexOf('Sponsor');
  cek('tab Visitor memuat kolom Sponsor', iSp > 0 && v1 && v1[iSp] === 'Budi Santoso (BNI Garuda)', JSON.stringify(v1));
  cek('tab Visitor: tanpa sponsor berbeda tertulis pengundang', v4 && /\(pengundang\)$/.test(v4[iSp]), JSON.stringify(v4));

  // Joined: sponsor rencana dipakai otomatis, dan kredit jatuh ke sponsor itu
  r = await call('LDC001', 'jadikanAnggota', { id_orang: id1, id_kursi: idKursi(0) });
  cek('jadikanAnggota memakai sponsor rencana tanpa mengisi ulang', r.ok, JSON.stringify(r));
  tv = await T.tampilan();
  const m1 = tv.member.baris.find(b => b[0] === 'Calon Satu');
  cek('tab Member menampilkan sponsor rencana', m1 && m1[tv.member.kolom.indexOf('Sponsor')] === 'Budi Santoso (BNI Garuda)', JSON.stringify(m1));
  r = await call('LDC001', 'jadikanAnggota', { id_orang: id4, id_kursi: idKursi(1) });
  cek('tanpa id_sponsor dan tanpa sponsor rencana: ditolak', !r.ok && /sponsor/i.test(r.pesan), JSON.stringify(r));
  r = await call('LDC001', 'jadikanAnggota', { id_orang: id2, id_kursi: idKursi(1), id_sponsor: idMember });
  cek('sponsor yang dipilih saat join menimpa rencana', r.ok, JSON.stringify(r));

  console.log('lulus', ok, 'gagal', gagal);
  process.exit(gagal ? 1 : 0);
})();
