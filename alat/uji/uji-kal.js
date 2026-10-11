const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const B='http://localhost:8765/web/index.html';
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>errs.push(e.message));
await p.goto(B+'?fase=BOD');await p.evaluate(()=>localStorage.clear());await p.goto(B+'?fase=BOD');
await p.fill('input.kode','AGT001');await p.click('button[type=submit]');await p.waitForTimeout(800);
await p.evaluate(()=>Api.panggil('tambahCalon',{nama:'Joko Budi',bisnis:'Toko Bangunan',whatsapp:'0812 3456 7890',id_kursi:'K06'}));
await p.goto(B+'?fase=BOD#kursi');await p.waitForTimeout(300);await p.goto(B+'?fase=BOD#undang');await p.waitForTimeout(800);
await p.click('[data-undang]');await p.waitForTimeout(300);await p.click('#p-kunjung');await p.waitForTimeout(500);
await p.screenshot({path:process.argv[2]+'/c1-acara.png'});
const tgls=await p.$$eval('#u-ev .kal-grid button.ada',x=>x.map(b=>b.dataset.tgl));console.log('event days',tgls);
await p.click('#u-ev [data-tgl="'+tgls[1]+'"]');await p.waitForTimeout(200);
await p.click('#u-ev [data-key]:nth-child(2)');await p.waitForTimeout(200);
await p.click('#u-langkah [data-langkah="1"]');console.log(await p.inputValue('#u-pesan'));
await p.click('[data-geser="1"]');await p.waitForTimeout(200);await p.screenshot({path:process.argv[2]+'/c2-bulan.png'});
await p.click('#u-salin');await p.waitForTimeout(500);console.log('locked:', await p.innerText('#u-ev'));
await p.keyboard.press('Escape');await p.goto(B+'?fase=BOD#kursi');await p.waitForTimeout(300);await p.goto(B+'?fase=BOD#undang');await p.waitForTimeout(800);
// coffee for Rika? use add new
await p.evaluate(()=>Api.panggil('tambahCalon',{nama:'Sari Ayu',bisnis:'Bakery',whatsapp:'0812 9999 1111',id_kursi:''}));
await p.goto(B+'?fase=BOD#kursi');await p.waitForTimeout(300);await p.goto(B+'?fase=BOD#undang');await p.waitForTimeout(800);
await p.click('[data-undang]');await p.waitForTimeout(300);await p.click('#p-kopi');await p.waitForTimeout(600);
await p.screenshot({path:process.argv[2]+'/c3-kopi.png'});
const d=await p.$$eval('#k-slot .kal-grid button.ada',x=>x.map(b=>b.dataset.tgl));console.log('slot days',d);
await p.click('#k-slot [data-tgl="'+d[1]+'"]');await p.waitForTimeout(200);await p.click('#k-slot [data-key]');await p.waitForTimeout(200);
await p.click('#k-langkah [data-langkah="1"]');console.log(await p.inputValue('#k-pesan'));
await p.screenshot({path:process.argv[2]+'/c4-kopi2.png'});
// members list
await p.goto(B+'?fase=BOD#kursi');await p.waitForTimeout(600);
console.log('errors',JSON.stringify(errs));await b.close();})();
