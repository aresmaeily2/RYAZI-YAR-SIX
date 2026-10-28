import type { SkillState } from './types';

/**
 * زمان‌بند مرور فاصله‌دار (Leitner ساده‌شده با بازه‌های قابل تنظیم).
 * بازه‌ها حقیقت علمی قطعی نیستند؛ نقطه شروع شواهدمحور و قابل تنظیم‌اند.
 */
export const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewScheduleResult {
  nextReviewAt: number;
  reviewStage: number;
}

/**
 * محاسبه مرور بعدی پس از یک رویداد (تمرین/مرور).
 * - موفقیت بدون راهنما: یک پله جلو.
 * - موفقیت با راهنما: همان پله.
 * - شکست: دو پله عقب (حداقل صفر) و مرور نزدیک.
 */
export function scheduleNextReview(
  currentStage: number,
  outcome: 'success-no-hints' | 'success-with-hints' | 'failure',
  now: number,
  intervals: readonly number[] = REVIEW_INTERVALS_DAYS
): ReviewScheduleResult {
  const maxStage = intervals.length - 1;
  let stage = Math.max(0, Math.min(maxStage, currentStage));
  if (outcome === 'success-no-hints') stage = Math.min(maxStage, stage + 1);
  else if (outcome === 'failure') stage = Math.max(0, stage - 2);
  const days = intervals[stage];
  return { nextReviewAt: now + days * DAY_MS, reviewStage: stage };
}

/** مهارت‌هایی که مرورشان سررسید شده است */
export function dueSkillIds(states: Record<string, SkillState>, now: number): string[] {
  return Object.values(states)
    .filter((s) => s.nextReviewAt !== null && s.nextReviewAt <= now)
    .filter((s) => s.evidence.length > 0)
    .sort((a, b) => (a.nextReviewAt ?? 0) - (b.nextReviewAt ?? 0))
    .map((s) => s.skillId);
}

/** برچسب فارسی فاصله تا مرور بعدی */
export function reviewDueLabel(nextReviewAt: number | null, now: number): string {
  if (nextReviewAt === null) return 'بدون برنامه مرور';
  const diff = nextReviewAt - now;
  if (diff <= 0) return 'سررسید شده';
  const days = Math.ceil(diff / DAY_MS);
  return days === 1 ? 'فردا' : `${days} روز دیگر`;
}
