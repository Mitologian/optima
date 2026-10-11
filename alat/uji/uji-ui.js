const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [fase, kode] of [['Pembentukan','LT0001'],['BOD','AGT001']]) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push(m.text()));
    await p.goto('http://localhost:8765/web/index.html?fase=' + fase);
    await p.fill('input.kode', kode); await p.click('button[type=submit]'); await p.waitForTimeout(1200);
    await p.screenshot({ path: `${process.argv[2]}/ui-${fase}-misi.png`, fullPage: true });
    await p.goto('http://localhost:8765/web/index.html?fase=' + fase + '#kursi'); await p.waitForTimeout(1000);
    await p.screenshot({ path: `${process.argv[2]}/ui-${fase}-kursi.png`, fullPage: true });
  }
  console.log('errors:', JSON.stringify(errs)); await b.close();
})();
