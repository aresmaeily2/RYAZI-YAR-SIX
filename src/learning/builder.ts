import type { AttemptRecord, Chapter } from '../types/curriculum';
import { SKILLS, SKILL_BY_ID } from './skills';
import { classifyWrongAnswer, dominantError } from './errorTaxonomy';
import { countDistinctSuccessProfiles, evaluateMastery } from './mastery';
import { scheduleNextReview } from './review';
import type { AnswerEvidence, MisconceptionCode, SkillDefinition, SkillState } from './types';

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
/**
 * F06 — حفظ تسلط پس از شکست‌های متوالی:
 *
 * تحلیل ممیزی: با پنجرهٔ دقت مستقل ۱۲تایی، پس از دو شکست متوالیِ انتهایی دقتِ
 * پنجره حداکثر ۱۰/۱۲ (۸۳٪) می‌شود و معیار تسلط خودبه‌خود می‌افتد؛ در نتیجه
 * مهارتِ پیش‌تر مسلط به جای «نیازمند مرور» به وضعیت تازه‌کارمانند
 * (learning/needspractice) سقوط می‌کرد و حافظهٔ آموزشی «این دانش‌آموز این
 * مفهوم را یاد گرفته بود» از دست می‌رفت.
 *
 * قواعد اصلاح‌شده (مستند و آزمون‌شده):
 * - مهارتی که پیش‌تر (روی پیشوند شواهد، با همان معیارهای چندشرطی) مسلط تشخیص
 *   داده شده و اکنون جفت‌شکست «بازسازی‌نشده» دارد → وضعیت needsreview.
 * - یک اشتباه تصادفی منفرد هرگز وضعیت را تغییر نمی‌دهد (شکست تنها در جفت سنجیده می‌شود).
 * - موفقیت با راهنما زنجیرهٔ شکست را می‌شکند اما شاهد بازگشت نیست.
 * - بازگشت به مسیر عادی با نخستین موفقیت مستقل پس از جفت‌شکست؛ بازگشت به خودِ
 *   تسلط فقط با بازسازی معیارهای چندشرطی (پنجرهٔ شواهد) رخ می‌دهد.
 * - مهارتی که هرگز مسلط نبوده، با شکست متوالی تازه‌کار می‌ماند (needspractice/learning).
 */
export const CONSECUTIVE_FAILURE_PAIR = 2;

/** شناسهٔ آغاز «آخرین» جفت‌شکست بازسازی‌نشده (بدون موفقیت مستقل پس از آن) یا -۱ */
export function lastUnrecoveredFailurePairIndex(evidence: AnswerEvidence[]): number {
  // از انتهای شواهد به عقب می‌رویم تا آخرین جفت‌شکست پیدا شود
  for (let i = evidence.length - CONSECUTIVE_FAILURE_PAIR; i >= 0; i--) {
    const pair = evidence.slice(i, i + CONSECUTIVE_FAILURE_PAIR);
    if (pair.length === CONSECUTIVE_FAILURE_PAIR && pair.every((e) => !e.isCorrect)) {
      const after = evidence.slice(i + CONSECUTIVE_FAILURE_PAIR);
      // بازسازی فقط با موفقیت مستقل (بدون راهنما) پس از جفت‌شکست
      if (!after.some((e) => e.isCorrect && e.hintsUsed === 0)) return i;
    }
  }
  return -1;
}

export function hasUnrecoveredConsecutiveFailures(evidence: AnswerEvidence[]): boolean {
  return lastUnrecoveredFailurePairIndex(evidence) >= 0;
}

