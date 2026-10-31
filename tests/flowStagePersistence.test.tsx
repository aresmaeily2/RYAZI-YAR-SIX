import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { ch7l3Flow } from '../src/data/flows/ch7l3.flow';
import { LessonFlowPlayer } from '../src/components/LessonFlowPlayer';
import { isAnswerCorrect } from '../src/utils/answerChecking';
import { loadLearnerState, saveLearnerState, STORAGE_KEY, importStateJson } from '../src/utils/storage';
import type { Question } from '../src/types/curriculum';
import type { SubmitResult } from '../src/hooks/useLearnerState';
import App from '../src/App';

/**
 * آزمون «حفظ وضعیت مرحلهٔ جریان پس از خروج و ورود مجدد» (الزام موتور تطبیقی).
 * سه لایه: ۱) پایدارسازی اندیس مرحله در پخش‌کننده ۲) اعتبارسنجی ذخیره‌سازی
 * ۳) سناریوی واقعی خروج/ورود مجدد در سطح App با localStorage مشترک.
 */

const qById = new Map<string, Question>(
  CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions)).map((q) => [q.id, q])
);

const recorder = () => {
  const fn = (q: Question, answer: string, _hintsUsed: number): SubmitResult => {
    const isCorrect = isAnswerCorrect(q, answer);
    return { isCorrect, explanation: q.explanation, earnedXp: 0 };
  };
  return vi.fn(fn);
};

describe('پایدارسازی مرحله در پخش‌کنندهٔ جریان', () => {
  it('با startStageIndex معتبر مستقیماً در همان مرحله شروع می‌کند (ورود مجدد)', () => {
    render(
      <LessonFlowPlayer
        flow={ch7l3Flow}
        questionsById={qById}
        onRecordAnswer={recorder()}
        startStageIndex={7}
        onExit={() => {}}
      />
    );
    // مرحلهٔ اندیس ۷ = سنجش انتقال (G)؛ مرحلهٔ A نباید رندر شده باشد
    expect(screen.getByText('آزمون انتقال: همین قرارداد در موقعیت‌های تازه')).toBeInTheDocument();
    expect(screen.queryByText('پیش از شروع: پایه‌های این درس را بررسی کنیم')).not.toBeInTheDocument();
    cleanup();
  });

  it('startStageIndex نامعتبر (خارج از بازه/اعشاری) به مرحلهٔ ۰ برمی‌گردد', () => {
    const { unmount } = render(
      <LessonFlowPlayer flow={ch7l3Flow} questionsById={qById} onRecordAnswer={recorder()} startStageIndex={99} onExit={() => {}} />
    );
    expect(screen.getByText('پیش از شروع: پایه‌های این درس را بررسی کنیم')).toBeInTheDocument();
    unmount();
    const { unmount: u2 } = render(
      <LessonFlowPlayer flow={ch7l3Flow} questionsById={qById} onRecordAnswer={recorder()} startStageIndex={1.5} onExit={() => {}} />
    );
    expect(screen.getByText('پیش از شروع: پایه‌های این درس را بررسی کنیم')).toBeInTheDocument();
    u2();
    cleanup();
  });

  it('ورود به هر مرحله پایدار می‌شود و عبور مرحلهٔ A اندیس ۱ را ثبت می‌کند', async () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const record = recorder();
    render(<LessonFlowPlayer flow={ch7l3Flow} questionsById={qById} onRecordAnswer={record} onStagePersist={persist} onExit={() => {}} />);

    // ورود اولیه به مرحلهٔ ۰ ثبت شده است
    expect(persist).toHaveBeenCalledWith(0);

    const pick = (qid: string, option: string) => {
      const card = screen.getByTestId(`question-${qid}`);
      fireEvent.click(within(card).getByRole('radio', { name: option }));
      fireEvent.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    };
    pick('q721', '۱۲۰۰');
    pick('q723', '۴۹٬۰۰۰');
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(persist).toHaveBeenCalledWith(1); // ورود به مرحلهٔ B پایدار شد
    expect(screen.getByText('یک محاسبه، دو جواب متفاوت؟!')).toBeInTheDocument();
    vi.useRealTimers();
    cleanup();
  });

  it('پایان جریان مدخل پایدارسازی را با null پاک می‌کند (اجرای بعدی از ابتدا)', () => {
    vi.useFakeTimers();
    const persist = vi.fn();
    const seqFlow = { ...ch7l3Flow, id: 'flow-ch7l3-persist-finish', stages: [ch7l3Flow.stages.find((s) => s.kind === 'step-sequencing')!] };
    render(<LessonFlowPlayer flow={seqFlow} questionsById={qById} onRecordAnswer={recorder()} onStagePersist={persist} onExit={() => {}} />);
    const panel = screen.getByTestId('sequencing-panel');
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s1'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s2'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s3'));
    fireEvent.click(within(panel).getByTestId('seq-card-flow-ch7l3-x-s4'));
    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(screen.getByTestId('flow-finished')).toBeInTheDocument();
    expect(persist).toHaveBeenLastCalledWith(null);
    vi.useRealTimers();
    cleanup();
  });
});

