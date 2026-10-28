import { SKILL_BY_ID } from './skills';
import { evaluateMastery, DEFAULT_MASTERY_POLICY, type MasteryPolicy } from './mastery';
import { scheduleNextReview } from './review';
import type { EngineDecision, SkillDefinition, SkillState } from './types';

/**
 * موتور تصمیم‌گیری تطبیقی — شفاف، قاعده‌مند و قابل آزمون.
 *
 * اصل: تصمیم فقط بر اساس درصد پاسخ صحیح نیست؛ سطح دشواری پرسش‌ها،
 * مصرف راهنما، اولین‌تلاش بودن، تنوع پروفایل موفقیت، سنجش انتقال،
 * مرور تأخیری و وضعیت پیش‌نیازها همگی در تصمیم نقش دارند.
 * خروجی هر تصمیم «دلیل قابل نمایش» دارد تا مسیر برای معلم/والد توضیح‌پذیر باشد.
 */

export interface DecideInput {
  skill: SkillDefinition;
  state: SkillState;
  /** وضعیت مهارت‌های پیش‌نیاز مستقیم */
  prereqStates: Array<{ skillId: string; state: SkillState }>;
  now: number;
  policy?: MasteryPolicy;
}

/** چند پاسخ غلط پیاپی اخیر = نشانه نیاز به تغییر رویکرد */
const CONSECUTIVE_WRONG_LIMIT = 2;
/** آستانه دقت اخیر برای «در حال یادگیری خوب» */
const RECENT_GOOD_ACC = 0.7;

function consecutiveRecentWrong(state: SkillState): boolean {
  const recent = state.evidence.slice(-CONSECUTIVE_WRONG_LIMIT);
  return recent.length === CONSECUTIVE_WRONG_LIMIT && recent.every((e) => !e.isCorrect);
}

function recentAccuracy(state: SkillState, window = 5): number {
  const recent = state.evidence.slice(-window);
  if (recent.length === 0) return 0;
  return recent.filter((e) => e.isCorrect).length / recent.length;
}

/** آخرین شمار خطاها در پنجره کوتاه برای تشخیص تکرار یک سوءبرداشت */
function repeatedSameError(state: SkillState): boolean {
  const recent = state.evidence.slice(-3).filter((e) => !e.isCorrect && e.errorCode);
  if (recent.length < 2) return false;
  const first = recent[recent.length - 1].errorCode;
  return recent.every((e) => e.errorCode === first);
}

function weakestPrereq(
  input: DecideInput
): { skillId: string; state: SkillState } | null {
  const candidates = input.prereqStates.filter(
    (p) => p.state.evidence.length === 0 || (p.state.independentTotal >= 2 && p.state.independentCorrect / p.state.independentTotal < 0.5)
  );
  if (candidates.length === 0) return null;
  // پیش‌نیاز بدون هیچ شواهد، اولویت دارد
  candidates.sort((a, b) => a.state.evidence.length - b.state.evidence.length);
  return candidates[0];
}

/**
 * تصمیم گام بعدی برای یک مهارت. قواعد به ترتیب اولویت اجرا می‌شوند و
 * اولین قاعده منطبق، تصمیم و دلیل را تعیین می‌کند.
 */
