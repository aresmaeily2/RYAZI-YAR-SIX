import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within, act, fireEvent } from '@testing-library/react';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { flowForLesson, buildFlowQuestionIndex } from '../src/data/flows';
import { ch7l3Flow } from '../src/data/flows/ch7l3.flow';
import { stageLabel, sourceForStage, sequencingStepAsQuestion, type LessonFlow, type FlowStage } from '../src/learning/flowTypes';
import { isAnswerCorrect } from '../src/utils/answerChecking';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { StepSolverAnimation } from '../src/components/StepSolverAnimation';

/**
 * آزمون‌های درس «عملیات ترکیبی» (ch7l3):
 *  ۱) ساختار جریان ۸ مرحله‌ای و انطباق با کتاب رسمی (چاپ ۱۴۰۵، ص ۱۳۷–۱۴۱)
 *  ۲) بازمحاسبهٔ مستقل ریاضی همهٔ کلیدها
 *  ۳) اعتبار مشخصهٔ انیمیشن (زنجیرهٔ عبارت‌ها و برجسته‌سازی‌ها)
 *  ۴) منطق و رابط چیدمان گام‌ها (مرحلهٔ X) با ثبت شواهد
 *  ۵) مسیر کامل موفق UI از A تا G و مسیر خطا
 *  ۶) دسترس‌پذیری انیمیشن زیر Reduced Motion
 */

const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

interface Rec {
  qid: string;
  source: string;
  correct: boolean;
  hints: number;
  answer: string;
}
function makeRecorder(recorded: Rec[]) {
  return (q: Question, answer: string, hintsUsed: number, source: 'practice' | 'prereq' | 'transfer'): SubmitResult => {
    const isCorrect = isAnswerCorrect(q, answer);
    recorded.push({ qid: q.id, source, correct: isCorrect, hints: hintsUsed, answer });
    return { isCorrect, explanation: q.explanation, earnedXp: 0 };
  };
}

/** پاسخ دادن به یک کارت پرسش با fireEvent (قرارداد آزمون‌های جریان پروژه) */
function submitAnswer(testId: string, answer: string | { option: string }) {
  const card = screen.getByTestId(`question-${testId}`);
  if (typeof answer === 'string') {
    fireEvent.change(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), { target: { value: answer } });
  } else {
    fireEvent.click(within(card).getByRole('radio', { name: answer.option }));
  }
  fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
}

