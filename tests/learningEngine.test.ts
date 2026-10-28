import { describe, expect, it } from 'vitest';
import { SKILLS, SKILL_BY_ID, prerequisiteChain } from '../src/learning/skills';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildQuestionIndex, rebuildSkillStates, emptySkillState, attemptToEvidence } from '../src/learning/builder';
import { decideNextStep, applyAttemptOutcome } from '../src/learning/engine';
import { evaluateMastery, DEFAULT_MASTERY_POLICY, countDistinctSuccessProfiles } from '../src/learning/mastery';
import { scheduleNextReview, dueSkillIds, REVIEW_INTERVALS_DAYS } from '../src/learning/review';
import { classifyWrongAnswer, dominantError, mapDiagnosisTextToCode, allErrorCodes } from '../src/learning/errorTaxonomy';
import { assistantRespond, encouragingNote } from '../src/learning/assistant';
import type { AttemptRecord, Difficulty } from '../src/types/curriculum';
import type { AnswerEvidence, SkillState } from '../src/learning/types';

const NOW = 1_700_000_000_000;

let attemptSeq = 0;
function mkAttempt(partial: Partial<AttemptRecord> = {}): AttemptRecord {
  attemptSeq += 1;
  return {
    id: `att_test_${attemptSeq}`,
    questionId: partial.questionId ?? 'q221',
    chapterId: partial.chapterId ?? 'ch2',
    lessonId: partial.lessonId ?? 'ch2l2',
    difficulty: partial.difficulty ?? 'easy',
    selectedAnswer: partial.selectedAnswer ?? '۳/۴',
    isCorrect: partial.isCorrect ?? true,
    hintsUsed: partial.hintsUsed ?? 0,
    timestamp: partial.timestamp ?? NOW,
    diagnosedMisconception: partial.diagnosedMisconception,
    source: partial.source ?? 'practice',
  };
}

function mkEvidence(partial: Partial<AnswerEvidence> = {}): AnswerEvidence {
  return {
    questionId: partial.questionId ?? 'q221',
    skillId: partial.skillId ?? 'sk-ch2l2',
    isCorrect: partial.isCorrect ?? true,
    hintsUsed: partial.hintsUsed ?? 0,
    difficulty: partial.difficulty ?? 'easy',
    source: partial.source ?? 'practice',
    timestamp: partial.timestamp ?? NOW,
    errorCode: partial.errorCode,
    firstAttemptOnQuestion: partial.firstAttemptOnQuestion ?? true,
  };
}

function mkSkillState(skillId: string, evidence: AnswerEvidence[], overrides: Partial<SkillState> = {}): SkillState {
  const base = emptySkillState(skillId, NOW);
  return { ...base, evidence, ...overrides };
}

// ============================================================ گراف مهارت‌ها
describe('گراف مهارت‌ها و نگاشت درس‌ها', () => {
  it('یک مهارت به ازای هر درس کتاب (۲۳ مهارت) با شناسه یکتا', () => {
    expect(SKILLS.length).toBe(23);
    const ids = new Set(SKILLS.map((s) => s.id));
    expect(ids.size).toBe(SKILLS.length);
  });

  it('هر مهارت به درس واقعی کتاب متصل است', () => {
    const lessonIds = new Set(CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.map((l) => l.id)));
    for (const s of SKILLS) expect(lessonIds.has(s.lessonId)).toBe(true);
  });

  it('همه پیش‌نیازها به مهارت موجود ارجاع می‌دهند و چرخه وجود ندارد', () => {
    for (const s of SKILLS) {
      for (const p of s.prerequisites) expect(SKILL_BY_ID.has(p)).toBe(true);
    }
    // تشخیص چرخه با جست‌وجوی عمقی
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const dfs = (id: string): boolean => {
      if (visiting.has(id)) return false;
      if (visited.has(id)) return true;
      visiting.add(id);
      const skill = SKILL_BY_ID.get(id);
      for (const p of skill?.prerequisites ?? []) if (!dfs(p)) return false;
      visiting.delete(id);
      visited.add(id);
      return true;
    };
    for (const s of SKILLS) expect(dfs(s.id)).toBe(true);
  });

  it('زنجیره پیش‌نیاز sk-ch2l2 شامل sk-ch2l1 است و تعداد نمایش‌های هر مهارت حداقل ۲ است', () => {
    expect(prerequisiteChain('sk-ch2l2')).toContain('sk-ch2l1');
    for (const s of SKILLS) expect(s.representations.length).toBeGreaterThanOrEqual(2);
  });

  it('نمایه پرسش‌ها همه ۹۲ پرسش را به مهارت نگاشت می‌کند', () => {
    const index = buildQuestionIndex(CURRICULUM_CHAPTERS);
    const allQuestions = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));
    expect(index.size).toBe(allQuestions.length);
  });
});

