import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { buildQuestionIndex, rebuildSkillStates } from '../src/learning/builder';
import { buildFlowQuestionIndex } from '../src/data/flows';
import { computeEffectivenessMetrics } from '../src/learning/metrics';
import { computeChapterMastery } from '../src/utils/mathEngine';
import { DiagnosticDashboard, ParentSkillReport } from '../src/components/DiagnosticDashboard';
import type { AttemptRecord } from '../src/types/curriculum';

/**
 * ممیزی فاز ۵ — تطبیق اعداد داشبورد و گزارش والد با دادهٔ واقعی تلاش‌ها.
 * سناریوی دانش‌آموز: در فصل ۲، چهار سؤال ch2l1 درست بدون راهنما؛
 * q221 درست با یک راهنما؛ q223 اول غلط (تشخیص: جمع مخرج‌ها) بعد درست؛ q222/q224 بی‌پاسخ.
 */

const NOW = 1_700_000_000_000;
const QINDEX: ReadonlyMap<string, { skillId: string; lessonId: string }> = (() => {
  const merged = new Map(buildQuestionIndex(CURRICULUM_CHAPTERS));
  for (const [id, m] of buildFlowQuestionIndex()) merged.set(id, m);
  return merged;
})();

let seq = 0;
function att(questionId: string, isCorrect: boolean, opts: { hints?: number; ts?: number; diagnosis?: string; selected?: string } = {}): AttemptRecord {
  seq += 1;
  return {
    id: `dash_att_${seq}`,
    questionId,
    chapterId: 'ch2',
    lessonId: `ch2l${questionId[2]}`,
    difficulty: (['easy', 'medium', 'medium', 'hard'] as const)[Number(questionId[3]) - 1] ?? 'easy',
    selectedAnswer: opts.selected ?? (isCorrect ? 'درست' : 'غلط'),
    isCorrect,
    hintsUsed: opts.hints ?? 0,
    timestamp: opts.ts ?? NOW - 10000 + seq,
    diagnosedMisconception: opts.diagnosis,
    source: 'practice',
  };
}

const ATTEMPTS: AttemptRecord[] = [
  att('q211', true, { ts: NOW - 7000 }),
  att('q212', true, { ts: NOW - 6000 }),
  att('q213', true, { ts: NOW - 5000 }),
  att('q214', true, { ts: NOW - 4000 }),
  att('q221', true, { hints: 1, ts: NOW - 3000 }),
  att('q223', false, { ts: NOW - 2000, diagnosis: 'جمع کردن مخرج‌ها همراه صورت‌ها', selected: '۳/۸' }),
  att('q223', true, { ts: NOW - 1000 }),
];

