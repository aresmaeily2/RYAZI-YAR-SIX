import type { FlowStage, LessonFlow } from './flowTypes';
import type { Question } from '../types/curriculum';
import type { SkillState } from './types';

/**
 * منطق خالص پیشرفت جریان درس — جدا از رابط کاربری برای آزمون‌پذیری.
 */

/** پرسش‌های سنجش‌پذیر یک مرحله (ارجاع‌ها از داده کتاب + inlineها) */
export function stageQuestions(
  stage: FlowStage,
  questionById: ReadonlyMap<string, Question>
): Question[] {
  const refs = (stage.questionRefs ?? [])
    .map((id) => questionById.get(id))
    .filter((q): q is Question => q !== undefined);
  return [...refs, ...(stage.inlineQuestions ?? [])];
}

export interface StageAttemptOutcome {
  questionId: string;
  isCorrect: boolean;
  hintsUsed: number;
  /** F08 — آیا پاسخ «ساختی» است (عددی/کسر) نه چهارگزینه‌ایِ قابل‌حدس؟ */
  constructedResponse?: boolean;
}

/** آیا شرط عبور مرحله برآورده شده است؟ */
export function isStagePassed(
  stage: FlowStage,
  outcomes: StageAttemptOutcome[],
  prereqState?: SkillState
): { passed: boolean; correctCount: number; required: number } {
  // F08 — تأیید پیش‌نیاز آگاه از سابقه و نوع سؤال (فقط وقتی وضعیت پیش‌نیاز در دسترس است)
  if (stage.kind === 'prereq-check' && prereqState) {
    const c = prereqConfirmation(outcomes, stage.passRule.minCorrect, prereqState);
    return { passed: c.confirmed, correctCount: c.independentCorrect, required: c.required };
  }
  const noHintCorrect = outcomes.filter((o) => o.isCorrect && (!stage.passRule.requireNoHints || o.hintsUsed === 0)).length;
  const anyCorrect = outcomes.filter((o) => o.isCorrect).length;
  const correctCount = stage.passRule.requireNoHints ? noHintCorrect : anyCorrect;
  return { passed: correctCount >= stage.passRule.minCorrect, correctCount, required: stage.passRule.minCorrect };
}

/**
 * F08 — سیاست تأیید پیش‌نیاز.
 *
 * پرسش ممیزی: آیا «یک پاسخ» برای تأیید پیش‌نیاز کفایت می‌کند؟
 * پاسخ: یک عدد ثابت بی‌توجیه، نه. تصمیم به سه عامل بستگی دارد:
 *
 *  ۱) استقلال: فقط پاسخ درستِ بدون راهنما شواهد تأیید شمرده می‌شود؛ پاسخ درست
 *     با راهنما نشان می‌دهد مهارت هنوز مستقل نیست (guidedOnly) و تأیید نمی‌شود —
 *     حلقهٔ یادآوری و بازآزمون همان مسیر موجود، شواهد مستقل جمع می‌کند.
 *  ۲) سابقهٔ یادگیرنده روی خودِ مهارت پیش‌نیاز:
 *     - سابقهٔ قوی (وضعیت تسلط موقت/تأییدشده): یک موفقیت مستقل کافی است —
 *       سابقه بار اصلی شواهد را حمل می‌کند و پاسخ فعلی تأییدکننده است.
 *     - سابقهٔ متوسط (حداقل ۲ تلاش مستقل با دقت ≥ ۵۰٪): حداقل ۲ موفقیت مستقل.
 *     - بدون سابقه: حداقل ۲ موفقیت مستقل (یک پاسخ تکی قابل‌اتکا نیست).
 *  ۳) نوع سؤال: پاسخ چهارگزینه‌ای قابل حدس (~۲۵٪) است؛ تا وقتی مرحله پرسش
 *     پاسخ‌ساخت (عددی/کسر) دارد و سابقهٔ قوی نیست، دست‌کم یکی از موفقیت‌های
 *     مستقل باید پاسخ‌ساخت باشد تا شانس حدس حذف شود.
 *
 * هرگز مهلک نیست: عدم تأیید یعنی مسیر یادآوری/بازآزمون مرحله A — نه بن‌بست.
 */
export interface PrereqConfirmationResult {
  confirmed: boolean;
  /** شمار موفقیت‌های مستقل (بدون راهنما) */
  independentCorrect: number;
  /** حداقل موفقیت مستقل موردنیاز (مشتق از قاعدهٔ مرحله + سابقه) */
  required: number;
  hasPriorHistory: boolean;
  strongHistory: boolean;
  /** پاسخ‌های درست هست اما همه با راهنما */
  guidedOnly: boolean;
  /** توضیح قابل نمایش برای معلم/والد */
  reason: string;
}

