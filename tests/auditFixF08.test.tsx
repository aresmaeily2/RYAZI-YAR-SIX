import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { flowForLesson } from '../src/data/flows';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { prereqConfirmation, isStagePassed, advanceFlow, type StageAttemptOutcome } from '../src/learning/flowLogic';
import { rebuildSkillStates, buildQuestionIndex } from '../src/learning/builder';
import type { SkillState } from '../src/learning/types';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';

/**
 * بررسی F08 — آیا یک پاسخ برای تأیید پیش‌نیاز کفایت می‌کند؟
 *
 * پاسخ مستند (سیاست پیاده‌شده): یک عدد ثابت بی‌توجیه نه. تصمیم تابع سه عامل است:
 *  ۱) استقلال — فقط پاسخ بدون راهنما شاهد تأیید است؛ پاسخِ راهنمادار → حلقهٔ یادآوری/بازآزمون
 *  ۲) سابقهٔ یادگیرنده روی مهارت پیش‌نیاز — تسلط پیشین: ۱ موفقیت کافی؛
 *     سابقهٔ متوسط یا بی‌سابقه: حداقل ۲ موفقیت مستقل
 *  ۳) نوع سؤال — تا وقتی پرسش پاسخ‌ساخت در مرحله هست و سابقهٔ قوی نیست،
 *     دست‌کم یک موفقیت مستقلِ پاسخ‌ساخت لازم است (حذف شانس حدسِ چهارگزینه‌ای)
 *
 * سازگاری: بدون skillStates، رفتار قبلی (قاعدهٔ دادهٔ مرحله) حفظ می‌شود.
 */

const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

const NOW = 1_700_000_000_000;

function skillState(partial: Partial<SkillState>): SkillState {
  return {
    skillId: 'sk-ch2l1',
    status: 'needspractice',
    evidence: [],
    independentCorrect: 0,
    independentTotal: 0,
    distinctIndependentSuccessProfiles: 0,
    transferPassed: false,
    delayedReviewPassed: false,
    prereqChecked: false,
    errorCounts: {},
    lastPracticedAt: null,
    nextReviewAt: null,
    reviewStage: 0,
    confidence: 0,
    ...partial,
  };
}

const oc = (isCorrect: boolean, hintsUsed = 0, constructedResponse = false): StageAttemptOutcome => ({
  questionId: 'q',
  isCorrect,
  hintsUsed,
  constructedResponse,
});

// مرحلهٔ A پایلوت: q211 عددی + q213 چهارگزینه‌ای، passRule: { minCorrect: 1 }
const flow = flowForLesson('ch2l2')!;
const stageA = flow.stages[0];

