import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, isNumericAnswerCorrect, findMisconception, normalizeAnswerInput } from '../src/utils/answerChecking';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { McqQuestion, NumericQuestion } from '../src/types/curriculum';

const mcq: McqQuestion = {
  type: 'mcq',
  id: 't-mcq',
  chapterId: 'ch1',
  lessonId: 'ch1l1',
  difficulty: 'easy',
  prompt: '',
  options: ['۲۱', '۲۰', '۲۲', '۱۹'],
  correctAnswer: '۲۱',
  hints: ['الف', 'ب', 'پ'],
  explanation: '',
  misconceptions: [{ wrongOptionValue: '۲۰', diagnosis: 'دلیل آزمایشی', remedialRule: 'قاعده آزمایشی' }],
};

const numericInt: NumericQuestion = {
  type: 'numeric',
  id: 't-int',
  chapterId: 'ch1',
  lessonId: 'ch1l1',
  difficulty: 'easy',
  prompt: '',
  hints: ['الف', 'ب', 'پ'],
  explanation: '',
  answerKind: 'integer',
  acceptedAnswers: ['21'],
};

const numericDecimal: NumericQuestion = {
  type: 'numeric',
  id: 't-dec',
  chapterId: 'ch3',
  lessonId: 'ch3l2',
  difficulty: 'medium',
  prompt: '',
  hints: ['الف', 'ب', 'پ'],
  explanation: '',
  answerKind: 'decimal',
  acceptedAnswers: ['28.26'],
};

const numericFraction: NumericQuestion = {
  type: 'numeric',
  id: 't-frac',
  chapterId: 'ch2',
  lessonId: 'ch2l1',
  difficulty: 'easy',
  prompt: '',
  hints: ['الف', 'ب', 'پ'],
  explanation: '',
  answerKind: 'fraction',
  acceptedAnswers: ['2/3'],
};

describe('تصحیح پرسش‌های چهارگزینه‌ای', () => {
  it('گزینه درست پذیرفته و گزینه‌های غلط رد می‌شوند', () => {
    expect(isAnswerCorrect(mcq, '۲۱')).toBe(true);
    expect(isAnswerCorrect(mcq, '۲۰')).toBe(false);
    expect(isAnswerCorrect(mcq, '۱۹')).toBe(false);
  });

  it('پاسخ خالی هرگز درست نیست', () => {
    expect(isAnswerCorrect(mcq, '')).toBe(false);
    expect(isAnswerCorrect(mcq, '   ')).toBe(false);
  });

  it('تشخیص اشتباه رایج فقط برای گزینه‌های مشخص‌شده', () => {
    expect(findMisconception(mcq, '۲۰')?.diagnosis).toBe('دلیل آزمایشی');
    expect(findMisconception(mcq, '۲۱')).toBeUndefined();
  });
});

describe('تصحیح پرسش‌های عددی — صحیح', () => {
  it('ارقام فارسی و انگلیسی هر دو پذیرفته می‌شوند', () => {
    expect(isNumericAnswerCorrect(numericInt, '۲۱')).toBe(true);
    expect(isNumericAnswerCorrect(numericInt, '21')).toBe(true);
    expect(isNumericAnswerCorrect(numericInt, ' ۲۱ ')).toBe(true);
  });

  it('جواب اشتباه پذیرفته نمی‌شود', () => {
    expect(isNumericAnswerCorrect(numericInt, '۱۲')).toBe(false);
    expect(isNumericAnswerCorrect(numericInt, '۲۱۰')).toBe(false);
    expect(isNumericAnswerCorrect(numericInt, '')).toBe(false);
  });

  it('جداکننده هزارگان نادیده گرفته می‌شود', () => {
    expect(normalizeAnswerInput('۳۰٬۰۰۰')).toBe('30000');
    expect(isNumericAnswerCorrect({ ...numericInt, acceptedAnswers: ['30000'] }, '۳۰٬۰۰۰')).toBe(true);
  });
});

describe('تصحیح پرسش‌های عددی — اعشاری', () => {
  it('نقطه، جداکننده فارسی و / به‌عنوان ممیز پذیرفته می‌شوند', () => {
    expect(isNumericAnswerCorrect(numericDecimal, '28.26')).toBe(true);
    expect(isNumericAnswerCorrect(numericDecimal, '۲۸/۲۶')).toBe(true);
    expect(isNumericAnswerCorrect(numericDecimal, '۲۸٫۲۶')).toBe(true);
    expect(isNumericAnswerCorrect(numericDecimal, '28,26')).toBe(true);
  });

  it('مقدار نزدیک اما نادرست رد می‌شود', () => {
    expect(isNumericAnswerCorrect(numericDecimal, '28.261')).toBe(false);
    expect(isNumericAnswerCorrect(numericDecimal, '2.826')).toBe(false);
    expect(isNumericAnswerCorrect(numericDecimal, '282.6')).toBe(false);
  });

  it('خطای مجاز اختیاری پشتیبانی می‌شود', () => {
    const tolerant = { ...numericDecimal, toleratedError: 0.005 };
    expect(isNumericAnswerCorrect(tolerant, '28.2604')).toBe(true);
    expect(isNumericAnswerCorrect(tolerant, '28.27')).toBe(false);
  });
});

describe('تصحیح پرسش‌های عددی — کسری', () => {
  it('کسر معادل با شکل ساده‌شده پذیرفته می‌شود', () => {
    expect(isNumericAnswerCorrect(numericFraction, '2/3')).toBe(true);
    expect(isNumericAnswerCorrect(numericFraction, '۴/۶')).toBe(true);
    expect(isNumericAnswerCorrect(numericFraction, '12/18')).toBe(true);
  });

  it('عدد مخلوط معادل پذیرفته می‌شود', () => {
    const mixed = { ...numericFraction, acceptedAnswers: ['7/3'] };
    expect(isNumericAnswerCorrect(mixed, '2 و 1/3')).toBe(true);
    expect(isNumericAnswerCorrect(mixed, '7/3')).toBe(true);
    expect(isNumericAnswerCorrect(mixed, '3/7')).toBe(false);
  });

  it('مخرج صفر پذیرفته نمی‌شود', () => {
    expect(isNumericAnswerCorrect(numericFraction, '2/0')).toBe(false);
  });

  it('کسر منفی درست تصحیح می‌شود', () => {
    const neg = { ...numericFraction, acceptedAnswers: ['-1/4'] };
    expect(isNumericAnswerCorrect(neg, '-1/4')).toBe(true);
    expect(isNumericAnswerCorrect(neg, '۱/۴')).toBe(false);
  });
});

describe('ناسازگاری تصحیح با داده‌های واقعی کتاب (نمونه‌برداری)', () => {
  it('پاسخ درست واقعی هر پرسش عددی توسط موتور تصحیح پذیرفته می‌شود', () => {
    let numericCount = 0;
    for (const ch of CURRICULUM_CHAPTERS) {
      for (const lesson of ch.lessons) {
        for (const q of lesson.questions) {
          if (q.type === 'numeric') {
            numericCount += 1;
            const firstAccepted = q.acceptedAnswers[0];
            expect(isNumericAnswerCorrect(q, firstAccepted)).toBe(true);
            // ارقام فارسی همان پاسخ هم باید پذیرفته شود
            const persian = firstAccepted.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
            expect(isNumericAnswerCorrect(q, persian)).toBe(true);
          }
        }
      }
    }
    expect(numericCount).toBeGreaterThanOrEqual(10);
  });
});
