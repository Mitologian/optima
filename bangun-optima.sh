#!/usr/bin/env bash
# Bangun proyek Apps Script Optima: proyek berdiri sendiri, menunjuk sheet Optima lewat ID.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
AS="$AKAR/apps-script"
SHEET="1lr7wQp5a_LPxK2wpwYRzgTcrHiexO2jvr-c0UBeX-t4"
TMP="$AKAR/_tmp-standalone"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"

echo "=== 1. Sisipkan penunjuk sheet di Code.js ==="
cd "$AS" || exit 1
if grep -q 'const SHEET_ID' Code.js; then
  echo "  sudah ada, dilewati"
else
  env -u PYTHONPATH "$V" - <<'PY'
import pathlib, re
p = pathlib.Path("Code.js")
t = p.read_text(encoding="utf-8", errors="replace")
t = t.replace("SpreadsheetApp.getActiveSpreadsheet()", "SpreadsheetApp.openById(SHEET_ID)")
if "const SHEET_ID" not in t:
    baris = t.splitlines()
    # taruh konstanta setelah baris komentar pembuka atau di paling atas
    sisip = ['// Penunjuk sheet data aplikasi. Ini sheet BNI Optima Road to Launch.',
             'const SHEET_ID = "1lr7wQp5a_LPxK2wpwYRzgTcrHiexO2jvr-c0UBeX-t4";', '']
    t = "\n".join(sisip + baris) + "\n"
p.write_text(t, encoding="utf-8")
print("  total penggantian openById:", t.count("SpreadsheetApp.openById(SHEET_ID)"), "baris")
PY
fi

echo
echo "=== 2. Zona waktu jadi Asia/Jakarta ==="
env -u PYTHONPATH "$V" - <<'PY'
import json, pathlib
p = pathlib.Path("appsscript.json")
d = json.loads(p.read_text(encoding="utf-8"))
d["timeZone"] = "Asia/Jakarta"
p.write_text(json.dumps(d, indent=2) + "\n", encoding="utf-8")
print("  timeZone:", d["timeZone"], "| web app:", d.get("webapp"))
PY

echo
echo "=== 3. Buat proyek Apps Script berdiri sendiri ==="
rm -rf "$TMP"; mkdir -p "$TMP"; cd "$TMP" || exit 1
clasp create-script --type standalone --title "BNI Optima" 2>&1 | tail -3
if [ ! -f "$TMP/.clasp.json" ]; then echo "  GAGAL membuat proyek"; exit 1; fi
cp "$TMP/.clasp.json" "$AS/.clasp.json"
sed -E 's/"scriptId": "[^"]*"/"scriptId": "<baru>"/' "$AS/.clasp.json"

echo
echo "=== 4. Naikkan kode ==="
cd "$AS" || exit 1
clasp push --force 2>&1 | tail -8

echo
echo "=== 5. Terbitkan web app ==="
clasp deploy --description "BNI Optima - terbitan pertama" 2>&1 | tail -6

rm -rf "$TMP"
