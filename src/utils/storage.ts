import type { AttemptRecord, LearnerState } from '../types/curriculum';

/**
 * لایه ذخیره‌سازی محلی (localStorage) با اعتبارسنجی ساختار.
 * هیچ داده‌ای از دستگاه خارج نمی‌شود؛ برای پشتیبان‌گیری، خروجی/ورودی JSON در اختیار کاربر است.
 */

export const STORAGE_KEY = 'ryaziyarsix.state.v3';

export function createInitialState(studentName = 'دانش‌آموز پایه ششم'): LearnerState {
  return {
    studentName,
    xp: 0,
    streakDays: 1,
    lastActiveDate: new Date().toISOString().slice(0, 10),
    lastVisitedChapterId: 'ch1',
    lastVisitedLessonId: 'ch1l1',
    completedLessonIds: [],
    attempts: [],
  };
}

function isValidAttempt(a: unknown): a is AttemptRecord {
  if (typeof a !== 'object' || a === null) return false;
  const rec = a as Record<string, unknown>;
  return (
    typeof rec.id === 'string' &&
    typeof rec.questionId === 'string' &&
    typeof rec.chapterId === 'string' &&
    typeof rec.lessonId === 'string' &&
    typeof rec.selectedAnswer === 'string' &&
    typeof rec.isCorrect === 'boolean' &&
    typeof rec.hintsUsed === 'number' &&
    typeof rec.timestamp === 'number' &&
    (rec.source === 'practice' ||
      rec.source === 'exam' ||
      rec.source === 'prereq' ||
      rec.source === 'transfer' ||
      rec.source === 'review')
  );
}

function isValidState(value: unknown): value is LearnerState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  // اعتبارسنجی برنامه مرور اختیاری (سازگار با داده نسخه‌های قبلی)
  if (s.reviewPlan !== undefined) {
    if (typeof s.reviewPlan !== 'object' || s.reviewPlan === null) return false;
    const plan = s.reviewPlan as Record<string, unknown>;
    for (const entry of Object.values(plan)) {
      if (typeof entry !== 'object' || entry === null) return false;
      const e = entry as Record<string, unknown>;
      if (typeof e.nextReviewAt !== 'number' || typeof e.reviewStage !== 'number' || typeof e.lastPracticedAt !== 'number') return false;
    }
  }
  return (
    typeof s.studentName === 'string' &&
    typeof s.xp === 'number' &&
    Number.isFinite(s.xp) &&
    s.xp >= 0 &&
    typeof s.streakDays === 'number' &&
    typeof s.lastActiveDate === 'string' &&
    typeof s.lastVisitedChapterId === 'string' &&
    typeof s.lastVisitedLessonId === 'string' &&
    Array.isArray(s.completedLessonIds) &&
    Array.isArray(s.attempts) &&
    s.attempts.every(isValidAttempt)
  );
}

/** بارگذاری وضعیت با اعتبارسنجی؛ در صورت خرابی داده، حالت اولیه برگردانده می‌شود */
export function loadLearnerState(): LearnerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    const parsed: unknown = JSON.parse(raw);
    if (isValidState(parsed)) return parsed;
    return createInitialState();
  } catch {
    return createInitialState();
  }
}

/** ذخیره وضعیت؛ خطای ذخیره‌سازی (مثل پر بودن حافظه) بی‌صدا مدیریت می‌شود */
export function saveLearnerState(state: LearnerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ذخیره‌سازی محلی ممکن نیست (حالت مرورگر خصوصی یا پر بودن ظرفیت)؛ برنامه بدون ذخیره ادامه می‌دهد
  }
}

/** پاک کردن کامل داده‌های پیشرفت */
export function clearLearnerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // بی‌اهمیت
  }
}

/** ساخت رشته خروجی JSON برای پشتیبان‌گیری */
export function exportStateJson(state: LearnerState): string {
  return JSON.stringify(state, null, 2);
}

/** اعتبارسنجی و پذیرش فایل پشتیبان JSON */
export function importStateJson(json: string): LearnerState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    if (isValidState(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}
