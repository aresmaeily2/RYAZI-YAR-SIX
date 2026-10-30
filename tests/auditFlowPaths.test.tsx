import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { flowForLesson } from '../src/data/flows';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';

/**
 * ممیزی فاز ۴ — مسیرهای دانش‌آموزی افزوده روی جریان پایلوت ch2l2:
 * مسیر ۳: دانش‌آموز درگیرِ خطا — استفاده از نردبان راهنما، حلقهٔ اصلاحی دوباره‌شکست،
 *          شکست مرحله C و تکرار آن، ثبت شواهد با راهنما.
 * مسیر ۴: شکست در تمرین مستقل و انتقال — ادامهٔ مسیر با ثبت شواهد (عبور اجباری نیست).
 */

const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

interface Rec {
  qid: string;
  source: string;
  correct: boolean;
  hints: number;
}
function makeRecorder(recorded: Rec[]) {
  return (q: Question, answer: string, hintsUsed: number, source: 'practice' | 'prereq' | 'transfer'): SubmitResult => {
    let isCorrect = false;
    if (q.type === 'mcq') isCorrect = answer === q.correctAnswer;
    else {
      const norm = (s: string) => s.replace(/\s/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      isCorrect = q.acceptedAnswers.some((a) => norm(a) === norm(answer));
    }
    recorded.push({ qid: q.id, source, correct: isCorrect, hints: hintsUsed });
    return { isCorrect, explanation: q.explanation, earnedXp: isCorrect ? 10 : 2 };
  };
}

function findQuestion(qid: string): Question | undefined {
  if (qById.has(qid)) return qById.get(qid);
  const flow = flowForLesson('ch2l2')!;
  for (const s of flow.stages) {
    const q = s.inlineQuestions?.find((x) => x.id === qid) ?? s.retestQuestions?.find((x) => x.id === qid);
    if (q) return q;
  }
  return undefined;
}

/** پاسخ دادن به همهٔ کارت‌های فعال؛ با کنترل تعداد راهنمای مصرفی */
function answerAll(recorder: ReturnType<typeof makeRecorder>, mode: 'correct' | 'wrong' | 'with-hints', hintClicks = 0) {
  const cards = screen.getAllByTestId(/^question-/);
  for (const card of cards) {
    const qid = card.getAttribute('data-testid')!.replace('question-', '');
    const question = findQuestion(qid);
    if (!question) continue;
    if (mode === 'with-hints') {
      const hintBtn = within(card).getByRole('button', { name: /دریافت راهنمایی/ });
      for (let i = 0; i < hintClicks; i++) fireEvent.click(hintBtn);
    }
    if (question.type === 'mcq') {
      const optionText =
        mode === 'wrong'
          ? question.options.find((o) => o !== question.correctAnswer)!
          : question.correctAnswer;
      fireEvent.click(within(card).getByRole('radio', { name: optionText }));
    } else {
      const input = within(card).getByLabelText(/پاسخ عددی خود را بنویس/);
      const value = mode === 'wrong' ? '999999' : question.acceptedAnswers[0];
      fireEvent.change(input, { target: { value } });
    }
    fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
  }
}

describe('ممیزی فاز ۴ — مسیر ۳: دانش‌آموز درگیرِ خطا با نردبان راهنما', () => {
  it('شکست در A → یادآوری → شکست در بازآزمون → تکرار حلقهٔ اصلاحی → عبور؛ سپس شکست مرحله C و تکرار آن؛ ثبت شواهد با راهنما', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    // A: پاسخ غلط → یادآوری
    answerAll(makeRecorder(recorded), 'wrong');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-remedial')).toBeInTheDocument();

    // بازآزمون: دوباره غلط → حلقهٔ اصلاحی تکرار می‌شود (روش آموزش عوض نمی‌شود — یافتهٔ ممیزی)
    answerAll(makeRecorder(recorded), 'wrong');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-remedial')).toBeInTheDocument();
    expect(screen.getByTestId('question-flow-ch2l2-a-r1')).toBeInTheDocument();

    // بازآزمون سوم: این‌بار با مصرف ۲ راهنما درست → عبور
    answerAll(makeRecorder(recorded), 'with-hints', 2);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/لیوان‌های آب پرتقال/)).toBeInTheDocument();

    // B: درست
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });

    // C: فقط ۱ درست از ۳ (شرط عبور ۲) → تکرار مرحله با همان محتوا
    const cCards = screen.getAllByTestId(/^question-/);
    const firstC = cCards[0];
    const qid1 = firstC.getAttribute('data-testid')!.replace('question-', '');
    const q1 = findQuestion(qid1)!;
    if (q1.type === 'mcq') fireEvent.click(within(firstC).getByRole('radio', { name: q1.correctAnswer }));
    else fireEvent.change(within(firstC).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: q1.acceptedAnswers[0] } });
    fireEvent.click(within(firstC).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    for (const card of cCards.slice(1)) {
      const qid = card.getAttribute('data-testid')!.replace('question-', '');
      const q = findQuestion(qid)!;
      if (q.type === 'mcq') fireEvent.click(within(card).getByRole('radio', { name: q.options.find((o) => o !== q.correctAnswer)! }));
      else fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: '999999' } });
      fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    }
    act(() => { vi.advanceTimersByTime(1000); });
    // هنوز در مرحله C است (تکرار) — با همان نمایش‌ها
    expect(screen.getByText(/سه نمایش متفاوت/)).toBeInTheDocument();

    // دوباره C با پاسخ کامل درست → عبور
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });

    // D → ادامه
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));

    // E: یک جای خالی را دوبار غلط → راهنما و سپس سؤال ساده‌تر (fallback) → پاسخ درست
    const m1 = screen.getByTestId('missing-step-1');
    fireEvent.change(m1.querySelector('input')!, { target: { value: '999' } });
    fireEvent.click(m1.querySelector('button')!);
    expect(within(m1).getByText(/راهنما:/)).toBeInTheDocument(); // نردبان: راهنمای اول
    fireEvent.change(m1.querySelector('input')!, { target: { value: '999' } });
    fireEvent.click(m1.querySelector('button')!);
    expect(within(m1).getByText(/گام‌به‌گام/)).toBeInTheDocument(); // سؤال ساده‌تر
    fireEvent.change(m1.querySelector('input')!, { target: { value: '10' } });
    fireEvent.click(m1.querySelector('button')!);
    // بقیه جای خالی‌ها درست
    const m2 = screen.getByTestId('missing-step-2');
    fireEvent.change(m2.querySelector('input')!, { target: { value: '4/10' } });
    fireEvent.click(m2.querySelector('button')!);
    const m3 = screen.getByTestId('missing-step-3');
    fireEvent.change(m3.querySelector('input')!, { target: { value: '1/2' } });
    fireEvent.click(m3.querySelector('button')!);
    act(() => { vi.advanceTimersByTime(1000); });

    // F: درست
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });

    // G: درست با راهنما → پایان
    answerAll(makeRecorder(recorded), 'with-hints', 1);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();

    // شواهد: بازآزمون‌ها با منبع prereq (۲ بار شکست + ۱ موفقیت + ۲ تلاش اولیه)
    expect(recorded.filter((r) => r.source === 'prereq').length).toBe(6);
    // تلاش موفق با راهنما ثبت شده و hintsUsed حفظ شده است
    const hinted = recorded.filter((r) => r.hints > 0 && r.correct);
    expect(hinted.length).toBeGreaterThanOrEqual(3);
    // شواهد انتقال
    expect(recorded.filter((r) => r.source === 'transfer').length).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });
});

