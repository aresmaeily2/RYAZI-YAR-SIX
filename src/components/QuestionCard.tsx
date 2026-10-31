import React, { useState } from 'react';
import type { Question } from '../types/curriculum';
import type { SubmitResult } from '../hooks/useLearnerState';
import { toPersianDigits } from '../utils/mathEngine';
import { CheckCircle2, AlertTriangle, HelpCircle, RotateCcw, Send } from 'lucide-react';

export interface QuestionCardProps {
  question: Question;
  index?: number;
  /** پاسخ قبلاً ثبت‌شده (برای نمایش در حالت مرور آزمون) */
  locked?: boolean;
  lockedAnswer?: string;
  showCorrectOnLock?: boolean;
  /** والد تلاش را ثبت می‌کند و نتیجه تصحیح را برمی‌گرداند (در حالت قفل لازم نیست) */
  onSubmit?: (answer: string, hintsUsed: number) => SubmitResult;
}

const difficultyLabel = (d: Question['difficulty']): string =>
  d === 'easy' ? 'آسان' : d === 'medium' ? 'متوسط' : 'دشوار';

const difficultyClass = (d: Question['difficulty']): string =>
  d === 'easy'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : d === 'medium'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

/** کارت پرسش: پشتیبانی از چهارگزینه‌ای و ورودی عددی با راهنمایی پله‌ای و بازخورد کامل */
export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  index,
  locked = false,
  lockedAnswer,
  showCorrectOnLock = false,
  onSubmit,
}) => {
  const [selected, setSelected] = useState<string>('');
  const [numericInput, setNumericInput] = useState<string>('');
  const [hintStep, setHintStep] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; explanation: string; diagnosis?: string; xp: number } | null>(null);
  const [error, setError] = useState<string>('');

  const currentAnswer = question.type === 'mcq' ? selected : numericInput;

  const handleSubmit = () => {
    if (currentAnswer.trim().length === 0) {
      setError(question.type === 'mcq' ? 'ابتدا یک گزینه انتخاب کن.' : 'پاسخ عددی را وارد کن.');
      return;
    }
    setError('');
    const result = onSubmit ? onSubmit(currentAnswer, hintStep) : null;
    if (result) {
      setFeedback({
        isCorrect: result.isCorrect,
        explanation: result.explanation,
        diagnosis: result.diagnosis,
        xp: result.earnedXp,
      });
    }
  };

  // در حالت قفل (مرور آزمون) فقط نمایش وضعیت و توضیح
  if (locked) {
    const wasAnswered = lockedAnswer !== undefined && lockedAnswer.trim().length > 0;
    return (
      <div className="card p-5 space-y-3" data-testid={`question-${question.id}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          {index !== undefined && (
            <span className="text-xs font-bold text-brand-600">سؤال {toPersianDigits(index + 1)}</span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyClass(question.difficulty)}`}>
            سطح: {difficultyLabel(question.difficulty)}
          </span>
        </div>
        <p className="font-bold text-sm text-slate-900 leading-relaxed">{question.prompt}</p>
        {wasAnswered && (
          <div className="text-xs text-slate-600 space-y-1">
            <div>
              پاسخ شما: <strong>{lockedAnswer}</strong>
            </div>
            {showCorrectOnLock && (
              <div className="text-emerald-700">
                پاسخ درست: <strong>{question.type === 'mcq' ? question.correctAnswer : question.acceptedAnswers[0]}</strong>
              </div>
            )}
          </div>
        )}
        {!wasAnswered && <div className="text-xs text-sun-700 bg-sun-50 border border-sun-200 rounded-xl p-2.5 font-bold">به این سؤال پاسخ ندادی.</div>}
        <div className="p-3.5 rounded-xl border-r-4 border-r-slate-300 text-xs bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
          <strong className="block mb-1">توضیح:</strong>
          {question.explanation}
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5 space-y-4 animate-pop" data-testid={`question-${question.id}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {index !== undefined && (
            <span className="text-xs font-black text-brand-600 bg-brand-50 rounded-lg px-2 py-1">سؤال {toPersianDigits(index + 1)}</span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyClass(question.difficulty)}`}>
            سطح: {difficultyLabel(question.difficulty)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setHintStep((prev) => Math.min(3, prev + 1))}
          disabled={hintStep >= 3}
          className="flex items-center gap-1 text-xs font-bold text-sun-600 hover:text-sun-700 bg-sun-50 rounded-lg px-2.5 py-1.5 transition-all duration-fast hover:bg-sun-100 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`دریافت راهنمایی ${toPersianDigits(hintStep)} از ۳`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>دریافت راهنمایی ({toPersianDigits(hintStep)}/۳)</span>
        </button>
      </div>

      <p className="font-bold text-[15px] text-slate-900 leading-relaxed">{question.prompt}</p>

      {hintStep > 0 && (
        <div className="bg-sun-50 border border-sun-200 rounded-xl p-3.5 space-y-1.5 text-xs text-sun-700 shadow-soft animate-pop" aria-live="polite">
          {question.hints.slice(0, hintStep).map((h, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-sun-200 text-sun-700 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">{toPersianDigits(idx + 1)}</span>
              <span>راهنمایی {toPersianDigits(idx + 1)}: {h}</span>
            </div>
          ))}
        </div>
      )}

      {question.type === 'mcq' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="گزینه‌های پاسخ">
          {question.options.map((opt, optIdx) => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={selected === opt}
              onClick={() => {
                setSelected(opt);
                setFeedback(null);
                setError('');
              }}
              className={`group flex items-center gap-2.5 py-3 px-3.5 rounded-xl border-2 text-xs font-bold transition-all duration-base ease-spring text-right ${
                selected === opt
                  ? 'bg-gradient-to-l from-brand-600 to-violet-600 text-white border-brand-600 shadow-glow scale-[1.02]'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-brand-400 hover:bg-brand-50/50 hover:-translate-y-0.5'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 transition-colors ${
                  selected === opt ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-brand-100 group-hover:text-brand-700'
                }`}
                aria-hidden="true"
              >
                {toPersianDigits(optIdx + 1)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-600" htmlFor={`num-${question.id}`}>
            پاسخ عددی خود را بنویس (ارقام فارسی یا انگلیسی):
          </label>
          <input
            id={`num-${question.id}`}
            type="text"
            dir="ltr"
            inputMode="text"
            autoComplete="off"
            value={numericInput}
            onChange={(e) => {
              setNumericInput(e.target.value);
              setFeedback(null);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmit();
            }}
            className="w-full max-w-xs px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-black text-center text-slate-900 bg-slate-50/50 transition-all duration-fast focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-100 outline-none"
            placeholder={question.answerKind === 'fraction' ? 'مثال: 2/3' : question.answerKind === 'decimal' ? 'مثال: 78.5' : 'مثال: 21'}
            aria-describedby={`num-hint-${question.id}`}
          />
          <p id={`num-hint-${question.id}`} className="text-[11px] text-slate-400 font-medium">
            {question.answerKind === 'fraction'
              ? 'کسر را به شکل صورت/مخرج بنویس؛ عدد مخلوط هم پذیرفته می‌شود (مثال: 2 و 1/3)'
              : question.answerKind === 'decimal'
                ? 'ممیز را با نقطه، جداکننده فارسی (٫) یا / بنویس'
                : 'فقط عدد صحیح'}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-bold bg-rose-50 rounded-lg px-2.5 py-1.5 w-fit animate-pop" role="alert">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-base ease-spring shadow-soft"
        >
          <Send className="w-3.5 h-3.5" />
          بررسی و تصحیح پاسخ
        </button>
        {(feedback || currentAnswer) && (
          <button
            type="button"
            onClick={() => {
              setSelected('');
              setNumericInput('');
              setFeedback(null);
              setError('');
            }}
            className="btn-ghost"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تمرین مجدد
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`relative overflow-hidden p-4 pl-12 rounded-2xl border text-xs space-y-1.5 shadow-soft animate-pop ${
            feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900 animate-shake'
          }`}
          aria-live="polite"
          data-testid="feedback"
        >
          <span
            className={`absolute top-0 bottom-0 right-0 w-1.5 ${feedback.isCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}
            aria-hidden="true"
          />
          <div className="font-bold flex items-center gap-1.5">
            {feedback.isCorrect ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-tick" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600" aria-hidden="true" />
            )}
            <span>
              {feedback.isCorrect ? `آفرین! پاسخ درست است (+${toPersianDigits(feedback.xp)} امتیاز).` : 'پاسخ نادرست است.'}
            </span>
          </div>
          <div className="leading-relaxed">{feedback.explanation}</div>
          {feedback.diagnosis && (
            <div className="text-rose-800 font-bold pt-1.5 border-t border-rose-200/70 flex items-start gap-1.5">
              <span className="chip bg-rose-100 text-rose-700 shrink-0" aria-hidden="true">پزشک خطا</span>
              {feedback.diagnosis}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
