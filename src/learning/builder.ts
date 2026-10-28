import type { AttemptRecord, Chapter } from '../types/curriculum';
import { SKILLS, SKILL_BY_ID } from './skills';
import { classifyWrongAnswer, dominantError } from './errorTaxonomy';
import { countDistinctSuccessProfiles, evaluateMastery } from './mastery';
import type { AnswerEvidence, MisconceptionCode, SkillState } from './types';

/**
 * ساخت وضعیت مهارت‌ها از شواهد خام (تلاش‌های ثبت‌شده).
 * وضعیت همیشه «مشتق» است: هیچ حالت پایدار اضافه‌ای ذخیره نمی‌شود؛
 * بنابراین پیشرفت نسخه‌های قبلی برنامه بدون مهاجرت معتبر می‌ماند
 * و خرابی داده نیز با بازسازی از تلاش‌ها جبران می‌شود.
 */

/** نقشه questionId → (skillId, lessonId) ساخته‌شده از داده واقعی کتاب */
export function buildQuestionIndex(chapters: Chapter[]): ReadonlyMap<string, { skillId: string; lessonId: string }> {
  const index = new Map<string, { skillId: string; lessonId: string }>();
  for (const skill of SKILLS) {
    const chapter = chapters.find((c) => c.id === skill.chapterId);
    const lesson = chapter?.lessons.find((l) => l.id === skill.lessonId);
    if (!lesson) continue;
    for (const q of lesson.questions) {
      index.set(q.id, { skillId: skill.id, lessonId: skill.lessonId });
    }
  }
  return index;
}

/** تبدیل یک تلاش خام به شاهد استاندارد لایه یادگیری */
export function attemptToEvidence(
  attempt: AttemptRecord,
  skillId: string,
  firstAttemptOnQuestion: boolean
): AnswerEvidence {
  const errorCode: MisconceptionCode | undefined = attempt.isCorrect
    ? undefined
    : classifyWrongAnswer({
        diagnosisText: attempt.diagnosedMisconception,
        hintsUsed: attempt.hintsUsed,
        blankLike: attempt.selectedAnswer.trim().length === 0,
      });
  return {
    questionId: attempt.questionId,
    skillId,
    isCorrect: attempt.isCorrect,
    hintsUsed: attempt.hintsUsed,
    difficulty: attempt.difficulty,
    source: attempt.source,
    timestamp: attempt.timestamp,
    errorCode,
    firstAttemptOnQuestion,
  };
}

/**
 * بازسازی کامل وضعیت همه مهارت‌ها از تلاش‌ها.
 * پنجره دقت مستقل: تلاش‌های مستقل (بدون راهنما) اخیر هر مهارت (حداکثر ۱۲ تای آخر)
 * تا اثر تلاش‌های قدیمی کهنه شود و پیشرفت واقعی منعکس گردد.
 */
export const INDEPENDENT_WINDOW = 12;

