#!/usr/bin/env bash
# 1) temukan sisa sebutan di Main.html, 2) bersihkan data Ventura di sheet Optima,
# 3) samakan nilai aksi di tab Rules, 4) uji web app.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
AS="$AKAR/apps-script"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"

echo "=== 1. Sisa sebutan ventura di Main.html ==="
grep -n -i ventura "$AS/Main.html" | cut -c1-160

echo
echo "=== 2. Bersihkan data di sheet Optima ==="
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

# tab yang seluruh isinya data lama Ventura
for nama in ["Activities", "BrainTargets"]:
    r = sh.spreadsheets().values().get(spreadsheetId=SID, range=f"'{nama}'!A1:Z1000").execute().get("values", [])
    if len(r) > 1:
        sh.spreadsheets().values().clear(spreadsheetId=SID, range=f"'{nama}'!A2:Z1000").execute()
        print(f"  {nama}: {len(r)-1} baris data dikosongkan, header tetap")

# Classifications: simpan baris katalog (tanpa nama member), buang baris milik member
nama = "Classifications"
r = sh.spreadsheets().values().get(spreadsheetId=SID, range=f"'{nama}'!A1:Z1000").execute().get("values", [])
if len(r) > 1:
    head, baris = r[0], r[1:]
    def kolom(baris, nm):
        try: return baris[head.index(nm)]
        except Exception: return ""
    katalog = [b for b in baris if not kolom(b, "MemberName").strip()]
    dibuang = len(baris) - len(katalog)
    sh.spreadsheets().values().clear(spreadsheetId=SID, range=f"'{nama}'!A2:Z1000").execute()
    if katalog:
        sh.spreadsheets().values().update(spreadsheetId=SID, range=f"'{nama}'!A2",
            valueInputOption="RAW", body={"values": katalog}).execute()
    print(f"  {nama}: {dibuang} baris milik member dibuang, {len(katalog)} baris katalog dipertahankan")

# Rules: samakan nama aksi dengan kode yang sudah diganti
nama = "Rules"
r = sh.spreadsheets().values().get(spreadsheetId=SID, range=f"'{nama}'!A1:Z200").execute().get("values", [])
ubah = 0
for i, baris in enumerate(r[1:], start=2):
    for j, isi in enumerate(baris):
        if "Ventura" in str(isi):
            baru = str(isi).replace("Joined_Ventura", "Joined_Optima").replace("Ventura", "Optima")
            kolom_huruf = chr(ord("A") + j)
            sh.spreadsheets().values().update(spreadsheetId=SID, range=f"'{nama}'!{kolom_huruf}{i}",
                valueInputOption="RAW", body={"values": [[baru]]}).execute()
            ubah += 1
print(f"  Rules: {ubah} sel disesuaikan (Joined_Ventura -> Joined_Optima)")

# periksa apakah Summary dan Dashboard berisi rumus atau nilai
for nama in ["Summary", "Dashboard"]:
    r = sh.spreadsheets().values().get(spreadsheetId=SID, range=f"'{nama}'!A1:H60",
        valueRenderOption="FORMULA").execute().get("values", [])
    rumus = sum(1 for baris in r for sel in baris if str(sel).startswith("="))
    print(f"  {nama}: {len(r)} baris, {rumus} sel berisi rumus")
PY

echo
echo "=== 3. Uji web app setelah terbit ulang ==="
env -u PYTHONPATH "$V" - <<'PY'
import re, urllib.error, urllib.request
u = "https://script.google.com/macros/s/AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ/exec"
try:
    t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "replace")
    j = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
    print("  HTTP 200 | judul:", (j.group(1).strip()[:40] if j else "-"))
    print("  menyebut Optima:", "optima" in t.lower(), "| menyebut Ventura:", "ventura" in t.lower())
    print("  tagline tampil:", "Optimal Results" in t)
except urllib.error.HTTPError as e:
    print("  HTTP", e.code, "- masih menunggu izin pemilik (langkah Allow yang saya sebutkan)")
PY
