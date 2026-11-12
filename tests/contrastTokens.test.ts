import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTRAST_CASES, TOKENS, contrastRatio } from '../src/utils/contrast';

/**
 * بخش ۱ مأموریت RC1.1 — رگرسیون کنتراست
 * هر زوج رنگی واقعی UI باید حد WCAG خود را پاس کند؛ گرادیان‌ها با بدترین stop.
 * جدول کامل در src/utils/contrast.ts (CONTRAST_CASES).
 */

describe('WCAG کنتراست — زوج‌های توکنی واقعی UI', () => {
  for (const c of CONTRAST_CASES) {
    const bgs = Array.isArray(c.bg) ? c.bg : [c.bg];
    it(`${c.id} — حد ${c.min}${c.note ? ` (${c.note})` : ''}`, () => {
      for (const bg of bgs) {
        const r = contrastRatio(TOKENS[c.fg], TOKENS[bg]);
        expect(r, `${c.fg} روی ${bg} = ${r.toFixed(2)}`).toBeGreaterThanOrEqual(c.min);
      }
    });
  }

  it('زوج‌های اصلاح‌شده — نسخه‌های قدیمیِ ردشده اکنون باید رد شوند (سند رفتار)', () => {
    // قدیمی‌ها که در ممیزی RC1.1 FAIL شدند — باید همچنان FAIL بمانند تا
    // اگر کسی برگرداندشان، این تست ناسازگاری را نشان دهد
    expect(contrastRatio(TOKENS['sun-600'], TOKENS['sun-50'])).toBeLessThan(4.5);
    expect(contrastRatio(TOKENS['slate-400'], TOKENS['white'])).toBeLessThan(4.5);
    expect(contrastRatio(TOKENS['slate-500'], TOKENS['slate-100'])).toBeLessThan(4.5);
    expect(contrastRatio(TOKENS['white'], TOKENS['brand-500'])).toBeLessThan(4.5);
  });
});

describe('قرارداد کلاس‌ها — جلوگیری از بازگشت رگرسیون در سورس', () => {
  const read = (f: string) => readFileSync(join(process.cwd(), 'src', f), 'utf-8');

  it('دکمهٔ راهنمای QuestionCard دیگر text-sun-600 ندارد', () => {
    const src = read('components/QuestionCard.tsx');
    expect(src).not.toContain('text-sun-600');
    expect(src).toContain('text-sun-700');
  });

  it('بadge شماره گزینه دیگر text-slate-500 روی slate-100 نیست', () => {
    const src = read('components/QuestionCard.tsx');
    expect(src).not.toContain('bg-slate-100 text-slate-500');
    expect(src).toContain('bg-slate-100 text-slate-600');
  });

  it('کارت گام بعدی دیگر گرادیان emerald-600 ندارد (بدترین stop قبلاً FAIL بود)', () => {
    const src = read('components/DiagnosticDashboard.tsx');
    expect(src).not.toContain('from-emerald-700 to-emerald-600 text-white');
    expect(src).toContain('from-emerald-800 to-emerald-700 text-white');
  });

  it('یادداشت تشویق دستیار دیگر slate-500 روی brand-50 نیست (4.26→6.0)', () => {
    const src = read('components/AssistantPanel.tsx');
    expect(src).toContain('text-[11px] text-slate-600');
    expect(src).not.toContain('text-[11px] text-slate-500');
  });

  it('متادیتای کوچک App دیگر text-slate-400 ندارد', () => {
    const src = read('App.tsx');
    expect(src).not.toContain('text-[11px] text-slate-400');
  });

  it('badge درس از brand-600 استفاده می‌کند (نه brand-500)', () => {
    const src = read('App.tsx');
    expect(src).toContain('from-brand-600 to-violet-600 text-white text-xs font-black');
  });
});
