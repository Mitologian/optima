import sys,json,os
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
r=lambda p:open(p,encoding='utf-8').read()
csv=r('data/klasifikasi-awal.csv')
parts=['<title>BNI Optima App</title>',
'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
'<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">',
'<style>\n'+r('web/gaya.css')+'\n</style>',
'<div id="app"></div><div id="lembar" class="lembar" hidden><div class="lembar-latar" data-tutup></div><div class="lembar-isi" role="dialog" aria-modal="true"></div></div><div id="toast" class="toast" role="status" aria-live="polite"></div>',
'<script>var CONFIG = { API_URL: "", CSV_TEKS: '+json.dumps(csv)+' };</script>']
for f in ['apps-script/Inti.js','web/tiruan.js','web/api.js','web/app.js']: parts.append('<script>\n'+r(f)+'\n</script>')
open(sys.argv[1],'w',encoding='utf-8').write('\n'.join(parts))
