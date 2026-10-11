const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  async function run(code, fase, hashes, seat) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(code + ' pageerror ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL_CONNECTION_FAILED|ERR_/.test(m.text())) errs.push(code + ' console ' + m.text()); });
    await p.goto('http://localhost:8765/web/index.html?reset=1&fase=' + fase);
    await p.fill('input[name=kode]', code);
    await p.click('button[type=submit]');
    await p.waitForSelector('nav.nav');
    for (const h of hashes) {
      await p.evaluate(h => location.hash = h, h);
      await p.waitForTimeout(500);
      const t = await p.innerText('#isi');
      if (/undefined|NaN|\[object/.test(t)) errs.push(code + ' ' + h + ' bad text');
      console.log(code, h, JSON.stringify(t.slice(0, 110)));
    }
    if (seat) {
      await p.evaluate(() => location.hash = '#kursi'); await p.waitForTimeout(500);
      await p.click('button.kursi.ada_calon');
      await p.waitForTimeout(500);
      console.log('SHEET', JSON.stringify((await p.innerText('.lembar-isi')).slice(0, 300)));
    }
    await ctx.close();
  }
  await run('LT0001', 'Pembentukan', ['#misi', '#kursi', '#tim', '#tim-regroup'], true);
  await run('AGT001', 'BOD', ['#misi', '#kursi', '#undang', '#papan'], true);
  await run('LDC001', 'BOD', ['#misi', '#undang', '#papan', '#tim', '#tim-rabu', '#tim-regroup', '#tim-ringkas'], false);
  console.log('ERRORS', errs);
  await b.close();
})();
