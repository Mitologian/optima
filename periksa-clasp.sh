#!/usr/bin/env bash
# Periksa berkas yang tadi terbuat oleh clasp, lalu bersihkan kalau memang sampah percobaan.
set -u
echo "=== 1. Apa isi parentId yang tadi terpasang? ==="
cd "/d/Hermes Work/_studi/optima-kerja/apps-script" || exit 1
python - "$@" <<'PY'
import json, pathlib, sys
sys.path.insert(0, "D:/Hermes Work/_scripts")
try:
    import ipv4_dulu  # noqa
except ImportError:
    pass
import jalur_pesan as jp
cfg = json.loads(pathlib.Path(".clasp.json").read_text(encoding="utf-8"))
pid = cfg.get("parentId", "")
print("  parentId terpasang:", pid[:14] + "..." if pid else "(tidak ada)")
d = jp.drive()
for fid, sebut in [(pid, "parentId sekarang"), ("1lr7wQp5a_LPxK2wpwYRzgTcrHiexO2jvr-c0UBeX-t4", "sheet Optima")]:
    if not fid:
        continue
    try:
        f = d.files().get(fileId=fid, fields="id,name,mimeType,createdTime,owners(emailAddress),trashed").execute()
        print(f"  {sebut}: {f['name']} | {f['mimeType'].split('.')[-1]} | dibuat {f['createdTime'][:19]} | pemilik {(f.get('owners') or [{}])[0].get('emailAddress','?')}")
    except Exception as e:
        print(f"  {sebut}: tidak bisa dibaca ({str(e)[:40]})")
PY
echo
echo "=== 2. Proyek Apps Script di akun sekarang ==="
clasp list 2>&1 | tail -6
