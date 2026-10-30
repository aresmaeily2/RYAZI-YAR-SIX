import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildFlowQuestionIndex } from '../src/data/flows';
import {
  buildQuestionIndex,
  rebuildSkillStates,
  applyReviewPlan,
  hasUnrecoveredConsecutiveFailures,
  lastUnrecoveredFailurePairIndex,
} from '../src/learning/builder';
import { decideForSkill } from '../src/learning/engine';
import type { AttemptRecord, Difficulty } from '../src/types/curriculum';

/**
 * اصلاح F06 — حفظ تسلط پس از شکست‌های متوالی.
 *
 * تحلیل ممیزی: با پنجرهٔ دقت مستقل ۱۲تایی، پس از دو شکست متوالیِ انتهایی، دقتِ
 * پنجره حداکثر ۱۰/۱۲ (۸۳٪) است؛ پس معیار تسلط خودبه‌خود می‌افتد و مهارتِ
 * پیش‌تر مسلط به جای «نیازمند مرور» به وضعیت تازه‌کارمانند سقوط می‌کرد.
 *
 * رفتار مستند (قواعد آموزشی):
 *  ۱) مهارتِ پیش‌تر مسلط (موقت/تأییدشده روی پیشوند شواهد) + جفت‌شکست بازسازی‌نشده → needsreview
 *  ۲) یک اشتباه تصادفی منفرد هرگز وضعیت را تغییر نمی‌دهد
 *  ۳) موفقیت با راهنما زنجیرهٔ شکست را می‌شکند اما شاهد بازگشت نیست
 *  ۴) پنجرهٔ شواهد: بازگشت به خودِ تسلط فقط با بازسازی معیارهای چندشرطی
 *  ۵) مهارتِ هرگز مسلط‌نشده با شکست متوالی تازه‌کار می‌ماند
 */

const NOW = 1_700_000_000_000;

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
    id: `f06_att_${seq}`,
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

// ایندکس واقعی اپ: پرسش‌های کتاب + پرسش‌های جریان درس
const QINDEX: ReadonlyMap<string, { skillId: string; lessonId: string }> = (() => {
  const merged = new Map(buildQuestionIndex(CURRICULUM_CHAPTERS));
  for (const [id, m] of buildFlowQuestionIndex()) merged.set(id, m);
  return merged;
})();

/** شواهد تسلط تأییدشده sk-ch2l2 (دقت+تنوع+انتقال+مرور) — مطابق سناریوی S05 ممیزی فاز ۳ */
const MASTERY_EVIDENCE = (): AttemptRecord[] => [
  att('q221', { isCorrect: true, difficulty: 'easy', source: 'practice' }),
  att('q222', { isCorrect: true, difficulty: 'easy', source: 'exam' }),
  att('q223', { isCorrect: true, difficulty: 'medium', source: 'practice' }),
  att('q224', { isCorrect: true, difficulty: 'hard', source: 'exam' }),
  att('flow-ch2l2-g-t1', { isCorrect: true, difficulty: 'hard', source: 'transfer' }),
  att('q221', { isCorrect: true, difficulty: 'easy', source: 'review' }),
];

function statesOf(attempts: AttemptRecord[]) {
  return rebuildSkillStates(attempts, QINDEX, NOW);
}

