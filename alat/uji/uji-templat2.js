const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:390,height:844}});
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/TUNNEL/.test(m.text())&&errs.push(m.text()));
await p.goto('http://localhost:8765/web/index.html?fase=BOD');await p.fill('input.kode','AGT001');await p.click('button[type=submit]');await p.waitForTimeout(900);
await p.evaluate(()=>Api.panggil('tambahCalon',{nama:'Joko Budi',bisnis:'Toko Bangunan',whatsapp:'0812 3456 7890',id_kursi:'K06'}));
await p.goto('http://localhost:8765/web/index.html?fase=BOD#undang');await p.waitForTimeout(900);
await p.evaluate(()=>localStorage.removeItem('optima_tiruan_v6'));await p.reload();await p.waitForTimeout(500);await p.evaluate(()=>Api.panggil('tambahCalon',{nama:'Joko Budi',bisnis:'Toko Bangunan',whatsapp:'0812 3456 7890',id_kursi:'K06'}));await p.reload();await p.waitForTimeout(800);await p.click('[data-undang]');await p.waitForTimeout(300);await p.click('#p-kunjung');await p.waitForTimeout(500);
for (const k of ['dekat','teman','kenal']) for (let l=0;l<4;l++){ await p.click('[data-dekat='+k+']'); await p.click('[data-langkah="'+l+'"]'); console.log('--',k,l+1); console.log(await p.inputValue('#u-pesan')); }
await p.click('#u-bhs'); for (const k of ['teman','kenal']) { await p.click('[data-dekat='+k+']'); await p.click('[data-langkah="1"]'); console.log('-- EN',k); console.log(await p.inputValue('#u-pesan')); }
await p.click('#u-bhs'); await p.click('[data-dekat=kenal]'); await p.click('#u-balasan summary'); await p.waitForTimeout(200);
console.log((await p.innerText('#u-balasan-isi')).slice(0,500));
await p.screenshot({path:process.argv[2]+'/templat3.png'});
console.log('errors',JSON.stringify(errs));await b.close();})();