// ============================================================ سازنده وضعیت
describe('بازسازی وضعیت مهارت از شواهد', () => {
  it('مهارت بدون تلاش: notstarted با هیچ شاهدی', () => {
    const states = rebuildSkillStates([], buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    expect(states['sk-ch2l2'].status).toBe('notstarted');
    expect(states['sk-ch2l2'].evidence.length).toBe(0);
  });

  it('تلاش‌های درس به مهارت درست نگاشت و خطاها شمارش می‌شوند', () => {
    const attempts = [
      mkAttempt({ questionId: 'q221', isCorrect: true }),
      mkAttempt({ questionId: 'q222', isCorrect: false, hintsUsed: 0, diagnosedMisconception: 'جمع صورت‌ها و مخرج‌ها به‌صورت جداگانه' }),
    ];
    const states = rebuildSkillStates(attempts, buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    const s = states['sk-ch2l2'];
    expect(s.evidence.length).toBe(2);
    expect(s.independentCorrect).toBe(1);
    expect(s.independentTotal).toBe(2);
    expect(s.dominantError).toBe('conceptual');
    expect(s.status).toBe('needspractice');
  });

  it('اولین‌تلاش بودن هر پرسش درست تشخیص داده می‌شود', () => {
    const attempts = [
      mkAttempt({ questionId: 'q221', isCorrect: false, timestamp: NOW - 100 }),
      mkAttempt({ questionId: 'q221', isCorrect: true, timestamp: NOW }),
    ];
    const states = rebuildSkillStates(attempts, buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    const [first, second] = states['sk-ch2l2'].evidence;
    expect(first.firstAttemptOnQuestion).toBe(true);
    expect(second.firstAttemptOnQuestion).toBe(false);
  });

  it('برچسب‌های انتقال و مرور از منابع ثبت و پیش‌نیاز از شواهد پیش‌نیاز مشتق می‌شود', () => {
    const attempts = [
      mkAttempt({ questionId: 'q211', lessonId: 'ch2l1', source: 'prereq', isCorrect: true }), // شواهد مهارت پیش‌نیاز
      mkAttempt({ questionId: 'q222', source: 'transfer', isCorrect: true }),
      mkAttempt({ questionId: 'q224', source: 'review', isCorrect: true }),
    ];
    const states = rebuildSkillStates(attempts, buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    const s = states['sk-ch2l2'];
    // پیش‌نیاز (sk-ch2l1) شواهد دارد → پیش‌نیاز درس بررسی‌شده تلقی می‌شود
    expect(s.prereqChecked).toBe(true);
    expect(states['sk-ch2l1'].evidence.length).toBe(1);
    expect(s.transferPassed).toBe(true);
    expect(s.delayedReviewPassed).toBe(true);
  });

  it('تلاش‌های متعلق به پرسش ناشناخته نادیده گرفته می‌شوند (سازگاری داده قدیمی)', () => {
    const states = rebuildSkillStates([mkAttempt({ questionId: 'q_unknown_x' })], buildQuestionIndex(CURRICULUM_CHAPTERS), NOW);
    const totalEvidence = Object.values(states).reduce((a, s) => a + s.evidence.length, 0);
    expect(totalEvidence).toBe(0);
  });

  it('تساخت evidence خام: پاسخ غلط با راهنمای کامل → حدس', () => {
    const ev = attemptToEvidence(mkAttempt({ isCorrect: false, hintsUsed: 3 }), 'sk-ch2l2', true);
    expect(ev.errorCode).toBe('guessing');
  });
});

// ============================================================ معیار تسلط
describe('معیار تسلط چندشرطی', () => {
  const skill = SKILL_BY_ID.get('sk-ch2l2')!;

  it('آزمون کوتاه موفق هرگز تسلط پایدار نمی‌سازد', () => {
    const state = mkSkillState('sk-ch2l2', [mkEvidence(), mkEvidence({ difficulty: 'medium' as Difficulty })]);
    const m = evaluateMastery(state, skill);
    expect(['needspractice', 'learning'].includes(m.status) || m.status === 'needspractice').toBe(true);
    expect(m.status).not.toBe('confirmed-mastery');
    expect(m.status).not.toBe('temporary-mastery');
    expect(m.missing.length).toBeGreaterThan(0);
  });

  it('دقت ۸۵٪ مستقل + تنوع، بدون انتقال و مرور → تسلط موقت', () => {
    const evidence = [
      mkEvidence({ difficulty: 'easy' as Difficulty }),
      mkEvidence({ difficulty: 'easy' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'easy' as Difficulty }),
    ];
    const state = mkSkillState('sk-ch2l2', evidence, {
      independentCorrect: 6,
      independentTotal: 6,
      distinctIndependentSuccessProfiles: 2,
    });
    const m = evaluateMastery(state, skill);
    expect(m.status).toBe('temporary-mastery');
    expect(m.missing.some((x) => x.includes('انتقال'))).toBe(true);
    expect(m.missing.some((x) => x.includes('مرور'))).toBe(true);
  });

  it('با موفقیت انتقال و مرور تأخیری → تسلط تأییدشده', () => {
    const evidence = [
      mkEvidence({ difficulty: 'easy' as Difficulty }),
      mkEvidence({ difficulty: 'easy' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'easy' as Difficulty }),
    ];
    const state = mkSkillState('sk-ch2l2', evidence, {
      independentCorrect: 6,
      independentTotal: 6,
      distinctIndependentSuccessProfiles: 2,
      transferPassed: true,
      delayedReviewPassed: true,
    });
    const m = evaluateMastery(state, skill);
    expect(m.status).toBe('confirmed-mastery');
    expect(m.missing).toEqual([]);
  });

  it('پروفایل‌های متفاوت از ترکیب منبع و دشواری شمرده می‌شوند', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence({ difficulty: 'easy' as Difficulty, source: 'practice' }),
      mkEvidence({ difficulty: 'medium' as Difficulty, source: 'exam' }),
      mkEvidence({ difficulty: 'hard' as Difficulty }),
    ]);
    expect(countDistinctSuccessProfiles(state, 0)).toBe(3);
  });

  it('سیاست قابل تنظیم است: آستانه بالاتر، تسلط موقت را می‌شکند', () => {
    const evidence = [mkEvidence(), mkEvidence(), mkEvidence({ difficulty: 'medium' as Difficulty }), mkEvidence({ difficulty: 'medium' as Difficulty })];
    const state = mkSkillState('sk-ch2l2', evidence, {
      independentCorrect: 3,
      independentTotal: 4,
      distinctIndependentSuccessProfiles: 2,
    });
    const strict = evaluateMastery(state, skill, { ...DEFAULT_MASTERY_POLICY, independentAccuracyThreshold: 1.0 });
    expect(strict.status).toBe('needspractice');
    const lenient = evaluateMastery(state, skill, { ...DEFAULT_MASTERY_POLICY, independentAccuracyThreshold: 0.7 });
    expect(lenient.status).toBe('temporary-mastery');
  });
});

// ============================================================ موتور تصمیم
describe('موتور تصمیم تطبیقی — قواعد شفاف', () => {
  const skill = SKILL_BY_ID.get('sk-ch2l2')!;

  it('شروع تازه با پیش‌نیاز بی‌شواهد → سنجش پیش‌نیاز', () => {
    const d = decideNextStep({
      skill,
      state: mkSkillState('sk-ch2l2', []),
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', []) }],
      now: NOW,
    });
    expect(d.action).toBe('prerequisite-check');
    expect(d.reasonCode).toBe('PREREQ_NOT_READY');
    expect(d.targetSkillId).toBe('sk-ch2l1');
  });

  it('پیش‌نیاز ضعیف با خطای پیاپی → بازگشت به پیش‌نیاز', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ isCorrect: false, errorCode: 'calculation' }),
      mkEvidence({ isCorrect: false, errorCode: 'guessing', difficulty: 'medium' as Difficulty }),
    ]);
    const weakPrereq = mkSkillState('sk-ch2l1', [
      mkEvidence({ skillId: 'sk-ch2l1', isCorrect: false }),
      mkEvidence({ skillId: 'sk-ch2l1', isCorrect: false }),
    ], { independentCorrect: 0, independentTotal: 2 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: weakPrereq }],
      now: NOW,
    });
    expect(d.action).toBe('review-prerequisite');
    expect(d.reasonCode).toBe('PREREQ_WEAK_WITH_ERRORS');
  });

  it('پیش‌نیاز قوی اما بررسی‌نشده → سنجش پیش‌نیاز درس', () => {
    const strongPrereq = mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], {
      independentCorrect: 1,
      independentTotal: 1,
    });
    const d = decideNextStep({
      skill,
      state: mkSkillState('sk-ch2l2', []),
      prereqStates: [{ skillId: 'sk-ch2l1', state: strongPrereq }],
      now: NOW,
    });
    expect(d.action).toBe('prerequisite-check');
    expect(d.reasonCode).toBe('PREREQ_CHECK_PENDING');
  });

  it('مهارت بدون پیش‌نیاز و بدون شواهد → شروع شهودی', () => {
    const noPrereqSkill = SKILL_BY_ID.get('sk-ch2l1')!;
    const d = decideNextStep({
      skill: noPrereqSkill,
      state: mkSkillState('sk-ch2l1', []),
      prereqStates: [],
      now: NOW,
    });
    expect(d.action).toBe('intuitive-intro');
  });

  it('سوءبرداشت تکرارشده → نمایش جایگزین (نه فقط تمرین تکراری)', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ isCorrect: false, errorCode: 'conceptual' }),
      mkEvidence({ isCorrect: false, errorCode: 'conceptual', difficulty: 'medium' as Difficulty }),
    ]);
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('alternative-representation');
    expect(d.reasonCode).toBe('REPEATED_MISCONCEPTION');
  });

  it('دقت بسیار پایین → تمرین ساده‌تر', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence({ isCorrect: true }),
      mkEvidence({ isCorrect: false, errorCode: 'calculation', difficulty: 'medium' as Difficulty }),
      mkEvidence({ isCorrect: false, errorCode: 'guessing' }),
      mkEvidence({ isCorrect: false, errorCode: 'operation-order', difficulty: 'medium' as Difficulty }),
      mkEvidence({ isCorrect: false, errorCode: 'calculation', difficulty: 'hard' as Difficulty }),
    ], { independentCorrect: 0, independentTotal: 4 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('easier-practice');
  });

  it('دو خطای متفاوت با دقت قابل قبول → راهنمایی مرحله‌ای', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence(),
      mkEvidence(),
      mkEvidence(),
      mkEvidence({ isCorrect: false, errorCode: 'calculation', difficulty: 'medium' as Difficulty }),
      mkEvidence({ isCorrect: false, errorCode: 'guessing' }),
    ], { independentCorrect: 4, independentTotal: 6 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('guided-practice');
  });

  it('مرور سررسیدشده → مرور ترکیبی', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
    ], { nextReviewAt: NOW - 1000 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('mixed-review');
  });

  it('عملکرد خوب بدون شواهد مستقل کافی → ارزیابی مستقل (درصد به‌تنهایی ملاک نیست)', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
    ], { independentCorrect: 2, independentTotal: 2 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('independent-assessment');
    expect(d.reasonCode).toBe('NEED_INDEPENDENT_EVIDENCE');
  });

  it('عملکرد قوی با دقت کامل، بدون شواهد انتقال → ابتدا سنجش انتقال (تعمیم قبل از افزایش سطح)', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'easy' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence(),
    ], { independentCorrect: 5, independentTotal: 5 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('transfer-assessment');
    expect(d.reasonCode).toBe('TRANSFER_PENDING');
  });

  it('دقت خوب اما زیر آستانه تسلط، بدون موفقیت در سؤال دشوار → تمرین دشوارتر', () => {
    // ۷ تلاش مستقل با ۵ موفقیت (۷۱٪ < آستانه ۸۵٪)؛ آخرین ۵ تلاش ۸۰٪؛ هیچ موفقیتی در سطح hard
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ isCorrect: false, errorCode: 'calculation', difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence(),
      mkEvidence({ difficulty: 'medium' as Difficulty }),
      mkEvidence(),
    ], { independentCorrect: 5, independentTotal: 7 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('harder-practice');
    expect(d.reasonCode).toBe('READY_FOR_HARDER');
  });

  it('پیشرفت ناکامل → تمرین همان سطح', () => {
    const state = mkSkillState('sk-ch2l2', [
      mkEvidence(),
      mkEvidence({ isCorrect: false, errorCode: 'calculation', difficulty: 'medium' as Difficulty }),
    ], { independentCorrect: 1, independentTotal: 2 });
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [{ skillId: 'sk-ch2l1', state: mkSkillState('sk-ch2l1', [mkEvidence({ skillId: 'sk-ch2l1' })], { independentCorrect: 1, independentTotal: 1 }) }],
      now: NOW,
    });
    expect(d.action).toBe('practice-same-level');
  });

  it('هر تصمیم دارای دلیل قابل نمایش و کد ماشین‌خوان است', () => {
    const state = mkSkillState('sk-ch2l2', [mkEvidence()]);
    const d = decideNextStep({
      skill,
      state,
      prereqStates: [],
      now: NOW,
    });
    expect(d.reason.length).toBeGreaterThan(10);
    expect(d.reasonCode.length).toBeGreaterThan(3);
  });
});

