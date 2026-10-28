import React, { useMemo, useState } from 'react';
import type { LessonFlow, FlowStage, MissingStep } from '../learning/flowTypes';
import { stageLabel, sourceForStage } from '../learning/flowTypes';
import { stageQuestions, advanceFlow, isStagePassed, type StageAttemptOutcome } from '../learning/flowLogic';
import type { Question, NumericQuestion } from '../types/curriculum';
import { QuestionCard } from './QuestionCard';
import type { SubmitResult } from '../hooks/useLearnerState';
import { isNumericAnswerCorrect } from '../utils/answerChecking';
import { toPersianDigits } from '../utils/mathEngine';
import { CheckCircle2, ChevronLeft, ChevronRight, XCircle, Info } from 'lucide-react';

/**
 * پخش‌کننده الگوی آموزشی چندمرحله‌ای (A تا G؛ مرحله H مرور تأخیری در موتور یادگیری است).
 * تصمیم پیشرفت با منطق خالص flowLogic گرفته می‌شود و هر پاسخ با منبع درست
 * (پیش‌نیاز/تمرین/انتقال) در موتور یادگیری ثبت می‌گردد.
 */

export interface LessonFlowPlayerProps {
  flow: LessonFlow;
  questionsById: ReadonlyMap<string, Question>;
  /** ثبت پاسخ با منبع مرحله؛ نتیجه تصحیح را برمی‌گرداند */
  onRecordAnswer: (q: Question, answer: string, hintsUsed: number, source: 'practice' | 'prereq' | 'transfer') => SubmitResult;
  onExit: () => void;
}

const KIND_COLORS: Record<FlowStage['kind'], string> = {
  'prereq-check': 'bg-sky-600',
  'intuitive-intro': 'bg-amber-500',
  representations: 'bg-violet-600',
  'worked-example': 'bg-indigo-600',
  'completion-example': 'bg-emerald-600',
  'independent-practice': 'bg-teal-600',
  'transfer-assessment': 'bg-rose-600',
};

/** بررسی پاسخ یک گام حذف‌شده با همان موتور تصحیح عددی برنامه */
function checkMissingStep(step: MissingStep, input: string): boolean {
  const pseudo: NumericQuestion = {
    id: step.id,
    chapterId: 'flow',
    lessonId: 'flow',
    type: 'numeric',
    difficulty: 'easy',
    prompt: step.prompt,
    hints: [step.hint, step.hint, step.hint],
    explanation: '',
    answerKind: step.answerKind,
    acceptedAnswers: step.acceptedAnswers,
  };
  return isNumericAnswerCorrect(pseudo, input);
}

