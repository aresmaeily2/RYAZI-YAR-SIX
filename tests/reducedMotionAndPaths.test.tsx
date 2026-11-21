import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StepSolverAnimation } from '../src/components/StepSolverAnimation';
import { AssistantPanel } from '../src/components/AssistantPanel';
import { bidiText, LRI, PDI } from '../src/utils/mathBidi';
import type { SolverAnimationSpec } from '../src/learning/flowTypes';

/**
 * بخش ۱٫۲ + ۳ مأموریت RC1.1:
 * ۱) Reduced Motion: پخش خودکار solver خاموش می‌ماند و پالس حرکتی ندارد.
 * ۲) مسیرهای رندرِ اصلاح‌شده (solver captions / assistant reply) bidi-isolated هستند.
 */

const SPEC: SolverAnimationSpec = {
  expression: '۴ + ۲ × ۳',
  steps: [
    { caption: 'اول ضرب: ۲ × ۳ را حساب می‌کنیم که می‌شود ۶.', expressionAfter: '۴ + ۶', highlight: '۲ × ۳' },
    { caption: 'حالا جمع: ۴ + ۶ = ۱۰.', expressionAfter: '۱۰', highlight: '۴ + ۶' },
  ],
  mistake: {
    caption: 'از چپ شروع کردن: ۴ + ۲ = ۶ و بعد ۶ × ۳ = ۱۸ — ترتیب عملیات رعایت نشد.',
    expression: '۴ + ۲ × ۳',
    highlight: '۴ + ۲',
  },
};

const mkReduce = (reduce: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion') ? true : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));

describe('Reduced Motion — StepSolverAnimation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('با prefers-reduced-motion: reduce — پخش خودکار غیرفعال است (دکمه «پخش»)', () => {
    vi.stubGlobal('matchMedia', mkReduce(true));
    render(<StepSolverAnimation spec={SPEC} />);
    expect(screen.getByTestId('anim-play').getAttribute('aria-label')).toBe('پخش انیمیشن');
  });

  it('بدون reduced-motion — پخش خودکار فعال است (دکمه «توقف»)', () => {
    vi.stubGlobal('matchMedia', mkReduce(false));
    render(<StepSolverAnimation spec={SPEC} />);
    expect(screen.getByTestId('anim-play').getAttribute('aria-label')).toBe('توقف انیمیشن');
  });
});

describe('مسیرهای رندر اصلاح‌شده — جداسازی bidi', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', mkReduce(true));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it('کپشن گام solver با عبارت ریاضی → جزیرهٔ LTR داخل RTL', async () => {
    render(<StepSolverAnimation spec={SPEC} />);
    await userEvent.click(screen.getByTestId('anim-next'));
    const body = document.body.textContent ?? '';
    expect(body).toContain(`${LRI}۲ × ۳${PDI}`);
    // متن توضیحی فارسی دور جزیره سالم است
    expect(body).toContain(`اول ضرب: ${LRI}۲ × ۳${PDI} را حساب می‌کنیم`);
  });

  it('کپشن اشتباه رایج — زنجیره‌های کامل محصور می‌شوند', async () => {
    render(<StepSolverAnimation spec={SPEC} />);
    await userEvent.click(screen.getByTestId('anim-mistake-toggle'));
    const body = document.body.textContent ?? '';
    expect(body).toContain(`از چپ شروع کردن: ${LRI}۴ + ۲ = ۶${PDI} و بعد ${LRI}۶ × ۳ = ۱۸${PDI}`);
  });

  it('خط پایان solver — عددِ بدون عملگر طبق قاعدهٔ محافظه‌کارانه بدون جزیره می‌ماند', async () => {
    render(<StepSolverAnimation spec={SPEC} />);
    await userEvent.click(screen.getByTestId('anim-next'));
    await userEvent.click(screen.getByTestId('anim-next'));
    const body = document.body.textContent ?? '';
    expect(body).toContain('عبارت کامل حل شد: ۱۰');
    // کپشن گام دوم حاوی زنجیرهٔ کامل محصور است
    expect(body).toContain(`حالا جمع: ${LRI}۴ + ۶ = ۱۰${PDI}`);
  });
});

describe('AssistantPanel — پاسخ دستیار bidi-isolated', () => {
  afterEach(() => cleanup());

  it('درس ch6l2 (گام‌های آموزشی با پرانتز ریاضی) — پاسخِ حاوی عبارت، در DOM جزیرهٔ LTR دارد', async () => {
    render(<AssistantPanel lessonId="ch6l2" />);
    const user = userEvent.setup();
    const requestButtons = screen.getAllByRole('button').filter(
      (b) => b.textContent && b.textContent.trim().length > 2 && !b.textContent.includes('پاک کردن')
    );
    let sawIsland = false;
    let checked = 0;
    for (const btn of requestButtons) {
      await user.click(btn);
      const reply = document.querySelector('[data-testid="assistant-reply"]');
      if (!reply) continue;
      checked++;
      const raw = reply.textContent ?? '';
      const plain = raw.split(LRI).join('').split(PDI).join('');
      // هر پاسخ در DOM باید دقیقاً نسخهٔ bidiText همان متن باشد (یک‌بار بسته‌بندی، بدون دستکاری)
      expect(bidiText(plain)).toBe(raw);
      if (raw.includes(LRI)) sawIsland = true;
    }
    expect(checked).toBeGreaterThan(0);
    expect(sawIsland, 'گام‌های ch6l2 حاوی «درصد = (زاویه ÷ ۳۶۰) × ۱۰۰» هستند — باید جزیره در DOM بیاید').toBe(true);
  });
});
