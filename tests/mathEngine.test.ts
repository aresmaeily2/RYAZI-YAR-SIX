import { describe, it, expect } from 'vitest';
import {
  toPersianDigits,
  normalizeDigitsToEnglish,
  gcd,
  simplifyFraction,
  addFractions,
  subtractFractions,
  multiplyFractions,
  divideFractions,
  middleFraction,
  calculateXpForAttempt,
  computeChapterMastery,
  computeCompletedLessonIds,
  updateStreak,
  roundTo,
  truncateTo,
  circleArea,
  circlePerimeter,
  cylinderVolume,
  percentOf,
} from '../src/utils/mathEngine';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { AttemptRecord } from '../src/types/curriculum';

function mkAttempt(partial: Partial<AttemptRecord> & { questionId: string; timestamp: number }): AttemptRecord {
  return {
    id: partial.questionId + '-' + partial.timestamp,
    chapterId: 'ch1',
    lessonId: 'ch1l1',
    difficulty: 'easy',
    selectedAnswer: '',
    isCorrect: true,
    hintsUsed: 0,
    source: 'practice',
    ...partial,
  };
}

describe('تبدیل ارقام فارسی و انگلیسی', () => {
  it('تبدیل صحیح انگلیسی به فارسی', () => {
    expect(toPersianDigits(1403)).toBe('۱۴۰۳');
    expect(toPersianDigits('78.5')).toBe('۷۸.۵');
    expect(toPersianDigits('abc123')).toBe('abc۱۲۳');
  });

  it('تبدیل صحیح فارسی و عربی به انگلیسی', () => {
    expect(normalizeDigitsToEnglish('۳/۱۴')).toBe('3/14');
    expect(normalizeDigitsToEnglish('٤٥')).toBe('45');
  });
});

describe('ب.م.م و عملیات کسری', () => {
  it('محاسبه ب.م.م', () => {
    expect(gcd(18, 24)).toBe(6);
    expect(gcd(7, 13)).toBe(1);
    expect(gcd(0, 5)).toBe(5);
    expect(gcd(-12, 18)).toBe(6);
  });

  it('ساده‌سازی کسرها', () => {
    expect(simplifyFraction(12, 16)).toEqual({ num: 3, den: 4 });
    expect(simplifyFraction(-6, 8)).toEqual({ num: -3, den: 4 });
    expect(simplifyFraction(6, -8)).toEqual({ num: -3, den: 4 });
    expect(() => simplifyFraction(1, 0)).toThrow('مخرج کسر نمی‌تواند صفر باشد');
  });

  it('جمع و تفریق کسرها', () => {
    expect(addFractions(2, 3, 1, 4)).toEqual({ num: 11, den: 12 });
    expect(addFractions(1, 4, 1, 4)).toEqual({ num: 1, den: 2 });
    expect(subtractFractions(5, 6, 1, 2)).toEqual({ num: 1, den: 3 });
    expect(subtractFractions(1, 2, 3, 4)).toEqual({ num: -1, den: 4 });
  });

  it('ضرب و تقسیم کسرها', () => {
    expect(multiplyFractions(2, 5, 5, 8)).toEqual({ num: 1, den: 4 });
    expect(divideFractions(3, 4, 9, 8)).toEqual({ num: 2, den: 3 });
    expect(() => divideFractions(3, 4, 0, 8)).toThrow();
  });

  it('کسر وسط دو کسر', () => {
    expect(middleFraction(1, 3, 1, 2)).toEqual({ num: 5, den: 12 });
    expect(middleFraction(1, 4, 3, 4)).toEqual({ num: 1, den: 2 });
  });
});

describe('امتیازدهی XP', () => {
  it('پاسخ درست اولین تلاش بدون راهنمایی = وزن × ۱۵', () => {
    expect(calculateXpForAttempt(true, 'easy', 0, true)).toBe(15);
    expect(calculateXpForAttempt(true, 'medium', 0, true)).toBe(30);
    expect(calculateXpForAttempt(true, 'hard', 0, true)).toBe(45);
  });

  it('جریمه راهنمایی هر راهنمایی ۳ امتیاز است', () => {
    expect(calculateXpForAttempt(true, 'hard', 2, true)).toBe(39);
    expect(calculateXpForAttempt(true, 'easy', 1, true)).toBe(12);
  });

  it('جریمه سه راهنمایی در سؤال آسان با کف مجاز ترکیب می‌شود', () => {
    // پایه ۱۵؛ جریمه حداکثر تا (پایه − ۵) می‌تواند برود → ۱۵ − ۹ = ۶
    expect(calculateXpForAttempt(true, 'easy', 3, true)).toBe(6);
  });

  it('تلاش مجدد ۴۰٪ و پاسخ نادرست ۲ امتیاز', () => {
    expect(calculateXpForAttempt(true, 'hard', 0, false)).toBe(18);
    expect(calculateXpForAttempt(false, 'medium', 0, true)).toBe(2);
  });
});

