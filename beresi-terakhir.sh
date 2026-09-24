#!/usr/bin/env bash
# Temukan dan beresi sebutan terakhir, naikkan, terbitkan ulang, lalu uji.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
AS="$AKAR/apps-script"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
DEPT="AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ"

echo "=== 1. Sebutan terakhir, apa adanya ==="
cd "$AS" || exit 1
grep -n -i "ventura" Main.html | cut -c1-200

echo
echo "=== 2. Beresi ==="
env -u PYTHONPATH "$V" - <<'PY'
import pathlib
for nama in ["Main.html", "Code.js", "Admin.html", "Member.html", "Dashboard_v2.html", "appsscript.json"]:
    p = pathlib.Path(nama)
    if not p.exists():
        continue
    t = p.read_text(encoding="utf-8", errors="replace")
    sisa_sebelum = t.lower().count("ventura")
    if sisa_sebelum == 0:
        continue
    t = t.replace("ventura", "optima").replace("Ventura", "Optima").replace("VENTURA", "OPTIMA")
    p.write_text(t, encoding="utf-8")
    print(f"  {nama}: {sisa_sebelum} sebutan diberesi -> sisa {t.lower().count('ventura')}")
PY

echo
echo "=== 3. Naikkan dan terbitkan ulang ==="
cd "$AS" || exit 1
clasp push --force 2>&1 | tail -3
clasp redeploy "$DEPT" --description "Beresi sebutan terakhir" 2>&1 | tail -3

echo
echo "=== 4. Naikkan ke repo ==="
cd "$AKAR" || exit 1
git add -A && git -c user.email=hermes@local -c user.name=Hermes commit -q -m "Beresi sebutan Ventura yang tersisa" && git push -q origin main && echo "  commit $(git rev-parse --short HEAD)"

echo
echo "=== 5. Uji akhir web app ==="
sleep 45
env -u PYTHONPATH "$V" - <<'PY'
import re, urllib.error, urllib.request
u = "https://script.google.com/macros/s/AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ/exec"
try:
    t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "replace")
    j = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
    print("  judul:", (j.group(1).strip()[:36] if j else "-"), "| panjang", len(t))
    print("  Optima:", "optima" in t.lower(), "| Ventura:", "ventura" in t.lower(), "| tagline:", "Optimal Results" in t)
except urllib.error.HTTPError as e:
    print("  HTTP", e.code)
PY
