#!/usr/bin/env bash
# 1) repo optima jadi publik, 2) bersihkan sheet kosong nyasar hasil percobaan clasp,
# 3) periksa panggilan yang hanya jalan kalau script terikat pada sheet.
set -u
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"

echo "=== 1. Repo optima jadi publik ==="
env -u PYTHONPATH "$V" - <<'PY'
import json, pathlib, re, urllib.error, urllib.request
raw = pathlib.Path("C:/Users/Lenovo/.git-credentials").read_text(encoding="utf-8", errors="ignore").strip()
token = re.match(r"https://([^:]+):([^@]+)@", raw).group(2)
def gh(jalur, metode="GET", isi=None):
    rq = urllib.request.Request("https://api.github.com" + jalur, method=metode,
        data=(json.dumps(isi).encode() if isi else None),
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json", "User-Agent": "Hermes"})
    try:
        with urllib.request.urlopen(rq, timeout=90) as r: return json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return {"error": e.code, "pesan": e.read().decode()[:150]}
r = gh("/repos/Mitologian/optima", "PATCH", {"private": False, "description": "BNI Optima Chapter Apps - cangkang PWA dan kode Apps Script, alur kerja lewat repo"})
print("  hasil:", "publik" if r.get("private") is False else r, "|", r.get("html_url", ""))
PY

echo
echo "=== 2. Periksa dan bersihkan sheet kosong nyasar ==="
env -u PYTHONPATH "$V" - <<'PY'
import sys
sys.path.insert(0, "D:/Hermes Work/_scripts")
try:
    import ipv4_dulu  # noqa
except ImportError:
    pass
import jalur_pesan as jp
d = jp.drive()
NYASAR = "1EkW5sDrPL3dvUAroNifS0gAoCNdeTTFtb_PWG_vYreA"
try:
    f = d.files().get(fileId=NYASAR, fields="id,name,mimeType,createdTime,owners(emailAddress)").execute()
    print("  ditemukan:", f["name"], "|", f["mimeType"].split(".")[-1], "| dibuat", f["createdTime"][:19])
    isi = d.files().list(q=f"'{NYASAR}' in parents and trashed=false", fields="files(name)").execute().get("files", [])
    print("  isinya:", isi or "kosong")
    if f["name"].strip() in ("BNI Optima", "Untitled spreadsheet", "") and not isi:
        d.files().update(fileId=NYASAR, body={"trashed": True}).execute()
        print("  -> dipindahkan ke Tong Sampah (bisa dipulihkan 30 hari)")
    else:
        print("  -> tidak saya pindahkan, perlu Anda lihat dulu")
except Exception as e:
    print("  tidak bisa dibaca:", str(e)[:80])
PY

echo
echo "=== 3. Panggilan yang menuntut script terikat pada sheet ==="
cd "/d/Hermes Work/_studi/optima-kerja/apps-script" || exit 1
echo "  getActiveSpreadsheet : $(grep -c 'getActiveSpreadsheet' Code.js) baris"
echo "  getUi                : $(grep -c 'getUi' Code.js) baris"
echo "  onOpen / menu        : $(grep -c 'onOpen' Code.js) baris"
echo "  getActiveSheet       : $(grep -c 'getActiveSheet' Code.js) baris"
