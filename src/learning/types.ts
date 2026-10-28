/**
 * مدل داده لایه یادگیری تطبیقی — ریاضی‌یار ششم
 *
 * اصل معماری: وضعیت مهارت‌ها از «شواهد» (تلاش‌های ثبت‌شده) مشتق می‌شود؛
 * بنابراین پیشرفت نسخه‌های قبلی (v3) بدون مهاجرت قابل استفاده است و
 * ذخیره‌سازی اضافه‌ای لازم ندارد. الگوریتم‌ها شفاف، قاعده‌مند و قابل آزمون‌اند
 * و بعداً می‌توانند با روش‌های پیشرفته‌تر جایگزین شوند بدون تغییر رابط.
 */
import type { Difficulty } from '../types/curriculum';

/** انواع نمایش مفهوم (سطوح CRA: ملموس ← تصویری ← نمادین) */
export type RepresentationKind =
  | 'concrete'
  | 'visual-bars'
  | 'visual-area'
  | 'number-line'
  | 'place-value-table'
  | 'diagram'
  | 'coordinate-plane'
  | 'ratio-table'
  | 'bar-model'
  | 'symbolic';

/** کد مقوله خطا — طبقه‌بندی ده‌گانه مأموریت */
export type MisconceptionCode =
  | 'calculation'
  | 'conceptual'
  | 'place-value'
  | 'wrong-method-context'
  | 'operation-order'
  | 'unit-conversion'
  | 'problem-reading'
  | 'data-selection'
  | 'diagram-interpretation'
  | 'guessing';

/** منبع ثبت شواهد — انواع جدید (پیش‌نیاز/انتقال/مرور) فقط در تلاش‌های جدید ظاهر می‌شوند */
export type EvidenceSource = 'practice' | 'exam' | 'prereq' | 'transfer' | 'review';

/** تعریف یک مهارت قابل سنجش (هر درس کتاب یک مهارت است) */
export interface SkillDefinition {
  /** شناسه پایدار و یکتا — مشتق از شناسه درس */
  id: string;
  lessonId: string;
  chapterId: string;
  title: string;
  /** توضیح مفهومی کوتاه برای نمایش به یادگیرنده/والد */
  description: string;
  /** شناسه مهارت‌های پیش‌نیاز */
  prerequisites: string[];
  /** سطح دشواری شناختی ۱ تا ۳ */
  cognitiveLevel: 1 | 2 | 3;
  /** نمایش‌های متناسب با ماهیت مفهوم */
  representations: RepresentationKind[];
  /** مراحل آموزش مفهومی (برای دستیار و مسیر آموزش) */
  teachingSteps: string[];
  /** آستانه تسلط این مهارت (پیش‌فرض ۰٫۸۵؛ قابل تنظیم) */
  masteryThreshold: number;
}

/** یک شاهد پاسخ؛ سطح انتزاعی بر فراز AttemptRecord */
export interface AnswerEvidence {
  questionId: string;
  skillId: string;
  isCorrect: boolean;
  hintsUsed: number;
  difficulty: Difficulty;
  source: EvidenceSource;
  timestamp: number;
  errorCode?: MisconceptionCode;
  /** آیا در اولین تلاش روی این پرسش بوده است */
  firstAttemptOnQuestion: boolean;
}

/** وضعیت یادگیری یک مهارت — همیشه از شواهد مشتق می‌شود */
export type SkillStatus =
  | 'notstarted'
  | 'prereq-check-needed'
  | 'learning'
  | 'needspractice'
  | 'needsreview'
  | 'temporary-mastery'
  | 'confirmed-mastery';

export interface SkillState {
  skillId: string;
  status: SkillStatus;
  evidence: AnswerEvidence[];
  /** دقت مستقل (بدون راهنما) در تلاش‌های اخیر */
  independentCorrect: number;
  independentTotal: number;
  /** تعداد انواع منبع پاسخ درستِ مستقل (mcq/numeric و سطوح دشواری متفاوت) */
  distinctIndependentSuccessProfiles: number;
  /** سنجش انتقال با موفقیت گذرانده است */
  transferPassed: boolean;
  /** مرور تأخیری با موفقیت گذرانده است */
  delayedReviewPassed: boolean;
  /** پیش‌نیازها بررسی/تأیید شده‌اند */
  prereqChecked: boolean;
  /** شمار تکرار هر مقوله خطا */
  errorCounts: Partial<Record<MisconceptionCode, number>>;
  /** مقوله خطای غالب (پرتکرارترین) */
  dominantError?: MisconceptionCode;
  lastPracticedAt: number | null;
  nextReviewAt: number | null;
  /** پله مرور فاصله‌دار (۰ تا ۳) */
  reviewStage: number;
  /** میزان اطمینان سامانه به ارزیابی خودش (۰ تا ۱) */
  confidence: number;
}

/** تصمیم موتور یادگیری */
export type NextStepAction =
  | 'prerequisite-check'
  | 'intuitive-intro'
  | 'continue-teaching'
  | 'alternative-representation'
  | 'guided-practice'
  | 'review-prerequisite'
  | 'practice-same-level'
  | 'easier-practice'
  | 'harder-practice'
  | 'mixed-review'
  | 'independent-assessment'
  | 'transfer-assessment'
  | 'schedule-review'
  | 'maintain-mastery';

export interface EngineDecision {
  action: NextStepAction;
  /** دلیل قابل نمایش به انسان (معلم/والد/دانش‌آموز) */
  reason: string;
  /** کد ماشین‌خوان دلیل — برای آزمون و ردیابی */
  reasonCode: string;
  /** مهارت هدف (در بازگشت به پیش‌نیاز یا مرور ترکیبی) */
  targetSkillId?: string;
}

/** پرسش پیشنهادی موتور برای گام بعدی */
export interface SuggestedQuestion {
  questionId: string;
  action: NextStepAction;
}