export function prereqConfirmation(
  outcomes: StageAttemptOutcome[],
  minCorrect: number,
  prereqState?: SkillState
): PrereqConfirmationResult {
  const independent = outcomes.filter((o) => o.isCorrect && o.hintsUsed === 0);
  const independentCorrect = independent.length;
  const anyCorrect = outcomes.filter((o) => o.isCorrect).length;
  const guidedOnly = independentCorrect === 0 && anyCorrect > 0;

  const strongHistory =
    prereqState?.status === 'temporary-mastery' || prereqState?.status === 'confirmed-mastery';
  const weakHistory =
    !strongHistory &&
    prereqState !== undefined &&
    prereqState.independentTotal >= 2 &&
    prereqState.independentCorrect / prereqState.independentTotal >= 0.5;
  const hasPriorHistory = strongHistory || weakHistory;

  const required = Math.max(minCorrect, strongHistory ? 1 : 2);

  // نوع سؤال: اگر مرحله پرسش پاسخ‌ساخت دارد و سابقهٔ قوی نیست، دست‌کم یک موفقیت مستقل پاسخ‌ساخت
  const stageHasConstructed = outcomes.some((o) => o.constructedResponse === true);
  const hasConstructedIndependent = independent.some((o) => o.constructedResponse === true);
  const constructedOk = !stageHasConstructed || strongHistory || hasConstructedIndependent;

  const confirmed = independentCorrect >= required && constructedOk && !guidedOnly;

  let reason: string;
  if (confirmed) {
    reason = strongHistory
      ? `تسلط پیشین روی پیش‌نیاز + ${independentCorrect} موفقیت مستقل؛ پیش‌نیاز تأیید شد.`
      : `${independentCorrect} موفقیت مستقل (حداقل ${required})؛ پیش‌نیاز تأیید شد.`;
  } else if (guidedOnly) {
    reason = 'پاسخ‌های درست با راهنما بودند؛ تأیید پیش‌نیاز به موفقیت مستقل نیاز دارد و یادآوری/بازآزمون ارائه می‌شود.';
  } else if (!constructedOk) {
    reason = 'برای حذف شانس حدس، دست‌کم یک پاسخ درستِ بدون راهنما روی پرسش پاسخ‌ساخت (عددی) لازم است.';
  } else {
    reason = `${independentCorrect} موفقیت مستقل از حداقل ${required} موردنیاز؛ یادآوری کوتاه و بازآزمون ارائه می‌شود.`;
  }
  return { confirmed, independentCorrect, required, hasPriorHistory, strongHistory, guidedOnly, reason };
}

export interface FlowAdvanceResult {
  nextIndex: number;
  /** مرحله A: نیاز به توضیح اصلاحی + بازآزمون */
  needsRemedialRetest: boolean;
  done: boolean;
}

/**
 * تصمیم پیشرفت پس از یک مرحله:
 * - عبور → مرحله بعد
 * - عدم عبور در سنجش پیش‌نیاز → توضیح اصلاحی و بازآزمون (نه عبور اجباری)
 * - عدم عبور در سایر مرحله‌ها → تکرار همان مرحله با راهنمای بیشتر (مگر در تمرین مستقل که ادامه مسیر آزاد است)
 */
export function advanceFlow(
  flow: LessonFlow,
  stageIndex: number,
  outcomes: StageAttemptOutcome[],
  prereqState?: SkillState
): FlowAdvanceResult {
  const stage = flow.stages[stageIndex];
  const { passed } = isStagePassed(stage, outcomes, prereqState);

  if (passed) {
    const nextIndex = stageIndex + 1;
    return { nextIndex, needsRemedialRetest: false, done: nextIndex >= flow.stages.length };
  }

  if (stage.kind === 'prereq-check' && stage.retestQuestions && stage.remedial) {
    return { nextIndex: stageIndex, needsRemedialRetest: true, done: false };
  }

  if (stage.kind === 'independent-practice' || stage.kind === 'transfer-assessment') {
    // در سنجش‌ها عبور اجباری نیست؛ مسیر ادامه می‌یابد اما شواهد ثبت شده است
    const nextIndex = stageIndex + 1;
    return { nextIndex, needsRemedialRetest: false, done: nextIndex >= flow.stages.length };
  }

  return { nextIndex: stageIndex, needsRemedialRetest: false, done: false };
}

/** متن پیشرفت جریان برای نمایش */
export function flowProgressLabel(stageIndex: number, total: number): string {
  return `مرحله ${stageIndex + 1} از ${total}`;
}