// ============================================================ مرور فاصله‌دار
describe('زمان‌بند مرور فاصله‌دار', () => {
  it('بازه‌های پیش‌فرض ۱، ۳، ۷ و ۱۴ روزه‌اند', () => {
    expect(REVIEW_INTERVALS_DAYS).toEqual([1, 3, 7, 14]);
  });

  it('موفقیت بدون راهنما یک پله جلو و موفقیت با راهنما همان پله می‌ماند', () => {
    const a = scheduleNextReview(0, 'success-no-hints', NOW);
    expect(a.reviewStage).toBe(1);
    expect(a.nextReviewAt - NOW).toBe(3 * 24 * 60 * 60 * 1000);
    const b = scheduleNextReview(1, 'success-with-hints', NOW);
    expect(b.reviewStage).toBe(1);
  });

  it('شکست دو پله عقب می‌رود و مرور نزدیک می‌شود', () => {
    const r = scheduleNextReview(3, 'failure', NOW);
    expect(r.reviewStage).toBe(1);
    expect(r.nextReviewAt - NOW).toBe(3 * 24 * 60 * 60 * 1000);
    const r0 = scheduleNextReview(1, 'failure', NOW);
    expect(r0.reviewStage).toBe(0);
  });

  it('سقف پله‌ها رعایت می‌شود', () => {
    const r = scheduleNextReview(3, 'success-no-hints', NOW);
    expect(r.reviewStage).toBe(3);
  });

  it('صف مرور سررسید مرتب‌شده برمی‌گردد', () => {
    const s1 = mkSkillState('sk-a', [mkEvidence()], { nextReviewAt: NOW + 100 });
    const s2 = mkSkillState('sk-b', [mkEvidence()], { nextReviewAt: NOW - 100 });
    const s3 = mkSkillState('sk-c', [mkEvidence()], { nextReviewAt: NOW - 200 });
    const s4 = mkSkillState('sk-d', [mkEvidence()], { nextReviewAt: null });
    expect(dueSkillIds({ sk_a: s1, sk_b: s2, sk_c: s3, sk_d: s4 }, NOW)).toEqual(['sk-c', 'sk-b']);
  });

  it('پیامد تلاش برنامه مرور را به‌روز می‌کند', () => {
    const state = mkSkillState('sk-ch2l2', [mkEvidence()]);
    const next = applyAttemptOutcome(state, true, 0, NOW);
    expect(next.nextReviewAt).toBe(NOW + 3 * 24 * 60 * 60 * 1000);
    expect(next.reviewStage).toBe(1);
  });
});

