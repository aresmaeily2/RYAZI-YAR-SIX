import type { FlowStage, LessonFlow } from './flowTypes';
import type { Question } from '../types/curriculum';

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
}

/** آیا شرط عبور مرحله برآورده شده است؟ */
export function isStagePassed(
  stage: FlowStage,
  outcomes: StageAttemptOutcome[]
): { passed: boolean; correctCount: number; required: number } {
  const noHintCorrect = outcomes.filter((o) => o.isCorrect && (!stage.passRule.requireNoHints || o.hintsUsed === 0)).length;
  const anyCorrect = outcomes.filter((o) => o.isCorrect).length;
  const correctCount = stage.passRule.requireNoHints ? noHintCorrect : anyCorrect;
  return { passed: correctCount >= stage.passRule.minCorrect, correctCount, required: stage.passRule.minCorrect };
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
  outcomes: StageAttemptOutcome[]
): FlowAdvanceResult {
  const stage = flow.stages[stageIndex];
  const { passed } = isStagePassed(stage, outcomes);

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
