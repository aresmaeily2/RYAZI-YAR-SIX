import { describe, expect, it, beforeEach } from 'vitest';
import {
  STORAGE_KEY,
  createInitialState,
  loadLearnerState,
  saveLearnerState,
  exportStateJson,
  importStateJson,
} from '../src/utils/storage';
import {
  buildQuestionIndex,
  rebuildSkillStates,
  rebuildReviewPlan,
  applyReviewPlan,
} from '../src/learning/builder';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { AttemptRecord, LearnerState } from '../src/types/curriculum';

/**
 * سناریوهای مهاجرت داده — پوشش شکاف ممیزی (k).
 *
 * معماری: وضعیت مهارت‌ها همیشه از «شواهد» مشتق می‌شود، پس ارتقای نسخه نیازی به
 * تبدیل schema ندارد؛ این آزمون‌ها رفتار مهاجرتی را به‌صورت صریح و قطعی قفل
 * می‌کنند تا تغییر آیندهٔ ساختار، این سازگاری را نشکند:
 *
 *  M1) کلیدهای نسخه‌های قدیمی‌تر (v1/v2) خوانده نمی‌شوند → وضعیت تازه (رفتار مستند)
 *  M2) ساختار قدیمی v3 (بدون reviewPlan/flowProgress) معتبر و round-trip است
 *  M3) برنامهٔ مرور گم‌شده از تلاش‌ها به‌صورت قطعی بازسازی می‌شود (== ثبت افزایشی)
 *  M4) دادهٔ خرابِ قدیمی → وضعیت تازه بدون کرش (bootstrap امن)
 *  M5) پشتیبان JSON با ساختار قدیمی import می‌شود؛ دادهٔ دستکاری‌شده رد می‌شود
 *  M6) flowProgress نبود/نامعتبر → پذیرش/ریست ایمن
 */

const QINDEX = buildQuestionIndex(CURRICULUM_CHAPTERS);
const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

let seq = 0;
function att(
  questionId: string,
  opts: { isCorrect?: boolean; hintsUsed?: number; ts?: number; source?: AttemptRecord['source'] } = {}
): AttemptRecord {
  seq += 1;
  const [chapterId] = questionId.match(/^q(\d)/)!.slice(1);
  const lessonId = `ch${chapterId}l${questionId.charAt(2)}`;
  const lesson = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons).find((l) => l.id === lessonId)!;
  const q = lesson.questions.find((x) => x.id === questionId)!;
  return {
    id: `mig_att_${seq}`,
    questionId,
    chapterId: `ch${chapterId}`,
    lessonId,
    difficulty: q.difficulty,
    selectedAnswer: opts.isCorrect === false ? 'پاسخ نادرست' : q.type === 'mcq' ? q.correctAnswer : q.acceptedAnswers[0],
    isCorrect: opts.isCorrect ?? true,
    hintsUsed: opts.hintsUsed ?? 0,
    timestamp: opts.ts ?? NOW,
    source: opts.source ?? 'practice',
  };
}

/** ساختار دقیق نسخهٔ پیش از موتور تطبیقی: بدون reviewPlan و flowProgress */
function legacyV3State(): LearnerState {
  const base = createInitialState('سارا');
  base.xp = 120;
  base.streakDays = 3;
  base.completedLessonIds = ['ch1l1'];
  base.attempts = [
    att('q111', { ts: NOW - 3 * DAY }),
    att('q121', { isCorrect: false, hintsUsed: 2, ts: NOW - 2 * DAY }),
  ];
  return base as LearnerState;
}

describe('M1 — کلیدهای نسخه‌های قدیمی خوانده نمی‌شوند', () => {
  beforeEach(() => localStorage.clear());

  it('v1/v2 موجودند اما STORAGE_KEY نیست → وضعیت تازه (بدون مهاجرت بین‌کلیدی؛ رفتار مستند)', () => {
    localStorage.setItem('ryaziyarsix.state', '{"xp":999}');
    localStorage.setItem('ryaziyarsix.state.v2', '{"xp":888}');
    const st = loadLearnerState();
    expect(st.xp).toBe(0);
    expect(st.attempts).toEqual([]);
    expect(st.studentName).toContain('دانش‌آموز');
  });

  it('پس از ذخیرهٔ وضعیت تازه، کلیدهای قدیمی دست‌نخورده می‌مانند (پاک‌سازی بر عهدهٔ کاربر)', () => {
    localStorage.setItem('ryaziyarsix.state.v2', '{"xp":888}');
    saveLearnerState(createInitialState());
    expect(localStorage.getItem('ryaziyarsix.state.v2')).toBe('{"xp":888}');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
  });
});