// ============================================================ طبقه‌بندی خطا
describe('طبقه‌بندی خطاهای ریاضی', () => {
  it('ده مقوله استاندارد ثبت شده‌اند', () => {
    expect(allErrorCodes().length).toBe(10);
  });

  it('پاسخ خالی یا با راهنمای کامل → حدس', () => {
    const q = CURRICULUM_CHAPTERS[1].lessons[1].questions[0];
    expect(classifyWrongAnswer({ question: q, hintsUsed: 0, blankLike: true })).toBe('guessing');
    expect(classifyWrongAnswer({ question: q, hintsUsed: 3, blankLike: false })).toBe('guessing');
  });

  it('تشخیص کتاب به مقوله استاندارد نگاشت می‌شود', () => {
    expect(mapDiagnosisTextToCode('جمع صورت‌ها و مخرج‌ها به‌صورت جداگانه')).toBe('conceptual');
    expect(mapDiagnosisTextToCode('اولویت عملیات ریاضی ابتدا با ضرب است')).toBe('operation-order');
    expect(mapDiagnosisTextToCode('نوشتن ۶ در جایگاه دهگان هزار به‌جای هزارگان')).toBe('place-value');
    expect(mapDiagnosisTextToCode('در تبدیل واحدهای سطح، نسبت خطی باید مجذور شود')).toBe('unit-conversion');
  });

  it('مقوله غالب با بیشترین شمارش انتخاب می‌شود', () => {
    expect(dominantError({ calculation: 2, conceptual: 5 })).toBe('conceptual');
    expect(dominantError({})).toBeUndefined();
  });
});