describe('F06 — کاهش مهارتِ پیش‌تر مسلط به نیاز به مرور', () => {
  it('پیش‌فرض: شواهد پایه بدون شکست، تسلط تأییدشده می‌دهد', () => {
    expect(statesOf(MASTERY_EVIDENCE())['sk-ch2l2'].status).toBe('confirmed-mastery');
  });

  it('دو شکست متوالی در مهارتِ تسلط تأییدشده → وضعیت needsreview (نه سقوط به learning)', () => {
    const after = statesOf([...MASTERY_EVIDENCE(), att('q222', { isCorrect: false }), att('q223', { isCorrect: false })]);
    const st = after['sk-ch2l2'];
    expect(st.status).toBe('needsreview');
    // اطمینان نمایشی به‌طور طبیعی کامل نیست (شرط دقت پنجره از دست رفته)
    expect(st.confidence).toBeLessThan(1);
  });

  it('دو شکست متوالی در مهارتِ تسلط موقت نیز → needsreview', () => {
    const base = MASTERY_EVIDENCE().slice(0, 4); // بدون انتقال و مرور → تسلط موقت
    expect(statesOf(base)['sk-ch2l2'].status).toBe('temporary-mastery');
    const after = statesOf([...base, att('q221', { isCorrect: false }), att('q222', { isCorrect: false })]);
    expect(after['sk-ch2l2'].status).toBe('needsreview');
  });

  it('یک اشتباه تصادفی منفرد هرگز وضعیت را تغییر نمی‌دهد (۶/۷ = ۸۵٫۷٪ ≥ آستانه)', () => {
    const after = statesOf([...MASTERY_EVIDENCE(), att('q223', { isCorrect: false })]);
    expect(after['sk-ch2l2'].status).toBe('confirmed-mastery');
  });

  it('شکست، موفقیت با راهنما، شکست (بدون جفت متوالی) → needsreview نیست؛ پنجره دقت طبق قاعدهٔ موجود افت می‌کند (۶/۸)', () => {
    const after = statesOf([
      ...MASTERY_EVIDENCE(),
      att('q222', { isCorrect: false }),
      att('q223', { isCorrect: true, hintsUsed: 2 }),
      att('q224', { isCorrect: false }),
    ]);
    const st = after['sk-ch2l2'];
    expect(st.status).not.toBe('needsreview'); // بدون جفت متوالی، برچسب مرور نمی‌نشیند
    expect(st.status).toBe('learning'); // دقت پنجره ۶/۸ = ۷۵٪ ≥ ۷۰٪
  });

  it('مهارتِ هرگز مسلط‌نشده با دو شکست متوالی، تازه‌کار می‌ماند (نه needsreview)', () => {
    const weak = [
      att('q221', { isCorrect: true }),
      att('q222', { isCorrect: false }),
      att('q223', { isCorrect: true }),
      att('q224', { isCorrect: false }),
      att('q221', { isCorrect: false }),
      att('q222', { isCorrect: false }),
    ];
    const st = statesOf(weak)['sk-ch2l2'];
    expect(st.status).not.toBe('needsreview');
    expect(['needspractice', 'learning']).toContain(st.status);
  });
});

describe('F06 — موفقیت با راهنما و پنجرهٔ شواهد در بازگشت', () => {
  it('موفقیت با راهنما پس از جفت‌شکست، بازگشت نیست (نیازمند مرور باقی می‌ماند)', () => {
    const after = statesOf([
      ...MASTERY_EVIDENCE(),
      att('q221', { isCorrect: false }),
      att('q222', { isCorrect: false }),
      att('q223', { isCorrect: true, hintsUsed: 1 }), // با راهنما
    ]);
    expect(after['sk-ch2l2'].status).toBe('needsreview');
  });

  it('نخستین موفقیت مستقل پس از جفت‌شکست → خروج از needsreview؛ اما تسلط فوری نیست (معیار چندشرطی)', () => {
    const after = statesOf([
      ...MASTERY_EVIDENCE(),
      att('q221', { isCorrect: false }),
      att('q222', { isCorrect: false }),
      att('q223', { isCorrect: true, difficulty: 'medium' }), // مستقل
    ]);
    const st = after['sk-ch2l2'];
    expect(st.status).not.toBe('needsreview');
    expect(st.status).not.toBe('confirmed-mastery'); // بازسازی دقت پنجره هنوز کامل نیست
    expect(['learning', 'needspractice']).toContain(st.status);
  });

  it('بازگشت به تسلط با شواهد پایدار مستقل (پنجره ۱۲تایی تجدید می‌شود)', () => {
    // ترتیب زمانی: شواهد تسلط ← جفت‌شکست ← تمرین مستقل تجدیدی (timestampها به ترتیب ساخت افزایش می‌یابند)
    const attempts = [...MASTERY_EVIDENCE(), att('q221', { isCorrect: false }), att('q222', { isCorrect: false })];
    for (let i = 0; i < 14; i++) {
      attempts.push(att(i % 2 === 0 ? 'q221' : 'q223', { isCorrect: true, difficulty: i % 3 === 0 ? 'medium' : 'easy' }));
    }
    const after = statesOf(attempts);
    expect(after['sk-ch2l2'].status).toBe('confirmed-mastery');
  });

  it('جفت‌شکست قدیمیِ درون شواهد که با موفقیت مستقل جواب داده، اثر بازداشتی ندارد', () => {
    const attempts = [...MASTERY_EVIDENCE(), att('q221', { isCorrect: false }), att('q222', { isCorrect: false })];
    for (let i = 0; i < 14; i++) {
      attempts.push(att(i % 2 === 0 ? 'q223' : 'q224', { isCorrect: true, difficulty: i % 2 ? 'medium' : 'hard' }));
    }
    const after = statesOf(attempts);
    expect(after['sk-ch2l2'].status).toBe('confirmed-mastery');
  });
});

