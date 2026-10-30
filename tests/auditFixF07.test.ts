import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildFlowQuestionIndex } from '../src/data/flows';
import {
  buildQuestionIndex,
  rebuildSkillStates,
  applyReviewPlan,
  rebuildReviewPlan,
} from '../src/learning/builder';
import { scheduleNextReview, dueSkillIds, REVIEW_INTERVALS_DAYS } from '../src/learning/review';
import { useLearnerState } from '../src/hooks/useLearnerState';
import { STORAGE_KEY } from '../src/utils/storage';
import type { AttemptRecord, Difficulty, LearnerState } from '../src/types/curriculum';

/**
 * اصلاح F07 — بازسازی برنامهٔ مرور از تلاش‌ها و وضعیت یادگیرنده.
 *
 * رفتار مستند:
 *  ۱) برنامهٔ گم‌شده (دادهٔ نسخهٔ قبلی/پشتیبان ناقص) از تلاش‌ها بازسازی می‌شود
 *  ۲) بازسازی قطعی است: با برنامهٔ سالم کامل، خروجی بازسازی = مدخل ذخیره‌شده
 *  ۳) برنامهٔ ناقص ترمیم می‌شود؛ مدخل ذخیره‌شدهٔ معتبر اولویت دارد
 *  ۴) جلوگیری از مرور تکراری: مدخل بازسازی‌شده مرور آینده‌نگر دارد؛ مدخل کهنه رد می‌شود
 *  ۵) در hook، ترمیم با نخستین تلاش به ذخیره‌سازی پایدار منتقل می‌شود
 */

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
function att(
  questionId: string,
  opts: {
    isCorrect?: boolean;
    hintsUsed?: number;
    difficulty?: Difficulty;
    source?: AttemptRecord['source'];
    ts?: number;
  } = {}
): AttemptRecord {
  seq += 1;
  return {
    id: `f07_att_${seq}`,
    questionId,
    chapterId: 'ch2',
    lessonId: 'ch2l2',
    difficulty: opts.difficulty ?? 'easy',
    selectedAnswer: opts.isCorrect === false ? 'غلط' : 'درست',
    isCorrect: opts.isCorrect ?? true,
    hintsUsed: opts.hintsUsed ?? 0,
    timestamp: opts.ts ?? NOW - 1000 * (400 - seq),
    source: opts.source ?? 'practice',
  };
}

const QINDEX: ReadonlyMap<string, { skillId: string; lessonId: string }> = (() => {
  const merged = new Map(buildQuestionIndex(CURRICULUM_CHAPTERS));
  for (const [id, m] of buildFlowQuestionIndex()) merged.set(id, m);
  return merged;
})();

/** ثبت تدریجی برنامهٔ مرور — همان کاری که recordAttempt در اپ می‌کند */
function incrementallyRecordedPlan(attempts: AttemptRecord[]) {
  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  let plan: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }> | undefined;
  for (const a of sorted) {
    const mapped = QINDEX.get(a.questionId);
    if (!mapped) continue;
    const outcome = !a.isCorrect ? 'failure' : a.hintsUsed === 0 ? 'success-no-hints' : 'success-with-hints';
    const stage = plan?.[mapped.skillId]?.reviewStage ?? 0;
    const next = scheduleNextReview(stage, outcome, a.timestamp);
    plan = { ...(plan ?? {}), [mapped.skillId]: { nextReviewAt: next.nextReviewAt, reviewStage: next.reviewStage, lastPracticedAt: a.timestamp } };
  }
  return plan;
}

const EVIDENCE_ATTEMPTS = (): AttemptRecord[] => [
  att('q221', { isCorrect: true }),
  att('q222', { isCorrect: true }),
  att('q223', { isCorrect: true }),
  att('q224', { isCorrect: false }),
  att('q211', { isCorrect: true }), // مهارت پیش‌نیاز sk-ch2l1
];

