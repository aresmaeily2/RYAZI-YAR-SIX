# RC1.1 — AFTER verification: contrast re-sweep, keyboard, RTL visuals (new paren grammar),
# q623, accnames, SW/offline, mobile overflow. Produces the final evidence pack.
import json, threading, time, functools, http.server, socketserver, pathlib, re, shutil
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/z/my-project/ryazi-yar-six')
DIST = ROOT / 'dist'
EV = ROOT / 'audit/rc1.1/raw-evidence'
SHOTS = ROOT / 'audit/rc1.1/screenshots'

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

socketserver.ThreadingTCPServer.allow_reuse_address = True
def serve():
    handler = functools.partial(Quiet, directory=str(DIST))
    with socketserver.ThreadingTCPServer(('127.0.0.1', 8831), handler) as httpd:
        httpd.serve_forever()

threading.Thread(target=serve, daemon=True).start()
time.sleep(0.5)
BASE = 'http://127.0.0.1:8831/'

def hexes(rgb):
    m = re.findall(r'[\d.]+', rgb)
    if len(m) >= 4 and float(m[3]) < 0.999: return None
    return '#%02x%02x%02x' % tuple(int(float(x)) for x in m[:3])

def lum(c):
    c = c.lstrip('#')
    r, g, b = [int(c[i:i+2], 16)/255 for i in (0, 2, 4)]
    def f(u): return u/12.92 if u <= 0.04045 else ((u+0.055)/1.055)**2.4
    return 0.2126*f(r) + 0.7152*f(g) + 0.0722*f(b)

def ratio(a, b):
    L1, L2 = sorted([lum(a), lum(b)], reverse=True)
    return (L1+0.05)/(L2+0.05)