export function rebuildSkillStates(
  attempts: AttemptRecord[],
  questionIndex: ReadonlyMap<string, { skillId: string; lessonId: string }>,
  now: number
): Record<string, SkillState> {
  // مرتب‌سازی زمانی صعودی برای تشخیص «اولین تلاش هر پرسش»
  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  const seenQuestions = new Set<string>();

  const states: Record<string, SkillState> = {};
  for (const skill of SKILLS) {
    states[skill.id] = emptySkillState(skill.id, now);
  }

  for (const attempt of sorted) {
    const mapped = questionIndex.get(attempt.questionId);
    if (!mapped) continue; // تلاش مربوط به مهارت شناخته‌شده نیست
    const state = states[mapped.skillId];
    if (!state) continue;
    const first = !seenQuestions.has(attempt.questionId);
    seenQuestions.add(attempt.questionId);
    const evidence = attemptToEvidence(attempt, mapped.skillId, first);
    state.evidence.push(evidence);
    if (evidence.errorCode) {
      state.errorCounts[evidence.errorCode] = (state.errorCounts[evidence.errorCode] ?? 0) + 1;
    }
    state.lastPracticedAt = attempt.timestamp;
  }

  for (const skill of SKILLS) {
    const state = states[skill.id];
    if (state.evidence.length === 0) continue;

    // پنجره مستقل: آخرین تلاش‌های بدون راهنما
    const independent = state.evidence.filter((e) => e.hintsUsed === 0);
    const window = independent.slice(-INDEPENDENT_WINDOW);
    state.independentCorrect = window.filter((e) => e.isCorrect).length;
    state.independentTotal = window.length;
    state.distinctIndependentSuccessProfiles = countDistinctSuccessProfiles(state, 0);

    // سنجش انتقال و مرور تأخیری از شواهد برچسب‌دار
    state.transferPassed = state.evidence.some((e) => e.source === 'transfer' && e.isCorrect);
    state.delayedReviewPassed = state.evidence.some((e) => e.source === 'review' && e.isCorrect && e.hintsUsed === 0);
    state.prereqChecked = state.evidence.some((e) => e.source === 'prereq');

    state.dominantError = dominantError(state.errorCounts);

    // وضعیت مهارت همیشه با معیار تسلط چندشرطی محاسبه می‌شود
    const mastery = evaluateMastery(state, skill);
    state.status = mastery.status;
    state.confidence = mastery.confidence;
    if (state.status === 'needspractice') {
      // تمایز «در حال یادگیری» از «نیازمند تمرین» بر اساس دقت مستقل اخیر
      const acc = state.independentTotal > 0 ? state.independentCorrect / state.independentTotal : recentAccuracyOf(state);
      state.status = acc >= 0.7 ? 'learning' : 'needspractice';
    }
  }

  return states;
}

/** دقت پنجره اخیر (بدون شرط مستقل بودن) برای مهارت‌هایی که هنوز تلاش مستقل ندارند */
function recentAccuracyOf(state: SkillState): number {
  const recent = state.evidence.slice(-5);
  if (recent.length === 0) return 0;
  return recent.filter((e) => e.isCorrect).length / recent.length;
}

/** وضعیت خالی اولیه یک مهارت */
export function emptySkillState(skillId: string, _now: number): SkillState {
  return {
    skillId,
    status: 'notstarted',
    evidence: [],
    independentCorrect: 0,
    independentTotal: 0,
    distinctIndependentSuccessProfiles: 0,
    transferPassed: false,
    delayedReviewPassed: false,
    prereqChecked: false,
    errorCounts: {},
    dominantError: undefined,
    lastPracticedAt: null,
    nextReviewAt: null,
    reviewStage: 0,
    confidence: 0,
  };
}

/** ادغام وضعیت‌های مشتق با برنامه مرور ذخیره‌شده (تا زمان‌بندی مرور بین نشست‌ها حفظ شود) */
export function mergeWithPersistedReviewPlan(
  derived: Record<string, SkillState>,
  persisted: Record<string, SkillState> | undefined
): Record<string, SkillState> {
  if (!persisted) return derived;
  for (const [id, prev] of Object.entries(persisted)) {
    const cur = derived[id];
    if (!cur) continue;
    // برنامه مرور فقط تا زمانی معتبر است که شواهد جدیدتری برای آن مهارت نیامده باشد
    const hasNewerEvidence = cur.lastPracticedAt !== null && (prev.lastPracticedAt ?? 0) < cur.lastPracticedAt;
    if (!hasNewerEvidence) {
      cur.nextReviewAt = prev.nextReviewAt;
      cur.reviewStage = prev.reviewStage;
    }
  }
  return derived;
}

/** برچسب وضعیت فارسی مهارت */
export function skillStatusLabel(status: SkillState['status']): string {
  switch (status) {
    case 'notstarted':
      return 'شروع نشده';
    case 'prereq-check-needed':
      return 'نیازمند سنجش پیش‌نیاز';
    case 'learning':
      return 'در حال یادگیری';
    case 'needspractice':
      return 'نیازمند تمرین';
    case 'needsreview':
      return 'نیازمند مرور';
    case 'temporary-mastery':
      return 'تسلط موقت';
    case 'confirmed-mastery':
      return 'تسلط تأییدشده';
  }
}

export { SKILL_BY_ID };
