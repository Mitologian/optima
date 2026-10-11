const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const B='http://localhost:8765/web/index.html';
(async()=>{const b=await chromium.launch();const errs=[];const ctx=await b.newContext({viewport:{width:390,height:844}});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&!/TUNNEL/.test(m.text())&&errs.push(m.text()));
const ss=n=>p.screenshot({path:process.argv[2]+'/'+n+'.png'});
// LDC schedule, post-ESM
await p.goto(B+'?fase=BOD');await p.evaluate(()=>localStorage.clear());await p.goto(B+'?fase=BOD');
await p.fill('input.kode','LDC001');await p.click('button[type=submit]');await p.waitForTimeout(800);
await p.goto(B+'?fase=BOD#tim-jadwal');await p.waitForTimeout(800);await ss('k1-jadwal');
await p.click('#b-buka-jam');await p.waitForTimeout(300);await p.click('[data-jam="09:00"]');await p.click('[data-jam="20:00"]');await ss('k2-buka');
await p.click('#f-jam button[type=submit]');await p.waitForTimeout(600);
console.log('after open:', (await p.innerText('#sub')).slice(0,300).replace(/\n/g,' | '));
await p.click('[data-isi]');await p.waitForTimeout(500);await ss('k3-pilih');
await p.click('[data-c]');await p.waitForTimeout(600);await ss('k4-kopi');
for (const k of ['dekat','teman','kenal']) for (let l=0;l<3;l++){ await p.click('[data-dekat='+k+']'); await p.click('#k-langkah [data-langkah="'+l+'"]'); console.log('--',k,l+1,'\n'+await p.inputValue('#k-pesan')); }
await p.click('#k-pesan-slot');await p.waitForTimeout(600);await ss('k5-dipesan');
console.log('info:', await p.innerText('#k-info'));
await p.keyboard.press('Escape');
// member flow
const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push(e.message));
await p2.goto(B+'?fase=BOD');await p2.click('#keluar').catch(()=>{});await p2.waitForTimeout(300);
await p2.evaluate(()=>{for(const k of Object.keys(localStorage)) if(!/tiruan/.test(k)) localStorage.removeItem(k);});await p2.goto(B+'?fase=BOD');
await p2.fill('input.kode','AGT001');await p2.click('button[type=submit]');await p2.waitForTimeout(800);
await p2.evaluate(()=>Api.panggil('tambahCalon',{nama:'Joko Budi',bisnis:'Toko Bangunan',whatsapp:'0812 3456 7890',id_kursi:'K06'}));
await p2.goto(B+'?fase=BOD#undang');await p2.waitForTimeout(800);
await p2.click('[data-undang]');await p2.waitForTimeout(300);await p2.screenshot({path:process.argv[2]+'/k6-pilih.png'});
await p2.click('#p-kopi');await p2.waitForTimeout(600);await p2.screenshot({path:process.argv[2]+'/k7-kopi-anggota.png'});
console.log('member msg2:', (await (async()=>{await p2.click('#k-langkah [data-langkah="1"]');return p2.inputValue('#k-pesan');})()));
await p2.click('#k-pesan-slot');await p2.waitForTimeout(600);
await p2.goto(B+'?fase=BOD#undang');await p2.waitForTimeout(800);await p2.screenshot({path:process.argv[2]+'/k8-mylist.png',fullPage:true});
console.log('mylist:', (await p2.innerText('#isi')).slice(0,600).replace(/\n/g,' | '));
// LDC interviews
await p.evaluate(()=>localStorage.setItem('optima_kode','LDC001'));await p.goto(B+'?fase=BOD#misi');await p.reload();await p.waitForTimeout(800);await p.goto(B+'?fase=BOD#tim-calon');await p.waitForTimeout(800);await ss('k9a');console.log('tim:',(await p.innerText('#isi')).slice(0,200));await p.click('[data-seg=cs]');await p.waitForTimeout(300);await ss('k9-cs');
console.log('cs:', (await p.innerText('#sub')).slice(0,400).replace(/\n/g,' | '));
await p.click('[data-seg=done]');await p.waitForTimeout(300);await ss('k10-done');
console.log('errors',JSON.stringify(errs));await b.close();})();
