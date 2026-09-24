#!/usr/bin/env bash
# Buat proyek Apps Script baru terikat ke sheet Optima, lalu naikkan kode dari repo.
set -u
AKAR="/d/Hermes Work/_studi/optima-kerja"
SHEET="1lr7wQp5a_LPxK2wpwYRzgTcrHiexO2jvr-c0UBeX-t4"
TMP="$AKAR/_tmp-buat"

echo "=== 1. Siapkan folder sementara ==="
rm -rf "$TMP"; mkdir -p "$TMP"; cd "$TMP" || exit 1

echo "=== 2. Buat proyek Apps Script terikat ke sheet Optima ==="
clasp create-script --type sheets --parentId "$SHEET" --title "BNI Optima" 2>&1 | tail -5

if [ ! -f "$TMP/.clasp.json" ]; then
  echo "  GAGAL: proyek tidak terbuat, .clasp.json tidak ada"
  exit 1
fi
echo "  .clasp.json terbuat. scriptId baru tersimpan."

echo "=== 3. Pindahkan penanda proyek ke folder apps-script di repo ==="
cd "$AKAR/apps-script" || exit 1
cp .clasp.json .clasp.json.bak
cp "$TMP/.clasp.json" .clasp.json
sed -E 's/"scriptId": "[^"]*"/"scriptId": "<baru, disamarkan>"/' .clasp.json

echo "=== 4. Naikkan kode ke proyek baru ==="
clasp push --force 2>&1 | tail -10

echo "=== 5. Daftar berkas di proyek baru ==="
clasp status 2>&1 | tail -12

rm -rf "$TMP"