describe('ساختار جریان درس عملیات ترکیبی', () => {
  const flow = flowForLesson('ch7l3')!;

  it('جریان ثبت شده و ۸ مرحله دارد: A، B، C، D، E، X (چیدمان)، F، G', () => {
    expect(flow).toBeDefined();
    expect(flow!.id).toBe('flow-ch7l3');
    expect(flow!.skillId).toBe('sk-ch7l3');
    expect(flow!.stages.map((s) => s.kind)).toEqual([
      'prereq-check',
      'intuitive-intro',
      'representations',
      'worked-example',
      'completion-example',
      'step-sequencing',
      'independent-practice',
      'transfer-assessment',
    ]);
  });

  it('برچسب فارسی و منبع شواهد گونهٔ جدید درست است', () => {
    expect(stageLabel('step-sequencing')).toBe('مرتب‌سازی مراحل');
    expect(sourceForStage('step-sequencing')).toBe('practice');
    expect(sourceForStage('prereq-check')).toBe('prereq');
    expect(sourceForStage('transfer-assessment')).toBe('transfer');
  });

  it('سنجش پیش‌نیاز به مهارت کاربرد تقریب وصل است و بازآزمون دارد', () => {
    const stageA = flow!.stages[0];
    expect(stageA.prereqSkillId).toBe('sk-ch7l2');
    expect(stageA.remedial).toBeDefined();
    expect(stageA.retestQuestions?.length).toBeGreaterThanOrEqual(1);
    // توضیح اصلاحی با عددهای متفاوت است و پاسخ بازآزمون را لو نمی‌دهد
    expect(stageA.remedial!).not.toContain('۳۹۸');
    expect(stageA.remedial!).not.toContain('۵۰۳');
  });

  it('انیمیشن مرحلهٔ D زنجیرهٔ معتبر عبارت‌ها دارد و اشتباه رایج را نشان می‌دهد', () => {
    const anim = flow!.stages.find((s) => s.kind === 'worked-example')!.solverAnimation;
    expect(anim).toBeDefined();
    let current = anim!.expression;
    for (const step of anim!.steps) {
      // عمل برجسته‌شده باید در عبارتِ همان گام واقعاً وجود داشته باشد
      expect(current).toContain(step.highlight);
      current = step.expressionAfter;
    }
    expect(current).toBe('۱۲');
    expect(anim!.mistake).toBeDefined();
    expect(anim!.mistake!.expression).toContain(anim!.mistake!.highlight);
  });

  it('مرحلهٔ چیدمان ترتیب درست حل را در داده نگه می‌دارد (۱۲÷۲+۳×۴=۱۸)', () => {
    const seq = flow!.stages.find((s) => s.kind === 'step-sequencing')!.sequencing!;
    expect(seq.steps).toHaveLength(4);
    // بازمحاسبهٔ مستقل: 12/2 + 3*4 = 6 + 12 = 18
    expect(12 / 2 + 3 * 4).toBe(18);
    expect(seq.steps[0].label).toContain('۱۲÷۲');
    expect(seq.steps[1].label).toContain('۳×۴');
    expect(seq.steps[3].label).toContain('۱۸');
    // راهنماها متن کارت درست را لو نمی‌دهند
    for (const st of seq.steps) {
      expect(st.hint).not.toContain(st.label);
    }
  });

  it('مرحلهٔ تمرین مستقل ۷ تمرین دارد (شامل دو تمرین کسری) و سنجش انتقال ۲ سؤال با زمینهٔ جدید', () => {
    const stageF = flow!.stages.find((s) => s.kind === 'independent-practice')!;
    expect(stageF.questionRefs).toEqual(['q731', 'q732', 'q733', 'q735', 'q736', 'q734']);
    expect(stageF.inlineQuestions).toHaveLength(1);
    // کسرها طبق تمرین‌های ۳ و ۵ کتاب (ص ۱۴۱) در مرحلهٔ تمرین مستقل حضور دارند
    expect(stageF.questionRefs).toContain('q735');
    expect(stageF.questionRefs).toContain('q736');
    const stageG = flow!.stages.find((s) => s.kind === 'transfer-assessment')!;
    const texts = (stageG.inlineQuestions ?? []).map((q) => q.prompt + ' ' + (q.type === 'mcq' ? q.options.join(' ') : '')).join(' ');
    expect(texts).toContain('برچسب');
    expect(texts).toContain('سینا');
  });
});