describe('F06 — هم‌کنش‌پذیری موتور تصمیم با وضعیت needsreview', () => {
  it('مهارت needsreview با مرور سررسیدشده → mixed-review (نه maintain-mastery)', () => {
    // جفت‌شکست + موفقیت راهنمادار (برای خروج از قاعدهٔ خطای پیاپی و ماندن در needsreview)
    const attempts = [
      ...MASTERY_EVIDENCE(),
      att('q221', { isCorrect: false }),
      att('q222', { isCorrect: false }),
      att('q223', { isCorrect: true, hintsUsed: 1 }),
    ];
    const st = statesOf(attempts);
    expect(st['sk-ch2l2'].status).toBe('needsreview');
    // برنامهٔ مرور سررسیدشده: مدخل برنامه جدیدتر از آخرین شواهد است تا گارد applyReviewPlan عبور کند
    const withPlan = applyReviewPlan(st, {
      'sk-ch2l2': { nextReviewAt: NOW - 1000, reviewStage: 0, lastPracticedAt: NOW + 1 },
    });
    const d = decideForSkill('sk-ch2l2', withPlan, NOW);
    expect(d?.action).toBe('mixed-review');
  });
});

describe('F06 — توابع خالص کمکی', () => {
  const ev = (isCorrect: boolean, hintsUsed = 0) => ({
    questionId: 'q',
    skillId: 's',
    isCorrect,
    hintsUsed,
    difficulty: 'easy' as const,
    source: 'practice' as const,
    timestamp: 0,
    firstAttemptOnQuestion: true,
  });

  it('hasUnrecoveredConsecutiveFailures: شواهد خالی/تک‌شکست → نادرست', () => {
    expect(hasUnrecoveredConsecutiveFailures([])).toBe(false);
    expect(hasUnrecoveredConsecutiveFailures([ev(false)])).toBe(false);
    expect(hasUnrecoveredConsecutiveFailures([ev(true), ev(false)])).toBe(false);
  });

  it('جفت‌شکست بازسازی‌نشده → درست؛ پس از موفقیت مستقل → نادرست؛ پس از موفقیت راهنمادار → درست', () => {
    expect(hasUnrecoveredConsecutiveFailures([ev(true), ev(false), ev(false)])).toBe(true);
    expect(hasUnrecoveredConsecutiveFailures([ev(true), ev(false), ev(false), ev(true)])).toBe(false);
    expect(hasUnrecoveredConsecutiveFailures([ev(true), ev(false), ev(false), ev(true, 1)])).toBe(true);
  });

  it('آخرین جفت‌شکست ملاک است (اسکن از انتها و اثر جفت‌های قدیمی‌تر می‌شود)', () => {
    expect(lastUnrecoveredFailurePairIndex([ev(false), ev(false), ev(true), ev(false), ev(false)])).toBe(3);
    expect(lastUnrecoveredFailurePairIndex([ev(false), ev(false), ev(true), ev(true)])).toBe(-1);
    // جفت‌شکست قدیمی بازسازده + جفت‌شکست جدید بازسازنشده
    expect(hasUnrecoveredConsecutiveFailures([ev(false), ev(false), ev(true), ev(false), ev(false)])).toBe(true);
    // سه شکست پیاپی نیز جفت دارد
    expect(hasUnrecoveredConsecutiveFailures([ev(false), ev(false), ev(false)])).toBe(true);
  });
});
