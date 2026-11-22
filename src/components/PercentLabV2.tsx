import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

/** آزمایشگاه درصد — شبکه ۱۰۰ خانه + اسلایدر تخفیف + تبدیل‌ها */
export const PercentLabV2: React.FC = () => {
  const [pct, setPct] = useState(35);
  const [price, setPrice] = useState(200);
  const filled = Math.round((pct / 100) * 100);

  return (
    <div className="card p-5 my-4 border-r-4 border-r-amber-400" data-testid="percent-lab-v2">
      <h4 className="font-black text-amber-900 text-base mb-1">آزمایشگاه درصد — شبکه ۱۰۰ خانه‌ای و تخفیف</h4>
      <p className="text-xs text-amber-700 mb-3">درصد را جابه‌جا کن؛ خانه‌های رنگی همان اندازه از ۱۰۰ خانهٔ شبکه روشن می‌شوند.</p>

      <label className="block text-sm font-bold mb-1" htmlFor="pct-slider">درصد: ٪{toPersianDigits(pct)}</label>
      <input id="pct-slider" type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} className="w-full accent-amber-600" aria-label="درصد" />

      <div className="grid grid-cols-10 gap-1 bg-white p-3 rounded-xl border border-amber-100 mt-2" role="img" aria-label={`شبکه ۱۰۰ خانه‌ای با ${toPersianDigits(filled)} خانه رنگی`}>
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className={`aspect-square rounded-sm transition-colors duration-200 motion-reduce:transition-none ${i < filled ? 'bg-amber-400' : 'bg-slate-100'}`} />
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-3 text-sm bg-slate-50 rounded-xl p-3" data-testid="percent-conversions">
        <span>کسر: <strong className="text-emerald-700">٪{toPersianDigits(pct)} = {toPersianDigits(pct)}/۱۰۰</strong></span>
        <span>اعشار: <strong className="text-indigo-700">{toPersianDigits((pct / 100).toFixed(2)).replace('.', '/')}</strong></span>
      </div>

      <div className="bg-white rounded-xl p-3 mt-3 border border-amber-100">
        <label className="block text-xs mb-1" htmlFor="price-slider">قیمت: {toPersianDigits(price)} هزار تومان</label>
        <input id="price-slider" type="range" min={50} max={500} step={10} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-amber-600" aria-label="قیمت" />
        <p className="text-sm mt-1" data-testid="discount-result">
          با ٪{toPersianDigits(pct)} تخفیف: پرداخت <strong className="text-emerald-700">{toPersianDigits(Math.round((price * (100 - pct)) / 100))}</strong> — صرفه‌جویی <strong className="text-rose-700">{toPersianDigits(Math.round((price * pct) / 100))}</strong>
        </p>
      </div>
    </div>
  );
};
