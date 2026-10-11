const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
await p.goto('http://localhost:8765/web/index.html?fase=BOD');await p.fill('input.kode','AGT001');await p.click('button[type=submit]');await p.waitForTimeout(1000);
await p.evaluate(()=>document.querySelectorAll('details.lipat').forEach(d=>d.open=true));
const el=await p.$('details.lipat');await el.scrollIntoViewIfNeeded();await el.screenshot({path:process.argv[2]+'/lencana.png'});await b.close();})();
