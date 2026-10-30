import type { Question, Difficulty, NumericQuestion } from '../types/curriculum';
import type { RepresentationKind } from './types';

/**
 * الگوی آموزشی چندمرحله‌ای (A تا H) برای درس‌ها.
 * هر جریان برای «ماهیت همان مفهوم» طراحی می‌شود؛ همه درس‌ها قالب یکسان ندارند.
 * مرحله H (مرور تأخیری) در موتور یادگیری و زمان‌بند فاصله‌دار پیاده شده است
 * و جریان، شواهد مرور را از طریق منبع «review» تغذیه می‌کند.
 */

/** نوع مرحله جریان درس */
export type FlowStageKind =
  | 'prereq-check'          // A — سنجش پیش‌نیاز
  | 'intuitive-intro'       // B — ایجاد درک شهودی
  | 'representations'       // C — نمایش چندگانه
  | 'worked-example'        // D — مثال حل‌شده با بلنداندیشی
  | 'completion-example'    // E — مثال ناقص و مشارکت دانش‌آموز
  | 'independent-practice'  // F — تمرین مستقل و تدریجی
  | 'transfer-assessment';  // G — سنجش انتقال یادگیری

/** یک کارت نمایش مفهوم (مرحله C) */
export interface RepresentationCard {
  kind: RepresentationKind;
  label: string;
  /** توضیح نمایش به زبان کودک */
  content: string;
}

/** گام مثال حل‌شده با بلنداندیشی آموزشی (مرحله D) */
export interface MetacognitiveStep {
  text: string;
  /** چرا این روش/گام انتخاب شد */
  why: string;
  /** از کجا می‌توان صحت را بررسی کرد */
  check?: string;
  /** اشتباه رایج در همین گام */
  commonMistake?: string;
}

/** یک گام حذف‌شده برای تکمیل توسط دانش‌آموز (مرحله E) */
export interface MissingStep {
  id: string;
  prompt: string;
  acceptedAnswers: string[];
  answerKind: 'integer' | 'decimal' | 'fraction';
  hint: string;
  /** پرسش جایگزین با راهنمای بیشتر (نردبان راهنمایی) */
  fallbackPrompt: string;
  fallbackAnswer: string;
}

/** شرط عبور از یک مرحله */
export interface FlowPassRule {
  /** حداقل پاسخ درست موردنیاز */
  minCorrect: number;
  /** آیا باید بدون راهنما باشد */
  requireNoHints?: boolean;
}

/** یک مرحله از جریان درس */
export interface FlowStage {
  id: string;
  kind: FlowStageKind;
  title: string;
  /** روایت معلم برای این مرحله (کوتاه و کودک‌پسند) */
  narrative: string;
  /** شناسه مهارت پیش‌نیاز (برای مراحل سنجش پیش‌نیاز؛ شواهد بازآزمون به آن تعلق می‌گیرد) */
  prereqSkillId?: string;
  /** سناریوی واقعی مرحله B */
  scenario?: string;
  /** کارت‌های نمایش (مرحله C) */
  representations?: RepresentationCard[];
  /** مثال حل‌شده (مرحله D) */
  workedExample?: {
    problem: string;
    steps: MetacognitiveStep[];
    finalAnswer: string;
  };
  /** مثال ناقص (مرحله E) */
  completionExample?: {
    problem: string;
    givenSteps: string[];
    missingSteps: MissingStep[];
  };
  /** ارجاع به پرسش‌های موجود کتاب (با منبع ثبت شواهد کنترل می‌شود) */
  questionRefs?: string[];
  /** پرسش‌های اختصاصی این مرحله */
  inlineQuestions?: Question[];
  /** توضیح اصلاحی کوتاه اگر پیش‌نیاز ضعیف بود (مرحله A) */
  remedial?: string;
  /** پرسش بازآزمون پیش‌نیاز (مرحله A پس از توضیح اصلاحی) */
  retestQuestions?: Question[];
  passRule: FlowPassRule;
}

/** جریان کامل یک درس */
export interface LessonFlow {
  id: string;
  lessonId: string;
  skillId: string;
  title: string;
  /** مرحله‌ها به ترتیب A تا G (H در موتور یادگیری است) */
  stages: FlowStage[];
}

/** منبع ثبت شواهد هر نوع مرحله — برای تغذیه موتور یادگیری */
export function sourceForStage(kind: FlowStageKind): 'practice' | 'prereq' | 'transfer' {
  switch (kind) {
    case 'prereq-check':
      return 'prereq';
    case 'transfer-assessment':
      return 'transfer';
    default:
      return 'practice';
  }
}

export type AttemptSourceForFlow = 'practice' | 'prereq' | 'transfer' | 'review' | 'exam';

/** برچسب فارسی مرحله برای نمایش */
export function stageLabel(kind: FlowStageKind): string {
  switch (kind) {
    case 'prereq-check':
      return 'سنجش پیش‌نیاز';
    case 'intuitive-intro':
      return 'درک شهودی';
    case 'representations':
      return 'نمایش‌های مفهوم';
    case 'worked-example':
      return 'مثال حل‌شده';
    case 'completion-example':
      return 'تکمیل راه‌حل';
    case 'independent-practice':
      return 'تمرین مستقل';
    case 'transfer-assessment':
      return 'سنجش انتقال';
  }
}

/** نوع دشواری ساده‌شده برای برچسب */
export type FlowDifficulty = Difficulty;

/**
 * F10 — ساخت پرسش عددی معادل یک گام حذف‌شدهٔ مرحله E.
 * تصحیح و ثبت شواهد گام‌های مثال ناقص با «همان موتور تصحیح عددی» برنامه انجام
 * می‌شود تا تلاش، خطا و راهنمای دریافت‌شده به‌شکل سازگار با سایر پرسش‌ها ثبت گردد.
 * شناسهٔ پرسش همان شناسهٔ گام است و در buildFlowQuestionIndex به مهارت جریان نگاشت می‌شود.
 */
export function missingStepAsQuestion(step: MissingStep): NumericQuestion {
  return {
    id: step.id,
    chapterId: 'flow',
    lessonId: 'flow',
    type: 'numeric',
    difficulty: 'easy',
    prompt: step.prompt,
    hints: [step.hint, step.hint, step.hint],
    explanation: '',
    answerKind: step.answerKind,
    acceptedAnswers: step.acceptedAnswers,
  };
}
