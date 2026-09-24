#!/usr/bin/env bash
# Periksa status Pages dan sebab sebenarnya web app menolak.
set -u
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
echo "=== 1. Sebab penolakan web app ==="
env -u PYTHONPATH "$V" - <<'PY'
import re, urllib.error, urllib.request
u = "https://script.google.com/macros/s/AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ/exec"
try:
    t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "replace")
    print("  HTTP 200 | panjang", len(t))
except urllib.error.HTTPError as e:
    isi = e.read().decode("utf-8", "replace")
    judul = re.search(r"<title[^>]*>(.*?)</title>", isi, re.S | re.I)
    print("  HTTP", e.code, "| judul pesan:", (judul.group(1).strip()[:70] if judul else "-"))
    for kata in ["need permission", "authorization", "Sorry, unable", "sign in", "izin"]:
        if kata.lower() in isi.lower():
            print("   menyebut:", kata)
PY
echo
echo "=== 2. Status GitHub Pages ==="
env -u PYTHONPATH "$V" - <<'PY'
import json, pathlib, re, urllib.error, urllib.request
raw = pathlib.Path("C:/Users/Lenovo/.git-credentials").read_text(encoding="utf-8", errors="ignore").strip()
token = re.match(r"https://([^:]+):([^@]+)@", raw).group(2)
def gh(j):
    rq = urllib.request.Request("https://api.github.com" + j, headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "Hermes"})
    try:
        with urllib.request.urlopen(rq, timeout=90) as r: return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"error": e.code}
p = gh("/repos/Mitologian/optima/pages")
print("  alamat:", p.get("html_url"), "| status:", p.get("status"), "| sumber:", (p.get("source") or {}).get("branch"))
b = gh("/repos/Mitologian/optima/pages/builds/latest")
print("  pembangunan terakhir:", b.get("status"), "| selesai:", b.get("updated_at"))
PY
echo
echo "=== 3. Uji halaman PWA di GitHub Pages ==="
env -u PYTHONPATH "$V" - <<'PY'
import re, urllib.error, urllib.request
try:
    t = urllib.request.urlopen(urllib.request.Request("https://mitologian.github.io/optima/", headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "replace")
    j = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
    print("  HTTP 200 | judul:", (j.group(1).strip()[:40] if j else "-"))
    m = re.search(r'src="(https://script\.google\.com/macros/s/[^"]+)"', t)
    print("  iframe menunjuk ke:", (m.group(1)[:64] + "..." if m else "tidak ditemukan"))
except urllib.error.HTTPError as e:
    print("  HTTP", e.code, "(Pages biasanya perlu satu sampai dua menit setelah dinyalakan)")
PY
