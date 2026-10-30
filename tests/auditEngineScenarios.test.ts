import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { LESSON_FLOWS, buildFlowQuestionIndex } from '../src/data/flows';
import {
  buildQuestionIndex,
  rebuildSkillStates,
  applyReviewPlan,
} from '../src/learning/builder';
import { decideForSkill } from '../src/learning/engine';
import { evaluateMastery, countDistinctSuccessProfiles } from '../src/learning/mastery';
import { scheduleNextReview, dueSkillIds } from '../src/learning/review';
import { classifyWrongAnswer, mapDiagnosisTextToCode, dominantError } from '../src/learning/errorTaxonomy';
import { SKILLS, SKILL_BY_ID, prerequisiteChain } from '../src/learning/skills';
import { computeEffectivenessMetrics } from '../src/learning/metrics';
import { advanceFlow, isStagePassed } from '../src/learning/flowLogic';
import type { AttemptRecord, Difficulty } from '../src/types/curriculum';
import type { MisconceptionCode } from '../src/learning/types';

/**
 * ممیزی مستقل فاز ۳ — ۳۴ سناریوی موتور یادگیری تطبیقی + بررسی ساختاری گراف مهارت.
 * این آزمون‌ها رفتار واقعی موتور را با سناریوهای دانش‌آموزی می‌سنجند و به‌عنوان
 * بازگشت دائمی ممیزی نگه داشته می‌شوند.
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
    diagnosis?: string;
    selected?: string;
  } = {}
): AttemptRecord {
  seq += 1;
  const meta = QINDEX.get(questionId);
  return {
    id: `audit_att_${seq}`,
    questionId,
    chapterId: meta ? questionId.slice(1, 3) : 'x',
    lessonId: questionId.slice(1, questionId.length - 1),
    difficulty: opts.difficulty ?? 'easy',
    selectedAnswer: opts.selected ?? (opts.isCorrect === false ? 'غلط' : 'درست'),
    isCorrect: opts.isCorrect ?? true,
    hintsUsed: opts.hintsUsed ?? 0,
    timestamp: opts.ts ?? NOW - 1000 * (100 - seq),
    diagnosedMisconception: opts.diagnosis,
    source: opts.source ?? 'practice',
  };
}

// ایندکس واقعی اپ: پرسش‌های کتاب + پرسش‌های جریان درس (مطابق useLearnerState)
const QINDEX: ReadonlyMap<string, { skillId: string; lessonId: string }> = (() => {
  const merged = new Map(buildQuestionIndex(CURRICULUM_CHAPTERS));
  for (const [id, m] of buildFlowQuestionIndex()) merged.set(id, m);
  return merged;
})();

const PREREQ_OK_CH2L1 = ['q211', 'q212', 'q213', 'q214'].map((q, i) =>
  att(q, { isCorrect: true, difficulty: i % 2 ? 'medium' : 'easy', ts: NOW - 6000 - i })
);

function statesOf(attempts: AttemptRecord[], now = NOW) {
  return rebuildSkillStates(attempts, QINDEX, now);
}

function decide(skillId: string, attempts: AttemptRecord[], now = NOW, plan?: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }>) {
  const st = applyReviewPlan(statesOf(attempts, now), plan);
  return decideForSkill(skillId, st, now);
}

// ============ بخش ۱: ساختار گراف مهارت ============

describe('ممیزی فاز ۳ — ساختار گراف ۲۳ مهارت', () => {
  it('شمار مهارت‌ها ۲۳ و یکتاست و هر مهارت درس و پرسش واقعی دارد', () => {
    expect(SKILLS.length).toBe(23);
    const ids = new Set(SKILLS.map((s) => s.id));
    expect(ids.size).toBe(23);
    for (const s of SKILLS) {
      const ch = CURRICULUM_CHAPTERS.find((c) => c.id === s.chapterId);
      const les = ch?.lessons.find((l) => l.id === s.lessonId);
      expect(les, `درس ${s.lessonId} یافت نشد`).toBeDefined();
      expect(les!.questions.length, `مهارت ${s.id} پرسش ندارد`).toBeGreaterThan(0);
    }
  });

  it('هر درس کتاب دقیقاً یک مهارت دارد (نبود مهارت بی‌کاربرد)', () => {
    const lessonCount = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons).length;
    expect(lessonCount).toBe(23);
    for (const les of CURRICULUM_CHAPTERS.flatMap((c) => c.lessons)) {
      expect(SKILLS.find((s) => s.lessonId === les.id), `درس ${les.id} مهارت ندارد`).toBeDefined();
    }
  });

  it('همه پیش‌نیازها موجودند و گراف بدون چرخه است (بررسی تمام‌گره)', () => {
    for (const s of SKILLS) {
      for (const p of s.prerequisites) {
        expect(SKILL_BY_ID.has(p), `پیش‌نیاز ناشناخته ${p} در ${s.id}`).toBe(true);
        expect(p, `خودارجاع در ${s.id}`).not.toBe(s.id);
      }
    }
    // تشخیص چرخه با رنگ‌آمیزی سه‌حالته
    const color = new Map<string, 0 | 1 | 2>();
    const hasCycle = (id: string): boolean => {
      color.set(id, 1);
      for (const p of SKILL_BY_ID.get(id)?.prerequisites ?? []) {
        const c = color.get(p) ?? 0;
        if (c === 1) return true;
        if (c === 0 && hasCycle(p)) return true;
      }
      color.set(id, 2);
      return false;
    };
    for (const s of SKILLS) {
      if ((color.get(s.id) ?? 0) === 0) expect(hasCycle(s.id), `چرخه شامل ${s.id}`).toBe(false);
    }
  });

  it('زنجیره پیش‌نیاز عمق ۳ برای مهارت‌های دشوار، ریشه‌های درست دارد', () => {
    // ضرب/تقسیم کسر به کسر (ریشه) می‌رسد
    expect(prerequisiteChain('sk-ch2l3')).toContain('sk-ch2l1');
    // تقارن مرکزی هم به تقارن محوری و هم به مختصات وابسته است
    expect(prerequisiteChain('sk-ch4l2')).toContain('sk-ch4l1');
    expect(prerequisiteChain('sk-ch4l2')).toContain('sk-ch4l3');
    // درصد به تناسب و نمایش اعشاری وابسته است
    expect(prerequisiteChain('sk-ch6l2')).toContain('sk-ch6l1');
  });
});

// ============ بخش ۲: سناریوهای تصمیم‌گیری تطبیقی ============

describe('ممیزی فاز ۳ — سناریوهای تصمیم موتور (جدول ورودی/وضعیت/تصمیم/دلیل)', () => {
  it('S01 دانش‌آموز مبتدی، مهارت ریشه‌ای (بدون پیش‌نیاز): معرفی شهودی', () => {
    const d = decide('sk-ch1l2', []);
    expect(d?.action).toBe('intuitive-intro');
    expect(d?.reasonCode).toBe('FRESH_START_INTUITIVE');
  });

  it('S02 تک‌تلاشِ درست روی پیش‌نیاز، prereqChecked را فعال می‌کند: ورود مستقیم به معرفی شهودی (یافتهٔ ممیزی: بار شواهد پیش‌نیاز کم است)', () => {
    const d = decide('sk-ch2l2', [att('q211', { isCorrect: true, ts: NOW - 6000 })]);
    // رفتار واقعی موتور: یک تلاش پیش‌نیاز کافی است تا سنجش مجدد حذف شود؛
    // در صورت ضعف بعدی، قاعدهٔ ۱ (پیش‌نیاز ضعیف + خطای پیاپی) نگاه می‌دارد.
    expect(d?.action).toBe('intuitive-intro');
  });

  it('S03 مبتدی با پیش‌نیازِ کاملاً بِنِشده: سنجش پیش‌نیاز هدف‌گذاری‌شده', () => {
    const d = decide('sk-ch2l2', []);
    expect(d?.action).toBe('prerequisite-check');
    expect(d?.targetSkillId).toBe('sk-ch2l1');
  });

  it('S04 پیش‌نیاز ضعیف (دقت < ۵۰٪) بدون خطای پیاپی فعلی: تمرین همان سطح؛ پیش‌نیاز فقط در خطای پیاپی فعال می‌شود', () => {
    const prereqWeak = ['q211', 'q212', 'q213', 'q214'].map((q, i) => att(q, { isCorrect: i === 0, difficulty: 'easy', ts: NOW - 5000 - i }));
    const current = [att('q221', { isCorrect: true, ts: NOW - 100 })];
    const d = decide('sk-ch2l2', [...prereqWeak, ...current]);
    expect(d?.action).toBe('practice-same-level');
  });

  it('S05 تسلط بالا تأییدشده (دقت+تنوع+انتقال+مرور): حفظ تسلط', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
      att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer' }),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'review' }),
    ];
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].status).toBe('confirmed-mastery');
    const d = decideForSkill('sk-ch2l2', st, NOW);
    expect(d?.action).toBe('maintain-mastery');
  });

  it('S06 تسلط موقت بدون انتقال: سنجش انتقال پیشنهاد می‌شود', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
    ];
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].status).toBe('temporary-mastery');
    expect(st['sk-ch2l2'].transferPassed).toBe(false);
    const d = decideForSkill('sk-ch2l2', st, NOW);
    expect(d?.action).toBe('transfer-assessment');
  });

  it('S07 تسلط موقت با انتقالِ گذرانده و بدون مرور تأخیری: برنامه‌ریزی مرور', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
      att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer' }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('schedule-review');
    expect(d?.reasonCode).toBe('DELAYED_REVIEW_PENDING');
  });

  it('S08 پاسخ‌های تصادفی (درست/غلط متناوب): تسلط تأیید نمی‌شود و مسیر تمرین می‌ماند', () => {
    const attempts = ['q221', 'q222', 'q223', 'q224', 'q221', 'q222', 'q223', 'q224'].map((q, i) =>
      att(q, { isCorrect: i % 2 === 0, difficulty: i % 2 === 0 ? 'easy' : 'medium', ts: NOW - 1000 - i, hintsUsed: i % 3 === 0 ? 0 : 1 })
    );
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].status).not.toBe('confirmed-mastery');
    expect(st['sk-ch2l2'].status).not.toBe('temporary-mastery');
  });

  it('S09 موفقیت اولیه و سپس افت عملکرد با پیش‌نیاز سالم: تمرین ساده‌تر یا راهنمایی‌شده', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, difficulty: 'easy', ts: NOW - 900 }),
      att('q222', { isCorrect: true, difficulty: 'easy', ts: NOW - 800 }),
      att('q223', { isCorrect: false, difficulty: 'medium', ts: NOW - 700 }),
      att('q224', { isCorrect: false, difficulty: 'hard', ts: NOW - 600 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(['easier-practice', 'guided-practice', 'alternative-representation']).toContain(d?.action);
  });

  it('S10 اشتباه تکراری هم‌نوع با پیش‌نیاز سالم: تغییر نمایش مفهوم', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, ts: NOW - 900 }),
      att('q223', { isCorrect: false, diagnosis: 'جمع صورت‌ها و مخرج‌ها به‌صورت جداگانه', ts: NOW - 800 }),
      att('q222', { isCorrect: false, diagnosis: 'جمع صورت‌ها و مخرج‌ها به‌صورت جداگانه', ts: NOW - 700 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('alternative-representation');
    expect(d?.reasonCode).toBe('REPEATED_MISCONCEPTION');
  });

  it('S11 دو خطای متفاوت پیاپی پس از نیم‌موفقیت: تمرین راهنمایی‌شده (نه تعویض نمایش)', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, ts: NOW - 900, difficulty: 'easy' }),
      att('q222', { isCorrect: true, ts: NOW - 850, difficulty: 'easy' }),
      att('q223', { isCorrect: false, diagnosis: 'محاسبه نادرست مجموع ارقام', ts: NOW - 800 }),
      att('q224', { isCorrect: false, diagnosis: 'نادیده گرفتن شرط زوج بودن', ts: NOW - 700 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    // دقت اخیر ۰٫۵ (≥۰٫۴) → تمرین راهنمایی‌شده؛ افت شدیدتر (S09) به تمرین ساده‌تر می‌رود
    expect(d?.action).toBe('guided-practice');
  });

  it('S12 پیش‌نیاز ضعیف + دو خطای پیاپی: بازگشت موقت به پیش‌نیاز', () => {
    const prereqWeak = ['q211', 'q212', 'q213', 'q214'].map((q, i) =>
      att(q, { isCorrect: i === 0, difficulty: 'easy', ts: NOW - 5000 - i })
    );
    const attempts = [
      ...prereqWeak,
      att('q221', { isCorrect: true, ts: NOW - 300 }),
      att('q222', { isCorrect: false, ts: NOW - 200 }),
      att('q223', { isCorrect: false, ts: NOW - 100 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('review-prerequisite');
    expect(d?.targetSkillId).toBe('sk-ch2l1');
  });

  it('S13 موفق در ساده اما بدون موفقیت دشوار: پیشنهاد مسئله دشوارتر', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', ts: NOW - 500 }),
      att('q223', { isCorrect: true, difficulty: 'medium', ts: NOW - 400 }),
      att('q222', { isCorrect: true, difficulty: 'easy', ts: NOW - 300 }),
      att('q224', { isCorrect: false, difficulty: 'hard', ts: NOW - 200 }),
      att('q221', { isCorrect: true, difficulty: 'easy', ts: NOW - 100 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('harder-practice');
  });

  it('S14 عملکرد خوب اما شواهد مستقل ناکافی: ارزیابی بدون راهنما', () => {
    const attempts = [
      att('q221', { isCorrect: true, hintsUsed: 2, ts: NOW - 500 }),
      att('q222', { isCorrect: true, hintsUsed: 1, ts: NOW - 400 }),
      att('q223', { isCorrect: true, hintsUsed: 2, ts: NOW - 300 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('independent-assessment');
    expect(d?.reasonCode).toBe('NEED_INDEPENDENT_EVIDENCE');
  });

  it('S15 عملکرد پایدار در همه سطوح: موتور پیش از ارزیابی مستقل، سنجش انتقال را اولویت می‌دهد', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, difficulty: 'easy', ts: NOW - 500 }),
      att('q222', { isCorrect: true, difficulty: 'medium', ts: NOW - 400 }),
      att('q223', { isCorrect: true, difficulty: 'medium', ts: NOW - 300 }),
      att('q224', { isCorrect: true, difficulty: 'hard', ts: NOW - 200 }),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'exam', ts: NOW - 100 }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(d?.action).toBe('transfer-assessment');
  });

  it('S16 مرور سررسیدشده مهارتِ تسلط‌تأییدشده: مرور نگهدارنده', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
      att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer' }),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'review', ts: NOW - DAY }),
    ];
    // مدخل برنامه جدیدتر از آخرین شواهد است تا اعمال شود (قرارداد applyReviewPlan)
    const plan = { 'sk-ch2l2': { nextReviewAt: NOW - 1000, reviewStage: 1, lastPracticedAt: NOW - 100 } };
    const d = decide('sk-ch2l2', attempts, NOW, plan);
    expect(d?.action).toBe('schedule-review');
    expect(d?.reasonCode).toBe('MASTERY_REVIEW_DUE');
  });

  it('S17 مرور سررسیدشده مهارتِ غیرتسلط: مرور ترکیبی', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, ts: NOW - 500 }),
      att('q222', { isCorrect: true, ts: NOW - 400 }),
    ];
    const plan = { 'sk-ch2l2': { nextReviewAt: NOW - 1000, reviewStage: 0, lastPracticedAt: NOW - 100 } };
    const d = decide('sk-ch2l2', attempts, NOW, plan);
    expect(d?.action).toBe('mixed-review');
  });

  it('S18 بازگشت پس از وقفهٔ طولانی: مرور سررسیدشده فعال می‌شود نه آموزش از صفر', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1,
      att('q221', { isCorrect: true, ts: NOW - 40 * DAY }),
      att('q222', { isCorrect: true, ts: NOW - 40 * DAY }),
      att('q223', { isCorrect: true, ts: NOW - 40 * DAY }),
    ];
    const plan = { 'sk-ch2l2': { nextReviewAt: NOW - 20 * DAY, reviewStage: 2, lastPracticedAt: NOW - 39 * DAY } };
    const d = decide('sk-ch2l2', attempts, NOW, plan);
    expect(['mixed-review', 'schedule-review']).toContain(d?.action);
  });

  it('S19 تک‌شکست پس از تسلط تأییدشده: تسلط حفظ می‌شود اما برنامهٔ مرور فوری بازچینی می‌شود', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
      att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer' }),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'review' }),
      att('q221', { isCorrect: false, source: 'review', ts: NOW - 50, selected: 'غلط' }),
    ];
    // یافتهٔ ممیزی: nextReviewAt مشتق‌پذیر نیست و فقط از برنامهٔ پایدار می‌آید؛
    // با اعمال برنامه (مطابق recordAttempt واقعی) مرور فوری فردا تعیین می‌شود.
    const plan = { 'sk-ch2l2': { nextReviewAt: NOW + DAY, reviewStage: 0, lastPracticedAt: NOW - 10 } };
    const st = applyReviewPlan(statesOf(attempts), plan);
    expect(st['sk-ch2l2'].nextReviewAt).toBe(NOW + DAY);
    const d = decideForSkill('sk-ch2l2', st, NOW);
    expect(['maintain-mastery', 'schedule-review', 'mixed-review']).toContain(d?.action);
  });

  it('S20 فراموشی واقعی (دو شکست اخیر): موتور مسیر بازآموزی می‌رود', () => {
    const attempts = [
      ...PREREQ_OK_CH2L1.map((a, i) => ({ ...a, timestamp: NOW - 5000 - i })),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice', ts: NOW - 900 }),
      att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam', ts: NOW - 800 }),
      att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice', ts: NOW - 700 }),
      att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam', ts: NOW - 600 }),
      att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer', ts: NOW - 500 }),
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'review', ts: NOW - 400 }),
      att('q221', { isCorrect: false, source: 'review', ts: NOW - 100, selected: 'غلط' }),
      att('q222', { isCorrect: false, source: 'review', ts: NOW - 50, selected: 'غلط' }),
    ];
    const d = decide('sk-ch2l2', attempts);
    expect(['guided-practice', 'alternative-representation', 'easier-practice', 'review-prerequisite']).toContain(d?.action);
  });
});

// ============ بخش ۳: زمان‌بند مرور فاصله‌دار ============

describe('ممیزی فاز ۳ — زمان‌بندی مرور (لایتنر ۱/۳/۷/۱۴)', () => {
  it('S21 موفقیت بدون راهنما پله جلو می‌رود: ۰→۱→۲→۳ و سپس سقف', () => {
    const r0 = scheduleNextReview(0, 'success-no-hints', NOW);
    expect(r0.reviewStage).toBe(1);
    expect(r0.nextReviewAt).toBe(NOW + 3 * DAY);
    const r1 = scheduleNextReview(1, 'success-no-hints', NOW);
    expect(r1.nextReviewAt).toBe(NOW + 7 * DAY);
    const r2 = scheduleNextReview(2, 'success-no-hints', NOW);
    expect(r2.nextReviewAt).toBe(NOW + 14 * DAY);
    const r3 = scheduleNextReview(3, 'success-no-hints', NOW);
    expect(r3.reviewStage).toBe(3);
    expect(r3.nextReviewAt).toBe(NOW + 14 * DAY);
  });

  it('S22 موفقیت با راهنما پله را ثابت نگه می‌دارد و شکست دو پله عقب می‌برد', () => {
    expect(scheduleNextReview(2, 'success-with-hints', NOW).reviewStage).toBe(2);
    expect(scheduleNextReview(3, 'failure', NOW)).toEqual({ nextReviewAt: NOW + 3 * DAY, reviewStage: 1 });
    expect(scheduleNextReview(0, 'failure', NOW).reviewStage).toBe(0);
  });

  it('S23 تکرار شکست: پله به صفر قفل می‌شود و مرور فردا تعیین می‌شود', () => {
    const a = scheduleNextReview(2, 'failure', NOW);
    const b = scheduleNextReview(a.reviewStage, 'failure', NOW);
    expect(b.reviewStage).toBe(0);
    expect(b.nextReviewAt).toBe(NOW + 1 * DAY);
  });

  it('S24 تأخیر طولانی دانش‌آموز در مرور، پله را تنبیه نمی‌کند؛ فقط سررسید گذشته فعال می‌شود', () => {
    const due = dueSkillIds({ 'sk-ch2l2': { ...statesOf([att('q221', { ts: NOW - 20 * DAY })])['sk-ch2l2'], nextReviewAt: NOW - 10 * DAY } }, NOW);
    expect(due).toContain('sk-ch2l2');
  });

  it('S25 بازگشت مهارت پس از فراموشی: شکست در پله ۳ → مرور ۳ روزه و بازسازی', () => {
    const r = scheduleNextReview(3, 'failure', NOW);
    expect(r.reviewStage).toBe(1);
    expect(r.nextReviewAt).toBe(NOW + 3 * DAY);
  });
});

// ============ بخش ۴: معیار تسلط و مقاومت در برابر تسلط کاذب ============

describe('ممیزی فاز ۳ — معیار تسلط چندشرطی', () => {
  it('S26 دادهٔ کم تسلط کاذب نمی‌سازد: ۴ موفقیت هم‌پروفایل کافی نیست', () => {
    const attempts = ['q221', 'q222', 'q223', 'q224'].map((q, i) => att(q, { isCorrect: true, difficulty: 'easy', ts: NOW - 1000 - i }));
    const st = statesOf(attempts);
    const m = evaluateMastery(st['sk-ch2l2'], SKILL_BY_ID.get('sk-ch2l2')!);
    expect(m.status).not.toBe('temporary-mastery');
    expect(m.missing.join(' ')).toContain('پروفایل');
  });

  it('S27 موفقیت صرفاً با راهنما هرگز تسلط نمی‌آورد', () => {
    const attempts = ['q221', 'q222', 'q223', 'q224', 'q221', 'q222'].map((q, i) =>
      att(q, { isCorrect: true, hintsUsed: 3, difficulty: i % 2 ? 'medium' : 'easy', source: i % 2 ? 'exam' : 'practice', ts: NOW - 1000 - i })
    );
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].independentTotal).toBe(0);
    // وضعیت «در حال یادگیری» مجاز است اما تسلط موقت/تأییدشده هرگز
    expect(['learning', 'needspractice']).toContain(st['sk-ch2l2'].status);
    expect(['temporary-mastery', 'confirmed-mastery']).not.toContain(st['sk-ch2l2'].status);
  });

  it('S28 تنوع پروفایل: تمرین و آزمون در سطوح متفاوت شمرده می‌شود', () => {
    const attempts = [
      att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
      att('q222', { isCorrect: true, difficulty: 'medium', source: 'exam' }),
    ];
    const st = statesOf(attempts);
    expect(countDistinctSuccessProfiles(st['sk-ch2l2'], 0)).toBe(2);
  });

  it('S29 انتقال با راهنما، شرط انتقال را برآورده نمی‌کند', () => {
    const attempts = [
      att('flow_t2', { isCorrect: true, hintsUsed: 2, source: 'transfer', difficulty: 'hard' }),
    ];
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].transferPassed).toBe(false);
  });

  it('S30 مرور تأخیری باید بدون راهنما و درست باشد تا شرط تأخیر برآورده شود', () => {
    const ok = statesOf([att('q221', { isCorrect: true, source: 'review', difficulty: 'easy' })]);
    expect(ok['sk-ch2l2'].delayedReviewPassed).toBe(true);
    const withHints = statesOf([att('q221', { isCorrect: true, source: 'review', hintsUsed: 2, difficulty: 'easy' })]);
    expect(withHints['sk-ch2l2'].delayedReviewPassed).toBe(false);
    const wrong = statesOf([att('q221', { isCorrect: false, source: 'review', difficulty: 'easy' })]);
    expect(wrong['sk-ch2l2'].delayedReviewPassed).toBe(false);
  });

  it('S31 پنجره مستقل ۱۲تایی: شکست‌های قدیمی با موفقیت‌های جدید رقیق می‌شود', () => {
    const attempts: AttemptRecord[] = [];
    for (let i = 0; i < 8; i++) attempts.push(att(`q22${(i % 4) + 1}`, { isCorrect: false, difficulty: 'easy', ts: NOW - 3000 - i }));
    for (let i = 0; i < 12; i++) attempts.push(att(`q22${(i % 4) + 1}`, { isCorrect: true, difficulty: 'medium', ts: NOW - 2000 + i }));
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].independentTotal).toBe(12);
    expect(st['sk-ch2l2'].independentCorrect).toBe(12);
  });
});

// ============ بخش ۵: طبقه‌بندی خطا ============

describe('ممیزی فاز ۳ — طبقه‌بندی خطا و اثر آن', () => {
  it('S32 نگاشت تشخیص‌های کتاب به مقوله‌های استاندارد درست است', () => {
    expect(mapDiagnosisTextToCode('جابه‌جایی ممیز هنگام ضرب')).toBe('place-value');
    expect(mapDiagnosisTextToCode('اولویت عملیات ابتدا با ضرب است')).toBe('operation-order');
    expect(mapDiagnosisTextToCode('تبدیل خطی واحد به‌جای تبدیل سطحی')).toBe('unit-conversion');
    expect(mapDiagnosisTextToCode('گرد کردن به‌جای قطع کردن')).toBe('wrong-method-context');
    expect(mapDiagnosisTextToCode('استفاده از اندازه زاویه به‌عنوان درصد')).toBe('diagram-interpretation');
    expect(mapDiagnosisTextToCode('جمع کردن قدرمطلق دو عدد')).toBe('calculation');
  });

  it('S33 پاسخ خالی یا با سه راهنما = حدس؛ نه سوءبرداشت قطعی', () => {
    expect(classifyWrongAnswer({ hintsUsed: 0, blankLike: true })).toBe('guessing');
    expect(classifyWrongAnswer({ hintsUsed: 3, blankLike: false })).toBe('guessing');
    expect(classifyWrongAnswer({ hintsUsed: 2, blankLike: false })).toBe('guessing');
  });

  it('S34 یک پاسخ غلط نتیجه‌گیری بیش از حد نمی‌سازد (فرضیه، نه قطعیت)', () => {
    const st = statesOf([att('q112', { isCorrect: false, diagnosis: 'جمع کردن ۱ به‌جای کم کردن آن', selected: '۶۱' })]);
    const s = st['sk-ch1l1'];
    expect(s.dominantError).toBeDefined();
    expect(s.status).toBe('needspractice');
    expect(evaluateMastery(s, SKILL_BY_ID.get('sk-ch1l1')!).missing.length).toBeGreaterThan(0);
  });

  it('سوءبرداشت غالب از شمار خطاها درست استخراج می‌شود', () => {
    const counts = { calculation: 3, 'place-value': 1 } as Partial<Record<MisconceptionCode, number>>;
    expect(dominantError(counts)).toBe('calculation');
    expect(dominantError({})).toBeUndefined();
  });
});

// ============ بخش ۶: سنجه‌ها و سازگاری برنامه مرور ============

describe('ممیزی فاز ۳ — سنجه‌های اثربخشی و برنامه مرور پایدار', () => {
  it('سنجه‌ها از تلاش‌های واقعی با نمونهٔ کوچکِ علامت‌دار درست حساب می‌شوند', () => {
    const attempts = [
      att('q221', { isCorrect: true, hintsUsed: 0 }),
      att('q222', { isCorrect: true, hintsUsed: 0 }),
      att('q223', { isCorrect: false, hintsUsed: 0, diagnosis: 'خطای محاسبه', selected: 'غلط' }),
      att('q224', { isCorrect: false, hintsUsed: 2, selected: 'غلط' }),
      att('flow_t2', { isCorrect: true, hintsUsed: 0, source: 'transfer' }),
      att('flow_r1', { isCorrect: true, hintsUsed: 0, source: 'review' }),
    ];
    const m = computeEffectivenessMetrics(attempts);
    expect(m.totalAttempts).toBe(6);
    expect(m.independentAccuracy).toBeCloseTo(4 / 5);
    expect(m.hintRelianceRate).toBeCloseTo(1 / 6);
    expect(m.transferSuccessRate).toBe(1);
    expect(m.delayedReviewSuccessRate).toBe(1);
    expect(m.smallSample).toBe(true);
  });

  it('برنامه مرورِ قدیمی‌تر از شواهد جدید نادیده گرفته می‌شود (بدون پرش رو به عقب)', () => {
    const st = statesOf([att('q221', { isCorrect: true, ts: NOW - 100 })]);
    const newerPlan = { 'sk-ch2l2': { nextReviewAt: NOW - 99999, reviewStage: 0, lastPracticedAt: NOW - 5000 } };
    const merged = applyReviewPlan(st, newerPlan);
    // مدخل برنامه قدیمی‌تر از آخرین تلاش است → برنامه اعمال نمی‌شود
    expect(merged['sk-ch2l2'].nextReviewAt).toBeNull();
    const olderPlan = { 'sk-ch2l2': { nextReviewAt: NOW + DAY, reviewStage: 2, lastPracticedAt: NOW - 2000 } };
    const merged2 = applyReviewPlan(statesOf([att('q221', { isCorrect: true, ts: NOW - 3000 })]), olderPlan);
    expect(merged2['sk-ch2l2'].nextReviewAt).toBe(NOW + DAY);
    expect(merged2['sk-ch2l2'].reviewStage).toBe(2);
  });
});

// ============ بخش ۷: منطق جریان درس (پیوند با موتور) ============

describe('ممیزی فاز ۳ — منطق پیشرفت جریان درس', () => {
  it('عدم عبور از سنجش پیش‌نیاز → حلقهٔ اصلاحی، نه عبور اجباری', () => {
    const flow = LESSON_FLOWS.find((f) => f.lessonId === 'ch2l2');
    expect(flow).toBeDefined();
    const prereqStage = flow!.stages.find((s) => s.kind === 'prereq-check')!;
    const fail = advanceFlow(flow!, 0, prereqStage.questionRefs!.map((id) => ({ questionId: id, isCorrect: false, hintsUsed: 0 })));
    expect(fail.needsRemedialRetest).toBe(true);
    expect(fail.done).toBe(false);
  });

  it('عدم عبور از تمرین مستقل/انتقال مسیر را نمی‌بندد اما ثبت می‌شود', () => {
    const flow = LESSON_FLOWS.find((f) => f.lessonId === 'ch2l2')!;
    const idx = flow.stages.findIndex((s) => s.kind === 'independent-practice');
    const stage = flow.stages[idx];
    const res = advanceFlow(flow, idx, stage.questionRefs!.map((id) => ({ questionId: id, isCorrect: false, hintsUsed: 0 })));
    expect(res.nextIndex).toBe(idx + 1);
    expect(isStagePassed(stage, stage.questionRefs!.map((id) => ({ questionId: id, isCorrect: false, hintsUsed: 0 }))).passed).toBe(false);
  });
});
