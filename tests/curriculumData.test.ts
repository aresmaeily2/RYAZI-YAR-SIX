import { describe, it, expect } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';

/**
 * تست جامع یکپارچگی داده‌های آموزشی:
 * این تست‌ها فقط «وجود» را بررسی نمی‌کنند؛ صحت ساختار، سازگاری شناسه‌ها،
 * درستی گزینه‌ها و پوشش سطوح دشواری را کنترل می‌کنند.
 */

const ALL_QUESTIONS = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));

describe('ساختار کلی برنامه درسی', () => {
  it('دقیقاً ۷ فصل دارد', () => {
    expect(CURRICULUM_CHAPTERS).toHaveLength(7);
  });

  it('فصل‌ها به ترتیب و با شماره ۱ تا ۷ هستند', () => {
    CURRICULUM_CHAPTERS.forEach((ch, i) => {
      expect(ch.number).toBe(i + 1);
      expect(ch.title.length).toBeGreaterThanOrEqual(3);
      expect(ch.subtitle.length).toBeGreaterThan(10);
    });
  });

  it('هر فصل حداقل ۲ درس و هر درس حداقل یک مثال حل‌شده و ۳ پرسش دارد', () => {
    for (const ch of CURRICULUM_CHAPTERS) {
      expect(ch.lessons.length).toBeGreaterThanOrEqual(2);
      for (const lesson of ch.lessons) {
        expect(lesson.title.length).toBeGreaterThan(3);
        expect(lesson.summary.length).toBeGreaterThan(20);
        expect(lesson.conceptSteps.length).toBeGreaterThanOrEqual(2);
        expect(lesson.workedExamples.length).toBeGreaterThanOrEqual(1);
        expect(lesson.questions.length).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('مثال‌های حل‌شده مراحل گام‌به‌گام و پاسخ نهایی دارند', () => {
    for (const ex of CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.workedExamples))) {
      expect(ex.steps.length).toBeGreaterThanOrEqual(2);
      expect(ex.finalAnswer.length).toBeGreaterThan(0);
      expect(ex.conceptualTip.length).toBeGreaterThan(15);
    }
  });
});

describe('یکپارچگی شناسه‌ها', () => {
  it('شناسه فصل‌ها، درس‌ها و پرسش‌ها یکتا هستند', () => {
    const chapterIds = CURRICULUM_CHAPTERS.map((c) => c.id);
    expect(new Set(chapterIds).size).toBe(chapterIds.length);

    const lessonIds = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.map((l) => l.id));
    expect(new Set(lessonIds).size).toBe(lessonIds.length);

    const questionIds = ALL_QUESTIONS.map((q) => q.id);
    expect(new Set(questionIds).size).toBe(questionIds.length);
  });

  it('شناسه هر پرسش با فصل و درس والدش سازگار است', () => {
    for (const ch of CURRICULUM_CHAPTERS) {
      for (const lesson of ch.lessons) {
        for (const q of lesson.questions) {
          expect(q.chapterId).toBe(ch.id);
          expect(q.lessonId).toBe(lesson.id);
          expect(chapterIdOf(q.id)).toBe(ch.id);
        }
      }
    }
  });

  function chapterIdOf(questionId: string): string {
    // قاعده نام‌گذاری: q<شماره فصل>...
    return 'ch' + questionId.slice(1, 2);
  }
});

describe('یکپارچگی پرسش‌های چهارگزینه‌ای', () => {
  const mcqs = ALL_QUESTIONS.filter((q) => q.type === 'mcq');

  it('گزینه درست دقیقاً یک‌بار در میان گزینه‌ها آمده است', () => {
    for (const q of mcqs) {
      if (q.type !== 'mcq') continue;
      expect(q.options).toContain(q.correctAnswer);
      expect(q.options.filter((o) => o === q.correctAnswer)).toHaveLength(1);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('هر پرسش دقیقاً سه راهنمایی دارد و راهنمایی‌ها پاسخ را لو نمی‌دهند', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.hints).toHaveLength(3);
      for (const hint of q.hints) {
        expect(hint.length).toBeGreaterThan(8);
      }
    }
  });

  it('تشخیص‌های اشتباه به گزینه‌های موجود ارجاع می‌دهند و با پاسخ درست فرق دارند', () => {
    for (const q of mcqs) {
      if (q.type !== 'mcq') continue;
      for (const m of q.misconceptions) {
        expect(q.options).toContain(m.wrongOptionValue);
        expect(m.wrongOptionValue).not.toBe(q.correctAnswer);
        expect(m.diagnosis.length).toBeGreaterThan(10);
        expect(m.remedialRule.length).toBeGreaterThan(10);
      }
    }
  });

  it('توضیح هر پرسش مرجع عددی قابل بررسی دارد', () => {
    for (const q of ALL_QUESTIONS) {
      expect(q.explanation.length).toBeGreaterThan(20);
    }
  });
});

describe('یکپارچگی پرسش‌های عددی', () => {
  const numerics = ALL_QUESTIONS.filter((q) => q.type === 'numeric');

  it('هر پرسش عددی حداقل یک پاسخ قابل قبول و نوع معتبر دارد', () => {
    expect(numerics.length).toBeGreaterThan(0);
    for (const q of numerics) {
      if (q.type !== 'numeric') continue;
      expect(['integer', 'decimal', 'fraction']).toContain(q.answerKind);
      expect(q.acceptedAnswers.length).toBeGreaterThan(0);
      for (const a of q.acceptedAnswers) expect(a.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('پوشش سطوح دشواری و تنوع', () => {
  it('در کل کتاب هر سه سطح دشواری موجود است', () => {
    const levels = new Set(ALL_QUESTIONS.map((q) => q.difficulty));
    expect(levels.has('easy')).toBe(true);
    expect(levels.has('medium')).toBe(true);
    expect(levels.has('hard')).toBe(true);
  });

  it('در هر فصل حداقل یک پرسش دشوار وجود دارد', () => {
    for (const ch of CURRICULUM_CHAPTERS) {
      const hasHard = ch.lessons.some((l) => l.questions.some((q) => q.difficulty === 'hard'));
      expect(hasHard).toBe(true);
    }
  });

  it('حداقل ۸۰ پرسش و حداقل ۱۰ پرسش عددی در کل کتاب وجود دارد', () => {
    expect(ALL_QUESTIONS.length).toBeGreaterThanOrEqual(80);
    expect(ALL_QUESTIONS.filter((q) => q.type === 'numeric').length).toBeGreaterThanOrEqual(10);
  });
});

describe('پوشش سرفصل‌های کتاب ریاضی ششم', () => {
  it('عناوین فصل‌ها با سرفصل رسمی کتاب مطابقت دارد', () => {
    const expectedTitles = [
      'عدد و الگوهای عددی',
      'کسر',
      'اعداد اعشاری',
      'تقارن و مختصات',
      'اندازه‌گیری',
      'تناسب و درصد',
      'تقریب و تخمین',
    ];
    expectedTitles.forEach((t) => {
      const found = CURRICULUM_CHAPTERS.some((ch) => ch.title === t);
      expect(found).toBe(true);
    });
  });

  it('موضوعات کلیدی هر فصل در درس‌ها پوشش داده شده است', () => {
    const expectedLessons = [
      'الگوهای عددی',
      'عددنویسی',
      'بخش‌پذیری',
      'اعداد صحیح',
      'ساده‌سازی',
      'جمع و تفریق کسرها',
      'ضرب و تقسیم کسرها',
      'کسر بین دو کسر',
      'مرتبه‌های اعشاری',
      'تبدیل کسر به اعشار',
      'جمع و تفریق اعداد اعشاری',
      'ضرب و تقسیم اعداد اعشاری',
      'تقارن محوری',
      'تقارن مرکزی',
      'دستگاه مختصات',
      'واحدهای سطح',
      'دایره',
      'حجم و گنجایش',
      'نسبت و جدول تناسب',
      'درصد',
      'نمودار',
      'قطع کردن و گرد کردن',
      'کاربرد تقریب',
    ];
    const allLessonTitles = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.map((l) => l.title)).join(' | ');
    for (const keyword of expectedLessons) {
      expect(allLessonTitles).toContain(keyword);
    }
  });
});