describe('ممیزی فاز ۵ — سازگاری اعداد داشبورد با دادهٔ واقعی', () => {
  it('درصد تسلط وزنی فصل دقیقاً با فرمول مستند مطابقت دارد (۱۰٫۰۵ از ۳۲ → ٪۳۱)', () => {
    const ch2 = CURRICULUM_CHAPTERS.find((c) => c.id === 'ch2')!;
    const m = computeChapterMastery(ch2, ATTEMPTS);
    // وزن کل: ۱۶ سؤال فصل ۲ → ۳۲؛ کسب‌شده: q211:1 + q212:2 + q213:2 + q214:3 + q221:2×0.85 + q222:0 + q223:2×0.6 + q224:0 = 10.05
    expect(m.weightedScore).toBeCloseTo(10.05, 2);
    expect(m.masteryPercent).toBe(31);
    expect(m.status).toBe('needspractice');
    expect(m.correctFirstTry).toBe(5); // q211..q214 + q221 (اولین تلاش درست)
    expect(m.weakLessonIds).toEqual(['ch2l2']);
  });

  it('درصد کل (میانگین فصل‌ها) = ۳۱ تقسیم بر ۷ ≈ ۴ — همان عددی که هدر نشان می‌دهد', () => {
    const masteries = CURRICULUM_CHAPTERS.map((ch) => computeChapterMastery(ch, ATTEMPTS));
    const overall = Math.round(masteries.reduce((a, m) => a + m.masteryPercent, 0) / masteries.length);
    expect(overall).toBe(4);
  });

  it('گروه‌های وضعیت داشبورد دقیقاً با وضعیت مشتق‌شدهٔ مهارت‌ها یکی است (۱ موقت، ۱ نیازمند تمرین، ۲۱ شروع‌نشده)', () => {
    const states = rebuildSkillStates(ATTEMPTS, QINDEX, NOW);
    render(
      <DiagnosticDashboard
        skillStates={states}
        attempts={ATTEMPTS}
        completedLessonCount={0}
        totalLessons={23}
        onOpenSkill={() => {}}
      />
    );
    const groups = screen.getByTestId('status-groups');
    expect(within(groups).getByText('۰ تسلط تأییدشده')).toBeInTheDocument();
    expect(within(groups).getByText('۱ تسلط موقت')).toBeInTheDocument();
    expect(within(groups).getByText('۰ در حال یادگیری')).toBeInTheDocument();
    expect(within(groups).getByText('۱ نیازمند تمرین')).toBeInTheDocument();
    // sk-ch2l1: دقت و تنوع کامل، بدون انتقال/مرور → تسلط موقت
    expect(states['sk-ch2l1'].status).toBe('temporary-mastery');
    // sk-ch2l2: پنجرهٔ مستقل شامل تک‌شکست q223 است (۱ از ۲) → نیازمند تمرین
    expect(states['sk-ch2l2'].status).toBe('needspractice');
  });

  it('سنجه‌های اثربخشی داشبورد با محاسبهٔ مستقل یکی است + هشدار نمونهٔ کوچک', () => {
    const m = computeEffectivenessMetrics(ATTEMPTS);
    expect(m.totalAttempts).toBe(7);
    // مستقل: q211..q214 (۴) + q223 غلط + q223 درست = ۶؛ درست ۵
    expect(m.independentAccuracy).toBeCloseTo(5 / 6, 5);
    expect(m.hintRelianceRate).toBeCloseTo(1 / 7, 5);
    expect(m.transferSuccessRate).toBeNull();
    expect(m.delayedReviewSuccessRate).toBeNull();
    expect(m.smallSample).toBe(true);

    const states = rebuildSkillStates(ATTEMPTS, QINDEX, NOW);
    render(
      <DiagnosticDashboard skillStates={states} attempts={ATTEMPTS} completedLessonCount={0} totalLessons={23} onOpenSkill={() => {}} />
    );
    expect(screen.getByText(/نمونه هنوز کوچک است/)).toBeInTheDocument();
    // الگوی خطا: فقط یک خطای تشخیص‌دار (جمع مخرج‌ها → محاسباتی)
    expect(screen.getByText('خطای محاسباتی')).toBeInTheDocument();
    expect(screen.getByText(/۱ بار/)).toBeInTheDocument();
  });

  it('گزارش والد: ۲۳ ردیف، اطمینان sk-ch2l1 = ٪۷۱ (۵ از ۷ وزن) و شمار وضعیت‌ها درست', () => {
    const states = rebuildSkillStates(ATTEMPTS, QINDEX, NOW);
    render(<ParentSkillReport skillStates={states} />);
    const report = screen.getByTestId('parent-skill-report');
    const rows = within(report).getAllByRole('row');
    expect(rows.length).toBe(24); // سرستون + ۲۳ مهارت
    expect(within(report).getAllByText('تسلط موقت').length).toBe(1);
    expect(within(report).getAllByText('نیازمند تمرین').length).toBe(1);
    // اطمینان sk-ch2l1: دقت(۳) + تنوع(۲) = ۵/۷ = ٪۷۱
    expect(within(report).getAllByText('٪۷۱').length).toBe(1);
  });

  it('پیشنهاد گام بعدی داشبورد از موتور واقعی با دلیل قابل نمایش می‌آید', () => {
    const states = rebuildSkillStates(ATTEMPTS, QINDEX, NOW);
    render(
      <DiagnosticDashboard skillStates={states} attempts={ATTEMPTS} completedLessonCount={0} totalLessons={23} onOpenSkill={() => {}} />
    );
    const card = screen.getByTestId('next-step-card');
    // اولویت‌سنجی: مرور سررسید ندارد؛ یادگیری فعال ندارد؛ نخستین شروع‌نشده sk-ch1l1 است
    // که پیش‌نیازش (sk-ch1l2) بی‌شواهد است → موتور سنجش پیش‌نیاز را پیشنهاد می‌دهد
    expect(within(card).getByText(/سنجش پیش‌نیاز/)).toBeInTheDocument();
    expect(within(card).getByText(/عددنویسی و ارزش مکانی/)).toBeInTheDocument();
  });
});
