import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

export interface SortableItem {
  id: string;
  label: string;
  /** مقدار عددی یا ترتیبی موردنظر برای سنجش صحت */
  order: number;
}

interface MatchSorterProps {
  /** عنوان فعالیت (مثلاً «مرتب‌سازی حاصل عبارت‌ها») */
  title: string;
  items: SortableItem[];
  /** بازخورد پس از اتمام مرتب‌سازی */
  onSuccess?: () => void;
}

/**
 * تمرین تعاملی «چیدمان» — دانش‌آموز آیتم‌ها را به ترتیب درست می‌چیند.
 * دکمه‌های بالا/پایین (سازگار با کیبورد و RTL) به‌جای درگ خام؛
 * حرکت با دکمه همیشه در دسترس است و motion-redivide ندارد.
 */
export const MatchSorter: React.FC<MatchSorterProps> = ({ title, items, onSuccess }) => {
  const [ordered, setOrdered] = useState<SortableItem[]>(() => shuffle(items));
  const [solved, setSolved] = useState(false);

  const move = (index: number, delta: -1 | 1) => {
    if (solved) return;
    const next = [...ordered];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
    if (next.every((it, i) => it.order === i + 1)) {
      setSolved(true);
      onSuccess?.();
    }
  };

  const reset = () => {
    setOrdered(shuffle(items));
    setSolved(false);
  };

  return (
    <div className="rounded-xl border-2 border-slate-200 bg-white p-4" data-testid="match-sorter">
      <p className="font-bold text-slate-800 mb-3">{title}</p>
      <ol className="space-y-2" aria-label={title}>
        {ordered.map((it, i) => (
          <li
            key={it.id}
            className={`flex items-center gap-2 rounded-lg border p-2 ${
              solved ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 bg-slate-50'
            }`}
          >
            <span className="w-7 text-center font-bold text-indigo-700" aria-hidden="true">
              {toPersianDigits(i + 1)}
            </span>
            <span className="flex-1 text-slate-800">{it.label}</span>
            {!solved && (
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`بالا بردن ${it.label}`}
                  className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-30 motion-reduce:transition-none"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === ordered.length - 1}
                  aria-label={`پایین آوردن ${it.label}`}
                  className="rounded border border-slate-300 px-2 py-1 text-sm disabled:opacity-30 motion-reduce:transition-none"
                >
                  ▼
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center justify-between">
        <p role="status" className="text-sm font-bold">
          {solved ? 'آفرین! ترتیب درست است ✓' : 'با دکمه‌های ▲▼ ترتیب را درست کن.'}
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-slate-300 px-3 py-1 text-sm text-slate-600 motion-reduce:transition-none"
        >
          شروع دوباره
        </button>
      </div>
    </div>
  );
};

/** بُر زدن ساده با کپی (تا هر بار چیدمان متفاوت شروع شود) */
function shuffle(items: SortableItem[]): SortableItem[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // اگر شانس، ترتیب درست آمد، یک جابه‌جایی ساده انجام بده
  if (arr.every((it, i) => it.order === i + 1) && arr.length > 1) {
    [arr[0], arr[1]] = [arr[1], arr[0]];
  }
  return arr;
}
