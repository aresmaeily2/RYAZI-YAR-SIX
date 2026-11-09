import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuestionCard } from '../src/components/QuestionCard';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { flowForLesson } from '../src/data/flows';
import { LRI, PDI } from '../src/utils/mathBidi';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';

/**
 * تست‌های رندر واقعی مؤلفه — رگرسیون MISSION-2R
 * خروجی واقعی QuestionCard و LessonFlowPlayer باید قطعه‌های ریاضی را
 * محصور در LRI…PDI نمایش دهد و متن عادی را دست‌نخورده نگه دارد.
 */

const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

const q621 = qById.get('q621')!;
const q622 = qById.get('q622')!;
const q623 = qById.get('q623')!;

if (q621.type !== 'mcq' || q622.type !== 'mcq' || q623.type !== 'mcq') {
  throw new Error('q621/q622/q623 باید چهارگزینه‌ای باشند');
}

const ok = (explanation: string, diagnosis?: string): SubmitResult => ({
  isCorrect: true,
  explanation,
  diagnosis,
  earnedXp: 10,
});

describe('QuestionCard — q623 (نمونهٔ شکست نمایشی)', () => {
  it('صورت سؤال: «۱۵٪» محصور؛ «۴۰۰٬۰۰۰» بدون عملگر دست‌نخورده', () => {
    render(<QuestionCard question={q623} />);
    const card = screen.getByTestId('question-q623');
    const prompt = card.querySelector('p.font-bold')!;
    expect(prompt.textContent).toBe(
      `قیمت کیفی ۴۰۰٬۰۰۰ تومان است و فروشنده ${LRI}۱۵٪${PDI} تخفیف می‌دهد. مبلغ قابل پرداخت چقدر است؟`
    );
  });

  it('گزینه‌های پاسخ: عدد با جداکنندهٔ هزارگان بدون عملگر، بدون جداسازی نمایش داده می‌شود', () => {
    render(<QuestionCard question={q623} />);
    const card = screen.getByTestId('question-q623');
    const opt = screen
      .getAllByRole('radio')
      .find((r) => r.querySelector('span.flex-1')?.textContent === '۳۴۰٬۰۰۰ تومان')!;
    expect(opt).toBeInTheDocument();
    expect(opt.querySelector('span.flex-1')!.textContent).toBe('۳۴۰٬۰۰۰ تومان');
    expect(opt.querySelector('span.flex-1')!.textContent).not.toContain(LRI);
    expect(card).toBeInTheDocument();
  });

  it('بازخورد پاسخ درست: توضیح واقعی q623 با قطعهٔ ریاضی محصور در DOM رندر می‌شود', () => {
    render(<QuestionCard question={q623} onSubmit={() => ok(q623.explanation)} />);
    fireEvent.click(screen.getByRole('radio', { name: /۳۴۰٬۰۰۰ تومان/ }));
    fireEvent.click(screen.getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    const feedback = screen.getByTestId('feedback');
    expect(feedback.textContent).toContain(
      `مبلغ پرداختی = ${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI} تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).`
    );
  });

  it('بازخورد پاسخ نادرست + پزشک خطا: تشخیص فارسیِ بدون ریاضی، بدون جداسازی', () => {
    const diag = q623.misconceptions[0].diagnosis;
    render(
      <QuestionCard
        question={q623}
        onSubmit={() => ({ isCorrect: false, explanation: q623.explanation, diagnosis: diag, earnedXp: 0 })}
      />
    );
    const wrongOpt = screen
      .getAllByRole('radio')
      .find((r) => r.querySelector('span.flex-1')?.textContent === '۶۰٬۰۰۰ تومان')!;
    fireEvent.click(wrongOpt);
    fireEvent.click(screen.getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    const feedback = screen.getByTestId('feedback');
    expect(feedback.textContent).toContain(diag);
    expect(feedback.textContent).toContain(
      `${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI}`
    );
  });

  it('متن‌های راهنمایی: «۸۵٪ قیمت پرداخت می‌شود» و «۴۰۰٬۰۰۰» در راهنماها درست رفتار می‌کنند', () => {
    render(<QuestionCard question={q623} />);
    // سه بار کلیک روی دریافت راهنمایی → هر سه راهنما
    const hintBtn = screen.getByRole('button', { name: /دریافت راهنمایی/ });
    fireEvent.click(hintBtn);
    fireEvent.click(hintBtn);
    fireEvent.click(hintBtn);
    const card = screen.getByTestId('question-q623');
    const hints = card.textContent ?? '';
    // راهنمای ۲: «۱٪ از ۴۰۰٬۰۰۰ برابر ۴٬۰۰۰ تومان است.» — ۱٪ محصور؛ اعداد بدون عملگر دست‌نخورده
    expect(hints).toContain(`${LRI}۱٪${PDI} از ۴۰۰٬۰۰۰ برابر ۴٬۰۰۰ تومان است.`);
    // راهنمای ۳: «۸۵ × ۴٬۰۰۰ را حساب کن.» — عبارت ضرب محصور
    expect(hints).toContain(`${LRI}۸۵ × ۴٬۰۰۰${PDI} را حساب کن.`);
    // راهنمای ۱: «با ۱۵٪ تخفیف، ۸۵٪ قیمت پرداخت می‌شود.» — دو درصد محصور
    expect(hints).toContain(`با ${LRI}۱۵٪${PDI} تخفیف، ${LRI}۸۵٪${PDI} قیمت پرداخت می‌شود.`);
  });
});

describe('QuestionCard — q622 (درصد خالص)', () => {
  it('صورت سؤال «۲۰ از ۸۰ چند درصد است؟» بدون هیچ جداسازی می‌ماند', () => {
    render(<QuestionCard question={q622} />);
    const card = screen.getByTestId('question-q622');
    const prompt = card.querySelector('p.font-bold')!;
    expect(prompt.textContent).toBe('۲۰ از ۸۰ چند درصد است؟');
    expect(prompt.textContent).not.toContain(LRI);
  });

  it('گزینه‌های درصدی «۲۵٪» محصور رندر می‌شوند', () => {
    render(<QuestionCard question={q622} />);
    const opt = screen
      .getAllByRole('radio')
      .find((r) => r.querySelector('span.flex-1')?.textContent?.includes('۲۵٪'))!;
    expect(opt.querySelector('span.flex-1')!.textContent).toBe(`${LRI}۲۵٪${PDI}`);
  });

  it('حالت مرور (locked): توضیح با قطعهٔ محصور نمایش داده می‌شود', () => {
    render(
      <QuestionCard question={q623} locked lockedAnswer="۳۴۰٬۰۰۰ تومان" showCorrectOnLock />
    );
    const card = screen.getByTestId('question-q623');
    expect(card.textContent).toContain(`${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI}`);
    expect(card.textContent).toContain('پاسخ درست:');
  });
});

describe('QuestionCard — q621 (منفی: «درصد» در متن عادی)', () => {
  it('صورت سؤال با کلمهٔ «درصد» هیچ جداسازی نمی‌گیرد', () => {
    render(<QuestionCard question={q621} />);
    const card = screen.getByTestId('question-q621');
    const prompt = card.querySelector('p.font-bold')!;
    expect(prompt.textContent).toBe(q621.prompt);
    expect(prompt.textContent).not.toContain(LRI);
    expect(prompt.textContent).not.toContain(PDI);
  });
});

describe('LessonFlowPlayer — مثال حل‌شده (مرحله D جریان ch2l2)', () => {
  const flow = flowForLesson('ch2l2');
  if (!flow) throw new Error('جریان ch2l2 باید موجود باشد');
  const workedIdx = flow.stages.findIndex((s) => s.kind === 'worked-example');

  it('صورت مثال حل‌شده «۱/۳ + ۱/۶» محصور رندر می‌شود', () => {
    render(
      <LessonFlowPlayer
        flow={flow}
        questionsById={qById}
        onRecordAnswer={vi.fn(() => ok('ok'))}
        startStageIndex={workedIdx}
        onExit={vi.fn()}
      />
    );
    const panel = document.querySelector('p.font-bold.bg-brand-50')!;
    expect(panel.textContent).toBe(
      `حاصل ${LRI}۱/۳ + ۱/۶${PDI} را به ساده‌ترین صورت بنویسیم.`
    );
  });

  it('گام‌های بلنداندیشی: عبارت‌های کسری داخل متن گام‌ها محصور و متن توضیحی سالم است', () => {
    render(
      <LessonFlowPlayer
        flow={flow}
        questionsById={qById}
        onRecordAnswer={vi.fn(() => ok('ok'))}
        startStageIndex={workedIdx}
        onExit={vi.fn()}
      />
    );
    const body = document.body.textContent ?? '';
    expect(body).toContain(`${LRI}۲/۶ + ۱/۶ = ۳/۶${PDI}`);
    expect(body).toContain(`${LRI}۳/۶ = ۱/۲${PDI}`);
    // اشتباه رایج: «(۳ + ۶ = ۹)» — قطعهٔ ریاضی داخل پرانتز محصور می‌شود
    expect(body).toContain(`(${LRI}۳ + ۶ = ۹${PDI})`);
  });
});