describe('ممیزی فاز ۴ — مسیر ۴: شکست در تمرین مستقل و انتقال', () => {
  it('عبور اجباری نیست؛ شکست ثبت می‌شود و مسیر با شواهد منفی ادامه می‌یابد', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    // A تا E درست و سریع
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });
    answerAll(makeRecorder(recorded), 'correct');
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));
    const steps = ['10', '4/10', '1/2'];
    for (let i = 1; i <= 3; i++) {
      const m = screen.getByTestId(`missing-step-${i}`);
      fireEvent.change(m.querySelector('input')!, { target: { value: steps[i - 1] } });
      fireEvent.click(m.querySelector('button')!);
    }
    act(() => { vi.advanceTimersByTime(1000); });

    // F: همه غلط → با وجود شکست، به G می‌رود (شواهد منفی ثبت شده)
    answerAll(makeRecorder(recorded), 'wrong');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/ظاهری تازه/)).toBeInTheDocument();
    expect(recorded.filter((r) => r.source === 'practice' && !r.correct).length).toBeGreaterThanOrEqual(5);

    // G: غلط → پایان مسیر با شواهد منفی
    answerAll(makeRecorder(recorded), 'wrong');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();
    expect(recorded.filter((r) => r.source === 'transfer' && !r.correct).length).toBe(2);
    vi.useRealTimers();
  });
});
