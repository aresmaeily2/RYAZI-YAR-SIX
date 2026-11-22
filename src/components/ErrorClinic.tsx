import React, { useMemo, useState } from 'react';
import { ERROR_TAXONOMY } from '../learning/errorTaxonomy';
import type { MisconceptionCode } from '../learning/types';
import { toPersianDigits } from '../utils/mathEngine';

export interface DiagnosisCase {
  /** عبارت یا مسئلهٔ اصلی */
  problem: string;
  /** پاسخ درست */
  correctAnswer: string;
  /** پاسخ غلطِ رایجی که باید علتش تشخیص داده شود */
  wrongAnswer: string;
  /** کد سوءبردافت مورد انتظار */
  expectedCode: MisconceptionCode;
  /** چهار گزینهٔ کد برای انتخاب دانش‌آموز (یا زیرمجموعه‌ای از آن‌ها) */
  options: MisconceptionCode[];
}

interface ErrorClinicProps {
  cases: DiagnosisCase[];
}

/**
 * پیش‌نمونه C — کلینیک تشخیص خطا:
 * دانش‌آموز یک پاسخ غلط رایج می‌بیند و باید «علت» اشتباه را تشخیص دهد،
 * نه فقط حاصل درست را. بر پایهٔ طبقه‌بندی ده‌گانهٔ errorTaxonomy.
 */
export const ErrorClinic: React.FC<ErrorClinicProps> = ({ cases }) => {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<MisconceptionCode | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const current = cases[index];
  const correct = selected !== null && selected === current.expectedCode;

  const info = useMemo(
    () => (selected ? ERROR_TAXONOMY[selected] : undefined),
    [selected],
  );

  const pick = (code: MisconceptionCode) => {
    if (selected) return;
    setSelected(code);
    if (code === current.expectedCode) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= cases.length) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
    }
  };

  if (finished) {
    return (
      <div className="rounded-xl border-2 border-indigo-200 bg-indigo-50 p-4" data-testid="error-clinic-done">
        <p className="font-bold text-indigo-900">
          پایان کلینیک: {toPersianDigits(score)} از {toPersianDigits(cases.length)} تشخیص درست
        </p>
        <p className="mt-2 text-sm text-slate-700">
          تشخیص علت اشتباه، مهارتی جدا از حل مسئله است؛ همین تمرین را با مداد دوباره انجام بده و ببین کدام مقوله‌ها برایت سخت‌تر بودند.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-amber-200 bg-amber-50 p-4" data-testid="error-clinic">
      <p className="font-bold text-amber-900 mb-2">
        کلینیک تشخیص خطا — مورد {toPersianDigits(index + 1)} از {toPersianDigits(cases.length)}
      </p>
      <p className="text-slate-800" data-testid="clinic-problem">
        مسئله: <span className="font-bold">{current.problem}</span>
      </p>
      <p className="mt-1 text-sm text-slate-700">
        پاسخ درست: <span className="font-bold text-emerald-700">{current.correctAnswer}</span>
        {' '}| پاسخ یک دانش‌آموز: <span className="font-bold text-rose-700">{current.wrongAnswer}</span>
      </p>
      <p className="mt-3 text-sm font-bold text-slate-800">علت این اشتباه کدام است؟</p>
      <div className="mt-2 grid gap-2">
        {current.options.map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => pick(code)}
            aria-pressed={selected === code}
            className={`rounded-lg border p-2 text-right text-sm motion-reduce:transition-none ${
              selected === code
                ? correct
                  ? 'border-emerald-500 bg-emerald-100'
                  : 'border-rose-500 bg-rose-100'
                : 'border-slate-300 bg-white hover:border-indigo-400'
            }`}
          >
            {ERROR_TAXONOMY[code].label}
          </button>
        ))}
      </div>
      {selected && info && (
        <div
          className={`mt-3 rounded-lg border p-3 text-sm ${correct ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'}`}
          role="status"
          data-testid="clinic-feedback"
        >
          <p className="font-bold">{correct ? 'تشخیص درست ✓' : 'تشخیص نادرست'}</p>
          <p className="mt-1 text-slate-700">{info.description}</p>
          <p className="mt-1 text-slate-700">
            <span className="font-bold">راه اصلاح: </span>
            {ERROR_TAXONOMY[current.expectedCode].remediation}
          </p>
          <button
            type="button"
            onClick={next}
            className="mt-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-bold text-white motion-reduce:transition-none"
          >
            {index + 1 >= cases.length ? 'پایان' : 'مورد بعدی'}
          </button>
        </div>
      )}
    </div>
  );
};
