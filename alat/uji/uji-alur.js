const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const out = process.argv[2];
(async () => {
  const b = await chromium.launch(); const errs = [];
  async function sesi(fase, kode, rute, nama) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(nama + ': ' + e.message));
    p.on('console', m => m.type()==='error' && !/TUNNEL/.test(m.text()) && errs.push(nama + ': ' + m.text()));
    await p.goto('http://localhost:8765/web/index.html?fase=' + fase);
    await p.fill('input.kode', kode); await p.click('button[type=submit]'); await p.waitForTimeout(900);
    for (const r of rute) { await p.goto('http://localhost:8765/web/index.html?fase=' + fase + '#' + r); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/alur-${nama}-${r}.png` }); }
    return p;
  }
  await sesi('Pembentukan', 'LT0001', ['misi', 'tim'], 'pra');
  const m = await sesi('BOD', 'AGT001', ['misi', 'undang', 'minggu'], 'member');
  await sesi('BOD', 'LT0001', ['tim-calon', 'tim-rabu'], 'lt');
  const ldc = await sesi('BOD', 'LDC001', ['kursi'], 'ldc');
  await ldc.click('[data-tk=anggota]'); await ldc.waitForTimeout(800); await ldc.screenshot({ path: `${out}/alur-ldc-anggota.png` });
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