describe('F07 — بازسازی برنامهٔ مرور گم‌شده', () => {
  beforeEach(() => {
    seq = 0;
  });

  it('برنامهٔ غایب → بازسازی از تلاش‌ها با پله‌های لایتنر درست', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    const plan = rebuildReviewPlan(attempts, QINDEX);

    // sk-ch2l2: ۳ موفقیت بدون راهنما (پله ۰→۱→۲→۳) + ۱ شکست (۳→۱)
    expect(plan['sk-ch2l2'].reviewStage).toBe(1);
    // sk-ch2l1: ۱ موفقیت (پله ۰→۱)
    expect(plan['sk-ch2l1'].reviewStage).toBe(1);
    // فاصلهٔ مرور مطابق بازهٔ پله
    expect(plan['sk-ch2l2'].nextReviewAt).toBe(attempts[3].timestamp + REVIEW_INTERVALS_DAYS[1] * DAY);
    // آخرین تلاش هر مهارت به‌عنوان lastPracticedAt ثبت شده است
    expect(plan['sk-ch2l2'].lastPracticedAt).toBe(attempts[3].timestamp);
  });

  it('قطعیت: بازسازی از تلاش‌ها با ثبت تدریجیِ برنامه در اپ یکسان است', () => {
    const attempts = [...EVIDENCE_ATTEMPTS(), att('q221', { isCorrect: true, hintsUsed: 2 }), att('q222', { isCorrect: false })];
    const rebuilt = rebuildReviewPlan(attempts, QINDEX);
    const incremental = incrementallyRecordedPlan(attempts);
    expect(rebuilt).toEqual(incremental);
  });

  it('ترتیب نامرتب تلاش‌ها اثر ندارد (پخش مجدد زمانی)', () => {
    const attempts = [...EVIDENCE_ATTEMPTS()];
    const shuffled = [...attempts].reverse();
    expect(rebuildReviewPlan(shuffled, QINDEX)).toEqual(rebuildReviewPlan(attempts, QINDEX));
  });

  it('برنامهٔ ناقص ترمیم می‌شود؛ مدخل ذخیره‌شدهٔ معتبر اولویت دارد', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    const persisted: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }> = {
      'sk-ch2l1': { nextReviewAt: NOW + 5 * DAY, reviewStage: 2, lastPracticedAt: attempts[4].timestamp },
    };
    const merged = { ...rebuildReviewPlan(attempts, QINDEX), ...persisted };

    // مهارت موجود در برنامهٔ ذخیره‌شده: همان مدخل ذخیره‌شده
    expect(merged['sk-ch2l1']).toEqual(persisted['sk-ch2l1']);
    // مهارت جاافتاده: از تلاش‌ها بازسازی شده است
    expect(merged['sk-ch2l2'].reviewStage).toBe(1);

    // اعمال بر وضعیت‌های مشتق: هر دو مهارت زمان‌بندی معتبر دارند
    const derived = rebuildSkillStates(attempts, QINDEX, NOW);
    const applied = applyReviewPlan(derived, merged);
    expect(applied['sk-ch2l1'].nextReviewAt).toBe(NOW + 5 * DAY);
    expect(applied['sk-ch2l2'].nextReviewAt).not.toBeNull();
  });

  it('دادهٔ نسخهٔ قبلی بدون reviewPlan: پیش از ترمیم بدون مرور بود؛ پس از ترمیم سررسید معتبر دارد', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    const derived = rebuildSkillStates(attempts, QINDEX, NOW);
    // بدون برنامه، وضعیت مشتق برنامهٔ مرور ندارد
    expect(derived['sk-ch2l2'].nextReviewAt).toBeNull();
    expect(dueSkillIds(derived, NOW)).toEqual([]);

    const healed = applyReviewPlan(derived, rebuildReviewPlan(attempts, QINDEX));
    expect(healed['sk-ch2l2'].nextReviewAt).toBeGreaterThan(NOW);
    // جلوگیری از مرور تکراری: مرور آینده‌نگر → در فهرست سررسید نیست
    expect(dueSkillIds(healed, NOW)).not.toContain('sk-ch2l2');
  });

  it('جلوگیری از مرور تکراری: مدخل ذخیره‌شدهٔ کهنه‌تر از شواهد رد می‌شود و مرور کاذب نمی‌سازد', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    const derived = rebuildSkillStates(attempts, QINDEX, NOW);
    const staleEntry = { nextReviewAt: NOW - DAY, reviewStage: 0, lastPracticedAt: attempts[3].timestamp - DAY };
    const applied = applyReviewPlan(derived, { 'sk-ch2l2': staleEntry });
    // گارد hasNewerEvidence: مدخل کهنه اعمال نشده → مرور کاذب سررسید نشده
    expect(applied['sk-ch2l2'].nextReviewAt).toBeNull();
    expect(dueSkillIds(applied, NOW)).not.toContain('sk-ch2l2');
  });

  it('مهارتی که آخرین تلاشش موفقیت بوده پس از بازسازی، سررسید مرور نیست (بدون مرور تکراری)', () => {
    const attempts = [att('q221', { isCorrect: true })];
    const healed = applyReviewPlan(rebuildSkillStates(attempts, QINDEX, NOW), rebuildReviewPlan(attempts, QINDEX));
    // یک موفقیت بدون راهنما → پله ۱ → بازهٔ ۳روزه
    expect(healed['sk-ch2l2'].nextReviewAt).toBe(attempts[0].timestamp + REVIEW_INTERVALS_DAYS[1] * DAY);
    expect(dueSkillIds(healed, attempts[0].timestamp + 3 * DAY - 1)).toEqual([]);
    // و هنگام سررسید واقعی، دقیقاً یک‌بار در فهرست می‌آید
    expect(dueSkillIds(healed, attempts[0].timestamp + 3 * DAY + 1)).toEqual(['sk-ch2l2']);
  });

  it('پرسش‌های ناشناخته در بازسازی نادیده گرفته می‌شوند (بدون برنامهٔ بی‌صاحب)', () => {
    const attempts = [...EVIDENCE_ATTEMPTS(), att('ghost-q', { isCorrect: true })];
    const plan = rebuildReviewPlan(attempts, QINDEX);
    expect(Object.keys(plan).sort()).toEqual(['sk-ch2l1', 'sk-ch2l2']);
  });
});

