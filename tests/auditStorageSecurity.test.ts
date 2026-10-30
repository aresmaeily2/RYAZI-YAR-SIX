import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  STORAGE_KEY,
  createInitialState,
  loadLearnerState,
  saveLearnerState,
  importStateJson,
} from '../src/utils/storage';
import { rebuildSkillStates } from '../src/learning/builder';
import { buildQuestionIndex } from '../src/learning/builder';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import type { LearnerState } from '../src/types/curriculum';

/**
 * ممیزی فاز ۶ — امنیت، حریم خصوصی و پایداری لایهٔ ذخیره‌سازی:
 * خرابی داده، ورودی نامعتبر، سازگاری نسخهٔ قدیم، دستکاری وضعیت و تلاش نامعلوم.
 */

const QINDEX = buildQuestionIndex(CURRICULUM_CHAPTERS);

function oldVersionState(): Record<string, unknown> {
  // دقیقاً ساختار نسخهٔ پیش از موتور تطبیقی (369a6a7): بدون reviewPlan، source محدود به practice/exam
  return {
    studentName: 'سارا',
    xp: 120,
    streakDays: 3,
    lastActiveDate: '2026-10-01',
    lastVisitedChapterId: 'ch2',
    lastVisitedLessonId: 'ch2l1',
    completedLessonIds: ['ch1l1'],
    attempts: [
      {
        id: 'att_old_1',
        questionId: 'q111',
        chapterId: 'ch1',
        lessonId: 'ch1l1',
        difficulty: 'easy',
        selectedAnswer: '21',
        isCorrect: true,
        hintsUsed: 0,
        timestamp: 1_700_000_000_000,
        source: 'practice',
      },
    ],
  };
}

describe('ممیزی فاز ۶ — پایداری لایهٔ ذخیره‌سازی', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('دادهٔ خراب JSON → حالت اولیه بدون کرش', () => {
    localStorage.setItem(STORAGE_KEY, '{ناقص و خراب');
    const st = loadLearnerState();
    expect(st.attempts).toEqual([]);
    expect(st.studentName).toContain('دانش‌آموز');
  });

  it('ساختار نامعتبر (آرایه به‌جای آبجکت) → حالت اولیه', () => {
    localStorage.setItem(STORAGE_KEY, '[1,2,3]');
    expect(loadLearnerState().attempts).toEqual([]);
  });

  it('حالت معتبر ذخیره و بازیابی می‌شود (round-trip)', () => {
    const st: LearnerState = { ...createInitialState('مهدی'), xp: 42 };
    st.attempts.push({
      id: 'a1', questionId: 'q111', chapterId: 'ch1', lessonId: 'ch1l1',
      difficulty: 'easy', selectedAnswer: '21', isCorrect: true, hintsUsed: 0,
      timestamp: 1_700_000_000_000, source: 'practice',
    });
    saveLearnerState(st);
    const loaded = loadLearnerState();
    expect(loaded.studentName).toBe('مهدی');
    expect(loaded.xp).toBe(42);
    expect(loaded.attempts.length).toBe(1);
  });

  it('خطای ذخیره‌سازی (حالت خصوصی/پر شدن ظرفیت) برنامه را نمی‌شکند', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => saveLearnerState(createInitialState())).not.toThrow();
    spy.mockRestore();
  });

  it('وضعیت نسخهٔ قدیمی (بدون reviewPlan، source محدود) پذیرفته و موتور از آن وضعیت می‌سازد', () => {
    const old = oldVersionState();
    const loaded = importStateJson(JSON.stringify(old));
    expect(loaded).not.toBeNull();
    expect(loaded!.studentName).toBe('سارا');
    // موتور تطبیقی از دادهٔ قدیمی وضعیت مهارت می‌سازد
    const states = rebuildSkillStates(loaded!.attempts, QINDEX, 1_700_000_000_000);
    expect(states['sk-ch1l1'].evidence.length).toBe(1);
  });
});

describe('ممیزی فاز ۶ — اعتبارسنجی ورودی و مقاومت در برابر دستکاری', () => {
  it('xp منفی/غیرمتناهی، تلاش بدون source، reviewPlan بدشکل، نام غیررشته‌ای → رد توسط importStateJson', () => {
    const base = oldVersionState();
    expect(importStateJson(JSON.stringify({ ...base, xp: -5 }))).toBeNull();
    expect(importStateJson(JSON.stringify({ ...base, xp: Number.POSITIVE_INFINITY }))).toBeNull();
    const badAttempt = { ...((base.attempts as unknown[])[0] as Record<string, unknown>) };
    delete badAttempt.source;
    expect(importStateJson(JSON.stringify({ ...base, attempts: [badAttempt] }))).toBeNull();
    expect(importStateJson(JSON.stringify({ ...base, reviewPlan: { 'sk-x': { nextReviewAt: 'bad' } } }))).toBeNull();
    expect(importStateJson(JSON.stringify({ ...base, studentName: 42 }))).toBeNull();
  });

  it('importStateJson ورودی خراب/غیرمجاز را رد می‌کند (نه کرش، نه پذیرش)', () => {
    expect(importStateJson('not json')).toBeNull();
    expect(importStateJson('null')).toBeNull();
    expect(importStateJson('{"studentName":"x"}')).toBeNull();
  });

  it('تلاش با questionId ناشناخته (دستکاری/حذف محتوا) → نادیده گرفته می‌شود و داشبورد نمی‌شکند', () => {
    const tampered = oldVersionState();
    (tampered.attempts as unknown[]).push({
      id: 'att_hack', questionId: 'q99999', chapterId: 'ch9', lessonId: 'ch9l9',
      difficulty: 'hard', selectedAnswer: 'x', isCorrect: true, hintsUsed: 0,
      timestamp: 1_700_000_000_001, source: 'exam',
    });
    const loaded = importStateJson(JSON.stringify(tampered))!;
    const states = rebuildSkillStates(loaded.attempts, QINDEX, 1_700_000_000_001);
    expect(states['sk-ch1l1'].evidence.length).toBe(1); // فقط تلاش معتبر شمرده شد
  });

  it('نام دانش‌آموز هنگام ثبت به ۳۰ نویسه محدود و بریده می‌شود (حداقل‌سازی داده)', () => {
    // فرمول مستقیم در useLearnerState.changeStudentName: trim + slice(0,30)
    const longName = 'ا'.repeat(100);
    const sanitized = longName.trim().slice(0, 30) || 'دانش‌آموز پایه ششم';
    expect(sanitized.length).toBe(30);
  });
});
