import React, { useMemo, useState } from 'react';

/**
 * آزمایشگاه تعاملی الگوهای عددی — جمله‌های الگو روی خط اعداد.
 * دانش‌آموز شماره جمله را جابه‌جا می‌کند و رابطه (اختلاف ثابت × n) + تنظیم‌کننده
 * را به‌صورت دیداری کشف می‌کند. RTL و reduced-motion رعایت شده است.
 */

interface PatternExplorerProps {
  /** جمله اول الگو */
  firstTerm: number;
  /** اختلاف ثابت بین دو جمله متوالی */
  commonDifference: number;
  /** تعداد جمله‌های نمایش داده شده */
  termCount?: number;
}

export const PatternExplorer: React.FC<PatternExplorerProps> = ({ firstTerm, commonDifference, termCount = 10 }) => {
  const [selected, setSelected] = useState(1);

  const terms = useMemo(
    () => Array.from({ length: termCount }, (_, i) => firstTerm + commonDifference * i),
    [firstTerm, commonDifference, termCount],
  );

  const termAt = (n: number) => firstTerm + commonDifference * (n - 1);
  const adjustment = firstTerm - commonDifference;
  const relation = adjustment === 0 ? `${toFa(commonDifference)} × n` : `(${toFa(commonDifference)} × n) ${adjustment > 0 ? '+' : '−'} ${toFa(Math.abs(adjustment))}`;

  const value = termAt(selected);

  return (
    <div className="rounded-2xl border-2 border-indigo-200 bg-white p-3 sm:p-4" data-testid="pattern-explorer">
      <h4 className="font-black text-indigo-900 text-base mb-1">آزمایشگاه تعاملی الگوی عددی</h4>
      <p className="text-xs text-slate-600 mb-3">
        روی شماره شکل بزن یا با دکمه‌ها جابه‌جا شو تا رابطه الگو را کشف کنی.
      </p>

      {/* دکمه‌های انتخاب شماره شکل — خودکار RTL */}
      <div className="flex flex-wrap gap-1.5 mb-3" role="group" aria-label="انتخاب شماره شکل">
        {terms.map((_t, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setSelected(i + 1)}
            aria-pressed={selected === i + 1}
            className={`w-10 h-10 rounded-lg text-sm font-bold border-2 transition-colors motion-reduce:transition-none ${
              selected === i + 1
                ? 'bg-indigo-600 text-white border-indigo-700'
                : 'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-100'
            }`}
          >
            {toFa(i + 1)}
          </button>
        ))}
      </div>

      {/* خط اعداد — SVG با جهت RTL: جمله اول سمت راست */}
      <svg viewBox="0 0 640 120" className="w-full h-24" role="img" aria-label={`نمودار الگو؛ جمله ${toFa(selected)}ام برابر ${toFa(value)}`}>
        {/* محور */}
        <line x1="20" y1="70" x2="620" y2="70" stroke="#6366f1" strokeWidth="2" />
        {terms.map((t, i) => {
          const x = 620 - (i * 600) / (termCount - 1); // RTL: جمله اول راست
          const h = Math.min(44, (t / Math.max(...terms)) * 44);
          const isSel = i + 1 === selected;
          return (
            <g key={i}>
              <rect x={x - 16} y={70 - h} width={isSel ? 36 : 32} height={h} rx="4" fill={isSel ? '#4f46e5' : '#c7d2fe'} className="motion-reduce:transition-none transition-all" />
              <text x={x} y={70 - h - 6} textAnchor="middle" fontSize="12" fontWeight={isSel ? 'bold' : 'normal'} fill="#312e81">{toFa(t)}</text>
              <text x={x} y={90} textAnchor="middle" fontSize="11" fill="#6366f1">{toFa(i + 1)}</text>
            </g>
          );
        })}
        <text x="620" y="112" textAnchor="middle" fontSize="11" fill="#4338ca">شماره شکل ←</text>
        <text x="20" y="112" textAnchor="middle" fontSize="11" fill="#4338ca">→ تعداد اجزا</text>
      </svg>

      {/* بازخورد رابطه */}
      <div className="mt-2 rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-900" aria-live="polite" data-testid="pattern-relation">
        جمله <b>{toFa(selected)}ام</b> = <b dir="ltr">{relation}</b> = <b>{toFa(value)}</b>
        <span className="block text-xs mt-1 text-indigo-700">
          اختلاف ثابت هر گام: {toFa(commonDifference)} — برای جمله‌های بزرگ لازم نیست یکی‌یکی بشماریم!
        </span>
      </div>

      {/* کنترل دستی */}
      <div className="mt-3 flex items-center justify-center gap-2" dir="ltr">
        <button type="button" onClick={() => setSelected((s) => Math.max(1, s - 1))} aria-label="جمله قبلی" className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-sm border border-indigo-200">−</button>
        <span className="font-bold text-indigo-900 min-w-8 text-center" data-testid="pattern-selected">{toFa(selected)}</span>
        <button type="button" onClick={() => setSelected((s) => Math.min(termCount, s + 1))} aria-label="جمله بعدی" className="px-3 py-1.5 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-sm border border-indigo-200">+</button>
      </div>
    </div>
  );
};

function toFa(n: number): string {
  return n.toLocaleString('fa-IR');
}
