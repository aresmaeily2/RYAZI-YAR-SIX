import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

/** آزمایشگاه نسبت — مدل اشیاء، جدول نسبت و خط دوگانه */
export const RatioLabV2: React.FC = () => {
  const [red, setRed] = useState(2);
  const [blue, setBlue] = useState(3);

  const rows = [1, 2, 3, 4, 5].map((k) => ({ k, r: red * k, b: blue * k }));

  return (
    <div className="card p-5 my-4 border-r-4 border-r-rose-400" data-testid="ratio-lab-v2">
      <h4 className="font-black text-rose-900 text-base mb-1">آزمایشگاه نسبت — مدل اشیاء و جدول نسبت</h4>
      <p className="text-xs text-rose-700 mb-3">تعداد مهره‌های قرمز و آبی را تغییر بده؛ نسبت همیشه {toPersianDigits(red)} به {toPersianDigits(blue)} می‌ماند، هرچقدر هم بزرگش کنی.</p>

      <div className="bg-white rounded-xl p-4 border border-rose-100 space-y-3">
        <div>
          <label className="block text-xs mb-1" htmlFor="ratio-red">قرمز: {toPersianDigits(red)}</label>
          <input id="ratio-red" type="range" min={1} max={6} value={red} onChange={(e) => setRed(Number(e.target.value))} className="w-full accent-rose-600" aria-label="تعداد قرمز" />
          <div className="flex flex-wrap gap-1 mt-1" role="img" aria-label={`${toPersianDigits(red)} مهره قرمز`}>
            {Array.from({ length: red }).map((_, i) => <span key={i} className="w-6 h-6 rounded-full bg-rose-500 border-2 border-rose-700" />)}
          </div>
        </div>
        <div>
          <label className="block text-xs mb-1" htmlFor="ratio-blue">آبی: {toPersianDigits(blue)}</label>
          <input id="ratio-blue" type="range" min={1} max={6} value={blue} onChange={(e) => setBlue(Number(e.target.value))} className="w-full accent-blue-600" aria-label="تعداد آبی" />
          <div className="flex flex-wrap gap-1 mt-1" role="img" aria-label={`${toPersianDigits(blue)} مهره آبی`}>
            {Array.from({ length: blue }).map((_, i) => <span key={i} className="w-6 h-6 rounded-full bg-blue-500 border-2 border-blue-700" />)}
          </div>
        </div>
      </div>

      <table className="w-full mt-3 text-sm bg-white rounded-xl border border-rose-100" data-testid="ratio-table">
        <thead><tr className="bg-rose-50"><th className="p-1.5">برابر</th><th>قرمز</th><th>آبی</th><th>نسبت</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k} className="border-t border-slate-100 text-center">
              <td className="p-1.5 font-bold">{toPersianDigits(r.k)}×</td>
              <td>{toPersianDigits(r.r)}</td>
              <td>{toPersianDigits(r.b)}</td>
              <td className="font-bold text-rose-700">{toPersianDigits(r.r)}:{toPersianDigits(r.b)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-600 mt-2">نسبت‌های مساوی: همه سطرها همان نسبت {toPersianDigits(red)}:{toPersianDigits(blue)} را دارند — نسبت مساوی، ضرب‌در عدد یکسان است.</p>
    </div>
  );
};
