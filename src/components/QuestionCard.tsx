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
      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3" data-testid={`question-${question.id}`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          {index !== undefined && (
            <span className="text-xs font-bold text-indigo-600">سؤال {toPersianDigits(index + 1)}</span>
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
        {!wasAnswered && <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2.5">به این سؤال پاسخ ندادی.</div>}
        <div className="p-3 rounded-xl border text-xs bg-slate-50 border-slate-200 text-slate-700 leading-relaxed">
          <strong className="block mb-1">توضیح:</strong>
          {question.explanation}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4" data-testid={`question-${question.id}`}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {index !== undefined && (
            <span className="text-xs font-bold text-indigo-600">سؤال {toPersianDigits(index + 1)}</span>
          )}
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${difficultyClass(question.difficulty)}`}>
            سطح: {difficultyLabel(question.difficulty)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setHintStep((prev) => Math.min(3, prev + 1))}
          disabled={hintStep >= 3}
          className="flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label={`دریافت راهنمایی ${toPersianDigits(hintStep)} از ۳`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>دریافت راهنمایی ({toPersianDigits(hintStep)}/۳)</span>
        </button>
      </div>

      <p className="font-bold text-sm text-slate-900 leading-relaxed">{question.prompt}</p>

      {hintStep > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1 text-xs text-amber-900" aria-live="polite">
          {question.hints.slice(0, hintStep).map((h, idx) => (
            <div key={idx}>• راهنمایی {toPersianDigits(idx + 1)}: {h}</div>
          ))}
        </div>
      )}

      {question.type === 'mcq' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="گزینه‌های پاسخ">
          {question.options.map((opt) => (
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
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition ${
                selected === opt
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-slate-50 text-slate-800 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {opt}
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
            className="w-full max-w-xs px-4 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            placeholder={question.answerKind === 'fraction' ? 'مثال: 2/3' : question.answerKind === 'decimal' ? 'مثال: 78.5' : 'مثال: 21'}
            aria-describedby={`num-hint-${question.id}`}
          />
          <p id={`num-hint-${question.id}`} className="text-[11px] text-slate-400">
            {question.answerKind === 'fraction'
              ? 'کسر را به شکل صورت/مخرج بنویس؛ عدد مخلوط هم پذیرفته می‌شود (مثال: 2 و 1/3)'
              : question.answerKind === 'decimal'
                ? 'ممیز را با نقطه، جداکننده فارسی (٫) یا / بنویس'
                : 'فقط عدد صحیح'}
          </p>
        </div>
      )}

      {error && <p className="text-xs text-rose-600 font-bold" role="alert">{error}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
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
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-bold hover:bg-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            تمرین مجدد
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl border text-xs space-y-1.5 ${
            feedback.isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
          aria-live="polite"
          data-testid="feedback"
        >
          <div className="font-bold flex items-center gap-1.5">
            {feedback.isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
            <span>
              {feedback.isCorrect ? `آفرین! پاسخ درست است (+${toPersianDigits(feedback.xp)} امتیاز).` : 'پاسخ نادرست است.'}
            </span>
          </div>
          <div className="leading-relaxed">{feedback.explanation}</div>
          {feedback.diagnosis && <div className="text-rose-800 font-medium pt-1">{feedback.diagnosis}</div>}
        </div>
      )}
    </div>
  );
};