describe('اعتبارسنجی ذخیره‌سازی flowProgress', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('flowProgress معتبر ذخیره و بازیابی می‌شود', () => {
    const state = { ...loadLearnerState(), flowProgress: { 'flow-ch7l3': 4 } };
    saveLearnerState(state);
    expect(loadLearnerState().flowProgress).toEqual({ 'flow-ch7l3': 4 });
  });

  it('دادهٔ خراب flowProgress (مقدار منفی/اعشاری/رشته‌ای) کل وضعیت را رد می‌کند و حالت اولیه برمی‌گردد', () => {
    for (const bad of [{ 'flow-x': -1 }, { 'flow-x': 1.5 }, { 'flow-x': '2' }, { 'flow-x': 999999 }]) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadLearnerState(), flowProgress: bad }));
      const loaded = loadLearnerState();
      expect(loaded.flowProgress).toBeUndefined();
      expect(loaded.attempts).toHaveLength(0); // حالت اولیه، نه دادهٔ خراب
    }
  });

  it('پشتیبان JSON بدون flowProgress پذیرفته می‌شود (سازگاری نسخه‌های قبلی) و با flowProgress خراب رد می‌شود', () => {
    const base = loadLearnerState();
    const noProgress = JSON.parse(JSON.stringify(base));
    delete noProgress.flowProgress;
    expect(importStateJson(JSON.stringify(noProgress))).not.toBeNull();
    expect(importStateJson(JSON.stringify({ ...noProgress, flowProgress: { f: 'x' } }))).toBeNull();
  });
});

describe('سناریوی واقعی خروج و ورود مجدد در سطح App', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
    cleanup();
  });

  it('پس از عبور مرحلهٔ A و بستن صفحه، ورود مجدد مستقیماً از مرحلهٔ B ادامه می‌دهد', async () => {
    const user = userEvent.setup();

    // ── اجرای اول: ورود به مسیر درس ch7l3 و عبور مرحلهٔ A ──
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۷: تقریب و تخمین/ }));
    await user.click(screen.getByRole('button', { name: '• عملیات ترکیبی' }));
    await user.click(screen.getByRole('button', { name: /شروع مسیر یادگیری کامل این درس/ }));
    expect(screen.getByText('پیش از شروع: پایه‌های این درس را بررسی کنیم')).toBeInTheDocument();

    const pick = async (qid: string, option: string) => {
      const card = screen.getByTestId(`question-${qid}`);
      await user.click(within(card).getByRole('radio', { name: option }));
      await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    };
    await pick('q721', '۱۲۰۰');
    await pick('q723', '۴۹٬۰۰۰');
    await waitFor(() => expect(screen.getByText('یک محاسبه، دو جواب متفاوت؟!')).toBeInTheDocument(), { timeout: 3000 });

    // ── «بستن صفحه»: حذف کامل درخت و رندر مجدد App با همان localStorage ──
    unmount();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۷: تقریب و تخمین/ }));
    await user.click(screen.getByRole('button', { name: '• عملیات ترکیبی' }));
    await user.click(screen.getByRole('button', { name: /شروع مسیر یادگیری کامل این درس/ }));

    // وضعیت مرحله حفظ شده است: مستقیماً مرحلهٔ B، نه مرحلهٔ A
    await waitFor(() => expect(screen.getByText('یک محاسبه، دو جواب متفاوت؟!')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByText('پیش از شروع: پایه‌های این درس را بررسی کنیم')).not.toBeInTheDocument();
    // مهلت ۲۰ ثانیه: این آزمون دو رندر کامل App + هشت کلیک دارد؛ روی runnerهای اشتراکی CI از ۵ ثانیهٔ پیش‌فرض عبور می‌کند (flake ثابت‌شده در run 41177444573)
  }, 20000);
});