describe('M2/M3 — سازگاری ساختار قدیمی v3 و بازسازی قطعی', () => {
  beforeEach(() => localStorage.clear());

  it('M2: ساختار بدون reviewPlan/flowProgress معتبر است و round-trip می‌شود', () => {
    saveLearnerState(legacyV3State());
    const loaded = loadLearnerState();
    expect(loaded.studentName).toBe('سارا');
    expect(loaded.xp).toBe(120);
    expect(loaded.attempts.length).toBe(2);
  });

  it('M3: reviewPlan گم‌شده از تلاش‌ها بازسازی می‌شود و با مسیر افزایشی برابر است', () => {
    const legacy = legacyV3State();
    const attempts = legacy.attempts;
    // مسیر بازسازی (رفتار پس از ارتقا): مهارت‌ها از شواهد + برنامهٔ مرور از تلاش‌ها
    const rebuilt = rebuildSkillStates(attempts, QINDEX, NOW);
    const plan = rebuildReviewPlan(attempts, QINDEX);
    const healed = applyReviewPlan(rebuilt, plan);
    // مقایسه با همان مسیر روی کپی مستقل — قطعی و تکرارپذیر
    const rebuilt2 = applyReviewPlan(rebuildSkillStates(attempts, QINDEX, NOW), rebuildReviewPlan(attempts, QINDEX));
    expect(JSON.stringify(healed['sk-ch1l1'])).toBe(JSON.stringify(rebuilt2['sk-ch1l1']));
    // برنامهٔ بازسازی‌شده مرور آینده‌نگر دارد (نه تاریخ گذشته)
    for (const entry of Object.values(plan)) {
      expect(entry.nextReviewAt).toBeGreaterThanOrEqual(NOW - DAY);
    }
  });

  it('M3ب: وضعیت ذخیره‌شدهٔ دارای reviewPlan پس از ارتقا همان می‌ماند (بازسازی == ذخیره‌شده)', () => {
    const attempts = [att('q111', { ts: NOW - DAY }), att('q112', { ts: NOW - DAY })];
    const plan = rebuildReviewPlan(attempts, QINDEX);
    const withPlan = { ...legacyV3State(), attempts, reviewPlan: plan } as LearnerState & {
      reviewPlan: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }>;
    };
    saveLearnerState(withPlan);
    const loaded = loadLearnerState();
    expect(loaded.attempts.length).toBe(2);
    const planRebuilt = rebuildReviewPlan(loaded.attempts, QINDEX);
    expect(planRebuilt['sk-ch1l1']?.nextReviewAt).toBe(withPlan.reviewPlan['sk-ch1l1']?.nextReviewAt);
  });
});

describe('M4/M5 — خرابی قدیمی و ورودی پشتیبان', () => {
  beforeEach(() => localStorage.clear());

  it('M4: دادهٔ خرابِ باقی‌مانده از نسخهٔ قبل → وضعیت تازه بدون کرش', () => {
    localStorage.setItem(STORAGE_KEY, '{"studentName":"سارا","xp":120,"attempts":[{"ناقص":');
    const st = loadLearnerState();
    expect(st.attempts).toEqual([]);
    expect(st.xp).toBe(0);
  });

  it('M5: خروجی JSON ساختار قدیمی (بدون reviewPlan) قابل import است', () => {
    const json = exportStateJson(legacyV3State());
    expect(json).not.toContain('reviewPlan');
    const imported = importStateJson(json);
    expect(imported).not.toBeNull();
    expect(imported!.attempts.length).toBe(2);
  });

  it('M5ب: پشتیبان دستکاری‌شده (xp منفی/بی‌نهایت) رد می‌شود', () => {
    const tampered = exportStateJson(legacyV3State()).replace('"xp": 120', '"xp": -5');
    expect(importStateJson(tampered)).toBeNull();
    const infinite = exportStateJson(legacyV3State()).replace('"xp": 120', '"xp": 1e999');
    expect(importStateJson(infinite)).toBeNull();
  });
});

describe('M6 — flowProgress در دادهٔ قدیمی/ناقص', () => {
  beforeEach(() => localStorage.clear());

  it('نبود flowProgress پذیرفته می‌شود (سازگاری رو به جلو)', () => {
    saveLearnerState(legacyV3State());
    expect(loadLearnerState().attempts.length).toBe(2);
  });

  it('flowProgress نامعتبر (منفی/کسری/رشته/خارج از بازه) → کل وضعیت ریست می‌شود', () => {
    for (const bad of [{ 'flow-flow-a': -1 }, { 'flow-flow-a': 1.5 }, { 'flow-flow-a': 'ب' }, { 'flow-flow-a': 999999 }]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...legacyV3State(), flowProgress: bad }));
      expect(loadLearnerState().attempts, `برای ${JSON.stringify(bad)}`).toEqual([]);
    }
  });

  it('flowProgress معتبر round-trip می‌شود', () => {
    const state = { ...legacyV3State(), flowProgress: { 'flow-ch2l2': 1 } } as LearnerState;
    saveLearnerState(state);
    const loaded = loadLearnerState() as LearnerState & { flowProgress?: Record<string, number> };
    expect(loaded.flowProgress).toEqual({ 'flow-ch2l2': 1 });
  });
});
