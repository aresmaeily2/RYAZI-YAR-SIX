import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { LESSON_FLOWS, flowForLesson, buildFlowQuestionIndex, findInlineQuestion } from '../src/data/flows';
import { stageQuestions, isStagePassed, advanceFlow, type StageAttemptOutcome } from '../src/learning/flowLogic';
import { sourceForStage } from '../src/learning/flowTypes';
import { isNumericAnswerCorrect, isAnswerCorrect } from '../src/utils/answerChecking';
import type { NumericQuestion } from '../src/types/curriculum';

/** همه پرسش‌های کتاب با شناسه */
const allCurriculumQuestions = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));
const qById = new Map(allCurriculumQuestions.map((q) => [q.id, q]));

describe('جریان درس پایلوت ch2l2 — الگوی A تا G', () => {
  const flow = flowForLesson('ch2l2');

  it('جریان پایلوت ثبت شده و هر ۷ مرحله A تا G را دارد', () => {
    expect(flow).toBeDefined();
    expect(flow!.stages.map((s) => s.kind)).toEqual([
      'prereq-check',
      'intuitive-intro',
      'representations',
      'worked-example',
      'completion-example',
      'independent-practice',
      'transfer-assessment',
    ]);
  });

  it('همه ارجاع‌های پرسش‌ها به پرسش واقعی کتاب اشاره می‌کنند', () => {
    for (const f of LESSON_FLOWS) {
      for (const s of f.stages) {
        for (const ref of s.questionRefs ?? []) {
          expect(qById.has(ref)).toBe(true);
        }
      }
    }
  });

  it('شناسه‌های همه پرسش‌های inline و گام‌های حذف‌شده یکتا هستند', () => {
    const ids = new Set<string>();
    for (const f of LESSON_FLOWS) {
      for (const s of f.stages) {
        for (const q of [...(s.inlineQuestions ?? []), ...(s.retestQuestions ?? [])]) {
          expect(ids.has(q.id)).toBe(false);
          ids.add(q.id);
          // پرسش‌های inline باید به درس/فصل جریان تعلق داشته باشند
          expect(q.chapterId).toBe('ch2');
        }
        for (const m of s.completionExample?.missingSteps ?? []) {
          expect(ids.has(m.id)).toBe(false);
          ids.add(m.id);
        }
      }
    }
  });

  it('مرحله پیش‌نیاز، مهارت پیش‌نیاز را مشخص کرده و بازآزمون دارد', () => {
    const stageA = flow!.stages[0];
    expect(stageA.prereqSkillId).toBe('sk-ch2l1');
    expect(stageA.remedial).toBeDefined();
    expect(stageA.retestQuestions?.length).toBeGreaterThanOrEqual(1);
  });

  it('مثال حل‌شده مرحله D بلنداندیشی کامل دارد (چرا/بررسی/اشتباه رایج)', () => {
    const stageD = flow!.stages.find((s) => s.kind === 'worked-example')!;
    expect(stageD.workedExample!.steps.length).toBeGreaterThanOrEqual(3);
    for (const st of stageD.workedExample!.steps) {
      expect(st.why.length).toBeGreaterThan(10);
      expect(st.check).toBeDefined();
    }
  });

  it('مثال ناقص مرحله E گام‌های حذف‌شده با نردبان راهنمایی دارد', () => {
    const stageE = flow!.stages.find((s) => s.kind === 'completion-example')!;
    const missing = stageE.completionExample!.missingSteps;
    expect(missing.length).toBeGreaterThanOrEqual(2);
    for (const m of missing) {
      expect(m.fallbackPrompt.length).toBeGreaterThan(5);
      expect(m.hint).not.toContain(m.acceptedAnswers[0]); // راهنما پاسخ را لو نمی‌دهد
    }
  });

  it('سنجش انتقال مرحله G زمینه جدید و متفاوت از مثال‌ها دارد', () => {
    const stageG = flow!.stages.find((s) => s.kind === 'transfer-assessment')!;
    const qs = stageQuestions(stageG, qById);
    expect(qs.length).toBeGreaterThanOrEqual(2);
    // زمینه‌های بطری آب و زمان مطالعه — نه تکرار شکل تمرین‌های درس
    const texts = qs.map((q) => q.prompt + ' ' + (q.type === 'mcq' ? q.options.join(' ') : '')).join(' ');
    expect(texts).toContain('بطری');
    expect(texts).toContain('مینا');
  });
});

