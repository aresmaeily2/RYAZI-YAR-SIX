import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AttemptRecord, ChapterMastery, LearnerState, Question, ReviewPlanEntry } from '../types/curriculum';
import { CURRICULUM_CHAPTERS } from '../data/curriculumData';
import { buildFlowQuestionIndex } from '../data/flows';
import { buildQuestionIndex, rebuildSkillStates, applyReviewPlan, rebuildReviewPlan } from '../learning/builder';
import { SKILL_BY_ID } from '../learning/skills';
import { scheduleNextReview } from '../learning/review';
import { calculateXpForAttempt, computeChapterMastery, computeCompletedLessonIds, updateStreak } from '../utils/mathEngine';
import { findMisconception, isAnswerCorrect } from '../utils/answerChecking';
import { clearLearnerState, createInitialState, exportStateJson, importStateJson, loadLearnerState, saveLearnerState } from '../utils/storage';

export interface SubmitResult {
  isCorrect: boolean;
  diagnosis?: string;
  explanation: string;
  earnedXp: number;
}

/** مدیریت کامل وضعیت یادگیرنده: ذخیره‌سازی، امتیاز، زنجیره و تسلط */
export function useLearnerState() {
  const [state, setState] = useState<LearnerState>(() => loadLearnerState());

  // نقشه پرسش ← مهارت: از داده کتاب + پرسش‌های جریان‌های آموزشی
  const questionSkillIndex = useMemo(() => {
    const merged = new Map(buildQuestionIndex(CURRICULUM_CHAPTERS));
    for (const [id, mapping] of buildFlowQuestionIndex()) merged.set(id, mapping);
    return merged;
  }, []);

  // F07 — برنامهٔ مرور مؤثر: اگر برنامهٔ ذخیره‌شده گم یا ناقص شده باشد،
  // از تلاش‌ها بازسازی می‌شود؛ مدخل‌های ذخیره‌شدهٔ معتبر بر بازسازی اولویت دارند.
  // ترمیم در حافظه اعمال و با نخستین تلاش بعدی به ذخیره‌سازی پایدار منتقل می‌شود.
  const effectiveReviewPlan = useMemo(
    () => ({ ...rebuildReviewPlan(state.attempts, questionSkillIndex), ...(state.reviewPlan ?? {}) }),
    [state.attempts, state.reviewPlan, questionSkillIndex]
  );

  // وضعیت مهارت‌ها همیشه از شواهد مشتق می‌شود (سازگار با داده نسخه‌های قبلی)
  const skillStates = useMemo(() => {
    const now = Date.now();
    const derived = rebuildSkillStates(state.attempts, questionSkillIndex, now);
    return applyReviewPlan(derived, effectiveReviewPlan);
  }, [state.attempts, effectiveReviewPlan, questionSkillIndex]);

  // به‌روزرسانی زنجیره روزانه و ذخیره‌سازی پایدار
  useEffect(() => {
    const todayISO = new Date().toISOString().slice(0, 10);
    setState((prev) => {
      const streak = updateStreak(prev.lastActiveDate, prev.streakDays, todayISO);
      if (streak.streakDays === prev.streakDays && streak.lastActiveDate === prev.lastActiveDate) {
        return prev;
      }
      return { ...prev, ...streak };
    });
  }, []);

  useEffect(() => {
    saveLearnerState(state);
  }, [state]);

  /** ثبت یک تلاش و به‌روزرسانی امتیاز و برنامه مرور */
  const recordAttempt = useCallback(
    (q: Question, selected: string, hintsUsed: number, source: 'practice' | 'exam' | 'prereq' | 'transfer' | 'review'): SubmitResult => {
      const isCorrect = isAnswerCorrect(q, selected);
      const priorAttempts = state.attempts.filter((a) => a.questionId === q.id);
      const earnedXp = calculateXpForAttempt(isCorrect, q.difficulty, hintsUsed, priorAttempts.length === 0);
      const misconception = isCorrect ? undefined : findMisconception(q, selected);

      const newAttempt: AttemptRecord = {
        id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        questionId: q.id,
        chapterId: q.chapterId,
        lessonId: q.lessonId,
        difficulty: q.difficulty,
        selectedAnswer: selected,
        isCorrect,
        hintsUsed,
        timestamp: Date.now(),
        diagnosedMisconception: misconception?.diagnosis,
        source,
      };

      // به‌روزرسانی برنامه مرور فاصله‌دار مهارت مربوط (لایتنر)
      // F07: مبنای برنامه، برنامهٔ مؤثر (ذخیره‌شده + بازسازی‌شده) است تا ترمیم
      // برنامهٔ گم‌شده/ناقص با همین تلاش به ذخیره‌سازی پایدار منتقل شود.
      const skillId = questionSkillIndex.get(q.id)?.skillId;
      const now = Date.now();
      let nextReviewPlan: LearnerState['reviewPlan'] = effectiveReviewPlan;
      if (skillId && SKILL_BY_ID.has(skillId)) {
        const currentStage = effectiveReviewPlan[skillId]?.reviewStage ?? 0;
        const outcome = !isCorrect ? 'failure' : hintsUsed === 0 ? 'success-no-hints' : 'success-with-hints';
        const plan = scheduleNextReview(currentStage, outcome, now);
        const entry: ReviewPlanEntry = {
          nextReviewAt: plan.nextReviewAt,
          reviewStage: plan.reviewStage,
          lastPracticedAt: now,
        };
        nextReviewPlan = { ...effectiveReviewPlan, [skillId]: entry };
      }

      setState((prev) => {
        const todayISO = new Date().toISOString().slice(0, 10);
        const streak = updateStreak(prev.lastActiveDate, prev.streakDays, todayISO);
        return {
          ...prev,
          ...streak,
          xp: prev.xp + earnedXp,
          lastVisitedChapterId: q.chapterId === 'flow' ? prev.lastVisitedChapterId : q.chapterId,
          lastVisitedLessonId: q.chapterId === 'flow' ? prev.lastVisitedLessonId : q.lessonId,
          attempts: [...prev.attempts, newAttempt],
          completedLessonIds: computeCompletedLessonIds(CURRICULUM_CHAPTERS, [...prev.attempts, newAttempt]),
          reviewPlan: nextReviewPlan,
        };
      });

      return {
        isCorrect,
        explanation: q.explanation,
        diagnosis: misconception
          ? `علت اشتباه رایج: ${misconception.diagnosis} — راه جبرانی: ${misconception.remedialRule}`
          : undefined,
        earnedXp,
      };
    },
    [state.attempts, effectiveReviewPlan, questionSkillIndex]
  );

  /** به‌روزرسانی آخرین محل مطالعه */
  const updateLastVisited = useCallback((chapterId: string, lessonId: string) => {
    setState((prev) =>
      prev.lastVisitedChapterId === chapterId && prev.lastVisitedLessonId === lessonId
        ? prev
        : { ...prev, lastVisitedChapterId: chapterId, lastVisitedLessonId: lessonId }
    );
  }, []);

  const changeStudentName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, studentName: name.trim().slice(0, 30) || 'دانش‌آموز پایه ششم' }));
  }, []);

  const resetProgress = useCallback(() => {
    clearLearnerState();
    setState(createInitialState());
  }, []);

  const exportBackup = useCallback(() => exportStateJson(state), [state]);

  const importBackup = useCallback((json: string): boolean => {
    const imported = importStateJson(json);
    if (imported === null) return false;
    setState(imported);
    return true;
  }, []);

  const masteryList: ChapterMastery[] = useMemo(
    () => CURRICULUM_CHAPTERS.map((ch) => computeChapterMastery(ch, state.attempts)),
    [state.attempts]
  );

  const overallMastery = useMemo(() => {
    if (masteryList.length === 0) return 0;
    const sum = masteryList.reduce((acc, m) => acc + m.masteryPercent, 0);
    return Math.round(sum / masteryList.length);
  }, [masteryList]);

  const recentMisconceptions = useMemo(
    () => state.attempts.filter((a) => !a.isCorrect && a.diagnosedMisconception).slice(-5).reverse(),
    [state.attempts]
  );

  const wrongQuestionIds = useMemo(() => {
    const wrong = new Set(state.attempts.filter((a) => !a.isCorrect).map((a) => a.questionId));
    return Array.from(wrong);
  }, [state.attempts]);

  /** شناسه مهارت یک درس (از نخستین پرسش درس) */
  const skillIdForLesson = useCallback(
    (lessonId: string): string | undefined => {
      const lesson = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons).find((l) => l.id === lessonId);
      const firstQuestionId = lesson?.questions[0]?.id;
      return firstQuestionId ? questionSkillIndex.get(firstQuestionId)?.skillId : undefined;
    },
    [questionSkillIndex]
  );

  return {
    state,
    masteryList,
    overallMastery,
    recentMisconceptions,
    wrongQuestionIds,
    skillStates,
    questionSkillIndex,
    skillIdForLesson,
    recordAttempt,
    updateLastVisited,
    changeStudentName,
    resetProgress,
    exportBackup,
    importBackup,
  };
}
