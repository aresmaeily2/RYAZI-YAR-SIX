import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { flowForLesson, buildFlowQuestionIndex } from '../src/data/flows';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { missingStepAsQuestion } from '../src/learning/flowTypes';
import { rebuildSkillStates } from '../src/learning/builder';
import { isNumericAnswerCorrect } from '../src/utils/answerChecking';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';

/**
 * اصلاح F10 — ثبت شواهد مرحلهٔ E (مثال ناقص).
 *
 * علت ریشه‌ای که پیش‌تر یافت شد: تلاش‌های گام‌های حذف‌شده فقط در وضعیت محلیِ
 * بازیکن ثبت می‌شدند و هرگز به onRecordAnswer (موتور یادگیری) ارسال نمی‌شدند؛
 * شناسهٔ گام‌ها نیز در ایندکس پرسش→مهارت نبود. نتیجه: هیچ شاهدی از مرحلهٔ E
 * (تلاش، خطا، راهنمای دریافت‌شده) در وضعیت یادگیرنده ثبت نمی‌شد.
 *
 * رفتار اصلاح‌شده:
 *  ۱) هر تلاش گام (درست یا غلط) با همان موتور تصحیح به موتور یادگیری ثبت می‌شود
 *  ۲) شمار راهنمای دریافتی = تلاش‌های نادرست پیشین همان گام (نخستین تلاش مستقل)
 *  ۳) گام‌ها در buildFlowQuestionIndex به مهارت جریان نگاشت شده‌اند
 *  ۴) مسیر موفق و ناموفق هر دو آزمون رگرسیون دارند
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

function answerStageA() {
  const cards = screen.getAllByTestId(/^question-/);
  for (const card of cards) {
    const qid = card.getAttribute('data-testid')!.replace('question-', '');
    const question = findQuestion(qid)!;
    if (question.type === 'mcq') {
      fireEvent.click(within(card).getByRole('radio', { name: question.correctAnswer }));
    } else {
      fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: question.acceptedAnswers[0] } });
    }
    fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
  }
}

function submitStep(index: number, value: string) {
  const step = screen.getByTestId(`missing-step-${index}`);
  fireEvent.change(step.querySelector('input')!, { target: { value } });
  fireEvent.click(step.querySelector('button')!);
}

describe('F10 — نگاشت گام‌های مرحلهٔ E به مهارت', () => {
  it('شناسهٔ گام‌های حذف‌شده در ایندکس پرسش→مهارت به مهارت جریان نگاشت شده‌اند', () => {
    const flow = flowForLesson('ch2l2')!;
    const index = buildFlowQuestionIndex();
    const stageE = flow.stages.find((s) => s.kind === 'completion-example')!;
    for (const step of stageE.completionExample!.missingSteps) {
      expect(index.get(step.id)).toEqual({ skillId: flow.skillId, lessonId: flow.lessonId });
    }
  });

  it('missingStepAsQuestion با موتور تصحیح عددی برنامه سازگار است', () => {
    const flow = flowForLesson('ch2l2')!;
    const stageE = flow.stages.find((s) => s.kind === 'completion-example')!;
    const [m1, m2, m3] = stageE.completionExample!.missingSteps;
    expect(isNumericAnswerCorrect(missingStepAsQuestion(m1), '10')).toBe(true);
    expect(isNumericAnswerCorrect(missingStepAsQuestion(m2), '4/10')).toBe(true);
    expect(isNumericAnswerCorrect(missingStepAsQuestion(m3), '1/2')).toBe(true);
    expect(isNumericAnswerCorrect(missingStepAsQuestion(m1), '5')).toBe(false);
    expect(isNumericAnswerCorrect(missingStepAsQuestion(m3), '3/10')).toBe(false);
  });
});

describe('F10 — رگرسیون مسیر موفق مرحلهٔ E', () => {
  it('هر سه گام درستِ نخستین‌تلاش با منبع practice و بدون راهنما ثبت می‌شوند', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    // رسیدن به مرحلهٔ E: A و B و C درست، D ادامه
    answerStageA();
    act(() => { vi.advanceTimersByTime(1000); });
    answerStageA(); // B
    act(() => { vi.advanceTimersByTime(1000); });
    answerStageA(); // C
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));
    expect(screen.getByText(/تو کامل کن/)).toBeInTheDocument();

    // مرحلهٔ E — هر سه گام درست در نخستین تلاش
    submitStep(1, '10');
    submitStep(2, '4/10');
    submitStep(3, '1/2');
    act(() => { vi.advanceTimersByTime(1000); });

    // سه تلاش ثبت شده با منبع تمرین و صفر راهنما
    const stepRecords = recorded.filter((r) => r.qid.startsWith('flow-ch2l2-e-'));
    expect(stepRecords).toHaveLength(3);
    expect(stepRecords.every((r) => r.source === 'practice')).toBe(true);
    expect(stepRecords.every((r) => r.correct && r.hints === 0)).toBe(true);

    // شواهد به موتور می‌رسد (ایندکس گام‌ها): ۳ شواهد تمرین برای sk-ch2l2
    const attempts = stepRecords.map((r, i) => ({
      id: `t${i}`,
      questionId: r.qid,
      chapterId: 'flow',
      lessonId: 'flow',
      difficulty: 'easy' as const,
      selectedAnswer: 'x',
      isCorrect: r.correct,
      hintsUsed: r.hints,
      timestamp: 1700000000000 + i,
      source: 'practice' as const,
    }));
    const states = rebuildSkillStates(attempts, buildFlowQuestionIndex(), 1700000001000);
    expect(states['sk-ch2l2'].evidence).toHaveLength(3);
    expect(states['sk-ch2l2'].evidence.every((e) => e.source === 'practice' && e.isCorrect && e.hintsUsed === 0)).toBe(true);
    vi.useRealTimers();
  });
});

describe('F10 — رگرسیون مسیر ناموفق و نردبان راهنما', () => {
  it('تلاش‌های نادرست نیز ثبت می‌شوند؛ شمار راهنما با پله‌های نردبان سازگار است', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    const flow = flowForLesson('ch2l2')!;
    render(<LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    answerStageA();
    act(() => { vi.advanceTimersByTime(1000); });
    answerStageA();
    act(() => { vi.advanceTimersByTime(1000); });
    answerStageA();
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));

    // گام ۱: دو تلاش نادرست (راهنما ← سؤال ساده‌تر) و سپس پاسخ درست
    submitStep(1, '999');
    expect(within(screen.getByTestId('missing-step-1')).getByText(/راهنما:/)).toBeInTheDocument();
    submitStep(1, '999');
    expect(within(screen.getByTestId('missing-step-1')).getByText(/گام‌به‌گام/)).toBeInTheDocument();
    submitStep(1, '10');
    // گام ۲ و ۳ درست
    submitStep(2, '4/10');
    submitStep(3, '1/2');
    act(() => { vi.advanceTimersByTime(1000); });

    const m1 = recorded.filter((r) => r.qid === 'flow-ch2l2-e-m1');
    expect(m1).toHaveLength(3);
    // نخستین تلاش نادرست: مستقل (بدون راهنما)
    expect(m1[0]).toMatchObject({ correct: false, hints: 0 });
    // تلاش نادرست دوم پس از دیدن راهنمای اول
    expect(m1[1]).toMatchObject({ correct: false, hints: 1 });
    // پاسخ درست پس از سؤال ساده‌تر: موفقیت با راهنما
    expect(m1[2]).toMatchObject({ correct: true, hints: 2 });
    // گام‌های ۲ و ۳ مستقل ثبت شده‌اند
    expect(recorded.find((r) => r.qid === 'flow-ch2l2-e-m2')).toMatchObject({ correct: true, hints: 0 });
    expect(recorded.find((r) => r.qid === 'flow-ch2l2-e-m3')).toMatchObject({ correct: true, hints: 0 });

    // مسیر ادامه می‌یابد (عبور مرحله با ۳ پاسخ درست) — رفتار قبلی حفظ شده
    expect(screen.getByText(/نوبت توست/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('شواهد خطای مرحلهٔ E به طبقه‌بندی خطا می‌رسد (source/مسیر سازگار با سایر پرسش‌ها)', () => {
    // شبیه‌سازی ثبت تلاش نادرست گام از طریق recordAttempt واقعی با پرسش معادل
    const flow = flowForLesson('ch2l2')!;
    const stageE = flow.stages.find((s) => s.kind === 'completion-example')!;
    const step = stageE.completionExample!.missingSteps[0];
    const q = missingStepAsQuestion(step);
    // پرسش معادل: نوع عددی، منبع تمرین، آسان — دقیقاً مانند سایر شواهد
    expect(q.type).toBe('numeric');
    expect(q.acceptedAnswers).toEqual(step.acceptedAnswers);
    const attempts = [
      {
        id: 'x1',
        questionId: q.id,
        chapterId: q.chapterId,
        lessonId: q.lessonId,
        difficulty: q.difficulty,
        selectedAnswer: '999',
        isCorrect: false,
        hintsUsed: 1,
        timestamp: 1700000000000,
        source: 'practice' as const,
      },
    ];
    const states = rebuildSkillStates(attempts, buildFlowQuestionIndex(), 1700000001000);
    const ev = states['sk-ch2l2'].evidence[0];
    expect(ev.isCorrect).toBe(false);
    expect(ev.hintsUsed).toBe(1);
    expect(ev.errorCode).toBeDefined(); // خطا طبقه‌بندی شده است
  });
});