export function decideNextStep(input: DecideInput): EngineDecision {
  const { skill, state, prereqStates, now } = input;
  const policy = input.policy ?? DEFAULT_MASTERY_POLICY;

  // ۰) مهارت اصلاً شروع نشده
  if (state.evidence.length === 0) {
    const weakPrereq = weakestPrereq({ skill, state, prereqStates, now, policy });
    if (skill.prerequisites.length > 0 && weakPrereq) {
      const prereqSkill = SKILL_BY_ID.get(weakPrereq.skillId);
      return {
        action: weakPrereq.state.evidence.length === 0 ? 'prerequisite-check' : 'review-prerequisite',
        reason: `پیش از «${skill.title}» باید مهارت «${prereqSkill?.title ?? weakPrereq.skillId}» ${
          weakPrereq.state.evidence.length === 0 ? 'سنجیده شود' : 'مرور شود'
        }.`,
        reasonCode: 'PREREQ_NOT_READY',
        targetSkillId: weakPrereq.skillId,
      };
    }
    if (skill.prerequisites.length > 0 && !state.prereqChecked) {
      return {
        action: 'prerequisite-check',
        reason: 'پیش از شروع درس، چند سؤال کوتاه پیش‌نیاز مطرح می‌شود.',
        reasonCode: 'PREREQ_CHECK_PENDING',
      };
    }
    return {
      action: 'intuitive-intro',
      reason: 'شروع مفهوم با مسئله واقعی و نمایش ملموس برای ساختن درک شهودی.',
      reasonCode: 'FRESH_START_INTUITIVE',
    };
  }

  // ۱) پیش‌نیاز ضعیف با شواهد منفی → بازگشت به پیش‌نیاز
  const weakPrereq = weakestPrereq({ skill, state, prereqStates, now, policy });
  if (weakPrereq && consecutiveRecentWrong(state)) {
    const prereqSkill = SKILL_BY_ID.get(weakPrereq.skillId);
    return {
      action: 'review-prerequisite',
      reason: `دو پاسخ آخر نادرست بوده و پیش‌نیاز «${prereqSkill?.title ?? weakPrereq.skillId}» نیز ضعیف است؛ بازگشت موقت به پیش‌نیاز لازم است.`,
      reasonCode: 'PREREQ_WEAK_WITH_ERRORS',
      targetSkillId: weakPrereq.skillId,
    };
  }

  // ۲) شکست پیاپی اخیر
  if (consecutiveRecentWrong(state)) {
    if (repeatedSameError(state)) {
      return {
        action: 'alternative-representation',
        reason: 'یک سوءبرداشت تکرار شده است؛ مفهوم با نمایش متفاوت (تصویری/ملموس) دوباره ساخته می‌شود.',
        reasonCode: 'REPEATED_MISCONCEPTION',
      };
    }
    const acc = recentAccuracy(state);
    if (acc < 0.4 && state.independentTotal >= 2 && state.independentCorrect / Math.max(1, state.independentTotal) < 0.5) {
      return {
        action: 'easier-practice',
        reason: 'دقت اخیر پایین است؛ با پرسش ساده‌تر اعتمادسازی و تثبیت روش انجام می‌شود.',
        reasonCode: 'LOW_ACC_EASIER',
      };
    }
    return {
      action: 'guided-practice',
      reason: 'پاسخ‌های اخیر نادرست‌اند؛ حل با راهنمای مرحله‌به‌مرحله ادامه می‌یابد.',
      reasonCode: 'CONSECUTIVE_WRONG_GUIDED',
    };
  }

  // ۳) مرور سررسیدشده
  if (state.nextReviewAt !== null && state.nextReviewAt <= now) {
    if (state.status === 'confirmed-mastery') {
      return {
        action: 'schedule-review',
        reason: 'مرور فاصله‌دار برای حفظ تسلط تأییدشده سررسید شده است.',
        reasonCode: 'MASTERY_REVIEW_DUE',
      };
    }
    return {
      action: 'mixed-review',
      reason: 'مرور سررسیدشده؛ ترکیب این مفهوم با مفاهیم قبلی برای ماندگاری انجام می‌شود.',
      reasonCode: 'REVIEW_DUE_MIXED',
    };
  }

  // ۴) ارزیابی تسلط
  const mastery = evaluateMastery(state, skill, policy);
  if (mastery.status === 'confirmed-mastery') {
    return {
      action: 'maintain-mastery',
      reason: `تسلط تأییدشده (اطمینان ${Math.round(mastery.confidence * 100)}٪)؛ مرور بعدی طبق برنامه فاصله‌دار.`,
      reasonCode: 'CONFIRMED_MASTERY',
    };
  }
  if (mastery.status === 'temporary-mastery') {
    if (policy.requireTransfer && !state.transferPassed) {
      return {
        action: 'transfer-assessment',
        reason: 'دقت مستقل خوب است؛ حالا تسلط در مسئله‌ای با ظاهر متفاوت سنجیده می‌شود.',
        reasonCode: 'TRANSFER_PENDING',
      };
    }
    if (policy.requireDelayedReview && !state.delayedReviewPassed) {
      return {
        action: 'schedule-review',
        reason: 'تسلط موقت ثبت شد؛ پس از مرور تأخیری موفق، تسلط تأیید می‌شود.',
        reasonCode: 'DELAYED_REVIEW_PENDING',
      };
    }
  }

  // ۵) عملکرد خوب اخیر → دشوارتر یا ارزیابی مستقل
  const recentAcc = recentAccuracy(state);
  if (recentAcc >= RECENT_GOOD_ACC && state.evidence.length >= 3) {
    const strongHintsFree = state.independentTotal >= policy.minIndependentAttempts;
    if (!strongHintsFree) {
      return {
        action: 'independent-assessment',
        reason: 'عملکرد خوب است؛ برای قضاوت تسلط، ارزیابی بدون هیچ راهنمایی لازم است.',
        reasonCode: 'NEED_INDEPENDENT_EVIDENCE',
      };
    }
    const hardOk = state.evidence.filter((e) => e.difficulty === 'hard' && e.isCorrect).length >= 1;
    if (!hardOk) {
      return {
        action: 'harder-practice',
        reason: 'پرسش‌های ساده و متوسط را خوب حل می‌کند؛ زمان مسئله دشوارتر و کاربردی‌تر است.',
        reasonCode: 'READY_FOR_HARDER',
      };
    }
    return {
      action: 'independent-assessment',
      reason: 'عملکرد پایدار در سطوح مختلف؛ ارزیابی مستقل چندنوعی برای ثبت تسلط انجام می‌شود.',
      reasonCode: 'READY_FOR_ASSESSMENT',
    };
  }

  // ۶) پیشرفت ناکامل → تمرین همان سطح
  return {
    action: 'practice-same-level',
    reason: 'در حال یادگیری؛ تمرین متنوع در همین سطح تا تثبیت روش ادامه می‌یابد.',
    reasonCode: 'PRACTICE_SAME_LEVEL',
  };
}

/**
 * ثبت پیامد یک تلاش روی وضعیت مهارت (توابع خالص؛ state جدید برمی‌گردد).
 * در موتور واقعی، صداکننده پس از هر تلاش این را اعمال و برنامه مرور را به‌روز می‌کند.
 */
export function applyAttemptOutcome(
  state: SkillState,
  isCorrect: boolean,
  hintsUsed: number,
  now: number
): SkillState {
  const outcome = !isCorrect ? 'failure' : hintsUsed === 0 ? 'success-no-hints' : 'success-with-hints';
  const plan = scheduleNextReview(state.reviewStage, outcome, now);
  return { ...state, reviewStage: plan.reviewStage, nextReviewAt: plan.nextReviewAt };
}
