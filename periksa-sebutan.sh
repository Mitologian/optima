#!/usr/bin/env bash
# Periksa semua sebutan Ventura di kode dan isi tab sheet Optima sebelum dibersihkan.
set -u
AS="/d/Hermes Work/_studi/optima-kerja/apps-script"
cd "$AS" || exit 1

echo "=== 1. Sebutan Ventura per berkas ==="
grep -c -i ventura Code.js Main.html Admin.html Member.html Dashboard_v2.html appsscript.json 2>/dev/null

echo
echo "=== 2. Isinya (dipotong 100 huruf per baris) ==="
grep -n -i ventura Code.js Admin.html Member.html Dashboard_v2.html appsscript.json 2>/dev/null | cut -c1-120

echo
echo "=== 3. Di Main.html, hanya baris yang mengandung ventura (dipotong) ==="
grep -n -i ventura Main.html 2>/dev/null | cut -c1-120 | head -20

echo
echo "=== 4. Cek rujukan ke id deployment atau url Ventura di dalam kode ==="
grep -n -iE "AKfycbzcEW7R|macros/s/AKfycbz" Code.js Main.html Admin.html Member.html Dashboard_v2.html appsscript.json 2>/dev/null | cut -c1-140

echo
echo "=== 5. Isi tab sheet Optima sekarang ==="
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
env -u PYTHONPATH "$V" - <<'PY'
import sys
sys.path.insert(0, "D:/Hermes Work/_scripts")
try:
    import ipv4_dulu  # noqa
except ImportError:
    pass
import jalur_pesan as jp
from googleapiclient.discovery import build
d = jp.drive()
sh = build("sheets", "v4", credentials=d._http.credentials, cache_discovery=False)
SID = "1lr7wQp5a_LPxK2wpwYRzgTcrHiexO2jvr-c0UBeX-t4"
meta = sh.spreadsheets().get(spreadsheetId=SID, fields="sheets.properties.title").execute()
for s in meta["sheets"]:
    nama = s["properties"]["title"]
    r = sh.spreadsheets().values().get(spreadsheetId=SID, range=f"'{nama}'!A1:Z500").execute().get("values", [])
    isi = sum(1 for baris in r[1:] if any(str(x).strip() for x in baris)) if r else 0
    print(f"  {nama:16} | baris isi: {isi:4} | header: {str(r[0])[:70] if r else '-'}")
PY