describe('F08 — منطق خالص prereqConfirmation', () => {
  it('دانش‌آموز بی‌سابقه با یک پاسخ درست (چهارگزینه‌ای): تأیید نمی‌شود', () => {
    const r = prereqConfirmation([oc(true, 0, false), oc(false)], 1, skillState({ status: 'notstarted' }));
    expect(r.confirmed).toBe(false);
    expect(r.required).toBe(2);
    expect(r.hasPriorHistory).toBe(false);
  });

  it('دانش‌آموز بی‌سابقه با دو موفقیت مستقل شامل پاسخ‌ساخت: تأیید می‌شود', () => {
    const r = prereqConfirmation([oc(true, 0, true), oc(true, 0, false)], 1, skillState({ status: 'notstarted' }));
    expect(r.confirmed).toBe(true);
    expect(r.independentCorrect).toBe(2);
  });

  it('حذف شانس حدس: موفقیت‌های مستقل فقط چهارگزینه‌ای‌اند و تلاش پاسخ‌ساخت نادرست بوده → تأیید نمی‌شود', () => {
    const r = prereqConfirmation([oc(true, 0, false), oc(true, 0, false), oc(false, 0, true)], 1, skillState({ status: 'notstarted' }));
    // پرسش پاسخ‌ساخت مرحله درست نشده → شانس حدس حذف نشده → تأیید نمی‌شود
    expect(r.confirmed).toBe(false);
  });

  it('مرحلهٔ فقط‌چهارگزینه‌ای: شرط پاسخ‌ساخت منتفی است', () => {
    const r = prereqConfirmation([oc(true, 0, false), oc(true, 0, false)], 1, skillState({ status: 'notstarted' }));
    expect(r.confirmed).toBe(true);
  });

  it('سابقهٔ متوسط (دقت مستقل ≥ ۵۰٪ در ≥۲ تلاش): همچنان ۲ موفقیت مستقل لازم است', () => {
    const r = prereqConfirmation([oc(true, 0, true)], 1, skillState({ independentTotal: 2, independentCorrect: 1 }));
    expect(r.hasPriorHistory).toBe(true);
    expect(r.strongHistory).toBe(false);
    expect(r.confirmed).toBe(false);
    expect(r.required).toBe(2);
  });

  it('سابقهٔ قوی (تسلط موقت/تأییدشده): یک موفقیت مستقل کافی است — حتی چهارگزینه‌ای', () => {
    const rMcq = prereqConfirmation([oc(true, 0, false)], 1, skillState({ status: 'temporary-mastery' }));
    expect(rMcq.confirmed).toBe(true);
    expect(rMcq.required).toBe(1);
    expect(rMcq.strongHistory).toBe(true);
    const rNum = prereqConfirmation([oc(true, 0, true)], 1, skillState({ status: 'confirmed-mastery' }));
    expect(rNum.confirmed).toBe(true);
  });

  it('پاسخ درست فقط با راهنما: تأیید نمی‌شود (guidedOnly) — حلقهٔ یادآوری مسیر موجود', () => {
    const r = prereqConfirmation([oc(true, 2, true), oc(true, 1, false)], 1, skillState({ status: 'temporary-mastery' }));
    expect(r.guidedOnly).toBe(true);
    expect(r.confirmed).toBe(false);
  });

  it('بدون وضعیت پیش‌نیاز (undefined): رفتار قدیمی حفظ می‌شود (قاعدهٔ دادهٔ مرحله)', () => {
    expect(isStagePassed(stageA, [oc(true, 2, false), oc(false)]).passed).toBe(true); // قبلاً ۱ درست کافی بود
    const legacy = prereqConfirmation([oc(true, 0, true)], 1, undefined);
    expect(legacy.required).toBe(2); // بی‌سابقه
  });

  it('یکپارچگی با advanceFlow: عدم تأیید → حلقهٔ اصلاحی؛ تأیید → مرحلهٔ بعد', () => {
    const fail = advanceFlow(flow, 0, [oc(true, 1, true), oc(false)], skillState({ status: 'notstarted' }));
    expect(fail.needsRemedialRetest).toBe(true);
    expect(fail.nextIndex).toBe(0);
    const pass = advanceFlow(flow, 0, [oc(true, 0, true), oc(true, 0, false)], skillState({ status: 'notstarted' }));
    expect(pass.nextIndex).toBe(1);
    expect(pass.needsRemedialRetest).toBe(false);
  });
});

// ================= یکپارچگی UI با وضعیت واقعی مهارت‌ها =================

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
  for (const s of flow.stages) {
    const q = s.inlineQuestions?.find((x) => x.id === qid) ?? s.retestQuestions?.find((x) => x.id === qid);
    if (q) return q;
  }
  return undefined;
}

function answerAll(mode: 'correct' | 'wrong') {
  const cards = screen.getAllByTestId(/^question-/);
  for (const card of cards) {
    const qid = card.getAttribute('data-testid')!.replace('question-', '');
    const question = findQuestion(qid);
    if (!question) continue;
    if (question.type === 'mcq') {
      const optionText = mode === 'wrong' ? question.options.find((o) => o !== question.correctAnswer)! : question.correctAnswer;
      fireEvent.click(within(card).getByRole('radio', { name: optionText }));
    } else {
      const value = mode === 'wrong' ? '999999' : question.acceptedAnswers[0];
      fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value } });
    }
    fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
  }
}