describe('بازمحاسبهٔ مستقل ریاضی درس عملیات ترکیبی', () => {
  // قرارداد کتاب: × ضرب، ÷ تقسیم — اینجا با اعداد انگلیسی بازمحاسبه می‌شود
  it('کلید q731: ۸−۲×۳ = ۲ (ضرب اول)', () => {
    expect(8 - 2 * 3).toBe(2);
  });
  it('کلید q732: (۸−۲)×۳ = ۱۸ (پرانتز اول)', () => {
    expect((8 - 2) * 3).toBe(18);
  });
  it('کلید q733: (۰/۵+۰/۲)×۶ = ۴/۲', () => {
    expect(Number(((0.5 + 0.2) * 6).toFixed(10))).toBe(4.2);
  });
  it('کلید q734: ۸÷۲+۳×۷+۴×۱۳−۵−۲ = ۷۰', () => {
    expect(8 / 2 + 3 * 7 + 4 * 13 - 5 - 2).toBe(70);
  });
  it('کلید q735 (کسر، تمرین ۵ کتاب ص ۱۴۱): (۱/۲+۱/۴)×۸ = ۳/۴×۸ = ۶', () => {
    // با محاسبهٔ گویا: 1/2+1/4 = 3/4؛ 3/4×8 = 24/4 = 6
    expect((1 / 2 + 1 / 4) * 8).toBe(6);
    expect((1 / 4) * 8).toBe(2); // بدون پرانتز: اول ضرب
    expect(1 / 2 + (1 / 4) * 8).toBe(2.5); // جواب متفاوت بدون پرانتز
  });
  it('کلید q736 (کسر، تمرین ۳ کتاب ص ۱۴۱): ۲+۱/۲×۴ = ۲+۲ = ۴', () => {
    expect(2 + (1 / 2) * 4).toBe(4);
    expect((2 + 1 / 2) * 4).toBe(10); // پرانتز ضمنی غلط = گزینهٔ انحرافی ۱۰
    expect(2 + 1 / (2 * 4)).toBe(17 / 8); // گسترش نادرست خط کسر = گزینهٔ انحرافی ۱۷/۸
  });
  it('مثال کسری ex74: ۲×۳/۴+۱/۲ = ۳/۲+۱/۲ = ۲ (با اعشار هم ۲)', () => {
    expect(2 * (3 / 4) + 1 / 2).toBe(2);
    expect(0.75 * 2 + 0.5).toBe(2);
  });
  it('مثال حل‌شده: ۱۰+۴×(۶−۲)÷۸ = ۱۲', () => {
    expect(10 + (4 * (6 - 2)) / 8).toBe(12);
  });
  it('تخمین بازآزمون: ۳۹۸+۵۰۳ → ۴۰۰+۵۰۰ = ۹۰۰ (دقیق: ۹۰۱)', () => {
    expect(400 + 500).toBe(900);
    expect(398 + 503).toBe(901);
  });
  it('تمرین‌های تعاملی: ۱۰−۳×۲=۴ | ۵×۳+۴×۲=۲۳ | (۳+۵)×۲+۴=۲۰ | ۵×۶+۴=۳۴ | ۳×۴+۲=۱۴', () => {
    expect(10 - 3 * 2).toBe(4);
    expect(5 * 3 + 4 * 2).toBe(23);
    expect((3 + 5) * 2 + 4).toBe(20);
    expect(5 * 6 + 4).toBe(34);
    expect(3 * 4 + 2).toBe(14);
  });

  it('پاسخ هر پرسش جریان با موتور تصحیح برنامه پذیرفته و پاسخ‌های نزدیک نادرست رد می‌شود', () => {
    const flow = flowForLesson('ch7l3')!;
    const flowQs: Question[] = flow.stages.flatMap((s) => [
      ...(s.inlineQuestions ?? []),
      ...(s.retestQuestions ?? []),
    ]);
    const keys: Record<string, string> = {
      'flow-ch7l3-a-r1': '900',
      'flow-ch7l3-a-r2': '۲۵۰',
      'flow-ch7l3-b-q1': '4',
      'flow-ch7l3-c-q1': '۳×۴+۲',
      'flow-ch7l3-c-q2': '23',
      'flow-ch7l3-c-q3': '۱۲÷۴؛ چون ضرب و تقسیم از چپ به راست انجام می‌شوند',
      'flow-ch7l3-f-e1': 'تفریق را قبل از ضرب انجام داده؛ باید اول ۲×۳ را حساب کند',
      'flow-ch7l3-g-t1': '34',
      'flow-ch7l3-g-t2': 'سینا ۸ برگ برچسب دارد و به هر یک از ۳ دوستش ۲ برچسب می‌دهد؛ چند برچسب برایش می‌ماند؟',
    };
    for (const q of flowQs) {
      expect(isAnswerCorrect(q, keys[q.id]), `${q.id} باید کلید را بپذیرد`).toBe(true);
    }
    // پاسخ‌های نادرست نمونه باید رد شوند
    const q731 = qById.get('q731')!;
    expect(isAnswerCorrect(q731, '18')).toBe(false);
    expect(isAnswerCorrect(q731, '5')).toBe(false);
    const q733 = qById.get('q733')!;
    expect(isAnswerCorrect(q733, '۳/۲')).toBe(false);
    expect(isAnswerCorrect(q733, '0.7')).toBe(false);
    // راهنمای عمیق‌ترین پرسش‌های جریان پاسخ را لو نمی‌دهد (آینهٔ قاعدهٔ کتاب)
    const segments = (s: string): string[] =>
      s.replace(/−/g, '-').replace(/[^\d/.+-]/g, '|').split('|').filter(Boolean);
    for (const q of flowQs) {
      const answers = q.type === 'mcq' ? [q.correctAnswer] : q.acceptedAnswers;
      for (const a of answers) {
        const tok = a.replace(/−/g, '-').replace(/[^\d/.-]/g, '');
        if ((tok.match(/\d/g) ?? []).length >= 2) {
          expect(segments(q.hints[2]).some((seg) => seg === tok), `${q.id} نشت راهنما`).toBe(false);
        }
      }
    }
  });
});

