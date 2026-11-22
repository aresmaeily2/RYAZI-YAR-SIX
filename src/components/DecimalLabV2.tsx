import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

/** شبکه ارزش مکانی اعشاری + مقایسه + محور */
export const DecimalLabV2: React.FC = () => {
  const [digits, setDigits] = useState({ ones: 3, tenths: 4, hundredths: 7 });
  const cmp = { a: '۲/۴۵', b: '۲/۵' };
  const value = digits.ones + digits.tenths / 10 + digits.hundredths / 100;

  const set = (k: keyof typeof digits, v: number) => setDigits((d) => ({ ...d, [k]: v }));

  const digitCell = (k: keyof typeof digits, label: string, max: number, color: string) => (
    <div className="text-center">
      <div className={`h-14 w-14 mx-auto rounded-lg border-2 flex items-center justify-center text-2xl font-black ${color}`}
        role="img" aria-label={`${label}: ${toPersianDigits(digits[k])}`}>
        {toPersianDigits(digits[k])}
      </div>
      <input type="range" min={0} max={max} value={digits[k]} aria-label={label}
        onChange={(e) => set(k, Number(e.target.value))} className="w-24 mt-1 accent-indigo-600" />
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );

  return (
    <div className="card p-5 my-4 border-r-4 border-r-indigo-400" data-testid="decimal-lab-v2">
      <h4 className="font-black text-indigo-900 text-base mb-1">آزمایشگاه اعشار — شبکه ارزش مکانی و مقایسه</h4>
      <p className="text-xs text-indigo-700 mb-3">رقم‌ها را جابه‌جا کن و ببین مقدار عدد اعشاری چطور تغییر می‌کند؛ جایگاه رقم تعیین‌کننده است، نه تعداد رقم‌ها.</p>

      <div className="flex justify-center gap-4 bg-white rounded-xl p-4 border border-indigo-100">
        {digitCell('ones', 'یکان', 9, 'border-slate-300 bg-slate-50 text-slate-800')}
        <span className="text-3xl font-black self-center mt-2 text-slate-400">،</span>
        {digitCell('tenths', 'دهم', 9, 'border-indigo-300 bg-indigo-50 text-indigo-800')}
        {digitCell('hundredths', 'صدم', 9, 'border-purple-300 bg-purple-50 text-purple-800')}
      </div>
      <p className="text-center text-lg font-black mt-2" data-testid="decimal-value">
        عدد: <span className="text-indigo-700">{toPersianDigits(value.toFixed(2)).replace('.', '/')}</span>
      </p>

      <div className="bg-slate-50 rounded-xl p-3 mt-3">
        <p className="text-sm font-bold text-slate-800 mb-2">چالش مقایسه: کدام بزرگ‌تر است؟</p>
        <div className="flex items-center justify-center gap-4">
          <span className="font-black text-xl">{cmp.a}</span>
          <span className="font-black text-2xl text-indigo-700" data-testid="decimal-cmp">
            {parseFloat(cmp.a.replace('/', '.')) > parseFloat(cmp.b.replace('/', '.')) ? '>' : '<'}
          </span>
          <span className="font-black text-xl">{cmp.b}</span>
        </div>
        <p className="text-xs text-slate-600 mt-2">۲/۵۰ در برابر ۲/۴۵: صفرِ انتهایی مقدار را عوض نمی‌کند اما مقایسه را آسان می‌کند — مرتبه‌ها را از چپ مقایسه کن.</p>
      </div>

      <svg viewBox="0 0 320 56" className="w-full mt-2" role="img" aria-label="محور اعداد اعشاری">
        <line x1="10" y1="28" x2="310" y2="28" stroke="#475569" strokeWidth="2" />
        {[2, 2.2, 2.4, 2.6, 2.8, 3].map((t) => (
          <g key={t}>
            <line x1={10 + (t - 2) * 150} y1="22" x2={10 + (t - 2) * 150} y2="34" stroke="#475569" strokeWidth="2" />
            <text x={10 + (t - 2) * 150} y="50" textAnchor="middle" fontSize="11" fill="#475569">{toPersianDigits(t)}</text>
          </g>
        ))}
        <circle cx={10 + (value - 2) * 150} cy="28" r="7" fill={COLOR_SAFE.indigo} stroke="#fff" strokeWidth="2" />
      </svg>
    </div>
  );
};

const COLOR_SAFE = { indigo: '#6366f1' };
