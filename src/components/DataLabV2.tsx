import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

interface Row { label: string; value: number }

/** آزمایشگاه آمار و احتمال — نمودار قابل ویرایش، میانگین، شبیه‌سازی تاس و سکه */
export const DataLabV2: React.FC = () => {
  const [rows, setRows] = useState<Row[]>([
    { label: 'شنبه', value: 4 },
    { label: 'یکشنبه', value: 7 },
    { label: 'دوشنبه', value: 3 },
    { label: 'سه‌شنبه', value: 6 },
  ]);
  const [flips, setFlips] = useState<number[]>([]);
  const [dice, setDice] = useState<number[]>([]);

  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  const mean = total / rows.length;

  const setVal = (i: number, v: number) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, value: v } : r)));

  const flipCoin = () => {
    const n = 20;
    const results = Array.from({ length: n }, () => (Math.random() < 0.5 ? 0 : 1));
    setFlips(results);
  };
  const rollDice = () => {
    const n = 12;
    setDice(Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)));
  };
  const heads = flips.filter((f) => f === 1).length;
  const sixes = dice.filter((d) => d === 6).length;

  return (
    <div className="card p-5 my-4 border-r-4 border-r-violet-400" data-testid="data-lab-v2">
      <h4 className="font-black text-violet-900 text-base mb-1">آزمایشگاه آمار — نمودار زنده، میانگین و احتمال</h4>
      <p className="text-xs text-violet-700 mb-3">مقادیر را تغییر بده؛ نمودار ستونی و میانگین همان لحظه عوض می‌شوند. بعد سکه و تاس بریز و پیش‌بینی را با نتیجه بسنج.</p>

      <div className="bg-white rounded-xl p-3 border border-violet-100">
        <div className="flex items-end gap-3 h-32" role="img" aria-label="نمودار ستونی داده‌ها">
          {rows.map((r) => (
            <div key={r.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-violet-700">{toPersianDigits(r.value)}</span>
              <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-500 to-violet-300 transition-all duration-300 motion-reduce:transition-none"
                style={{ height: `${(r.value / max) * 80}%` }} />
              <span className="text-[10px] text-slate-500">{r.label}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {rows.map((r, i) => (
            <label key={r.label} className="text-[10px] text-center">
              {r.label}
              <input type="range" min={0} max={10} value={r.value} onChange={(e) => setVal(i, Number(e.target.value))} className="w-full accent-violet-600" aria-label={`مقدار ${r.label}`} />
            </label>
          ))}
        </div>
        <p className="text-sm mt-2" data-testid="mean-result">
          جمع: <strong>{toPersianDigits(total)}</strong> | میانگین: <strong className="text-violet-700">{toPersianDigits(mean.toFixed(1))}</strong>
          <span className="text-xs text-slate-500"> (جمع تقسیم بر تعداد)</span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <div className="bg-white rounded-xl p-3 border border-violet-100">
          <button type="button" onClick={flipCoin} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white motion-reduce:transition-none">۲۰ بار سکه بریز</button>
          {flips.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1" role="img" aria-label={`نتیجه ${toPersianDigits(heads)} رو و ${toPersianDigits(20 - heads)} پشت`}>
                {flips.map((f, i) => (
                  <span key={i} className={`w-5 h-5 rounded-full text-[9px] flex items-center justify-center text-white ${f ? 'bg-amber-500' : 'bg-slate-400'}`}>{f ? 'ر' : 'پ'}</span>
                ))}
              </div>
              <p className="text-xs mt-1" data-testid="coin-result">رو: {toPersianDigits(heads)} — پشت: {toPersianDigits(20 - heads)}</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl p-3 border border-violet-100">
          <button type="button" onClick={rollDice} className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-bold text-white motion-reduce:transition-none">۱۲ بار تاس بریز</button>
          {dice.length > 0 && (
            <div className="mt-2">
              <div className="flex flex-wrap gap-1" role="img" aria-label={`تعداد شش: ${toPersianDigits(sixes)} از ${toPersianDigits(12)}`}>
                {dice.map((d, i) => (
                  <span key={i} className={`w-6 h-6 rounded border text-[10px] flex items-center justify-center ${d === 6 ? 'border-emerald-500 bg-emerald-100 font-bold' : 'border-slate-300'}`}>{toPersianDigits(d)}</span>
                ))}
              </div>
              <p className="text-xs mt-1" data-testid="dice-result">شش آمد: {toPersianDigits(sixes)} بار — احتمال نظری هر بار ۱ از ۶ است.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
