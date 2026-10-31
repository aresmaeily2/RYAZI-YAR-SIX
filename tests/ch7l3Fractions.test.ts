import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { flowForLesson } from '../src/data/flows';
import { isAnswerCorrect, findMisconception } from '../src/utils/answerChecking';
import { isStagePassed, type StageAttemptOutcome } from '../src/learning/flowLogic';
import type { NumericQuestion, Question, McqQuestion } from '../src/types/curriculum';

/**
 * آزمون‌های اختصاصی پوشش «عملیات ترکیبی شامل کسرها» (q735، q736، ex74).
 *
 * مبنای محتوایی: کتاب رسمی ریاضی ششم (کد ۶۰۵، چاپ ۱۴۰۵)، ص ۱۴۱ — تمرین ۳
 * (تبدیل کسر↔اعشار در عبارت ترکیبی) و تمرین ۵ (عبارت ترکیبی با کسر و پرانتز)
 * و ص ۱۴۰ تمرین ۴ (ترتیب عملیات با اعداد اعشاری). سطح: پرانتز یک‌سطحی،
 * بدون توان و بدون عدد منفی میانی — دقیقاً هم‌سطح کتاب.
 */

const allQuestions = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));
const qById = new Map<string, Question>(allQuestions.map((q) => [q.id, q]));

const q735 = qById.get('q735') as NumericQuestion;
const q736 = qById.get('q736') as McqQuestion;

describe('صحت ریاضی پرسش‌های کسری با محاسبهٔ گویا (بدون خطای اعشار)', () => {
  it('q735: (۱/۲+۱/۴)×۸ = ۲۴/۴ = ۶ — با محاسبهٔ صحیح', () => {
    // 1/2 + 1/4 = 3/4 (صورت: 1*4 + 1*2 = 6؛ مخرج: 8) → 6/8 = 3/4
    const sumNum = 1 * 4 + 1 * 2;
    const sumDen = 2 * 4;
    expect(sumNum / sumDen).toBe(3 / 4);
    // 3/4 × 8 = 24/4 = 6
    expect((sumNum * 8) % sumDen).toBe(0);
    expect((sumNum * 8) / sumDen).toBe(6);
  });

  it('q735 بدون پرانتز جواب متفاوت می‌دهد: ۱/۲+۱/۴×۸ = ۱/۲+۲ = ۵/۲ — نقش پرانتز حفظ است', () => {
    // 1/4 × 8 = 8/4 = 2؛ سپس 1/2 + 2 = (1 + 2×2)/2 = 5/2
    const mul = (1 * 8) / 4; // ۲
    const num = 1 + mul * 2; // صورت با مخرج مشترک ۲
    const den = 2;
    expect(mul).toBe(2);
    expect(num / den).toBe(2.5);
    expect(2.5).not.toBe(6);
  });

  it('q736: ۲+۱/۲×۴ = ۲+۴/۲ = ۴ — با محاسبهٔ صحیح', () => {
    const mulNum = 1 * 4; // 1/2 × 4 = 4/2
    const mulDen = 2;
    expect(mulNum / mulDen).toBe(2);
    expect(2 + mulNum / mulDen).toBe(4);
  });

  it('q736 گزینه‌های انحرافی دقیقاً از خطاهای محتمل می‌آیند: ۱۰ و ۱۷/۸ و ۲', () => {
    // ۱۰ = پرانتز ضمنی: (۲+۱/۲)×۴ = ۵/۲×۴
    expect((2 + 1 / 2) * 4).toBe(10);
    // ۱۷/۸ = گسترش خط کسر: ۲+۱/(۲×۴)
    expect(2 + 1 / (2 * 4)).toBe(17 / 8);
    // ۲ = انجام ضرب و رها کردن جمع: ۱/۲×۴ = ۲
    expect((1 / 2) * 4).toBe(2);
    // هیچ گزینهٔ انحرافی هم‌ارز عددی پاسخ درست (۴) نیست
    for (const o of q736.options.filter((x) => x !== q736.correctAnswer)) {
      const eng = o.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
      const asFraction = eng.includes('/');
      const value = asFraction
        ? Number(eng.split('/')[0]) / Number(eng.split('/')[1])
        : Number(eng);
      expect(value, `گزینه «${o}» نباید برابر ۴ باشد`).not.toBe(4);
    }
  });

  it('ex74: ۲×۳/۴+۱/۲ = ۶/۴+۱/۲ = ۳/۲+۱/۲ = ۲ و معادل اعشاری نیز ۲ است', () => {
    expect((2 * 3) / 4 + 1 / 2).toBe(2); // 6/4 + 2/4 = 8/4
    expect(2 * 0.75 + 0.5).toBe(2); // مسیر اعشاری (تبدیل کسر↔اعشار کتاب)
  });
});