report = {'contrast': {'samples': 0, 'fails': []}, 'keyboard': {}, 'sw': {}, 'q623': {}, 'accname': {}, 'mobile': {}, 'console': [], 'pages': []}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}, locale='fa-IR')
    page = ctx.new_page()
    page.on('console', lambda m: report['console'].append(f'{m.type}: {m.text}') if m.type == 'error' else None)
    page.on('pageerror', lambda e: report['console'].append('PAGEERROR: ' + str(e)))

    # ---------- 1. contrast re-sweep over 4 tabs ----------
    for tab in ['درس‌نامه و تمرین', 'آزمون', 'گزارش پیشرفت', 'داشبورد']:
        page.goto(BASE, wait_until='networkidle')
        if tab != 'داشبورد':
            page.get_by_role('button', name=tab, exact=True).click()
            page.wait_for_timeout(500)
        sweep = page.evaluate('''() => {
          const out = [];
          for (const el of document.querySelectorAll('body *')) {
            if (el.children.length > 0) continue;
            const txt = (el.textContent || '').trim();
            if (!txt) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            let bgs = [];
            {
              let n = el;
              while (n) {
                const c2 = getComputedStyle(n);
                const bgi2 = c2.backgroundImage;
                if (bgi2 && bgi2 !== 'none' && bgi2.includes('gradient')) {
                  bgs = bgi2.match(/rgba?\([^)]+\)/g) || [];
                  break;
                }
                const bg = c2.backgroundColor;
                if (bg && !bg.startsWith('rgba(0, 0, 0, 0')) { bgs = [bg]; break; }
                n = n.parentElement;
              }
              if (!bgs.length) bgs = ['rgb(255,255,255)'];
            }
            const fs = parseFloat(cs.fontSize), fw = parseInt(cs.fontWeight) || 400;
            out.push({ txt: txt.slice(0, 30), fg: cs.color, bgs,
                       large: fs >= 24 || (fs >= 18.66 && fw >= 700), fs: fs + '/' + fw });
          }
          return out;
        }''')
        for e in sweep:
            report['contrast']['samples'] += 1
            fg = hexes(e['fg'])
            if fg is None: continue
            worst, worstbg = None, None
            for bg in e['bgs']:
                bgx = hexes(bg)
                if bgx is None: continue
                r = ratio(fg, bgx)
                if worst is None or r < worst: worst, worstbg = r, bgx
            if worst is None: continue
            need = 3.0 if e['large'] else 4.5
            if worst < need:
                report['contrast']['fails'].append({**e, 'ratio': round(worst, 2), 'need': need, 'worst_bg': worstbg, 'tab': tab})

    # ---------- 2. SW + offline ----------
    page.goto(BASE, wait_until='networkidle')
    page.evaluate("caches.open('ryaziyarsix-v3-obsolete').then(c => c.put('/x', new Response('old')))")
    page.reload(wait_until='load')
    page.wait_for_timeout(1200)
    sw = page.evaluate('''async () => {
      const reg = await navigator.serviceWorker.ready;
      return { controlled: !!navigator.serviceWorker.controller,
               state: reg.active && reg.active.state, keys: await caches.keys() };
    }''')
    report['sw']['state'] = sw
    ctx.set_offline(True)
    page.reload(wait_until='load')
    page.wait_for_timeout(800)
    report['sw']['offline_ok'] = page.locator('h1', has_text='ریاضی‌یار ششم').count() > 0
    page.screenshot(path=str(SHOTS/'sw-offline-desktop.png'))
    ctx.set_offline(False)
    page.reload(wait_until='networkidle')

    # ---------- 3. keyboard: traversal + settled focus ring ----------
    page.goto(BASE, wait_until='networkidle')
    trav = []
    for i in range(12):
        page.keyboard.press('Tab')
        time.sleep(0.30)  # let transition-all settle
        trav.append(page.evaluate('''() => { const a = document.activeElement; const cs = getComputedStyle(a);
          return { el: (a.textContent||'').trim().slice(0,14) || a.tagName, fv: a.matches(':focus-visible'),
                   w: cs.outlineWidth, c: cs.outlineColor }; }'''))
    report['keyboard']['traversal'] = trav
    page.get_by_role('button', name='درس‌نامه و تمرین', exact=True).click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(SHOTS/'after-learn-desktop.png'))

    # ---------- 4. q623 path + accname + islands ----------
    page.locator('aside button', has_text='فصل ۶').first.click()
    page.wait_for_timeout(300)
    page.locator('aside button', has_text='درصد و کاربردهای آن').first.click()
    page.wait_for_timeout(500)
    q = page.locator('[data-testid="question-q623"]')
    report['q623']['present'] = q.count() > 0
    if q.count():
        q.scroll_into_view_if_needed()
        # accname contract — via aria-label attribute AND role query fallback
        acc = q.locator('button[aria-label="گزینه ۱: ۳۴۰٬۰۰۰ تومان"]')
        report['accname']['q623_opt1'] = acc.count() == 1
        opt1 = acc.first
        opt1.click()
        page.wait_for_timeout(300)
        q.locator('button', has_text='بررسی و تصحیح پاسخ').first.click()
        page.wait_for_timeout(600)
        page.screenshot(path=str(SHOTS/'after-q623-feedback-correct.png'))
        islands = page.evaluate('''() => {
          const txt = document.querySelector('[data-testid="feedback"]')?.textContent || '';
          const LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
          const runs = []; let depth = 0, cur = '';
          for (const ch of txt) {
            if (ch === LRI) { depth++; cur=''; }
            else if (ch === PDI) { if (depth) { runs.push(cur); depth--; } }
            else if (depth) cur += ch;
          }
          return runs;
        }''')
        report['q623']['live_islands'] = islands
        # copy behavior: simulate Ctrl+A? use selection API + copy event on the feedback area
        copy_probe = page.evaluate('''async () => {
          const fb = document.querySelector('[data-testid="feedback"]');
          const sel = getSelection(); const range = document.createRange();
          range.selectNodeContents(fb); sel.removeAllRanges(); sel.addRange(range);
          let captured = null;
          const onCopy = (e) => { captured = e.clipboardData.getData('text/plain'); e.preventDefault(); };
          document.addEventListener('copy', onCopy);
          const ev = new ClipboardEvent('copy', { clipboardData: new DataTransfer() });
          document.dispatchEvent(ev);
          document.removeEventListener('copy', onCopy);
          sel.removeAllRanges();
          return captured;
        }''')
        report['q623']['copied_text'] = copy_probe

    # ---------- 5. RTL BEFORE/AFTER page with NEW grammar ----------
    rtl_html = '''<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<style>@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Regular.woff2') format('woff2')}
@font-face{font-family:Vazirmatn;src:url('/fonts/Vazirmatn-Bold.woff2') format('woff2');font-weight:700}
body{font-family:Vazirmatn,sans-serif;background:#fff;margin:20px;font-size:19px}
.row{margin-bottom:18px}.lbl{font-size:11px;color:#64748b;margin-bottom:3px}
.before{color:#b91c1c}.after{color:#065f46}.math{font-weight:700;color:#312e81;background:#eef2ff;border-radius:6px;padding:0 3px}</style></head><body>
<div class="row"><div class="lbl">BEFORE — چ۱: (۳ × ۲۰) + ۱ = ۶۱</div><div class="before">گام ۳: برای جمله بیستم عدد ۲۰ را جایگزین می‌کنیم: (۳ × ۲۰) + ۱ = ۶۱.</div></div>
<div class="row"><div class="lbl">AFTER — همان رشته با پرانتزِ ایزوله‌شده</div><div class="after" id="w1">…</div></div>
<div class="row"><div class="lbl">BEFORE — ترکیبی: ۱۰+۴×(۶−۲)÷۸</div><div class="before">۱۰+۴×(۶−۲)÷۸</div></div>
<div class="row"><div class="lbl">AFTER — یک جزیرهٔ کامل</div><div class="after" id="w2">…</div></div>
<div class="row"><div class="lbl">BEFORE — q623</div><div class="before">مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).</div></div>
<div class="row"><div class="lbl">AFTER — زنجیره جزیره؛ پرانتزِ توضیحی فارسی دست‌نخورده</div><div class="after" id="w3">…</div></div>
<div class="row"><div class="lbl">AFTER — ۵/۰۶ < ۵/۶ < ۵/۶۶ و (۲/۵) و ۱۰٬۰۰۰ + ۲۵۰</div><div class="after" id="w4">…</div></div>
<script type="module">
import { bidiText } from '/rtl-math.bundle.mjs';
const LRI = String.fromCharCode(0x2066), PDI = String.fromCharCode(0x2069);
function render(t) { return bidiText(t).split(LRI).join('<span class="math">').split(PDI).join('</span>'); }
document.getElementById('w1').innerHTML = render('گام ۳: برای جمله بیستم عدد ۲۰ را جایگزین می‌کنیم: (۳ × ۲۰) + ۱ = ۶۱.');
document.getElementById('w2').innerHTML = render('۱۰+۴×(۶−۲)÷۸');
document.getElementById('w3').innerHTML = render('مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).');
document.getElementById('w4').innerHTML = render('۵/۰۶ < ۵/۶ < ۵/۶۶ و (۲/۵) و ۱۰٬۰۰۰ + ۲۵۰');
</script></body></html>'''
    (DIST / 'rtl-test.html').write_text(rtl_html, encoding='utf-8')
    shutil.copy('/tmp/mathBidi.bundle.mjs', DIST / 'rtl-math.bundle.mjs') if pathlib.Path('/tmp/mathBidi.bundle.mjs').exists() else None
    # ensure the bundle matches CURRENT source (rebuild if missing)
    if not (DIST / 'rtl-math.bundle.mjs').exists() or True:
        import subprocess
        subprocess.run(['npx', 'esbuild', 'src/utils/mathBidi.ts', '--bundle', '--format=esm',
                        '--outfile=str(DIST)/rtl-math.bundle.mjs'.replace('str(DIST)', str(DIST)),
                        '--log-level=silent'], cwd=str(ROOT), check=True)
    bctx = b.new_context(viewport={'width': 1366, 'height': 620}, locale='fa-IR')
    bpage = bctx.new_page()
    bpage.goto(BASE + 'rtl-test.html', wait_until='networkidle')
    bpage.wait_for_timeout(500)
    bpage.screenshot(path=str(SHOTS/'rtl-paren-before-after-1366.png'))
    w1 = bpage.evaluate("document.getElementById('w1').textContent")
    w3 = bpage.evaluate("document.getElementById('w3').textContent")
    report['pages'].append({'rtl_w1': w1, 'rtl_w3': w3})
    bctx.close()

    # ---------- 6. mobile overflow ----------
    mctx = b.new_context(viewport={'width': 390, 'height': 844}, locale='fa-IR', is_mobile=True, has_touch=True)
    mpage = mctx.new_page()
    mpage.goto(BASE, wait_until='networkidle')
    mpage.screenshot(path=str(SHOTS/'after-home-mobile-390.png'))
    report['mobile']['home_ok'] = mpage.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    mpage.get_by_role('button', name='درس‌نامه و تمرین', exact=True).click()
    mpage.wait_for_timeout(300)
    mpage.locator('aside button', has_text='فصل ۶').first.click()
    mpage.wait_for_timeout(250)
    mpage.locator('aside button', has_text='درصد و کاربردهای آن').first.click()
    mpage.wait_for_timeout(400)
    qm = mpage.locator('[data-testid="question-q623"]')
    if qm.count():
        qm.scroll_into_view_if_needed()
        mpage.screenshot(path=str(SHOTS/'after-q623-mobile-390.png'))
    report['mobile']['learn_ok'] = mpage.evaluate('document.documentElement.scrollWidth <= window.innerWidth + 1')
    mctx.close()
    try: ctx.close()
    except Exception: pass

try:
    b.close()
except Exception:
    pass

(EV / '07-after-browser-verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
fails = report['contrast']['fails']
uniq = {}
for f in fails: uniq.setdefault((f['txt'], f['fg'], f['worst_bg']), f)
print('CONTRAST samples:', report['contrast']['samples'], 'unique fails:', len(uniq))
for k, v in list(uniq.items())[:10]:
    print('FAIL', v['ratio'], v['need'], v['fg'], v['worst_bg'], repr(v['txt']), v['tab'])
print('keyboard[0..2]:', json.dumps(report['keyboard']['traversal'][:3], ensure_ascii=False))
print('SW:', json.dumps(report['sw'], ensure_ascii=False)[:260])
print('q623 islands:', report['q623'].get('live_islands'))
print('copied:', json.dumps(report['q623'].get('copied_text'), ensure_ascii=False))
print('accname q623 opt1:', report['accname'])
print('mobile:', report['mobile'])
print('CONSOLE:', report['console'][:5], 'count:', len(report['console']))