describe('گونهٔ چیدمان گام‌ها — منطق و رابط', () => {
  it('پرسش معادل جایگاه فقط کارت درست همان جایگاه را می‌پذیرد و در نمایه نگاشت می‌شود', () => {
    const seq = flowForLesson('ch7l3')!.stages.find((s) => s.kind === 'step-sequencing')!.sequencing!;
    const labels = seq.steps.map((s) => s.label);
    const pseudo = sequencingStepAsQuestion(seq.steps[0], labels);
    expect(isAnswerCorrect(pseudo, seq.steps[0].label)).toBe(true);
    expect(isAnswerCorrect(pseudo, seq.steps[1].label)).toBe(false);
    const index = buildFlowQuestionIndex();
    for (const st of seq.steps) {
      expect(index.get(st.id)?.skillId).toBe('sk-ch7l3');
    }
  });

  let recorded: Rec[] = [];
  beforeEach(() => {
    recorded = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('چیدمان در UI: کارت درست جایگاه را پر می‌کند، کارت نادرست رد می‌شود و شواهد ثبت می‌گردد', () => {
    const seqFlow: LessonFlow = {
      ...ch7l3Flow,
      id: 'flow-ch7l3-x-only',
      stages: [ch7l3Flow.stages.find((s) => s.kind === 'step-sequencing') as FlowStage],
    };
    render(<LessonFlowPlayer flow={seqFlow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);

    const panel = screen.getByTestId('sequencing-panel');
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s1'));
    expect(within(panel).getByTestId('seq-slot-1')).toHaveTextContent('۱۲÷۲ را حساب می‌کنم: ۶');
    expect(within(panel).getByTestId('seq-message')).toHaveTextContent('درست بود');

    // کارت نادرست برای جایگاه دوم (باید گام ضرب ۳×۴ باشد)
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s3'));
    expect(within(panel).getByTestId('seq-message')).toHaveTextContent('اینجا نیست');
    expect(within(panel).getByTestId('seq-slot-2')).not.toHaveTextContent('حاصل‌ها را کنار هم');

    // ادامه با کارت‌های درست
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s2'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s3'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s4'));

    // ثبت شواهد: ۵ تلاش (۴ درست + ۱ نادرست)، همه با منبع تمرین و صفر راهنما
    expect(recorded).toHaveLength(5);
    expect(recorded.every((c) => c.source === 'practice')).toBe(true);
    expect(recorded.every((c) => c.hints === 0)).toBe(true);
    // تلاش نادرست روی جایگاه دوم، با پرسشِ همان جایگاه ثبت شده است
    expect(recorded[1].qid).toBe('flow-ch7l3-x-s2');
    expect(recorded[1].correct).toBe(false);
    expect(recorded[1].answer).toContain('حاصل‌ها را کنار هم');

    // پایان مرحله پس از ۹۰۰ms
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();
  });

  it('دکمهٔ راهنمای گام بعد، راهنمای درست را نشان می‌دهد و در شواهد شمارش می‌شود', () => {
    const seqFlow: LessonFlow = {
      ...ch7l3Flow,
      id: 'flow-ch7l3-x-hint',
      stages: [ch7l3Flow.stages.find((s) => s.kind === 'step-sequencing') as FlowStage],
    };
    render(<LessonFlowPlayer flow={seqFlow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);
    const panel = screen.getByTestId('sequencing-panel');
    const seq = ch7l3Flow.stages.find((s) => s.kind === 'step-sequencing')!.sequencing!;

    fireEvent.click(within(panel).getByTestId('seq-hint'));
    expect(within(panel).getByTestId('seq-hint-text')).toHaveTextContent(seq.steps[0].hint);
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s1'));
    expect(recorded).toHaveLength(1);
    expect(recorded[0].hints).toBe(1); // راهنمای مصرف‌شده در شواهد ثبت شده است
  });
});

describe('انیمیشن حل‌کننده — رفتار و دسترس‌پذیری', () => {
  const spec = ch7l3Flow.stages.find((s) => s.kind === 'worked-example')!.solverAnimation!;

  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('پخش خودکار، توقف/ادامه، گام دستی و سرعت', () => {
    render(<StepSolverAnimation spec={spec} />);
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×(۶−۲)÷۸');
    expect(within(screen.getByTestId('anim-expression')).getByText('۶−۲')).toBeInTheDocument();

    // پخش خودکار (پیش‌فرض روشن): گام ۱ پس از ۲.۴ ثانیه
    act(() => {
      vi.advanceTimersByTime(2400);
    });
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×۴÷۸');

    // توقف: پیشرفتی نمی‌کند
    fireEvent.click(screen.getByTestId('anim-play'));
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×۴÷۸');

    // ادامهٔ پخش با سرعت ۲×: گام بعدی در ۱.۲ ثانیه
    fireEvent.click(screen.getByTestId('anim-play'));
    fireEvent.change(screen.getByTestId('anim-speed'), { target: { value: '2' } });
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۱۶÷۸');

    // گام دستی
    fireEvent.click(screen.getByTestId('anim-next'));
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۲');
  });

  it('نمایش اشتباه رایج و بازپخش', () => {
    render(<StepSolverAnimation spec={spec} />);
    fireEvent.click(screen.getByTestId('anim-mistake-toggle'));
    const mistake = screen.getByTestId('anim-mistake');
    expect(mistake).toHaveTextContent('(۱۰+۴)×۴÷۸');
    expect(within(mistake).getByText('۱۰+۴')).toBeInTheDocument();

    // پیشروی تا پایان
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(2400);
      });
    }
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۲');
    // بازپخش از ابتدا
    fireEvent.click(screen.getByTestId('anim-replay'));
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×(۶−۲)÷۸');
  });

  it('با Reduced Motion: پخش خودکار غیرفعال است و پیشروی فقط با گام بعد انجام می‌شود', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({ matches: true, media: '(prefers-reduced-motion: reduce)', addEventListener: vi.fn(), removeEventListener: vi.fn() })
    );
    render(<StepSolverAnimation spec={spec} />);
    expect(screen.getByTestId('anim-play')).toBeDisabled(); // پخش خودکار در دسترس نیست
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×(۶−۲)÷۸'); // پیشرفت خودکار رخ نداد
    fireEvent.click(screen.getByTestId('anim-next')); // پیشروی کنترل‌شده توسط کاربر مجاز است
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×۴÷۸');
  });
});