/** ارزیابی وضعیت تسلط روی زیرمجموعه‌ای از شواهد — برای سنجش «آیا پیش‌تر مسلط بود؟» */
function masteryStatusForEvidence(evidence: AnswerEvidence[], skill: SkillDefinition): SkillState['status'] {
  if (evidence.length === 0) return 'notstarted';
  const independent = evidence.filter((e) => e.hintsUsed === 0);
  const window = independent.slice(-INDEPENDENT_WINDOW);
  const pseudo: SkillState = {
    ...emptySkillState(skill.id, 0),
    evidence,
    independentCorrect: window.filter((e) => e.isCorrect).length,
    independentTotal: window.length,
    transferPassed: evidence.some((e) => e.source === 'transfer' && e.isCorrect),
    delayedReviewPassed: evidence.some((e) => e.source === 'review' && e.isCorrect && e.hintsUsed === 0),
  };
  return evaluateMastery(pseudo, skill).status;
}

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

    state.dominantError = dominantError(state.errorCounts);

    // وضعیت مهارت همیشه با معیار تسلط چندشرطی محاسبه می‌شود
    const mastery = evaluateMastery(state, skill);
    state.status = mastery.status;
    state.confidence = mastery.confidence;
    // F06 — حفظ تسلط پس از شکست‌های متوالی: مهارتِ پیش‌تر مسلط با جفت‌شکست
    // بازسازی‌نشده به «نیازمند مرور» می‌رود؛ نه تازه‌کارمانند سقوط می‌کند و
    // نه تسلط بی‌قیدوشرط حفظ می‌شود. اطمینان نمایشی همان وزن معیارها می‌ماند
    // (در این حالت به‌طور طبیعی ≤ ۴/۷ است چون شرط دقت پنجره از دست رفته است).
    const pairStart = lastUnrecoveredFailurePairIndex(state.evidence);
    if (pairStart >= 0) {
      const prefixMastery = masteryStatusForEvidence(state.evidence.slice(0, pairStart), skill);
      const wasMastery = prefixMastery === 'confirmed-mastery' || prefixMastery === 'temporary-mastery';
      const currentIsMastery = state.status === 'confirmed-mastery' || state.status === 'temporary-mastery';
      if (wasMastery || currentIsMastery) {
        state.status = 'needsreview';
      }
    }
    if (state.status === 'needspractice') {
      // تمایز «در حال یادگیری» از «نیازمند تمرین» بر اساس دقت مستقل اخیر
      const acc = state.independentTotal > 0 ? state.independentCorrect / state.independentTotal : recentAccuracyOf(state);
      state.status = acc >= 0.7 ? 'learning' : 'needspractice';
    }
  }

  // بررسی‌شدن پیش‌نیازها: همه پیش‌نیازهای مستقیم باید حداقل یک شواهد داشته باشند
  for (const skill of SKILLS) {
    const state = states[skill.id];
    if (skill.prerequisites.length === 0) {
      state.prereqChecked = true; // بدون پیش‌نیاز، سنجش لازم نیست
      continue;
    }
    state.prereqChecked = skill.prerequisites.every((p) => (states[p]?.evidence.length ?? 0) > 0);
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

/**
 * اعمال برنامه مرور ذخیره‌شده بر وضعیت‌های مشتق.
 * stage مرور فقط از برنامه پایدار می‌آید (رفتار لایتنر یکنواخت می‌ماند)؛
 * اگر برای مهارتی شواهد جدیدتری از آخرین مدخل برنامه آمده باشد،
 * زمان‌بندی آن مهارت منقضی تلقی و صرفاً توسط تلاش بعدی بازمحاسبه می‌شود.
 */
export function applyReviewPlan(
  derived: Record<string, SkillState>,
  plan: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }> | undefined
): Record<string, SkillState> {
  if (!plan) return derived;
  for (const [id, entry] of Object.entries(plan)) {
    const cur = derived[id];
    if (!cur) continue;
    const hasNewerEvidence = cur.lastPracticedAt !== null && entry.lastPracticedAt < cur.lastPracticedAt;
    if (!hasNewerEvidence) {
      cur.nextReviewAt = entry.nextReviewAt;
      cur.reviewStage = entry.reviewStage;
    }
  }
  return derived;
}

/**
 * F07 — بازسازی برنامهٔ مرور از تلاش‌ها:
 * برنامهٔ مرور فاصله‌دار (reviewPlan) فیلد ذخیره‌سازی‌شدنی است و ممکن است گم،
 * ناقص یا قدیمی شود (دادهٔ نسخه‌های قبلی بدون آن، خروجی ناقص از پشتیبان‌گیری،
 * یا مدخل‌های جاافتاده برای مهارت‌های دارای شواهد). این تابع با پخش مجدد
 * ترتیبیِ تلاش‌های هر مهارت از زمان‌بند لایتنر، همان برنامه‌ای را که ثبت
 * تدریجی می‌ساخت — به‌صورت قطعی و بدون اثر جانبی — بازتولید می‌کند.
 *
 * تضمین قطعیت: اگر برنامهٔ ذخیره‌شده کامل و به‌روز باشد، خروجی این تابع برای
 * هر مهارت با مدخل ذخیره‌شده یکسان است؛ بنابراین ادغام (ذخیره‌شده بر بازسازی
 * اولویت دارد) برای دادهٔ سالم بی‌اثر است و فقط شکاف‌ها را پر می‌کند.
 * جلوگیری از مرور تکراری: مدخل بازسازی‌شده همان nextReviewAt آینده‌نگرِ
 * ناشی از آخرین تلاش را دارد؛ پس مهارتی که مرورش سررسید نشده، سررسید تلقی نمی‌شود
 * و گارد hasNewerEvidence در applyReviewPlan نیز مدخل کهنه را رد می‌کند.
 */
export function rebuildReviewPlan(
  attempts: AttemptRecord[],
  questionIndex: ReadonlyMap<string, { skillId: string; lessonId: string }>
): Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }> {
  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);
  const plan: Record<string, { nextReviewAt: number; reviewStage: number; lastPracticedAt: number }> = {};
  for (const attempt of sorted) {
    const mapped = questionIndex.get(attempt.questionId);
    if (!mapped) continue;
    const outcome = !attempt.isCorrect
      ? 'failure'
      : attempt.hintsUsed === 0
        ? 'success-no-hints'
        : 'success-with-hints';
    const prev = plan[mapped.skillId];
    const next = scheduleNextReview(prev?.reviewStage ?? 0, outcome, attempt.timestamp);
    plan[mapped.skillId] = {
      nextReviewAt: next.nextReviewAt,
      reviewStage: next.reviewStage,
      lastPracticedAt: attempt.timestamp,
    };
  }
  return plan;
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
