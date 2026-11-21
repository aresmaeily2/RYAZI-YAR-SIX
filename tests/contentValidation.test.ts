import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildQuestionIndex } from '../src/learning/builder';
import { SKILLS, SKILL_BY_ID } from '../src/learning/skills';
import { ERROR_TAXONOMY, allErrorCodes } from '../src/learning/errorTaxonomy';
import type { McqQuestion, Question } from '../src/types/curriculum';

/**
 * فرایند اعتبارسنجی محتوا (فاز ۴ مأموریت) — چک‌لیست اجباری «هر پرسش»:
 * شناسه یکتا، پاسخ صحیح، توضیح، دشواری، مهارت مرتبط، هدف یادگیری،
 * راهنمایی مناسب و طبقه‌بندی خطا (هرجا قابل‌اجرا باشد).
 *
 * این آزمون، «دروازهٔ انتشار محتوا» است: افزودن پرسش ناقص، suite را قرمز می‌کند.
 * شرح فرایند کامل: docs/CONTENT_VALIDATION.md
 */

const allQuestions: Question[] = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));
const QINDEX = buildQuestionIndex(CURRICULUM_CHAPTERS);
const ids = allQuestions.map((q) => q.id);

describe('پوشش کلی — ثبات اعداد مستندات', () => {
  it('۷ فصل، ۲۴ درس، ۹۸ پرسش (تطبیق با docs/CURRICULUM_COVERAGE.md)', () => {
    expect(CURRICULUM_CHAPTERS.length).toBe(7);
    expect(CURRICULUM_CHAPTERS.flatMap((c) => c.lessons).length).toBe(24);
    expect(allQuestions.length).toBe(98);
  });

  it('هر درس یک مهارت دارد و هر مهارت هدف یادگیری مستند دارد', () => {
    expect(SKILLS.length).toBe(24);
    for (const skill of SKILLS) {
      expect(skill.description.length, `توصیف ${skill.id}`).toBeGreaterThan(10);
      expect(skill.teachingSteps.length, `گام‌های آموزشی ${skill.id}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('چک‌لیست اجباری هر پرسش (۹۸/۹۸)', () => {
  it('شناسه یکتا با قالب استاندارد', () => {
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id, `قالب شناسه ${id}`).toMatch(/^(q[1-7][1-4][1-9]|flow-ch[1-7]l[1-4]-[a-z]+-.+)$/);
    }
  });

  it('پاسخ صحیح موجود و درون گزینه‌ها/پاسخ‌های پذیرفتنی', () => {
    for (const q of allQuestions) {
      if (q.type === 'mcq') {
        expect(q.options.includes(q.correctAnswer), `پاسخ درست ${q.id} میان گزینه‌ها`).toBe(true);
      } else {
        expect(q.acceptedAnswers.length, `پاسخ‌های پذیرفتنی ${q.id}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('توضیح غیرتهی برای همه', () => {
    for (const q of allQuestions) {
      expect(q.explanation.trim().length, `توضیح ${q.id}`).toBeGreaterThanOrEqual(10);
    }
  });

  it('سطح دشواری معتبر و توزیع سه‌سطحی', () => {
    const levels = new Set(allQuestions.map((q) => q.difficulty));
    expect([...levels].sort()).toEqual(['easy', 'hard', 'medium']);
  });

  it('مهارت مرتبط برای هر پرسش قابل حل است (اتصال درس←مهارت یا نمایهٔ جریان)', () => {
    for (const q of allQuestions) {
      const entry = QINDEX.get(q.id);
      expect(entry, `مهارت ${q.id} در نمایه`).toBeDefined();
      const skill = SKILL_BY_ID.get(entry!.skillId);
      expect(skill, `مهارت ${entry!.skillId}`).toBeDefined();
      expect(skill!.lessonId, `درسِ مهارت ${q.id}`).toBe(q.lessonId);
    }
  });

  it('هدف یادگیری هر پرسش از طریق مهارتِ درسِ آن در دسترس است', () => {
    for (const q of allQuestions) {
      const skill = SKILL_BY_ID.get(QINDEX.get(q.id)!.skillId)!;
      expect(skill.teachingSteps.join(' ').length, `هدف آموزشی ${q.id}`).toBeGreaterThan(20);
    }
  });

  it('سه راهنمای غیرتهی برای هر پرسش (بدون افشای پاسخ)', () => {
    for (const q of allQuestions) {
      expect(q.hints.length, `راهنماها ${q.id}`).toBe(3);
      for (const h of q.hints) expect(h.trim().length, `راهنما ${q.id}`).toBeGreaterThan(0);
    }
  });

  it('طبقه‌بندی خطا: هر MCQ دست‌کم یک سوءبرداشت مستند با راهنمای اصلاح دارد', () => {
    for (const q of allQuestions) {
      if (q.type !== 'mcq') continue;
      const mcq = q as McqQuestion;
      expect(mcq.misconceptions.length, `سوءبرداشت ${q.id}`).toBeGreaterThanOrEqual(1);
      for (const m of mcq.misconceptions) {
        expect(mcq.options).toContain(m.wrongOptionValue);
        expect(m.diagnosis.trim().length, `تشخیص ${q.id}`).toBeGreaterThan(5);
        expect(m.remedialRule.trim().length, `راهنمای اصلاح ${q.id}`).toBeGreaterThan(5);
      }
      // پاسخ درست هرگز در فهرست سوءبرداشت‌ها نیست
      expect(mcq.misconceptions.some((m) => m.wrongOptionValue === mcq.correctAnswer), `سوءبرداشتِ پاسخ درست ${q.id}`).toBe(false);
    }
  });

  it('کدهای تشخیص موتور ده‌گانه و معتبرند', () => {
    expect(allErrorCodes().length).toBe(10);
    for (const code of allErrorCodes()) {
      expect(ERROR_TAXONOMY[code].label.length).toBeGreaterThan(3);
      expect(ERROR_TAXONOMY[code].remediation.length).toBeGreaterThan(10);
    }
  });
});