// ============================================================ منطق پیشرفت
describe('منطق خالص پیشرفت جریان', () => {
  const flow = flowForLesson('ch2l2')!;

  const outcomesFrom = (correct: boolean[]): StageAttemptOutcome[] =>
    correct.map((c, i) => ({ questionId: `q_${i}`, isCorrect: c, hintsUsed: 0 }));

  it('عبور از مرحله به مرحله بعد می‌رود', () => {
    const result = advanceFlow(flow, 0, outcomesFrom([true, true]));
    expect(result.nextIndex).toBe(1);
    expect(result.done).toBe(false);
  });

  it('عدم عبور در پیش‌نیاز → توضیح اصلاحی و بازآزمون (نه عبور اجباری)', () => {
    const result = advanceFlow(flow, 0, outcomesFrom([false, false]));
    expect(result.nextIndex).toBe(0);
    expect(result.needsRemedialRetest).toBe(true);
  });

  it('عدم عبور در نمایش‌ها → تکرار همان مرحله', () => {
    const result = advanceFlow(flow, 2, outcomesFrom([true, false, false]));
    expect(result.nextIndex).toBe(2);
    expect(result.needsRemedialRetest).toBe(false);
  });

  it('عدم عبور در تمرین مستقل مانع ادامه مسیر نمی‌شود (شواهد ثبت شده است)', () => {
    const result = advanceFlow(flow, 5, outcomesFrom([false, false, false, false, false]));
    expect(result.nextIndex).toBe(6);
    expect(result.done).toBe(false);
  });

  it('پایان مرحله G → پایان جریان', () => {
    const result = advanceFlow(flow, 6, outcomesFrom([true, false]));
    expect(result.done).toBe(true);
  });

  it('شرط عبور مرحله F حداقل ۳ پاسخ درست از ۵ تمرین است', () => {
    const stageF = flow.stages.find((s) => s.kind === 'independent-practice')!;
    const qs = stageQuestions(stageF, qById);
    expect(qs.length).toBe(5);
    expect(isStagePassed(stageF, outcomesFrom([true, true, false, false, false])).passed).toBe(false);
    expect(isStagePassed(stageF, outcomesFrom([true, true, true, false, false])).passed).toBe(true);
  });

  it('منبع شواهد هر مرحله درست تعیین می‌شود', () => {
    expect(sourceForStage('prereq-check')).toBe('prereq');
    expect(sourceForStage('transfer-assessment')).toBe('transfer');
    expect(sourceForStage('independent-practice')).toBe('practice');
    expect(sourceForStage('intuitive-intro')).toBe('practice');
  });
});

