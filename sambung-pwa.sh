#!/usr/bin/env bash
# Sambungkan cangkang PWA ke web app Optima, ganti identitas, naikkan ke repo, hidupkan GitHub Pages.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
BARU="AKfycby35LyEmHEfFCUmibAEqCDYW85I6iX6aIE23_Lj9FTuQgQPqK4JBvoMFNu7kf-c2JsDbQ"
V="$HOME/AppData/Local/hermes/hermes-agent/venv/Scripts/python.exe"
cd "$AKAR" || exit 1

echo "=== 1. Uji web app Optima benar-benar hidup ==="
env -u PYTHONPATH "$V" - <<PY
import re, urllib.request
u = "https://script.google.com/macros/s/$BARU/exec"
t = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"}), timeout=90).read().decode("utf-8", "replace")
m = re.search(r"<title[^>]*>(.*?)</title>", t, re.S | re.I)
print("  HTTP 200 | panjang", len(t), "| judul:", (m.group(1).strip()[:50] if m else "-"))
print("  memuat kata Ventura:", "ventura" in t.lower())
PY

echo
echo "=== 2. Ganti alamat dan identitas di cangkang PWA ==="
env -u PYTHONPATH "$V" - <<PY
import pathlib, re
akar = pathlib.Path(".")
idx = akar / "index.html"
t = idx.read_text(encoding="utf-8")
t = re.sub(r'(<iframe[^>]*src=")[^"]*(")', r'\g<1>https://script.google.com/macros/s/$BARU/exec\g<2>', t, flags=re.S)
t = t.replace("<title>BNI Ventura</title>", "<title>BNI Optima</title>")
t = t.replace('content="BNI Ventura"', 'content="BNI Optima"')
t = t.replace("BNI VENTURA", "BNI OPTIMA")
t = t.replace("Bravely Venturing Together!", "")
idx.write_text(t, encoding="utf-8")
print("  index.html: alamat iframe diganti, judul jadi BNI Optima, tagline dikosongkan")
man = akar / "manifest.json"
m = man.read_text(encoding="utf-8")
m = m.replace('"name": "BNI Ventura"', '"name": "BNI Optima"').replace('"short_name": "Ventura"', '"short_name": "Optima"')
m = m.replace('"description": "BNI Ventura Chapter Gamification App"', '"description": "BNI Optima Chapter Gamification App"')
man.write_text(m, encoding="utf-8")
print("  manifest.json: nama jadi BNI Optima")
print("  sisa sebutan Ventura di cangkang:", sum(x.read_text(encoding='utf-8', errors='ignore').lower().count('ventura') for x in [idx, man]))
PY

echo
echo "=== 3. Naikkan ke repo ==="
git add -A && git -c user.email=hermes@local -c user.name=Hermes commit -q -m "Sambungkan cangkang PWA ke web app Optima dan ganti identitas" && git push -q origin main && echo "  commit $(git rev-parse --short HEAD)"

echo
echo "=== 4. Hidupkan GitHub Pages ==="
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
        return {"error": e.code, "pesan": e.read().decode()[:160]}
kini = gh("/repos/Mitologian/optima/pages")
if isinstance(kini, dict) and kini.get("html_url"):
    print("  Pages sudah hidup:", kini["html_url"])
else:
    h = gh("/repos/Mitologian/optima/pages", "POST", {"source": {"branch": "main", "path": "/"}})
    print("  aktifkan Pages:", h.get("html_url") or h)
    print("  status:", (gh("/repos/Mitologian/optima/pages") or {}).get("status"))
PY
