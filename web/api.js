/* Klien API. Satu pintu: Api.panggil(action, data). Kode akses ditambahkan otomatis. */
var Api = (function () {
  var kode = '';
  var tiruan = !CONFIG.API_URL || /[?&]tiruan=1(&|$)/.test(location.search);
  function setKode(k) { kode = k || ''; }

  async function panggil(action, data) {
    var badan = Object.assign({ action: action, kode: kode }, data || {});
    if (tiruan) return Tiruan.panggil(badan);
    var res;
    try {
      res = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(badan),
        redirect: 'follow'
      });
    } catch (e) {
      return { ok: false, pesan: 'No internet connection. Try again.' };
    }
    try { return await res.json(); }
    catch (e) { return { ok: false, pesan: 'Unexpected server response. Try again shortly.' }; }
  }

  return { panggil: panggil, setKode: setKode, tiruan: tiruan };
})();
