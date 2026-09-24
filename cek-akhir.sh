#!/usr/bin/env bash
# Cari sisa sebutan yang tepat, lalu uji ulang web app setelah jeda (Apps Script suka menyimpan singgahan).
set -u
AS="/d/Hermes Work/_studi/optima-kerja/apps-script"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"

echo "=== 1. Potongan persis di sekitar sebutan yang tersisa ==="
grep -o -i ".\{40\}ventura.\{40\}" "$AS/Main.html" | head -3

echo
echo "=== 2. Berkas mana yang sudah mengandung Optima dan tagline ==="
grep -c "Optima" "$AS/Main.html" "$AS/Code.js" 2>/dev/null
grep -c "Optimal Results" "$AS/Main.html" 2>/dev/null

echo
echo "=== 3. Tunggu lalu uji ulang web app ==="
sleep 75
env -u PYTHONPATH "$V" - <<'PY'
import re, urllib.error, urllib.request
u = "https://script.google.com/macros/s/AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ/exec?pemeriksaan=1"
try:
    t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"}), timeout=90).read().decode("utf-8", "replace")
    j = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
    print("  judul halaman:", (j.group(1).strip()[:40] if j else "-"))
    print("  menyebut Optima:", "optima" in t.lower(), "| menyebut Ventura:", "ventura" in t.lower())
    print("  tagline tampil:", "Optimal Results" in t)
except urllib.error.HTTPError as e:
    print("  HTTP", e.code)
PY
