import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { computeEffectivenessMetrics, aggregateErrorCounts } from '../src/learning/metrics';
import { decideForSkill } from '../src/learning/engine';
import { pickPrioritySkillId, actionLabel, DiagnosticDashboard } from '../src/components/DiagnosticDashboard';
import { AssistantPanel } from '../src/components/AssistantPanel';
import { rebuildSkillStates } from '../src/learning/builder';
import { mapDiagnosisTextToCode } from '../src/learning/errorTaxonomy';
import { SKILLS } from '../src/learning/skills';
import type { AttemptRecord } from '../src/types/curriculum';
import type { NextStepAction } from '../src/learning/types';

const NOW = Date.now();
let seq = 0;
function mkAttempt(p: Partial<AttemptRecord> = {}): AttemptRecord {
  seq += 1;
  return {
    id: `m_${seq}`,
    questionId: p.questionId ?? 'q221',
    chapterId: p.chapterId ?? 'ch2',
    lessonId: p.lessonId ?? 'ch2l2',
    difficulty: p.difficulty ?? 'easy',
    selectedAnswer: p.selectedAnswer ?? '۳/۴',
    isCorrect: p.isCorrect ?? true,
    hintsUsed: p.hintsUsed ?? 0,
    timestamp: p.timestamp ?? NOW,
    diagnosedMisconception: p.diagnosedMisconception,
    source: p.source ?? 'practice',
  };
}

describe('سنجه‌های اثربخشی', () => {
  it('بدون تلاش: همه سنجه‌ها صفر و نمونه کوچک', () => {
    const m = computeEffectivenessMetrics([]);
    expect(m.totalAttempts).toBe(0);
    expect(m.smallSample).toBe(true);
    expect(m.transferSuccessRate).toBeNull();
  });

  it('وابستگی به راهنما و دقت مستقل جدا محاسبه می‌شوند', () => {
    const attempts = [
      mkAttempt({ hintsUsed: 0, isCorrect: true }),
      mkAttempt({ hintsUsed: 0, isCorrect: true }),
      mkAttempt({ hintsUsed: 2, isCorrect: true }),
      mkAttempt({ hintsUsed: 0, isCorrect: false }),
    ];
    const m = computeEffectivenessMetrics(attempts);
    expect(m.hintRelianceRate).toBeCloseTo(0.25);
    expect(m.independentAccuracy).toBeCloseTo(2 / 3);
    expect(m.totalAttempts).toBe(4);
  });

  it('نرخ تکرار خطا: تشخیص تکراری شمرده می‌شود', () => {
    const attempts = [
      mkAttempt({ isCorrect: false, diagnosedMisconception: 'جمع مخرج‌ها', questionId: 'q222' }),
      mkAttempt({ isCorrect: false, diagnosedMisconception: 'جمع مخرج‌ها', questionId: 'q222' }),
      mkAttempt({ isCorrect: false, diagnosedMisconception: 'خواندن نادرست صورت مسئله', questionId: 'q224' }),
    ];
    const m = computeEffectivenessMetrics(attempts);
    expect(m.errorRepetitionRate).toBeCloseTo(1 / 3);
  });

  it('انتقال و مرور تأخیری از آزمون فوری جدا هستند', () => {
    const attempts = [
      mkAttempt({ source: 'transfer', isCorrect: true, questionId: 'flow-ch2l2-g-t1' }),
      mkAttempt({ source: 'review', isCorrect: false, questionId: 'q223' }),
      mkAttempt({ source: 'exam', isCorrect: true }),
    ];
    const m = computeEffectivenessMetrics(attempts);
    expect(m.transferSuccessRate).toBe(1);
    expect(m.delayedReviewSuccessRate).toBe(0);
  });

  it('تجمیع خطاها با نگاشت مقوله کار می‌کند', () => {
    const attempts = [
      mkAttempt({ isCorrect: false, diagnosedMisconception: 'اولویت عملیات رعایت نشده' }),
      mkAttempt({ isCorrect: false, diagnosedMisconception: 'اولویت عملیات رعایت نشده' }),
    ];
    const counts = aggregateErrorCounts(attempts, mapDiagnosisTextToCode);
    expect(counts['operation-order']).toBe(2);
  });
});