export const LessonFlowPlayer: React.FC<LessonFlowPlayerProps> = ({ flow, questionsById, onRecordAnswer, onExit }) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [remedialMode, setRemedialMode] = useState(false);
  const [outcomes, setOutcomes] = useState<StageAttemptOutcome[]>([]);
  const [finished, setFinished] = useState(false);

  // وضعیت مرحله مثال ناقص
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});
  const [stepTries, setStepTries] = useState<Record<string, number>>({});
  const [stepDone, setStepDone] = useState<Record<string, boolean>>({});
  const [stepFeedback, setStepFeedback] = useState<Record<string, 'ok' | 'retry' | 'fallback'>>({});

  const stage: FlowStage | undefined = flow.stages[stageIndex];
  const stageQs = useMemo(() => (stage ? stageQuestions(stage, questionsById) : []), [stage, questionsById]);
  const activeQuestions = useMemo(() => {
    if (!stage) return [];
    if (remedialMode && stage.retestQuestions) return stage.retestQuestions;
    return stageQs;
  }, [stage, remedialMode, stageQs]);

  const resetStageState = () => {
    setOutcomes([]);
    setStepInputs({});
    setStepTries({});
    setStepDone({});
    setStepFeedback({});
  };

  const finishStage = (finalOutcomes: StageAttemptOutcome[]) => {
    if (!stage) return;
    const result = advanceFlow(flow, stageIndex, finalOutcomes);
    if (result.done) {
      setFinished(true);
      return;
    }
    if (result.needsRemedialRetest) {
      setRemedialMode(true);
      setOutcomes([]);
      return;
    }
    if (result.nextIndex !== stageIndex) {
      setRemedialMode(false);
      setStageIndex(result.nextIndex);
      resetStageState();
    } else {
      // تکرار همان مرحله با شواهد تازه
      resetStageState();
    }
  };

  const handleSubmit = (q: Question, answer: string, hintsUsed: number): SubmitResult => {
    if (!stage) throw new Error('مرحله فعال یافت نشد');
    const source = remedialMode ? 'prereq' : sourceForStage(stage.kind);
    const result = onRecordAnswer(q, answer, hintsUsed, source);
    const next = [...outcomes, { questionId: q.id, isCorrect: result.isCorrect, hintsUsed }];
    setOutcomes(next);
    if (next.length >= activeQuestions.length) {
      // با setTimeout که رندر بازخورد اول دیده شود
      window.setTimeout(() => finishStage(next), 900);
    }
    return result;
  };

  const handleMissingStepSubmit = (step: MissingStep) => {
    const input = (stepInputs[step.id] ?? '').trim();
    if (input.length === 0) return;
    const tries = (stepTries[step.id] ?? 0) + 1;
    setStepTries((prev) => ({ ...prev, [step.id]: tries }));
    const ok = checkMissingStep(step, input);
    if (ok) {
      setStepFeedback((prev) => ({ ...prev, [step.id]: 'ok' }));
      setStepDone((prev) => ({ ...prev, [step.id]: true }));
      const next = [...outcomes, { questionId: step.id, isCorrect: true, hintsUsed: Math.max(0, tries - 1) }];
      setOutcomes(next);
      if (Object.keys({ ...stepDone, [step.id]: true }).length >= (stage?.completionExample?.missingSteps.length ?? 0)) {
        window.setTimeout(() => finishStage(next), 900);
      }
    } else if (tries === 1) {
      setStepFeedback((prev) => ({ ...prev, [step.id]: 'retry' }));
    } else {
      setStepFeedback((prev) => ({ ...prev, [step.id]: 'fallback' }));
    }
  };

  // ==================== نمایش پایان جریان ====================
  if (finished) {
    return (
      <div className="bg-white rounded-2xl border border-emerald-200 p-6 text-center space-y-3" data-testid="flow-finished">
        <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
        <h3 className="font-extrabold text-lg text-slate-900">مسیر این درس کامل شد!</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          شواهد یادگیری تو ثبت شد. موتور یادگیری حالا وضعیت این مهارت را می‌داند و برنامه مرور فاصله‌دار آن را در داشبورد نشان می‌دهد.
          برای تثبیت ماندگاری، مرور بعدی را جدی بگیر.
        </p>
        <button
          type="button"
          onClick={onExit}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition"
        >
          بازگشت به درس
        </button>
      </div>
    );
  }

  if (!stage) return null;

  const progress = isStagePassed(stage, outcomes);

  return (
    <div className="space-y-4" data-testid="lesson-flow-player">
      {/* نوار پیشرفت مراحل */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold text-white px-2.5 py-1 rounded-full ${KIND_COLORS[stage.kind]}`}>
              {stageLabel(stage.kind)}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {toPersianDigits(stageIndex + 1)} از {toPersianDigits(flow.stages.length)}
            </span>
          </div>
          <button
            type="button"
            onClick={onExit}
            className="text-xs font-bold text-slate-400 hover:text-slate-600"
            aria-label="خروج از مسیر یادگیری"
          >
            خروج از مسیر
          </button>
        </div>
        <div className="flex gap-1.5" role="progressbar" aria-valuenow={stageIndex + 1} aria-valuemin={1} aria-valuemax={flow.stages.length}>
          {flow.stages.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full transition ${i < stageIndex ? 'bg-emerald-500' : i === stageIndex ? 'bg-indigo-500' : 'bg-slate-200'}`}
            />
          ))}
        </div>
      </div>

      {/* عنوان و روایت مرحله */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
        <h3 className="font-extrabold text-slate-900">{stage.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{stage.narrative}</p>
        {remedialMode && stage.remedial && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 leading-relaxed" data-testid="flow-remedial">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Info className="w-4 h-4" />
              یادآوری کوتاه
            </div>
            {stage.remedial}
          </div>
        )}
        {stage.scenario && (
          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3.5 text-xs text-sky-900 leading-relaxed">
            {stage.scenario}
          </div>
        )}
      </div>

      {/* مرحله C — کارت‌های نمایش */}
      {stage.representations && !remedialMode && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stage.representations.map((rep) => (
            <div key={rep.kind} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
              <span className="text-[11px] font-bold text-violet-700 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                {rep.label}
              </span>
              <p className="text-xs text-slate-600 leading-relaxed">{rep.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* مرحله D — مثال حل‌شده با بلنداندیشی */}
      {stage.workedExample && !remedialMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
          <p className="font-bold text-sm text-slate-900 bg-indigo-50 border border-indigo-200 rounded-xl p-3">{stage.workedExample.problem}</p>
          {stage.workedExample.steps.map((st, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-xs">
              <div className="font-bold text-slate-800">{st.text}</div>
              <div className="text-slate-600 leading-relaxed">چرا؟ {st.why}</div>
              {st.check && <div className="text-emerald-700 leading-relaxed">بررسی صحت: {st.check}</div>}
              {st.commonMistake && <div className="text-rose-700 leading-relaxed">اشتباه رایج: {st.commonMistake}</div>}
            </div>
          ))}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-bold text-emerald-900">
            پاسخ نهایی: {stage.workedExample.finalAnswer}
          </div>
        </div>
      )}

      {/* مرحله E — مثال ناقص */}
      {stage.completionExample && !remedialMode && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <p className="font-bold text-sm text-slate-900 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            {stage.completionExample.problem}
          </p>
          <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
            {stage.completionExample.givenSteps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ol>
          {stage.completionExample.missingSteps.map((step, idx) => {
            const fb = stepFeedback[step.id];
            const tries = stepTries[step.id] ?? 0;
            const useFallback = fb === 'fallback';
            return (
              <div key={step.id} className="border border-slate-200 rounded-xl p-3.5 space-y-2" data-testid={`missing-step-${idx + 1}`}>
                <div className="text-xs font-bold text-slate-700">
                  جای خالی {toPersianDigits(idx + 1)}: {useFallback ? step.fallbackPrompt : step.prompt}
                </div>
                {stepDone[step.id] ? (
                  <div className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> درست بود!
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={stepInputs[step.id] ?? ''}
                      onChange={(e) => setStepInputs((prev) => ({ ...prev, [step.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleMissingStepSubmit(step);
                      }}
                      className="w-32 px-3 py-2 rounded-xl border border-slate-300 text-sm font-bold text-center focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      aria-label={`پاسخ جای خالی ${toPersianDigits(idx + 1)}`}
                      placeholder="پاسخ"
                    />
                    <button
                      type="button"
                      onClick={() => handleMissingStepSubmit(step)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                    >
                      بررسی
                    </button>
                  </div>
                )}
                {fb === 'retry' && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5 leading-relaxed">
                    هنوز درست نیست. راهنما: {step.hint}
                  </div>
                )}
                {fb === 'fallback' && (
                  <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 leading-relaxed">
                    بیا با هم گام‌به‌گام برویم؛ سؤال ساده‌تر بالای کادر نوشته شد.
                  </div>
                )}
                {fb === 'retry' && tries >= 1 && (
                  <div className="text-[11px] text-slate-400">اگر دوباره نادرست شد، سؤال ساده‌تر برایت نمایش داده می‌شود.</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* پرسش‌های مرحله (A، B، C، F، G و بازآزمون) */}
      {activeQuestions.length > 0 && (
        <div className="space-y-4">
          {activeQuestions.map((q, i) => (
            <QuestionCard key={q.id} question={q} index={i} onSubmit={(answer, hints) => handleSubmit(q, answer, hints)} />
          ))}
        </div>
      )}

      {/* مرحله D بدون پرسش: دکمه ادامه */}
      {stage.kind === 'worked-example' && !remedialMode && (
        <button
          type="button"
          onClick={() => finishStage([])}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          متوجه شدم؛ مرحله بعد
        </button>
      )}

      {/* بازخورد وضعیت عبور مرحله */}
      {(stage.kind !== 'worked-example' || remedialMode) && outcomes.length >= activeQuestions.length && activeQuestions.length > 0 && (
        <div
          className={`rounded-xl border p-3.5 text-xs font-bold flex items-center gap-2 ${
            progress.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
          data-testid="stage-outcome"
          aria-live="polite"
        >
          {progress.passed ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {progress.passed
            ? `شرط این مرحله برآورده شد (${toPersianDigits(progress.correctCount)} پاسخ درست از حداقل ${toPersianDigits(progress.required)}).`
            : `هنوز شرط مرحله کامل نشده (${toPersianDigits(progress.correctCount)} از ${toPersianDigits(progress.required)})؛ در حال آماده‌سازی گام بعدی...`}
        </div>
      )}

      {outcomes.length < activeQuestions.length && (
        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <ChevronLeft className="w-3.5 h-3.5" />
          {toPersianDigits(outcomes.length)} از {toPersianDigits(activeQuestions.length)} سؤال این مرحله پاسخ داده شده است.
        </div>
      )}
    </div>
  );
};
