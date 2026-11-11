import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { QuestionCard } from '../src/components/QuestionCard';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { toPersianDigits } from '../src/utils/mathEngine';
import type { Question } from '../src/types/curriculum';

/**
 * دسترس‌پذیری گزینه‌ها — بخش ۲ مأموریت RC1.1
 *
 * مشکل اصلاح‌شده: نام قابل‌دسترسی هر گزینه قبلاً فقط مقدار گزینه بود و
 * textContent بصری، badge شمارهٔ گزینه را به مقدار می‌چسباند
 * («۱» + «۳۴۰٬۰۰۰ تومان» → «۱۳۴۰٬۰۰۰ تومان»).
 *
 * قاعدهٔ الزامی: نام قابل‌دسترسی باید «گزینه N: مقدار» باشد، به‌طوری‌که N
 * همان عدد فارسی badge بصری است. صحت‌سنجی از طریق درخت دسترس‌پذیری
 * (getByRole radio با name) انجام می‌شود — شبیه‌سازی معتبر صفحه‌خوان.
 */

const allQuestions: Question[] = CURRICULUM_CHAPTERS.flatMap((c) =>
  c.lessons.flatMap((l) => l.questions)
);

const mcqQuestions = allQuestions.filter((q) => q.type === 'mcq');

describe('accessible name گزینه‌ها — کل سؤال‌های چهارگزینه‌ای برنامهٔ درسی', () => {
  it('همهٔ سؤال‌های MCQ پیدا می‌شوند (تست پوششی)', () => {
    expect(mcqQuestions.length).toBeGreaterThan(30);
  });

  for (const q of mcqQuestions) {
    it(`«${q.id}» — هر ${q.type === 'mcq' ? (q as { options: string[] }).options.length : 0} گزینه نام «گزینه N: مقدار» دارد`, () => {
      if (q.type !== 'mcq') return;
      render(<QuestionCard question={q} />);
      const card = screen.getByTestId(`question-${q.id}`);
      const radios = within(card).getAllByRole('radio');
      expect(radios.length).toBe(q.options.length);

      q.options.forEach((opt, idx) => {
        const expected = `گزینه ${toPersianDigits(idx + 1)}: ${opt}`;
        const radio = radios[idx];

        // ۱) نام قابل‌دسترسی از attribute (منبع حقیقت aria)
        expect(radio.getAttribute('aria-label')).toBe(expected);

        // ۲) شبیه‌سازی صفحه‌خوان: جست‌وجو از طریق درخت دسترس‌پذیری
        //    getByRole با name دقیقاً accname محاسبه‌شده را می‌سنجد.
        expect(within(card).getByRole('radio', { name: expected })).toBe(radio);

        // ۳) نام قابل‌دسترسی نباید badge را به مقدار بچسباند
        //    (نمونهٔ ممنوع: «۱» + «۳۴۰٬۰۰۰ تومان» = «۱۳۴۰٬۰۰۰ تومان»)
        const merged = `${toPersianDigits(idx + 1)}${opt}`;
        expect(radio.getAttribute('aria-label')).not.toBe(merged);
      });

      // ۴) badge بصری تزئینی است و از درخت دسترس‌پذیری خارج می‌ماند
      card.querySelectorAll('[role="radio"] span[aria-hidden="true"]').forEach((badge) => {
        expect(badge.getAttribute('aria-hidden')).toBe('true');
      });
    });
  }

  it('نمونهٔ الزامی directive — q623 گزینهٔ ۱: متن بصری «۱» و «۳۴۰٬۰۰۰ تومان» جدا و accname «گزینه ۱: ۳۴۰٬۰۰۰ تومان»', () => {
    const q623 = mcqQuestions.find((q) => q.id === 'q623')!;
    render(<QuestionCard question={q623} />);
    const card = screen.getByTestId('question-q623');
    const first = within(card).getByRole('radio', { name: 'گزینه ۱: ۳۴۰٬۰۰۰ تومان' });
    expect(first).toBeTruthy();
    // textContent شامل badge + مقدار است (نمایش بصری دو تکهٔ جدا)
    expect(first.textContent).toContain('۳۴۰٬۰۰۰ تومان');
    expect(first.textContent!.length).toBeGreaterThan('۳۴۰٬۰۰۰ تومان'.length);
  });

  it('سؤال‌های عددی — input برچسب accessible دارد', () => {
    const numeric = allQuestions.filter((q) => q.type !== 'mcq');
    for (const q of numeric.slice(0, 6)) {
      render(<QuestionCard question={q} />);
      const card = screen.getByTestId(`question-${q.id}`);
      const input = card.querySelector('input')!;
      expect(input.id).toBeTruthy();
      const label = card.querySelector(`label[for="${input.id}"]`);
      expect(label).toBeTruthy();
      expect(label!.textContent!.length).toBeGreaterThan(5);
    }
  });
});