// ============================================================ دستیار آموزشی
describe('دستیار آموزشی قاعده‌مند', () => {
  const skill = SKILL_BY_ID.get('sk-ch2l2')!;

  it('توضیح ساده‌تر به نمایش غیرنمادین ارجاع می‌دهد', () => {
    const r = assistantRespond('simpler', { skill, state: mkSkillState('sk-ch2l2', []) });
    expect(r.uncertain).toBe(false);
    expect(r.text.length).toBeGreaterThan(20);
    expect(r.text).toContain('ساده‌تر');
  });

  it('راهنمای مرحله‌ای همه گام‌های معتبر مهارت را شامل است', () => {
    const r = assistantRespond('step-guide', { skill, state: mkSkillState('sk-ch2l2', []) });
    for (const step of skill.teachingSteps) expect(r.text).toContain(step.slice(0, 10));
  });

  it('در نبود شواهد، درباره خطاهای خاص ادعای قطعی نمی‌کند', () => {
    const r = assistantRespond('common-mistakes', { skill, state: mkSkillState('sk-ch2l2', []) });
    expect(r.uncertain).toBe(true);
    expect(r.text).toContain('شواهد کافی');
  });

  it('با سوءبرداشت شناسایی‌شده، اصلاح همان مقوله را پیشنهاد می‌دهد', () => {
    const state = mkSkillState('sk-ch2l2', [mkEvidence({ isCorrect: false, errorCode: 'conceptual' })], {
      dominantError: 'conceptual',
    });
    const r = assistantRespond('common-mistakes', { skill, state, recentError: 'conceptual' });
    expect(r.text).toContain('سوءبرداشت مفهومی');
  });

  it('چالش فقط برای عملکرد مستقل قوی پیشنهاد می‌شود', () => {
    const weak = assistantRespond('challenge', { skill, state: mkSkillState('sk-ch2l2', [mkEvidence({ isCorrect: false })]) });
    expect(weak.suggestedAction).toBe('practice-same-level');
    const strong = assistantRespond('challenge', {
      skill,
      state: mkSkillState('sk-ch2l2', [mkEvidence(), mkEvidence(), mkEvidence()], { independentCorrect: 3, independentTotal: 3 }),
    });
    expect(strong.suggestedAction).toBe('transfer-assessment');
  });

  it('یادداشت تشویقی مقایسه‌ای و اعتیادآور نیست', () => {
    const notes = [
      encouragingNote(mkSkillState('sk-ch2l2', [])),
      encouragingNote(mkSkillState('sk-ch2l2', [mkEvidence({ isCorrect: false, errorCode: 'calculation' })])),
      encouragingNote(mkSkillState('sk-ch2l2', [mkEvidence()], { status: 'confirmed-mastery' })),
    ];
    for (const n of notes) {
      expect(n).not.toMatch(/رتبه|بهترین از کلاس|ضعیف‌ترین|بازنده/);
    }
  });
});
