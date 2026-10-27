/** انواع داده پایه پروژه ریاضی‌یار ششم */

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface WorkedExample {
  id: string;
  problem: string;
  steps: string[];
  finalAnswer: string;
  conceptualTip: string;
}

export interface QuestionMisconception {
  /** مقدار گزینه اشتباه که این تشخیص برای آن نمایش داده می‌شود (فقط برای MCQ) */
  wrongOptionValue: string;
  diagnosis: string;
  remedialRule: string;
}

/** انواع پرسش: چهارگزینه‌ای یا ورودی عددی */
export type QuestionType = 'mcq' | 'numeric';

/** نوع مقدار مورد انتظار برای پرسش‌های عددی */
export type NumericAnswerKind = 'integer' | 'decimal' | 'fraction';

interface QuestionBase {
  id: string;
  chapterId: string;
  lessonId: string;
  difficulty: Difficulty;
  prompt: string;
  /** سه راهنمایی پله‌پله؛ بدون لو دادن پاسخ نهایی */
  hints: [string, string, string];
  explanation: string;
}

export interface McqQuestion extends QuestionBase {
  type: 'mcq';
  options: string[];
  correctAnswer: string;
  misconceptions: QuestionMisconception[];
}

export interface NumericQuestion extends QuestionBase {
  type: 'numeric';
  answerKind: NumericAnswerKind;
  /** پاسخ‌های قابل قبول؛ نرمال‌سازی ارقام فارسی به‌صورت خودکار انجام می‌شود */
  acceptedAnswers: string[];
  /** خطای مجاز برای پاسخ اعشاری (پیش‌فرض صفر) */
  toleratedError?: number;
}

export type Question = McqQuestion | NumericQuestion;

export interface Lesson {
  id: string;
  title: string;
  summary: string;
  conceptSteps: string[];
  formulaBox?: string;
  workedExamples: WorkedExample[];
  interactiveLab?: 'coordinate' | 'fraction' | 'percentage' | 'cylinder';
  questions: Question[];
}

export interface Chapter {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  color: string;
  lessons: Lesson[];
}

/** یک تلاش ثبت‌شده برای یک پرسش */
export interface AttemptRecord {
  id: string;
  questionId: string;
  chapterId: string;
  lessonId: string;
  difficulty: Difficulty;
  /** برای MCQ متن گزینه و برای numeric ورودی خام کاربر */
  selectedAnswer: string;
  isCorrect: boolean;
  hintsUsed: number;
  timestamp: number;
  diagnosedMisconception?: string;
  /** منبع تلاش: تمرین درس یا آزمون */
  source: 'practice' | 'exam';
}

export type MasteryStatus = 'notstarted' | 'needspractice' | 'good' | 'mastered';

export interface ChapterMastery {
  chapterId: string;
  totalAttempts: number;
  correctFirstTry: number;
  weightedScore: number;
  masteryPercent: number;
  status: MasteryStatus;
  weakLessonIds: string[];
}

/** وضعیت یادگیری دانش‌آموز؛ فقط در localStorage همین دستگاه ذخیره می‌شود */
export interface LearnerState {
  studentName: string;
  xp: number;
  streakDays: number;
  lastActiveDate: string;
  lastVisitedChapterId: string;
  lastVisitedLessonId: string;
  completedLessonIds: string[];
  attempts: AttemptRecord[];
}

/** نتیجه تصحیح یک آزمون */
export interface ExamScore {
  total: number;
  answered: number;
  correct: number;
  wrong: number;
  unanswered: number;
  percent: number;
  band: 'excellent' | 'verygood' | 'good' | 'fair' | 'needspractice';
}
