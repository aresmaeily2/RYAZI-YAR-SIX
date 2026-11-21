import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';


/**
 * قرارداد منبع Service Worker / Manifest / سطح شبکه — پوشش شکاف ممیزی (l).
 *
 * jsdom نمی‌تواند SW واقعی را اجرا کند؛ بنابراین رفتار بحرانی SW به‌صورت
 * «قرارداد منبع» قفل می‌شود (تطبیق متن منبع با قواعد امنیتی) و صحت manifest
 * و «صفر بودن درخواست‌های خارجی» به‌صورت برنامه‌ای راستی‌آزمایی می‌شود.
 * این آزمون ادعای حریم خصوصی README را قابل‌تمرین می‌کند (docs/PRIVACY.md).
 */

// vitest در محیط jsdom مقدار import.meta.url را http می‌کند؛ از cwd پروژه استفاده می‌کنیم
const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const swSource = read('public/sw.js');
const mainSource = read('src/main.tsx');

describe('Service Worker — قرارداد منبع (public/sw.js)', () => {
  it('نام کش نسخه‌دار دارد (مکانیزم ابطال = تغییر نام کش)', () => {
    expect(swSource).toMatch(/const CACHE_NAME = 'ryaziyarsix-v\d+[^']*';/);
  });

  it('فقط درخواست‌های GET هم‌مبدأ را پاسخ می‌دهد (دروازهٔ امنیتی)', () => {
    // رد متدهای غیر GET
    expect(swSource).toContain("req.method !== 'GET'");
    // رد مبدأ خارجی — تنها fetch کل کدبیس پشت این دروازه است
    expect(swSource).toContain('url.origin !== self.location.origin');
  });

  it('در activate همهٔ کش‌های با نام متفاوت حذف می‌شوند (purge کش قدیمی)', () => {
    expect(swSource).toContain('caches.keys()');
    expect(swSource).toContain('caches.delete(');
    expect(swSource).toMatch(/filter\(\(k\) => k !== CACHE_NAME\)/);
  });

  it('در شکست شبکه، پوستهٔ کش‌شدهٔ اپ به‌عنوان fallback برمی‌گردد', () => {
    expect(swSource).toContain("new Request('./')");
    expect(swSource).toContain('Response.error()');
  });

  it('کش‌گذاری بی‌صدا شکست می‌خورد و پاسخ به کاربر نمی‌رسد (بدون throw)', () => {
    expect(swSource).toMatch(/\.catch\(\(\) => undefined\)/);
  });
});

describe('ثبت Service Worker (src/main.tsx)', () => {
  it('فقط در بیلد production ثبت می‌شود و خطا بی‌صدا است', () => {
    expect(mainSource).toContain('import.meta.env.PROD');
    expect(mainSource).toContain('serviceWorker');
    expect(mainSource).toMatch(/\.register\(\.\/sw\.js|register\('\.\/sw\.js'\)/);
  });
});

describe('manifest.webmanifest — PWA فارسی/RTL', () => {
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    name: string;
    short_name: string;
    lang: string;
    dir: string;
    start_url: string;
    scope: string;
    display: string;
    icons: Array<{ src: string; sizes: string; purpose?: string }>;
    theme_color: string;
    background_color: string;
  };

  it('زبان و جهت فارسی/راست‌چین است', () => {
    expect(manifest.lang).toBe('fa');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.name.length).toBeGreaterThan(0);
    expect(manifest.short_name.length).toBeGreaterThan(0);
  });

  it('start_url و scope نسبی‌اند (سازگار با زیرمسیر GitHub Pages)', () => {
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
    expect(manifest.display).toBe('standalone');
  });

  it('حداقل سه آیکون با مسیر نسبی، شامل maskable دارد', () => {
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);
    for (const icon of manifest.icons) {
      expect(icon.src.startsWith('./icons/')).toBe(true);
      expect(icon.sizes).toMatch(/^\d+x\d+$/);
    }
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('index.html به manifest ارجاع می‌دهد و فونت‌ها محلی‌اند', () => {
    const html = read('index.html');
    expect(html).toContain('manifest.webmanifest');
    expect(html).toContain('./fonts/');
    expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe('سطح شبکه — راستی‌آزمایی برنامه‌ای «صفر درخواست خارجی»', () => {
  const srcFiles = walk(join(ROOT, 'src'));
  const publicFiles = walk(join(ROOT, 'public')).filter((f) => f.endsWith('.js') || f.endsWith('.webmanifest') || f.endsWith('.html'));
  const htmlIndex = read('index.html');

  it('تنها fetch کل کدبیس، fetch هم‌مبدأ داخل sw.js است', () => {
    const offenders = srcFiles.filter((f) => read(relative(ROOT, f)).includes('fetch('));
    expect(offenders).toEqual([]);
    // در public هم فقط sw.js
    const publicFetch = publicFiles.filter((f) => !f.endsWith('sw.js') && read(relative(ROOT, f)).includes('fetch('));
    expect(publicFetch).toEqual([]);
    expect(swSource.includes('fetch(')).toBe(true);
  });

  it('هیچ API شبکه/تلمتری دیگری در کد نیست', () => {
    const all = [...srcFiles, ...publicFiles, join(ROOT, 'index.html')];
    const banned = [
      'XMLHttpRequest',
      'navigator.sendBeacon',
      'new WebSocket',
      'gtag(',
      "importScript",
    ];
    for (const f of all) {
      const text = f.endsWith('.webmanifest') ? '' : read(relative(ROOT, f));
      for (const b of banned) expect(text.includes(b), `${b} در ${relative(ROOT, f)}`).toBe(false);
    }
  });

  it('هیچ URL مطلق خارجی در src/ و index.html نیست (فونت/اسکریپت/CDN)', () => {
    for (const f of srcFiles) {
      const text = read(relative(ROOT, f));
      // استثنا: کامنت‌های مستنداتی که آدرس Pages را ذکر می‌کنند
      const code = text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(code.match(/https?:\/\//), `URL خارجی در ${relative(ROOT, f)}`).toBeNull();
    }
    expect(htmlIndex.match(/https?:\/\//)).toBeNull();
  });
});
