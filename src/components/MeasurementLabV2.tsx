import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

/** آزمایشگاه اندازه‌گیری — خط‌کش تعاملی و مدل حجم زنده */
export const MeasurementLabV2: React.FC = () => {
  const [len, setLen] = useState(6);
  const [width, setWidth] = useState(3);
  const [height, setHeight] = useState(2);

  const unitPx = 24;
  const depth = 3; // عمق ثابت برای نمایش حجم

  return (
    <div className="card p-5 my-4 border-r-4 border-r-teal-400" data-testid="measurement-lab-v2">
      <h4 className="font-black text-teal-900 text-base mb-1">آزمایشگاه اندازه‌گیری — خط‌کش و حجم زنده</h4>
      <p className="text-xs text-teal-700 mb-3">جسم را روی خط‌کش بگذار و اندازه‌اش را بخوان؛ بعد ابعاد مکعب‌مستطیل را تغییر بده و اثرش روی حجم را ببین.</p>

      <div className="bg-white rounded-xl p-3 border border-teal-100 mb-3">
        <p className="text-xs font-bold mb-1">خط‌کش — جسم از ۰ تا {toPersianDigits(len)} سانتی‌متر:</p>
        <svg viewBox={`0 0 ${10 * unitPx + 20} 64`} className="w-full" role="img" aria-label={`خط‌کش با جسم ${toPersianDigits(len)} سانتی‌متری`}>
          <rect x="10" y="20" width={10 * unitPx} height="20" fill="#fef3c7" stroke="#d97706" rx="3" />
          {Array.from({ length: 10 }).map((_, i) => (
            <g key={i}>
              <line x1={10 + i * unitPx} y1="20" x2={10 + i * unitPx} y2={i % 5 === 0 ? '12' : '16'} stroke="#92400e" strokeWidth={i % 5 === 0 ? 2 : 1} />
              {i > 0 && <text x={10 + i * unitPx} y="54" textAnchor="middle" fontSize="10" fill="#78350f">{toPersianDigits(i)}</text>}
            </g>
          ))}
          <rect x="10" y="24" width={len * unitPx} height="12" fill="#14b8a6" opacity="0.8" rx="2" />
          <text x={10 + len * unitPx} y="12" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0f766e">{toPersianDigits(len)}cm</text>
        </svg>
        <input type="range" min={1} max={10} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full accent-teal-600" aria-label="طول جسم" />
        <p className="text-xs text-slate-500">تغییر واحد: {toPersianDigits(len)} سانتی‌متر = {toPersianDigits((len / 10).toFixed(1))} دسی‌متر</p>
      </div>

      <div className="bg-white rounded-xl p-3 border border-teal-100">
        <p className="text-xs font-bold mb-2">مدل حجم — مکعب‌مستطیل:</p>
        <div className="flex items-end gap-3">
          <div className="relative" style={{ width: len * 8, height: height * 16 }} role="img" aria-label={`مکعب‌مستطیل ${toPersianDigits(len)}×${toPersianDigits(width)}×${toPersianDigits(height)}`}>
            {Array.from({ length: depth }).map((_, d) => (
              <div key={d} className="absolute rounded border-2 border-teal-500 bg-teal-100"
                style={{ left: d * 8, bottom: d * 6, width: len * 8, height: height * 16, opacity: 1 - d * 0.25 }} />
            ))}
          </div>
          <div className="text-sm" data-testid="volume-result">
            <p>حجم = <strong className="text-teal-700">{toPersianDigits(len * width * height)}</strong> مکعب واحد</p>
            <p className="text-xs text-slate-500 mt-1">{toPersianDigits(len)} × {toPersianDigits(width)} × {toPersianDigits(height)}</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          <label className="text-xs">طول<input type="range" min={1} max={8} value={len} onChange={(e) => setLen(Number(e.target.value))} className="w-full accent-teal-600" aria-label="طول مکعب" /></label>
          <label className="text-xs">عرض<input type="range" min={1} max={5} value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full accent-teal-600" aria-label="عرض مکعب" /></label>
          <label className="text-xs">ارتفاع<input type="range" min={1} max={4} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full accent-teal-600" aria-label="ارتفاع مکعب" /></label>
        </div>
      </div>
    </div>
  );
};
