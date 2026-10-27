import type { Chapter, ExamScore, Question } from '../types/curriculum';
import { isAnswerCorrect } from './answerChecking';

/**
 * موتور آزمون: ساخت آزمون موضوعی (یک فصل) یا جامع (کل کتاب)،
 * تصحیح و محاسبه نمره بر اساس پاسخ‌های ثبت‌شده.
 */

/** ساخت سؤال‌های آزمون؛ در حالت جامع سؤال‌های همه فصل‌ها به ترتیب کتاب می‌آید */
export function buildExamQuestions(chapters: Chapter[], chapterId: string | null): Question[] {
  const source = chapterId === null ? chapters : chapters.filter((c) => c.id === chapterId);
  return source.flatMap((c) => c.lessons.flatMap((l) => l.questions));
}

/** نگاشت پاسخ‌های ثبت‌شده آزمون: شناسه سؤال → پاسخ انتخابی کاربر */
export type ExamAnswers = Record<string, string>;

/** تصحیح آزمون و محاسبه نمره */
export function scoreExam(questions: Question[], answers: ExamAnswers): ExamScore {
  let correct = 0;
  let wrong = 0;
  let unanswered = 0;

  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined || answer.trim().length === 0) {
      unanswered += 1;
      continue;
    }
    if (isAnswerCorrect(q, answer)) correct += 1;
    else wrong += 1;
  }

  const total = questions.length;
  const answered = correct + wrong;
  const percent = total === 0 ? 0 : Math.round((correct / total) * 100);

  let band: ExamScore['band'];
  if (percent >= 90) band = 'excellent';
  else if (percent >= 75) band = 'verygood';
  else if (percent >= 60) band = 'good';
  else if (percent >= 40) band = 'fair';
  else band = 'needspractice';

  return { total, answered, correct, wrong, unanswered, percent, band };
}

/** برچسب فارسی سطح نتیجه آزمون */
export function examBandLabel(band: ExamScore['band']): string {
  switch (band) {
    case 'excellent':
      return 'عالی! تسلط شما درخشان است';
    case 'verygood':
      return 'خیلی خوب! فقط کمی تمرین بیشتر';
    case 'good':
      return 'خوب؛ پایه‌ها را مرور کن';
    case 'fair':
      return 'قابل قبول؛ نیازمند تمرین بیشتر';
    case 'needspractice':
      return 'نیازمند تمرین بیشتر؛ ناامید نشو!';
  }
}

/** شناسه سؤال‌های بی‌پاسخ */
export function unansweredIds(questions: Question[], answers: ExamAnswers): string[] {
  return questions.filter((q) => {
    const a = answers[q.id];
    return a === undefined || a.trim().length === 0;
  }).map((q) => q.id);
}

/** شناسه سؤال‌های غلط برای حالت «تمرین مجدد اشتباهات» */
export function wrongAnswerIds(questions: Question[], answers: ExamAnswers): string[] {
  return questions.filter((q) => {
    const a = answers[q.id];
    return a !== undefined && a.trim().length > 0 && !isAnswerCorrect(q, a);
  }).map((q) => q.id);
}