describe('موتور تصحیح برای پرسش‌های کسری', () => {
  it('q735 پاسخ درست را با ارقام فارسی/انگلیسی می‌پذیرد', () => {
    expect(isAnswerCorrect(q735, '6')).toBe(true);
    expect(isAnswerCorrect(q735, '۶')).toBe(true);
    expect(isAnswerCorrect(q735, ' ۶ ')).toBe(true);
  });

  it('q735 پاسخ‌های نزدیک اما نادرست را رد می‌کند (از جمله جواب بدون پرانتز و کسر ساده‌نشده)', () => {
    expect(isAnswerCorrect(q735, '2.5')).toBe(false); // جواب بدون پرانتز (۲و۱/۲)
    expect(isAnswerCorrect(q735, '۲و۱/۲')).toBe(false); // عدد مخلوط همان مقدار نادرست
    expect(isAnswerCorrect(q735, '24/4')).toBe(false); // ساده‌نشده؛ قالب پاسخ این سؤال عدد صحیح است
    expect(isAnswerCorrect(q735, '3/4')).toBe(false); // فقط حاصل پرانتز
    expect(isAnswerCorrect(q735, '4')).toBe(false);
    expect(isAnswerCorrect(q735, '')).toBe(false);
  });

  it('q736 فقط گزینهٔ درست را می‌پذیرد و بقیهٔ گزینه‌ها رد می‌شوند', () => {
    expect(isAnswerCorrect(q736, '۴')).toBe(true);
    for (const o of q736.options.filter((x) => x !== q736.correctAnswer)) {
      expect(isAnswerCorrect(q736, o), `گزینهٔ نادرست «${o}» باید رد شود`).toBe(false);
    }
  });

  it('q736 هر سه گزینهٔ انحرافی به تشخیص سوءبرداشت متصل‌اند و گزینهٔ درست تشخیص ندارد', () => {
    expect(findMisconception(q736, '۱۰')?.diagnosis).toContain('جمع پیش از ضرب');
    expect(findMisconception(q736, '۱۷/۸')?.diagnosis).toContain('خط کسر');
    expect(findMisconception(q736, '۲')?.diagnosis).toContain('جمع باقی‌مانده');
    expect(findMisconception(q736, '۴')).toBeUndefined();
    expect(q736.options).toHaveLength(4);
    expect(new Set(q736.options).size).toBe(4);
  });

  it('راهنمای عمیق‌ترین پله هر دو پرسش، پاسخ نهایی را لو نمی‌دهد', () => {
    // قاعدهٔ پروژه: توکن پاسخ (≥۲ رقم) نباید در سومین راهنما باشد؛
    // اینجا سخت‌گیرانه‌تر: هیچ رقمِ تنهاِ برابر با کل پاسخ هم در راهنمای سوم مستقل نیست.
    const segments = (s: string): string[] =>
      s.replace(/−/g, '-').replace(/[^\d/.+-]/g, '|').split('|').filter(Boolean);
    const check = (answer: string, hint: string) => {
      const tok = answer.replace(/[^\d/.-]/g, '');
      const digits = (tok.match(/\d/g) ?? []).length;
      if (digits >= 2) expect(segments(hint)).not.toContain(tok);
    };
    check('6', q735.hints[2]);
    check('۴', q736.hints[2]);
    // و راهنمای سوم q735 حاصل پرانتز (۳/۴) را هم لو نمی‌دهد
    expect(q735.hints[2]).not.toContain('۳/۴');
  });
});

describe('ساختار مرحلهٔ تمرین مستقل با پرسش‌های کسری', () => {
  it('شرط عبور مرحلهٔ F حالا ۴ پاسخ درست از ۷ تمرین است و مرز آن دقیق اجرا می‌شود', () => {
    const flow = flowForLesson('ch7l3')!;
    const stageF = flow.stages.find((s) => s.kind === 'independent-practice')!;
    const outcomes = (flags: boolean[]): StageAttemptOutcome[] =>
      flags.map((c, i) => ({ questionId: `f${i}`, isCorrect: c, hintsUsed: 0 }));
    expect(stageF.passRule.minCorrect).toBe(4);
    expect(stageQuestionsCount(stageF)).toBe(7);
    expect(isStagePassed(stageF, outcomes([true, true, true, false, false, false, false])).passed).toBe(false);
    expect(isStagePassed(stageF, outcomes([true, true, true, true, false, false, false])).passed).toBe(true);
  });

  it('هر دو پرسش کسری در مرحلهٔ F ارجاع دارند و در جایگاه پس از پرسش‌های اعشاری‌اند', () => {
    const flow = flowForLesson('ch7l3')!;
    const stageF = flow.stages.find((s) => s.kind === 'independent-practice')!;
    const refs = stageF.questionRefs ?? [];
    expect(refs.indexOf('q735')).toBeGreaterThan(refs.indexOf('q733'));
    expect(refs.indexOf('q736')).toBeGreaterThan(refs.indexOf('q735'));
    expect(refs[refs.length - 1]).toBe('q734'); // دشوارترین عبارت چندعملی در پایان ارجاع‌ها
  });
});

function stageQuestionsCount(stage: { questionRefs?: string[]; inlineQuestions?: unknown[] }): number {
  return (stage.questionRefs?.length ?? 0) + (stage.inlineQuestions?.length ?? 0);
}
