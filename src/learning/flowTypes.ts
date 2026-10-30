import type { Question, Difficulty, NumericQuestion, McqQuestion } from '../types/curriculum';
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
  | 'step-sequencing'       // X — مرتب‌سازی مراحل حل (چالش چیدمان)
  | 'independent-practice'  // F — تمرین مستقل و تدریجی
  | 'transfer-assessment';  // G — سنجش انتقال یادگیری

/** یک کارت نمایش مفهوم (مرحله C) */
export interface RepresentationCard {
  kind: RepresentationKind;
  label: string;
  /** توضیح نمایش به زبان کودک */
  content: string;
  /** نمایش بصری SVG اختصاصی (اختیاری — فعلاً گروه‌های مساوی + اضافه) */
  visual?: RepresentationVisual;
}

/** نمایش بصری SVG کارت — کشیدن گروه‌های مساوی و اعضای اضافه (تطبیق تصویر با عبارت) */
export interface RepresentationVisual {
  kind: 'groups';
  /** شمار دسته‌های کامل */
  groupCount: number;
  /** شمار عضو هر دسته */
  perGroup: number;
  /** شمار عضوهای اضافه خارج از دسته‌ها */
  extra: number;
  /** برچسب کوتاه زیر شکل */
  caption: string;
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

/** یک کارت گام برای مرحلهٔ مرتب‌سازی مراحل حل (مرحلهٔ X) */
export interface SequencingStep {
  id: string;
  /** متن گام (روی کارت نمایش داده می‌شود) */
  label: string;
  /** راهنمای غیرلوده‌دهندهٔ مربوط به جای این گام در ترتیب */
  hint: string;
}

/** چیدمان مرحلهٔ X — ترتیب آرایهٔ steps یعنی ترتیب درست حل */
export interface SequencingSpec {
  /** عبارت ریاضی مورد حل (نمایش چپ‌به‌راست) */
  expression: string;
  steps: SequencingStep[];
}

/** یک گام انیمیشن حل‌کننده (نمایش مرحله‌به‌مرحلهٔ محاسبه) */
export interface SolverAnimationStep {
  /** کپشن آموزشی گام (چرا این عمل؟) */
  caption: string;
  /** زیررشتهٔ عملیاتی که در عبارتِ این گام باید برجسته شود */
  highlight: string;
  /** عبارت پس از انجام این گام */
  expressionAfter: string;
}

/** مشخصهٔ انیمیشن آموزشی حل عبارت (برای مراحل C/D) */
export interface SolverAnimationSpec {
  /** عبارت آغازین */
  expression: string;
  steps: SolverAnimationStep[];
  /** نمایش اشتباه رایج: راه نادرست و چرا غلط است */
  mistake?: {
    caption: string;
    /** عبارت/راه نادرست برای نمایش */
    expression: string;
    /** زیررشتهٔ نقطهٔ اشتباه برای برجسته‌سازی */
    highlight: string;
  };
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
  /** چالش مرتب‌سازی مراحل حل (مرحلهٔ X) */
  sequencing?: SequencingSpec;
  /** انیمیشن آموزشی حل مرحله‌به‌مرحله (معمولاً در مرحلهٔ D) */
  solverAnimation?: SolverAnimationSpec;
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
    case 'step-sequencing':
      return 'مرتب‌سازی مراحل';
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

/**
 * ساخت پرسش معادل یک جایگاه در مرحلهٔ مرتب‌سازی مراحل (X).
 * «درست بودن» یک جایگاه یعنی کارت گام درست روی آن جایگاه گذاشته شده باشد؛
 * تصحیح با همان موتور تصحیح MCQ انجام می‌شود (مقایسهٔ نرمال‌شدهٔ متن کارت با
 * کارت درستِ آن جایگاه) تا تلاش، خطا و راهنمای دریافت‌شده به‌شکل سازگار ثبت گردد.
 * شناسهٔ پرسش، شناسهٔ گام درستِ آن جایگاه است و در buildFlowQuestionIndex به
 * مهارت جریان نگاشت می‌شود؛ گزینه‌ها متن همهٔ کارت‌هاست (برای ثبت پاسخ انتخابی).
 */
export function sequencingStepAsQuestion(
  expectedStep: SequencingStep,
  allStepLabels: string[]
): McqQuestion {
  return {
    id: expectedStep.id,
    chapterId: 'flow',
    lessonId: 'flow',
    type: 'mcq',
    difficulty: 'easy',
    prompt: expectedStep.label,
    options: [...allStepLabels],
    correctAnswer: expectedStep.label,
    hints: [expectedStep.hint, expectedStep.hint, expectedStep.hint],
    explanation: '',
    misconceptions: [],
  };
}
