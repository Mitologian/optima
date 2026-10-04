/* Klien API. Satu pintu: Api.panggil(action, data). Kode akses ditambahkan otomatis. */
var Api = (function () {
  var kode = '';
  function setKode(k) { kode = k || ''; }

  async function panggil(action, data) {
    var badan = Object.assign({ action: action, kode: kode }, data || {});
    if (!CONFIG.API_URL) return Tiruan.panggil(badan);
    var res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(badan),
        redirect: 'follow'
      });
    } catch (e) {
      return { ok: false, pesan: 'Tidak tersambung ke internet. Coba lagi.' };
    }
    try { return await res.json(); }
    catch (e) { return { ok: false, pesan: 'Server membalas tidak wajar. Coba lagi sebentar.' }; }
  }

  return { panggil: panggil, setKode: setKode, tiruan: !CONFIG.API_URL };
})();