/** فقط q213 (چهارگزینه‌ای) درست — q211 عددی غلط */
function answerOnlyMcq() {
  const cards = screen.getAllByTestId(/^question-/);
  for (const card of cards) {
    const qid = card.getAttribute('data-testid')!.replace('question-', '');
    const question = findQuestion(qid)!;
    const isMcq = question.type === 'mcq';
    if (isMcq) {
      fireEvent.click(within(card).getByRole('radio', { name: question.correctAnswer }));
    } else {
      fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: '999999' } });
    }
    fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
  }
}

describe('F08 — یکپارچگی Player با وضعیت مهارت‌ها', () => {
  it('دانش‌آموز با تسلط پیشین روی sk-ch2l1: یک موفقیت مستقل کافی است', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    // سابقهٔ تسلط پیشین برای پیش‌نیاز sk-ch2l1
    const priorAttempts = [
      { id: 'p1', questionId: 'q211', chapterId: 'ch2', lessonId: 'ch2l1', difficulty: 'easy' as const, selectedAnswer: 'x', isCorrect: true, hintsUsed: 0, timestamp: NOW - 5000, source: 'practice' as const },
      { id: 'p2', questionId: 'q212', chapterId: 'ch2', lessonId: 'ch2l1', difficulty: 'medium' as const, selectedAnswer: 'x', isCorrect: true, hintsUsed: 0, timestamp: NOW - 4000, source: 'exam' as const },
      { id: 'p3', questionId: 'q213', chapterId: 'ch2', lessonId: 'ch2l1', difficulty: 'easy' as const, selectedAnswer: 'x', isCorrect: true, hintsUsed: 0, timestamp: NOW - 3500, source: 'exam' as const },
      { id: 'p4', questionId: 'q214', chapterId: 'ch2', lessonId: 'ch2l1', difficulty: 'hard' as const, selectedAnswer: 'x', isCorrect: true, hintsUsed: 0, timestamp: NOW - 3000, source: 'exam' as const },
    ];
    const skillStates = rebuildSkillStates(priorAttempts, buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    expect(skillStates['sk-ch2l1'].status).toBe('temporary-mastery');

    render(
      <LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} skillStates={skillStates} onExit={() => {}} />
    );
    // فقط q213 درست (یک موفقیت مستقل چهارگزینه‌ای) — با سابقهٔ قوی کافی است
    answerOnlyMcq();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/لیوان‌های آب پرتقال/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('دانش‌آموز بی‌سابقه: یک موفقیت مستقل کافی نیست → یادآوری و بازآزمون؛ دو موفقیت مستقل عبور', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    render(
      <LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} skillStates={{}} onExit={() => {}} />
    );
    // فقط q213 درست → بی‌سابقه + بدون پاسخ‌ساختِ درست → عدم تأیید
    answerOnlyMcq();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-remedial')).toBeInTheDocument();

    // بازآزمون (r1 عددی + r2 چهارگزینه‌ای) هر دو مستقل → تأیید
    answerAll('correct');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText(/لیوان‌های آب پرتقال/)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('دانش‌آموز بی‌سابقه که مرحله را با پاسخ‌های راهنمادار درست می‌زند: تأیید نمی‌شود', () => {
    vi.useFakeTimers();
    const recorded: Rec[] = [];
    render(
      <LessonFlowPlayer flow={flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} skillStates={{}} onExit={() => {}} />
    );
    // همه با مصرف راهنما درست → guidedOnly
    const cards = screen.getAllByTestId(/^question-/);
    for (const card of cards) {
      const qid = card.getAttribute('data-testid')!.replace('question-', '');
      const question = findQuestion(qid)!;
      const hintBtn = within(card).getByRole('button', { name: /دریافت راهنمایی/ });
      fireEvent.click(hintBtn);
      if (question.type === 'mcq') {
        fireEvent.click(within(card).getByRole('radio', { name: question.correctAnswer }));
      } else {
        fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: question.acceptedAnswers[0] } });
      }
      fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    }
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByTestId('flow-remedial')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
