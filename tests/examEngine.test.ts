import { describe, it, expect } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildExamQuestions, scoreExam, examBandLabel, unansweredIds, wrongAnswerIds } from '../src/utils/examEngine';

describe('ساخت آزمون', () => {
  it('آزمون جامع شامل تمام پرسش‌های کتاب است', () => {
    const total = CURRICULUM_CHAPTERS.reduce(
      (acc, c) => acc + c.lessons.reduce((a, l) => a + l.questions.length, 0),
      0
    );
    expect(buildExamQuestions(CURRICULUM_CHAPTERS, null)).toHaveLength(total);
  });

  it('آزمون موضوعی فقط پرسش‌های همان فصل را دارد', () => {
    const ch2Questions = buildExamQuestions(CURRICULUM_CHAPTERS, 'ch2');
    expect(ch2Questions.length).toBeGreaterThan(0);
    expect(ch2Questions.every((q) => q.chapterId === 'ch2')).toBe(true);
  });
});

describe('تصحیح و نمره‌دهی آزمون', () => {
  const questions = buildExamQuestions(CURRICULUM_CHAPTERS, null);

  it('بدون پاسخ: نمره صفر و همه بی‌پاسخ', () => {
    const s = scoreExam(questions, {});
    expect(s.total).toBe(questions.length);
    expect(s.correct).toBe(0);
    expect(s.unanswered).toBe(questions.length);
    expect(s.percent).toBe(0);
    expect(s.band).toBe('needspractice');
  });

  it('نمره‌دهی صحیح با ترکیب پاسخ درست/غلط/خالی', () => {
    const answers: Record<string, string> = {};
    questions.forEach((q, i) => {
      if (i < 10) answers[q.id] = q.type === 'mcq' ? q.correctAnswer : q.acceptedAnswers[0];
      else if (i < 20) answers[q.id] = 'پاسخ قطعاً غلط';
    });
    const s = scoreExam(questions, answers);
    expect(s.correct).toBe(10);
    expect(s.wrong).toBe(10);
    expect(s.unanswered).toBe(questions.length - 20);
    expect(s.percent).toBe(Math.round((10 / questions.length) * 100));
  });

  it('پاسخ همگی درست → صد درصد و band عالی', () => {
    const answers: Record<string, string> = {};
    questions.forEach((q) => {
      answers[q.id] = q.type === 'mcq' ? q.correctAnswer : q.acceptedAnswers[0];
    });
    const s = scoreExam(questions, answers);
    expect(s.percent).toBe(100);
    expect(s.band).toBe('excellent');
  });

  it('نمره منفی یا بیش از ۱۰۰٪ تولید نمی‌شود', () => {
    const answers: Record<string, string> = {};
    questions.forEach((q) => {
      answers[q.id] = 'جواب غلط';
    });
    const s = scoreExam(questions, answers);
    expect(s.percent).toBe(0);
    expect(s.percent).toBeGreaterThanOrEqual(0);
    expect(s.percent).toBeLessThanOrEqual(100);
  });
});

describe('برچسب نتیجه و شناسه‌ها', () => {
  it('برچسب فارسی برای هر سطح نتیجه', () => {
    expect(examBandLabel('excellent')).toContain('عالی');
    expect(examBandLabel('needspractice')).toContain('تمرین');
  });

  it('شناسه بی‌پاسخ‌ها و غلط‌ها درست استخراج می‌شود', () => {
    const questions = buildExamQuestions(CURRICULUM_CHAPTERS, 'ch1');
    const answers: Record<string, string> = {};
    answers[questions[0].id] = 'پاسخ غلط';
    answers[questions[1].id] = questions[1].type === 'mcq' ? questions[1].correctAnswer : questions[1].acceptedAnswers[0];
    const un = unansweredIds(questions, answers);
    expect(un).not.toContain(questions[0].id);
    expect(un).not.toContain(questions[1].id);
    expect(un.length).toBe(questions.length - 2);
    const wrong = wrongAnswerIds(questions, answers);
    expect(wrong).toContain(questions[0].id);
    expect(wrong).not.toContain(questions[1].id);
  });
});