describe('انتخاب مهارت اولویت‌دار داشبورد', () => {
  it('مرور سررسید اولویت اول است', () => {
    const attempts = [mkAttempt({ questionId: 'q221' })];
    const states = rebuildSkillStates(attempts, new Map(), NOW);
    // دستی مرور سررسید می‌گذاریم
    const skillId = states['sk-ch2l1'] ? 'sk-ch2l1' : SKILLS[0].id;
    states[skillId] = { ...states[skillId], nextReviewAt: NOW - 1000, evidence: [{ ...states[skillId].evidence[0] }] };
    expect(pickPrioritySkillId(states, NOW)).toBe(skillId);
  });

  it('برای یادگیرنده تازه، نخستین مهارت مناسب شروع انتخاب می‌شود', () => {
    const states = rebuildSkillStates([], new Map(), NOW);
    const picked = pickPrioritySkillId(states, NOW);
    expect(picked).not.toBeNull();
    const skill = SKILLS.find((s) => s.id === picked);
    expect(skill).toBeDefined();
    // مهارت شروع‌نشده: بدون شواهد
    expect(states[picked!].evidence.length).toBe(0);
  });

  it('decideForSkill برای مهارت ناشناخته null برمی‌گرداند', () => {
    expect(decideForSkill('sk-unknown', {}, NOW)).toBeNull();
  });

  it('برچسب اقدام برای همه اقدامات موتور تعریف شده است', () => {
    const actions: NextStepAction[] = [
      'prerequisite-check', 'intuitive-intro', 'continue-teaching', 'alternative-representation',
      'guided-practice', 'review-prerequisite', 'practice-same-level', 'easier-practice',
      'harder-practice', 'mixed-review', 'independent-assessment', 'transfer-assessment',
      'schedule-review', 'maintain-mastery',
    ];
    for (const a of actions) expect(actionLabel(a).length).toBeGreaterThan(2);
  });
});

describe('رابط داشبورد تشخیصی و دستیار', () => {
  it('داشبورد با حالت خالی رندر می‌شود و مرور سررسید ندارد', () => {
    const states = rebuildSkillStates([], new Map(), NOW);
    render(
      <DiagnosticDashboard
        skillStates={states}
        attempts={[]}
        completedLessonCount={0}
        totalLessons={23}
        onOpenSkill={() => {}}
      />
    );
    expect(screen.getByTestId('diagnostic-dashboard')).toBeInTheDocument();
    expect(screen.getByText(/مرور سررسیدشده‌ای نداری/)).toBeInTheDocument();
  });

  it('داشبورد با تلاش‌ها کارت گام بعدی و سنجه‌ها را نشان می‌دهد', () => {
    const attempts = [mkAttempt({ questionId: 'q221' }), mkAttempt({ questionId: 'q222', isCorrect: false, hintsUsed: 1, diagnosedMisconception: 'جمع مخرج‌ها' })];
    const index = new Map<string, { skillId: string; lessonId: string }>([
      ['q221', { skillId: 'sk-ch2l2', lessonId: 'ch2l2' }],
      ['q222', { skillId: 'sk-ch2l2', lessonId: 'ch2l2' }],
    ]);
    const states = rebuildSkillStates(attempts, index, NOW);
    render(
      <DiagnosticDashboard
        skillStates={states}
        attempts={attempts}
        completedLessonCount={0}
        totalLessons={23}
        onOpenSkill={() => {}}
      />
    );
    expect(screen.getByTestId('status-groups')).toBeInTheDocument();
    expect(screen.getByTestId('metrics')).toBeInTheDocument();
    expect(screen.getAllByText(/جمع و تفریق کسرها/).length).toBeGreaterThan(0);
  });

  it('پنل دستیار به درخواست «ساده‌تر» پاسخ فارسی می‌دهد', () => {
    render(<AssistantPanel lessonId="ch2l2" />);
    fireEvent.click(screen.getByRole('button', { name: /ساده‌تر توضیح بده/ }));
    const reply = screen.getByTestId('assistant-reply');
    expect(reply.textContent).toContain('ساده‌تر');
  });

  it('دستیار در نبود شواهد، تشخیص خطای قطعی اعلام نمی‌کند', () => {
    render(<AssistantPanel lessonId="ch2l2" />);
    fireEvent.click(screen.getByRole('button', { name: /اشتباه‌های رایج من/ }));
    const reply = screen.getByTestId('assistant-reply');
    expect(reply.textContent).toContain('شواهد کافی');
  });

  it('دستیار برای عملکرد ضعیف، چالش نمی‌دهد', () => {
    render(
      <AssistantPanel
        lessonId="ch2l2"
        skillState={{
          skillId: 'sk-ch2l2',
          status: 'needspractice',
          evidence: [],
          independentCorrect: 0,
          independentTotal: 0,
          distinctIndependentSuccessProfiles: 0,
          transferPassed: false,
          delayedReviewPassed: false,
          prereqChecked: true,
          errorCounts: {},
          lastPracticedAt: null,
          nextReviewAt: null,
          reviewStage: 0,
          confidence: 0,
        }}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /چالشی/ }));
    const reply = screen.getByTestId('assistant-reply');
    expect(reply.textContent).toContain('پایه');
  });
});