describe('F07 — هم‌کنش‌پذیری hook: ترمیم و انتقال به ذخیره‌سازی پایدار', () => {
  beforeEach(() => {
    localStorage.clear();
    seq = 0;
  });

  function seedStorage(state: Partial<LearnerState>) {
    const base: LearnerState = {
      studentName: 'آزمون‌گر',
      xp: 0,
      streakDays: 1,
      lastActiveDate: new Date().toISOString().slice(0, 10),
      lastVisitedChapterId: 'ch2',
      lastVisitedLessonId: 'ch2l2',
      completedLessonIds: [],
      attempts: [],
      ...state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(base));
  }

  it('بارگذاری دادهٔ بدون reviewPlan → skillStates زمان‌بندی بازسازی‌شده دارد', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    seedStorage({ attempts });
    const { result } = renderHook(() => useLearnerState());
    const st = result.current.skillStates['sk-ch2l2'];
    expect(st.nextReviewAt).not.toBeNull();
    expect(st.reviewStage).toBe(1);
  });

  it('پس از نخستین تلاش، برنامهٔ ترمیم‌شده در state (و ذخیره‌سازی) می‌نشیند', () => {
    const attempts = EVIDENCE_ATTEMPTS();
    seedStorage({ attempts });
    const { result } = renderHook(() => useLearnerState());

    // پیش از تلاش: state.reviewPlan غایب است اما برنامهٔ مؤثر بازسازی شده است
    expect(result.current.state.reviewPlan).toBeUndefined();
    expect(result.current.skillStates['sk-ch2l1'].nextReviewAt).not.toBeNull();

    // یک تلاش روی پرسش کتاب
    const q = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons).find((l) => l.id === 'ch2l2')!.questions[0];
    act(() => {
      result.current.recordAttempt(q, q.type === 'mcq' ? q.correctAnswer : (q as { acceptedAnswers: string[] }).acceptedAnswers[0], 0, 'practice');
    });

    // برنامهٔ ذخیره‌شده حالا هم مدخل مهارتِ تلاش و هم مدخل ترمیم‌شدهٔ سایر مهارت‌ها را دارد
    const plan = result.current.state.reviewPlan!;
    expect(plan['sk-ch2l2']).toBeDefined();
    expect(plan['sk-ch2l1']).toBeDefined();
    // مقدار sk-ch2l1 همان بازسازی از شواهد است
    const expected = rebuildReviewPlan(attempts, QINDEX)['sk-ch2l1'];
    expect(plan['sk-ch2l1'].reviewStage).toBe(expected.reviewStage);
    expect(plan['sk-ch2l1'].nextReviewAt).toBe(expected.nextReviewAt);

    // در localStorage نیز نشسته است
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.reviewPlan['sk-ch2l1']).toBeDefined();
  });
});
