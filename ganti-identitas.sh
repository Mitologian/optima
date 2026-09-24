#!/usr/bin/env bash
# Ganti seluruh sebutan Ventura menjadi Optima, pasang tagline, naikkan dan terbitkan ulang.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
AS="$AKAR/apps-script"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
TAGLINE="Optimal Results, Together!"

echo "=== 1. Ganti sebutan di kode aplikasi ==="
cd "$AS" || exit 1
env -u PYTHONPATH "$V" - "$TAGLINE" <<'PY'
import pathlib, sys
tagline = sys.argv[1]
pasangan = [
    ("Joined_Ventura", "Joined_Optima"),
    ("Joined Ventura", "Joined Optima"),
    ("joinedVentura", "joinedOptima"),
    ("newVentura", "newOptima"),
    ("topVentura", "topOptima"),
    ("BNI VENTURA", "BNI OPTIMA"),
    ("BNI Ventura", "BNI Optima"),
    ("Ventura Launch Mission", "Optima Launch Mission"),
    ("Ventura Impact Board", "Optima Impact Board"),
    ("Ventura Dashboard", "Optima Dashboard"),
    ("Top Ventura Contributor", "Top Optima Contributor"),
    ("Most Joined to Ventura", "Most Joined to Optima"),
    ("Member Join Ventura", "Member Join Optima"),
    ("join Ventura", "join Optima"),
    ("Ventura Admin", "Optima Admin"),
    ("Ventura", "Optima"),
]
total = 0
for nama in ["Code.js", "Main.html", "Admin.html", "Member.html", "Dashboard_v2.html", "appsscript.json"]:
    p = pathlib.Path(nama)
    if not p.exists():
        continue
    t0 = p.read_text(encoding="utf-8", errors="replace")
    t = t0
    for lama, baru in pasangan:
        t = t.replace(lama, baru)
    # tagline: ganti teks tagline lama kalau ada
    if "Bravely Venturing Together" in t:
        t = t.replace("Bravely Venturing Together!", tagline)
    jumlah = sum(t0.count(lama) for lama, _ in pasangan)
    if t != t0:
        p.write_text(t, encoding="utf-8")
    total += jumlah
    sisa = t.lower().count("ventura")
    print(f"  {nama:20} ganti {jumlah:3} | sisa 'ventura': {sisa}")

# sisipkan tagline pada antarmuka utama kalau belum ada
main = pathlib.Path("Main.html")
t = main.read_text(encoding="utf-8")
if tagline not in t:
    if "topbar-logo" in t:
        t = t.replace('<div class="topbar-logo">BNI OPTIMA</div>',
                      f'<div class="topbar-logo">BNI OPTIMA<span class="topbar-tagline">{tagline}</span></div>', 1)
        main.write_text(t, encoding="utf-8")
        print("  tagline disisipkan di bilah atas:", tagline)
print("  total penggantian:", total)
PY

echo
echo "=== 2. Perbaiki cangkang PWA ==="
cd "$AKAR" || exit 1
env -u PYTHONPATH "$V" - "$TAGLINE" <<'PY'
import pathlib, sys, re
tagline = sys.argv[1]
idx = pathlib.Path("index.html")
t = idx.read_text(encoding="utf-8")
t = t.replace('<div id="splash-tagline"></div>', f'<div id="splash-tagline">{tagline}</div>')
t = t.replace('<div id="splash-tagline"> </div>', f'<div id="splash-tagline">{tagline}</div>')
t = re.sub(r'(<div id="splash-tagline">).*?(</div>)', lambda m: m.group(1) + tagline + m.group(2), t, flags=re.S)
t = t.replace("Ventura", "Optima")
idx.write_text(t, encoding="utf-8")
print("  index.html: tagline dipasang dan sisa sebutan Ventura:", t.lower().count("ventura"))
PY

echo
echo "=== 3. Naikkan ke Apps Script dan terbitkan ulang ==="
cd "$AS" || exit 1
clasp push --force 2>&1 | tail -4
DEPT="AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ"
clasp redeploy "$DEPT" --description "Identitas Optima dan tagline" 2>&1 | tail -4

echo
echo "=== 4. Naikkan ke repo ==="
cd "$AKAR" || exit 1
git add -A && git -c user.email=hermes@local -c user.name=Hermes commit -q -m "Ganti seluruh identitas Ventura menjadi Optima dan pasang tagline Optimal Results, Together" && git push -q origin main && echo "  commit $(git rev-parse --short HEAD)"
