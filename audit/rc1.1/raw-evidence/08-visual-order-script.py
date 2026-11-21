# RC1.1 — visual order extraction (machine truth, not eyeballing)
# For each char of a string rendered in RTL context: x-position via Range rects.
# Expected for a correct LTR island: visual left-to-right order == logical order.
import threading, time, functools, http.server, socketserver, pathlib, json, shutil, subprocess
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/z/my-project/ryazi-yar-six')
DIST = ROOT / 'dist'

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

socketserver.ThreadingTCPServer.allow_reuse_address = True
def serve():
    handler = functools.partial(Quiet, directory=str(DIST))
    with socketserver.ThreadingTCPServer(('127.0.0.1', 8841), handler) as httpd:
        httpd.serve_forever()

threading.Thread(target=serve, daemon=True).start()
time.sleep(0.5)

# fresh bundle from CURRENT source
subprocess.run(['npx', 'esbuild', 'src/utils/mathBidi.ts', '--bundle', '--format=esm',
                '--outfile=' + str(DIST / 'rtl-math.bundle.mjs'), '--log-level=silent'],
               cwd=str(ROOT), check=True)

PAGE = '''<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<style>
body{font-family:Vazirmatn,sans-serif;background:#fff;margin:20px;font-size:24px}
.t{margin-bottom:14px;white-space:pre}
</style></head><body>
<div class="t" id="s1"></div>
<div class="t" id="s2"></div>
<div class="t" id="s3"></div>
<div class="t" id="s4"></div>
<div class="t" id="s5"></div>
<div class="t" id="s6"></div>
<script type="module">
import { bidiText } from '/rtl-math.bundle.mjs';
const strings = {
  s1: 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان',
  s2: 'WRAP:' + 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان',
  s3: 'WRAP:' + '۱۰٬۰۰۰ + ۲۵۰',
  s4: 'WRAP:' + '۱۰+۴×(۶−۲)÷۸',
  s5: 'WRAP:' + '(۳ × ۲۰) + ۱ = ۶۱',
  s6: 'RAW:' + '(۳ × ۲۰) + ۱ = ۶۱',
};
for (const [id, raw] of Object.entries(strings)) {
  const el = document.getElementById(id);
  if (raw.startsWith('WRAP:')) el.textContent = bidiText(raw.slice(5));
  else el.textContent = raw.slice(4);
}
</script></body></html>'''
(DIST / 'vo-test.html').write_text(PAGE, encoding='utf-8')

JS = '''(sel) => {
  const el = document.querySelector(sel);
  const text = el.textContent;
  const LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
  const out = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === LRI || ch === PDI) continue;
    const r = document.createRange();
    r.setStart(el.firstChild, i);
    r.setEnd(el.firstChild, i + 1);
    const rect = r.getClientRects()[0];
    if (!rect) continue;
    out.push({ ch, x: Math.round(rect.x), w: Math.round(rect.width) });
  }
  const sorted = [...out].sort((a, b) => a.x - b.x);
  return { logical: text.split(LRI).join('').split(PDI).join(''),
           visual: sorted.map(s => s.ch).join('') };
}'''

STR = 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان'
CHAIN = '۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰'
with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_context(viewport={'width': 1366, 'height': 768}).new_page()
    page.goto('http://127.0.0.1:8841/vo-test.html', wait_until='networkidle')
    page.wait_for_timeout(400)
    res = {}
    for sel in ['#s1', '#s2', '#s3', '#s4', '#s5', '#s6']:
        res[sel] = page.evaluate(JS, sel)
    b.close()

report = {}
for sel, r in res.items():
    logical = r['logical']
    visual = r['visual']
    # island content only (between first LRI and PDI if wrapped)
    LRI = chr(0x2066); PDI = chr(0x2069)
    if LRI in logical:
        island = logical[logical.index(LRI)+1:logical.index(PDI)]
    else:
        island = logical
    # does visual (L->R) start with the logical start of the island?
    # strip LRI/PDI from visual too (they were skipped)
    v_clean = visual.replace(LRI, '').replace(PDI, '')
    # For full-line RTL text the whole line is RTL: only the ISLAND substring matters.
    # find island substring position in visual:
    idx = v_clean.find(island[:10]) if len(island) >= 10 else v_clean.find(island)
    island_visual = v_clean[idx:idx+len(island)] if idx >= 0 else None
    ok = island_visual == island if island_visual else False
    report[sel] = {'logical_island': island[:40], 'visual_island': (island_visual or '')[:40],
                   'match': ok, 'full_visual': v_clean[:60]}

path = ROOT / 'audit/rc1.1/raw-evidence/08-visual-order.json'
path.write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
for sel, r in report.items():
    print(sel, 'MATCH=' + str(r['match']))
    print('  logical:', r['logical_island'])
    print('  visual :', r['visual_island'])
