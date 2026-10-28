import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { flowForLesson } from '../src/data/flows';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';

/** همه پرسش‌های کتاب با شناسه */
const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

/** کلیدهای درست پرسش‌های کتاب استفاده‌شده در جریان پایلوت (مرجع مستند) */
const CORRECT_KEYS_DOCUMENTED: Record<string, string> = {
  q211: '2/3',
  q213: '۱/۵',
  q221: '۳/۴',
  q222: '۱۱/۱۲',
  q223: '1/3',
  q224: '۳/۴ لیتر',
};
void CORRECT_KEYS_DOCUMENTED;

function makeRecorder(recorded: Array<{ qid: string; source: string; correct: boolean }>) {
  return (q: Question, answer: string, _hintsUsed: number, source: 'practice' | 'prereq' | 'transfer'): SubmitResult => {
    let isCorrect = false;
    if (q.type === 'mcq') isCorrect = answer === q.correctAnswer;
    else {
      // پاسخ عددی: مقایسه ساده با acceptedAnswers پس از حذف فاصله
      const norm = (s: string) => s.replace(/\s/g, '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      isCorrect = q.acceptedAnswers.some((a) => norm(a) === norm(answer));
    }
    recorded.push({ qid: q.id, source, correct: isCorrect });
    return { isCorrect, explanation: q.explanation, earnedXp: isCorrect ? 10 : 2 };
  };
}

function answerCurrentQuestions(_recorder: ReturnType<typeof makeRecorder>, withCorrect: boolean) {
  // همه کارت‌های سؤال فعال را پیدا و پاسخ می‌دهیم
  const cards = screen.getAllByTestId(/^question-/);
  for (const card of cards) {
    const qid = card.getAttribute('data-testid')!.replace('question-', '');
    const question = findQuestion(qid);
    if (!question) continue;
    if (question.type === 'mcq') {
      const optionText = withCorrect ? question.correctAnswer : question.options.find((o) => o !== question.correctAnswer)!;
      const option = within(card).getByRole('radio', { name: optionText });
      fireEvent.click(option);
    } else {
      const input = within(card).getByLabelText(/پاسخ عددی خود را بنویس/);
      const value = withCorrect ? question.acceptedAnswers[0] : '999999';
      fireEvent.change(input, { target: { value } });
    }
    const submit = within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ });
    fireEvent.click(submit);
  }
}

function findQuestion(qid: string): Question | undefined {
  // از کتاب
  if (qById.has(qid)) return qById.get(qid);
  // از جریان (inline/retest)
  const flow = flowForLesson('ch2l2')!;
  for (const s of flow.stages) {
    const q = s.inlineQuestions?.find((x) => x.id === qid) ?? s.retestQuestions?.find((x) => x.id === qid);
    if (q) return q;
  }
  return undefined;
}

describe('یکپارچگی کامل مسیر درس پایلوت (UI)', () => {
  it('مسیر موفق: از سنجش پیش‌نیاز تا سنجش انتقال با پاسخ‌های درست طی می‌شود', () => {
    vi.useFakeTimers();
    const recorded: Array<{ qid: string; source: string; correct: boolean }> = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    // مرحله A — سنجش پیش‌نیاز (q211, q213)
    expect(screen.getByText(/پایه‌های این درس را بررسی کنیم/)).toBeInTheDocument();
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });

    // مرحله B — درک شهودی
    expect(screen.getByText(/لیوان‌های آب پرتقال/)).toBeInTheDocument();
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });

    // مرحله C — نمایش‌ها
    expect(screen.getByText(/سه نمایش متفاوت/)).toBeInTheDocument();
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });

    // مرحله D — مثال حل‌شده (بدون پرسش)
    expect(screen.getByText(/با هم حل کنیم/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));

    // مرحله E — مثال ناقص (سه جای خالی)
    expect(screen.getByText(/تو کامل کن/)).toBeInTheDocument();
    const m1 = screen.getByTestId('missing-step-1').querySelector('input')!;
    fireEvent.change(m1, { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('missing-step-1').querySelector('button')!);
    const m2 = screen.getByTestId('missing-step-2').querySelector('input')!;
    fireEvent.change(m2, { target: { value: '4/10' } });
    fireEvent.click(screen.getByTestId('missing-step-2').querySelector('button')!);
    const m3 = screen.getByTestId('missing-step-3').querySelector('input')!;
    fireEvent.change(m3, { target: { value: '1/2' } });
    fireEvent.click(screen.getByTestId('missing-step-3').querySelector('button')!);
    act(() => { vi.advanceTimersByTime(1000); });

    // مرحله F — تمرین مستقل (q221,q222,q223,q224 + خطایابی)
    expect(screen.getByText(/نوبت توست/)).toBeInTheDocument();
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });

    // مرحله G — سنجش انتقال
    expect(screen.getByText(/ظاهری تازه/)).toBeInTheDocument();
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });

    // پایان
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();

    // منبع شواهد: پیش‌نیاز‌ها با source=prereq ثبت شده‌اند
    expect(recorded.filter((r) => r.source === 'prereq').length).toBeGreaterThanOrEqual(2);
    expect(recorded.filter((r) => r.source === 'transfer').length).toBeGreaterThanOrEqual(2);
    expect(recorded.every((r) => r.correct)).toBe(true);
    vi.useRealTimers();
  });

  it('مسیر اصلاحی: شکست در پیش‌نیاز → یادآوری کوتاه و بازآزمون (نه عبور اجباری)', () => {
    vi.useFakeTimers();
    const recorded: Array<{ qid: string; source: string; correct: boolean }> = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    // مرحله A با پاسخ نادرست
    answerCurrentQuestions(makeRecorder(recorded), false);
    act(() => { vi.advanceTimersByTime(1000); });

    // باید یادآوری اصلاحی نمایش داده شود
    expect(screen.getByTestId('flow-remedial')).toBeInTheDocument();
    // پرسش‌های بازآزمون جای سؤال‌های اصلی را گرفته‌اند
    expect(screen.getByTestId('question-flow-ch2l2-a-r1')).toBeInTheDocument();

    // بازآزمون با پاسخ درست → عبور به مرحله بعد
    answerCurrentQuestions(makeRecorder(recorded), true);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/لیوان‌های آب پرتقال/)).toBeInTheDocument();

    // شواهد بازآزمون هم با منبع prereq ثبت شده‌اند
    expect(recorded.filter((r) => r.source === 'prereq').length).toBe(4); // ۲ بار اول + ۲ بازآزمون
    vi.useRealTimers();
  });
});