// ============================================================ صحت ریاضی جریان
describe('صحت ریاضی پرسش‌های جریان پایلوت', () => {
  const flow = flowForLesson('ch2l2')!;

  it('پاسخ درست هر پرسش inline توسط موتور تصحیح پذیرفته می‌شود', () => {
    const expected: Record<string, string[]> = {
      'flow-ch2l2-a-r1': ['2/3'],
      'flow-ch2l2-a-r2': ['۲/۵'],
      'flow-ch2l2-b-q1': ['3/4'],
      'flow-ch2l2-c-q1': ['۲ قسمت از ۶'],
      'flow-ch2l2-c-q2': ['4/6'],
      'flow-ch2l2-c-q3': ['4/8'],
      'flow-ch2l2-f-e1': ['مخرج مشترک نگرفته و صورت‌ها و مخرج‌ها را جداگانه جمع کرده'],
      'flow-ch2l2-g-t1': ['5/8'],
      'flow-ch2l2-g-t2': ['مینا ۱/۲ ساعت ریاضی و ۱/۴ ساعت علوم خوانده است؛ مجموع زمان مطالعه او چند ساعت است؟'],
    };
    for (const f of LESSON_FLOWS) {
      for (const s of f.stages) {
        for (const q of [...(s.inlineQuestions ?? []), ...(s.retestQuestions ?? [])]) {
          const expectedAnswers = expected[q.id];
          expect(expectedAnswers, `کلید طلایی برای ${q.id} تعریف نشده`).toBeDefined();
          for (const ans of expectedAnswers) {
            expect(isAnswerCorrect(q, ans), `${q.id} باید «${ans}» را بپذیرد`).toBe(true);
          }
        }
      }
    }
  });

  it('گام‌های حذف‌شده مرحله E با موتور تصحیح عددی درست سنجیده می‌شوند', () => {
    const stageE = flow.stages.find((s) => s.kind === 'completion-example')!;
    const missing = stageE.completionExample!.missingSteps;
    const m1 = missing[0], m2 = missing[1];
    const mkPseudo = (m: typeof m1): NumericQuestion => ({
      id: m.id, chapterId: 'flow', lessonId: 'flow', type: 'numeric', difficulty: 'easy',
      prompt: m.prompt, hints: [m.hint, m.hint, m.hint], explanation: '',
      answerKind: m.answerKind, acceptedAnswers: m.acceptedAnswers,
    });
    expect(isNumericAnswerCorrect(mkPseudo(m1), '۱۰')).toBe(true);
    expect(isNumericAnswerCorrect(mkPseudo(m1), '9')).toBe(false);
    expect(isNumericAnswerCorrect(mkPseudo(m2), '4/10')).toBe(true);
    // کسر معادل (۲/۵) از نظر مقدار درست است و طبق سیاست مأموریت (§۸) پذیرفته می‌شود
    expect(isNumericAnswerCorrect(mkPseudo(m2), '2/5')).toBe(true);
    expect(isNumericAnswerCorrect(mkPseudo(m2), '3/10')).toBe(false);
  });

  it('مثال ناقص: ۲/۵ + ۱/۱۰ = ۱/۲ (بازمحاسبه مستقل)', () => {
    // ۲/۵ = ۴/۱۰ → ۴/۱۰ + ۱/۱۰ = ۵/۱۰ = ۱/۲
    expect(2 / 5 + 1 / 10).toBeCloseTo(1 / 2, 10);
    const stageE = flow.stages.find((s) => s.kind === 'completion-example')!;
    const m3 = stageE.completionExample!.missingSteps[2];
    expect(m3.acceptedAnswers).toContain('1/2');
    expect(m3.acceptedAnswers).toContain('5/10');
  });

  it('سنجش انتقال: ۳/۴ − ۱/۸ = ۵/۸ (بازمحاسبه مستقل)', () => {
    expect(3 / 4 - 1 / 8).toBeCloseTo(5 / 8, 10);
  });

  it('نمایه جریان، پرسش‌های inline و بازآزمون را نگاشت می‌کند', () => {
    const index = buildFlowQuestionIndex();
    expect(index.get('flow-ch2l2-a-r1')?.skillId).toBe('sk-ch2l1'); // بازآزمون → مهارت پیش‌نیاز
    expect(index.get('flow-ch2l2-b-q1')?.skillId).toBe('sk-ch2l2'); // inline → مهارت جریان
    expect(findInlineQuestion('flow-ch2l2-g-t1')).toBeDefined();
    expect(findInlineQuestion('unknown-flow-q')).toBeUndefined();
  });
});