describe('محاسبه تسلط وزنی فصل', () => {
  it('بدون تلاش: وضعیت notstarted', () => {
    const m = computeChapterMastery(CURRICULUM_CHAPTERS[0], []);
    expect(m.status).toBe('notstarted');
    expect(m.masteryPercent).toBe(0);
  });

  it('پاسخ درست بدون راهنمایی در اولین تلاش: وزن کامل', () => {
    const ch1 = CURRICULUM_CHAPTERS[0];
    const q1 = ch1.lessons[0].questions[0];
    const m = computeChapterMastery(ch1, [
      mkAttempt({ questionId: q1.id, chapterId: 'ch1', lessonId: q1.lessonId, difficulty: q1.difficulty, isCorrect: true, hintsUsed: 0, timestamp: 1000 }),
    ]);
    expect(m.totalAttempts).toBe(1);
    expect(m.correctFirstTry).toBe(1);
    expect(m.masteryPercent).toBeGreaterThan(0);
  });

  it('پاسخ درست بعد از اشتباه، درس را در فهرست ضعیف قرار می‌دهد', () => {
    const ch1 = CURRICULUM_CHAPTERS[0];
    const q1 = ch1.lessons[0].questions[0];
    const m = computeChapterMastery(ch1, [
      mkAttempt({ questionId: q1.id, chapterId: 'ch1', lessonId: q1.lessonId, difficulty: q1.difficulty, isCorrect: false, hintsUsed: 1, timestamp: 1000 }),
      mkAttempt({ questionId: q1.id, chapterId: 'ch1', lessonId: q1.lessonId, difficulty: q1.difficulty, isCorrect: true, hintsUsed: 0, timestamp: 2000 }),
    ]);
    expect(m.weakLessonIds).toContain(q1.lessonId);
    expect(m.masteryPercent).toBeLessThan(100);
  });
});

describe('درس‌های تکمیل‌شده و زنجیره روزانه', () => {
  it('درس فقط وقتی کامل می‌شود که همه پرسش‌هایش حداقل یک پاسخ درست داشته باشند', () => {
    const ch1 = CURRICULUM_CHAPTERS[0];
    const l1 = ch1.lessons[0];
    const attempts = l1.questions.map((q, i) =>
      mkAttempt({ questionId: q.id, chapterId: ch1.id, lessonId: l1.id, difficulty: q.difficulty, isCorrect: true, timestamp: i })
    );
    const completed = computeCompletedLessonIds(CURRICULUM_CHAPTERS, attempts);
    expect(completed).toContain(l1.id);
  });

  it('درس ناقص تکمیل‌شده محسوب نمی‌شود', () => {
    const ch1 = CURRICULUM_CHAPTERS[0];
    const l1 = ch1.lessons[0];
    const attempts = l1.questions.slice(0, -1).map((q, i) =>
      mkAttempt({ questionId: q.id, chapterId: ch1.id, lessonId: l1.id, difficulty: q.difficulty, isCorrect: true, timestamp: i })
    );
    const completed = computeCompletedLessonIds(CURRICULUM_CHAPTERS, attempts);
    expect(completed).not.toContain(l1.id);
  });

  it('زنجیره: امروز بدون تغییر، دیروز +۱، قدیمی‌تر = بازنشانی', () => {
    expect(updateStreak('2025-01-10', 3, '2025-01-10').streakDays).toBe(3);
    expect(updateStreak('2025-01-10', 3, '2025-01-11').streakDays).toBe(4);
    expect(updateStreak('2025-01-10', 3, '2025-01-15').streakDays).toBe(1);
  });
});

describe('توابع کمکی فصل‌های ۵ تا ۷', () => {
  it('گرد کردن و قطع کردن', () => {
    expect(roundTo(8.479, 1)).toBe(8.5);
    expect(truncateTo(14.783, 1)).toBe(14.7);
    expect(truncateTo(123456, -3)).toBe(123000);
    expect(roundTo(48750, -3)).toBe(49000);
  });

  it('دایره و استوانه با پی تقریبی ۳/۱۴', () => {
    expect(circleArea(10)).toBe(314);
    expect(circlePerimeter(5)).toBeCloseTo(31.4);
    expect(circleArea(5)).toBeCloseTo(78.5);
    expect(cylinderVolume(5, 10)).toBeCloseTo(785);
  });

  it('محاسبه درصد', () => {
    expect(percentOf(400000, 15)).toBe(60000);
    expect(percentOf(25, 60)).toBe(15);
  });
});
