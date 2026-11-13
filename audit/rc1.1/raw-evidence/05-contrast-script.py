# RC1.1 بخش ۱ — contrast sweep (DOM + pixel truth) + keyboard/reduced-motion probe
import json, threading, time, functools, http.server, socketserver, pathlib, re
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path('/home/z/my-project/ryazi-yar-six')
DIST = ROOT / 'dist'
EV = ROOT / 'audit/rc1.1/raw-evidence'
SHOTS = ROOT / 'audit/rc1.1/screenshots'
EV.mkdir(parents=True, exist_ok=True); SHOTS.mkdir(parents=True, exist_ok=True)

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

socketserver.ThreadingTCPServer.allow_reuse_address = True
def serve():
    handler = functools.partial(Quiet, directory=str(DIST))
    with socketserver.ThreadingTCPServer(('127.0.0.1', 8811), handler) as httpd:
        httpd.serve_forever()

threading.Thread(target=serve, daemon=True).start()
time.sleep(0.5)
BASE = 'http://127.0.0.1:8811/'

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

GRAD_STOPS = re.compile(r'rgba?\([^)]+\)')

# ---- rebuild dist from current source first (fixes included later; this run = BEFORE state)
report = {'dom': [], 'pixel': [], 'keyboard': {}, 'reduced_motion': {}}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}, locale='fa-IR')
    page = ctx.new_page()

    for tab in ['درس‌نامه و تمرین', 'آزمون', 'گزارش پیشرفت', 'داشبورد']:
        page.goto(BASE, wait_until='networkidle')
        if tab != 'داشبورد':
            page.get_by_role('button', name=tab, exact=True).click()
            page.wait_for_timeout(500)
        sweep = page.evaluate('''() => {
          const out = [];
          const els = document.querySelectorAll('body *');
          for (const el of els) {
            if (el.children.length > 0) continue;               // leaf only
            const txt = (el.textContent || '').trim();
            if (!txt) continue;
            const cs = getComputedStyle(el);
            if (cs.visibility === 'hidden' || cs.display === 'none') continue;
            const fgRaw = cs.color;
            const bgi = cs.backgroundImage;
            let bgs = [];
            if (bgi && bgi !== 'none') {
              bgs = (bgi.match(/rgba?\\([^)]+\\)/g) || []);
            }
            // resolve solid bg up the tree
            let n = el;
            let solid = 'rgb(255,255,255)';
            while (n) {
              const bg = getComputedStyle(n).backgroundColor;
              if (bg && !bg.startsWith('rgba(0, 0, 0, 0')) { solid = bg; break; }
              n = n.parentElement;
            }
            if (!bgs.length) bgs = [solid];
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const fs = parseFloat(cs.fontSize);
            const fw = parseInt(cs.fontWeight) || 400;
            const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
            const need = large ? 3.0 : 4.5;
            out.push({ txt: txt.slice(0, 26), fg: fgRaw, bgs, large, need,
                       fs: fs + '/' + fw, cls: (el.className.baseVal ?? el.className ?? '').toString().slice(0, 60) });
          }
          return out;
        }''')
        for e in sweep:
            fg = hexes(e['fg'])
            if fg is None: continue
            worst, worstbg = None, None
            for bg in e['bgs']:
                bgx = hexes(bg)
                if bgx is None: continue
                r = ratio(fg, bgx)
                if worst is None or r < worst: worst, worstbg = r, bgx
            if worst is None: continue
            ok = worst >= e['need']
            report['dom'].append({**e, 'ratio': round(worst, 2), 'worst_bg': worstbg, 'ok': ok, 'tab': tab})

    # pixel-level truth: sample actual screenshot colors at gradient buttons
    page.goto(BASE, wait_until='networkidle')
    page.get_by_role('button', name='درس‌نامه و تمرین', exact=True).click()
    page.wait_for_timeout(400)
    active_sidebar = page.locator('aside button.bg-gradient-to-l').first
    active_sidebar.scroll_into_view_if_needed()
    box = active_sidebar.bounding_box()
    page.screenshot(path=str(SHOTS/'a1-pixel-sidebar-active.png'))
    if box:
        # sample pixels: left edge (violet end), middle, right end (brand end) + text area
        import subprocess
        py = f'''
from PIL import Image
im = Image.open('{SHOTS}/a1-pixel-sidebar-active.png').convert('RGB')
xs = [int({box["x"]}+6), int({box["x"]}+{box["width"]}/2), int({box["x"]}+{box["width"]}-6)]
ys_text = int({box["y"]}+{box["height"]}/2)
out = {{}}
for i, x in enumerate(xs):
    out[f"bg_point_{{i}}"] = im.getpixel((x, int({box["y"]}+8)))
# find a text pixel: scan row for near-white pixel inside button
found = None
for x in range(int({box["x"]}), int({box["x"]}+{box["width"]})):
    p_ = im.getpixel((x, ys_text))
    if all(v > 230 for v in p_): found = (x, p_); break
out["text_pixel"] = found
print(out)
'''
        r = subprocess.run(['python3', '-c', py], capture_output=True, text=True)
        report['pixel'].append({'el': 'sidebar active chapter (gradient brand→violet)', 'out': r.stdout.strip()[:400]})

    # ---------- keyboard probes ----------
    page.goto(BASE, wait_until='networkidle')
    page.keyboard.press('Tab'); page.keyboard.press('Tab')
    kb = page.evaluate('''() => {
      const a = document.activeElement;
      const cs = getComputedStyle(a);
      return { text: (a.textContent||'').trim().slice(0,15),
               matchesFV: a.matches(':focus-visible'),
               outline: cs.outlineWidth + ' ' + cs.outlineStyle + ' ' + cs.outlineColor,
               outlineOffset: cs.outlineOffset };
    }''')
    report['keyboard']['focus_visible_nav_tab'] = kb
    # long traversal — no trap
    seq = []
    for i in range(40):
        page.keyboard.press('Tab')
        seq.append(page.evaluate("() => { const a = document.activeElement; return a ? a.tagName + ':' + (a.textContent||'').trim().slice(0,12) : 'none'; }"))
    report['keyboard']['traversal_40_unique'] = len(set(seq))
    report['keyboard']['traversal_seq'] = seq[:24]
    # exam pop-in (overlay) — exam tab: does a modal exist? check dialog roles
    page.get_by_role('button', name='آزمون', exact=True).click()
    page.wait_for_timeout(400)
    report['keyboard']['dialog_roles_on_exam'] = page.evaluate("() => document.querySelectorAll('[role=dialog],dialog').length")
    # disabled control behavior
    report['keyboard']['disabled_present'] = page.evaluate("() => [...document.querySelectorAll('button:disabled')].length")

    # ---------- reduced motion ----------
    rctx = b.new_context(viewport={'width': 1366, 'height': 768}, reduced_motion='reduce', locale='fa-IR')
    rpage = rctx.new_page()
    rpage.goto(BASE, wait_until='networkidle')
    rm = rpage.evaluate('''() => {
      const animated = [...document.querySelectorAll('*')].filter(e => {
        const cs = getComputedStyle(e);
        return cs.animationName !== 'none' && parseFloat(cs.animationDuration) > 0;
      }).length;
      const transitions = [...document.querySelectorAll('*')].filter(e => {
        const cs = getComputedStyle(e);
        return cs.transitionDuration.split(',').some(d => parseFloat(d) > 0);
      }).length;
      return { activeAnimations: animated, activeTransitions: transitions };
    }''')
    report['reduced_motion']['home'] = rm
    # solver autoplay disabled under reduced motion
    rpage.get_by_role('button', name='درس‌نامه و تمرین', exact=True).click()
    rpage.wait_for_timeout(300)
    rpage.locator('aside button', has_text='فصل ۷').first.click()
    rpage.wait_for_timeout(300)
    rpage.locator('aside button', has_text='عملیات ترکیبی').first.click()
    rpage.wait_for_timeout(400)
    flow_btn = rpage.locator('[data-testid="start-flow-btn"]')
    if flow_btn.count():
        flow_btn.click()
        rpage.wait_for_timeout(600)
        solver = rpage.evaluate('''() => {
          const play = document.querySelector('[data-testid="anim-play"]');
          return play ? { found: true, playing: play.getAttribute('aria-label') } : { found: false };
        }''')
        report['reduced_motion']['solver'] = solver
        rpage.screenshot(path=str(SHOTS/'a2-reduced-motion-solver.png'))
    rctx.close()
    ctx.close()
try:
    b.close()
except Exception:
    pass

fails = [e for e in report['dom'] if not e['ok']]
uniq_fails = {}
for f in fails:
    key = (f['txt'], f['fg'], f['worst_bg'], f['ratio'], f['fs'], f['tab'])
    uniq_fails.setdefault(key, f)
(EV/'05-contrast-keyboard-before.json').write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding='utf-8')
print('DOM samples:', len(report['dom']), 'FAILS:', len(uniq_fails))
for k, v in list(uniq_fails.items())[:20]:
    print(f"FAIL r={v['ratio']} need={v['need']} fs={v['fs']} fg={v['fg']} bg={v['worst_bg']} txt={v['txt']!r} [{v['tab']}] cls={v['cls'][:40]}")
print('---pixel---'); print(json.dumps(report['pixel'], ensure_ascii=False)[:600])
print('---keyboard---'); print(json.dumps(report['keyboard'], ensure_ascii=False)[:800])
print('---reduced motion---'); print(json.dumps(report['reduced_motion'], ensure_ascii=False)[:300])
