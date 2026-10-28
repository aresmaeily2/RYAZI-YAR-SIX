import type { AnswerEvidence, SkillDefinition, SkillState } from './types';

/**
 * معیار تسلط چندشرطی و قابل تنظیم:
 * ۱) دقت مستقل (بدون راهنما) ≥ آستانه (پیش‌فرض ۸۵٪)
 * ۲) حداقل تعداد تلاش مستقل
 * ۳) موفقیت مستقل در حداقل دو «پروفایل متفاوت» (نوع پرسش/سطح دشواری متفاوت)
 * ۴) موفقیت در سنجش انتقال (مسئله با ظاهر متفاوت)
 * ۵) موفقیت در مرور تأخیری
 *
 * هیچ‌یک حقیقت علمی قطعی نیست؛ آستانه‌ها از پیکربندی خوانده می‌شوند و
 * باید بر اساس نتایج ارزیابی واقعی بازتنظیم شوند.
 */

export interface MasteryPolicy {
  /** آستانه دقت مستقل — کلید تنظیم سراسری؛ مقدار پیش‌فرض هر مهارت ۰٫۸۵ است */
  independentAccuracyThreshold: number;
  /** کمینه تلاش مستقل برای قضاوت */
  minIndependentAttempts: number;
  /** کمینه پروفایل موفقیت متفاوت (نوع/سطح) */
  minDistinctSuccessProfiles: number;
  /** بیشینه راهنمای مجاز در تلاش «مستقل» */
  maxHintsForIndependence: number;
  /** الزام سنجش انتقال */
  requireTransfer: boolean;
  /** الزام مرور تأخیری موفق */
  requireDelayedReview: boolean;
}

export const DEFAULT_MASTERY_POLICY: MasteryPolicy = {
  independentAccuracyThreshold: 0.85,
  minIndependentAttempts: 4,
  minDistinctSuccessProfiles: 2,
  maxHintsForIndependence: 0,
  requireTransfer: true,
  requireDelayedReview: true,
};

/** پروفایل موفقیت: ترکیب نوع منبع + سطح دشواری؛ برای تنوع شواهد */
export function successProfileOf(e: AnswerEvidence): string {
  return `${e.source}:${e.difficulty}`;
}

/** شمار پروفایل‌های متفاوتی که در آن‌ها موفقیت مستقل رخ داده است */
export function countDistinctSuccessProfiles(state: SkillState, maxHints: number): number {
  const profiles = new Set<string>();
  for (const e of state.evidence) {
    if (e.isCorrect && e.hintsUsed <= maxHints) profiles.add(successProfileOf(e));
  }
  return profiles.size;
}

export interface MasteryEvaluation {
  status: SkillState['status'];
  confidence: number;
  /** شرط‌های برآورده‌نشده — برای نمایش شفاف */
  missing: string[];
}

/**
 * ارزیابی تسلط بر اساس سیاست. تابع خالص و قابل آزمون.
 * اطمینان: نسبت شرط‌های برآورده‌شده با وزن دقت (۳) + تنوع (۲) + انتقال (۱) + مرور (۱).
 */
export function evaluateMastery(
  state: SkillState,
  skill: SkillDefinition,
  policy: MasteryPolicy = DEFAULT_MASTERY_POLICY
): MasteryEvaluation {
  const missing: string[] = [];
  let weightMet = 0;
  const weightTotal = 7;

  const acc = state.independentTotal > 0 ? state.independentCorrect / state.independentTotal : 0;
  // آستانه مؤثر: سیاست تنظیم‌شده سراسری؛ مقدار هر مهارت (skill.masteryThreshold) پیش‌فرض مستند است
  const threshold = policy.independentAccuracyThreshold;
  const accMet =
    state.independentTotal >= policy.minIndependentAttempts &&
    acc >= threshold;
  if (accMet) weightMet += 3;
  else missing.push(`دقت مستقل «${skill.title}» ${Math.round(acc * 100)}٪ است (نیاز: ${Math.round(threshold * 100)}٪ در حداقل ${policy.minIndependentAttempts} تلاش بدون راهنما)`);

  const variety = countDistinctSuccessProfiles(state, policy.maxHintsForIndependence);
  const varietyMet = variety >= policy.minDistinctSuccessProfiles;
  if (varietyMet) weightMet += 2;
  else missing.push(`موفقیت در ${variety} پروفایل متفاوت ثبت شده (نیاز: ${policy.minDistinctSuccessProfiles} نوع سؤال/سطح متفاوت)`);

  const transferMet = !policy.requireTransfer || state.transferPassed;
  if (transferMet) weightMet += 1;
  else if (policy.requireTransfer) missing.push('سنجش انتقال (مسئله با ظاهر متفاوت) موفق ثبت نشده است');

  const reviewMet = !policy.requireDelayedReview || state.delayedReviewPassed;
  if (reviewMet) weightMet += 1;
  else if (policy.requireDelayedReview) missing.push('مرور تأخیری موفق ثبت نشده است');

  const confidence = weightMet / weightTotal;

  if (accMet && varietyMet && transferMet && reviewMet) {
    return { status: 'confirmed-mastery', confidence, missing: [] };
  }

  // تسلط موقت: دقت و تنوع مستقل برآورده شده اما انتقال/مرور هنوز نه
  if (accMet && varietyMet) {
    return { status: 'temporary-mastery', confidence, missing };
  }

  return { status: 'needspractice', confidence, missing };
}