describe('مسیر کامل موفق جریان عملیات ترکیبی در UI (A تا G)', () => {
  let recorded: Rec[] = [];
  beforeEach(() => {
    recorded = [];
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('۲۰ تلاش درست با منبع درست ثبت و جریان کامل می‌شود', () => {
    render(<LessonFlowPlayer flow={ch7l3Flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);
    const next = () => act(() => { vi.advanceTimersByTime(1000); });

    // ── مرحله A: دو سؤال کتابی پیش‌نیاز (منبع prereq) ──
    submitAnswer('q721', { option: '۱۲۰۰' });
    submitAnswer('q723', { option: '۴۹٬۰۰۰' });
    next();
    expect(screen.getByText('یک محاسبه، دو جواب متفاوت؟!')).toBeInTheDocument();

    // ── مرحله B ──
    submitAnswer('flow-ch7l3-b-q1', '4');
    next();
    expect(screen.getByText('همین قرارداد با سه نمایش متفاوت')).toBeInTheDocument();

    // ── مرحله C: سه بررسی نمایش‌ها + شکل گروه‌ها ──
    expect(screen.getByTestId('groups-visual')).toBeInTheDocument();
    submitAnswer('flow-ch7l3-c-q1', { option: '۳×۴+۲' });
    submitAnswer('flow-ch7l3-c-q2', '23');
    submitAnswer('flow-ch7l3-c-q3', { option: '۱۲÷۴؛ چون ضرب و تقسیم از چپ به راست انجام می‌شوند' });
    next();
    expect(screen.getByText('با هم حل کنیم و بلند فکر کنیم')).toBeInTheDocument();

    // ── مرحله D: انیمیشن + ادامه ──
    expect(screen.getByTestId('solver-animation')).toBeInTheDocument();
    expect(screen.getByTestId('anim-expression')).toHaveTextContent('۱۰+۴×(۶−۲)÷۸');
    fireEvent.click(screen.getByRole('button', { name: /متوجه شدم؛ مرحله بعد/ }));
    expect(screen.getByText('حالا بخشی از راه‌حل را تو کامل کن')).toBeInTheDocument();

    // ── مرحله E: تکمیل گام‌ها ──
    const fillStep = (idx: number, value: string) => {
      const stepBox = screen.getByTestId(`missing-step-${idx}`);
      fireEvent.change(within(stepBox).getByRole('textbox'), { target: { value } });
      fireEvent.click(within(stepBox).getByRole('button', { name: 'بررسی' }));
    };
    fillStep(1, '8');
    fillStep(2, '16');
    fillStep(3, '20');
    next();
    expect(screen.getByText('چالش چیدمان: گام‌های حل را به ترتیب بساز')).toBeInTheDocument();

    // ── مرحله X: چیدمان درست هر ۴ گام ──
    const panel = screen.getByTestId('sequencing-panel');
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s1'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s2'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s3'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s4'));
    next();
    expect(screen.getByText('نوبت توست — از فهم تا حل مسئله')).toBeInTheDocument();

    // ── مرحله F: ۷ تمرین مستقل (۶ ارجاعی شامل دو کسری + ۱ خطایابی) ──
    submitAnswer('q731', '2');
    submitAnswer('q732', { option: '۱۸' });
    submitAnswer('q733', { option: '۴/۲' });
    submitAnswer('q735', '6');
    submitAnswer('q736', { option: '۴' });
    submitAnswer('q734', '70');
    submitAnswer('flow-ch7l3-f-e1', { option: 'تفریق را قبل از ضرب انجام داده؛ باید اول ۲×۳ را حساب کند' });
    next();
    expect(screen.getByText('آزمون انتقال: همین قرارداد در موقعیت‌های تازه')).toBeInTheDocument();

    // ── مرحله G: دو سؤال انتقال (منبع transfer) ──
    submitAnswer('flow-ch7l3-g-t1', '34');
    submitAnswer('flow-ch7l3-g-t2', { option: 'سینا ۸ برگ برچسب دارد و به هر یک از ۳ دوستش ۲ برچسب می‌دهد؛ چند برچسب برایش می‌ماند؟' });
    next();
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();

    // ── شواهد: ۲۲ تلاش، همه درست، منبع‌ها درست ──
    expect(recorded).toHaveLength(22);
    expect(recorded.every((c) => c.correct)).toBe(true);
    const stageSourceOf = (qid: string): string => {
      const st = ch7l3Flow.stages.find(
        (s) =>
          s.questionRefs?.includes(qid) ||
          (s.inlineQuestions ?? []).some((q) => q.id === qid) ||
          (s.completionExample?.missingSteps ?? []).some((m) => m.id === qid) ||
          (s.sequencing?.steps ?? []).some((m) => m.id === qid)
      );
      return st ? sourceForStage(st.kind) : 'unknown';
    };
    for (const c of recorded) {
      expect(c.source, `منبع ${c.qid}`).toBe(stageSourceOf(c.qid));
    }
    expect(recorded.filter((c) => c.source === 'prereq')).toHaveLength(2);
    expect(recorded.filter((c) => c.source === 'transfer')).toHaveLength(2);
    expect(recorded.filter((c) => c.source === 'practice')).toHaveLength(18);
    for (const id of ['q731', 'q732', 'q733', 'q734', 'q735', 'q736']) {
      expect(recorded.some((c) => c.qid === id)).toBe(true);
    }
  });

  it('مسیر خطا: پاسخ نادرست در مرحلهٔ B تکرار مرحله می‌آورد و در نهایت عبور ممکن است', () => {
    render(<LessonFlowPlayer flow={ch7l3Flow} questionsById={qById} onRecordAnswer={makeRecorder(recorded)} onExit={() => {}} />);
    const next = () => act(() => { vi.advanceTimersByTime(1000); });

    // مرحله A: درست
    submitAnswer('q721', { option: '۱۲۰۰' });
    submitAnswer('q723', { option: '۴۹٬۰۰۰' });
    next();
    // مرحله B: پاسخ نادرست (۲۴ = نتیجهٔ تفریق پیش از ضرب) → تکرار مرحله
    submitAnswer('flow-ch7l3-b-q1', '24');
    next();
    expect(screen.getByText('یک محاسبه، دو جواب متفاوت؟!')).toBeInTheDocument();
    expect(recorded.some((c) => !c.correct)).toBe(true); // تلاش نادرست ثبت شده است
    // پاسخ درست → عبور
    submitAnswer('flow-ch7l3-b-q1', '4');
    next();
    expect(screen.getByText('همین قرارداد با سه نمایش متفاوت')).toBeInTheDocument();
  });
});
