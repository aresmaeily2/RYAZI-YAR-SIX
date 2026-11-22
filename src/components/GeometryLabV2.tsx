import React, { useState } from 'react';
import { toPersianDigits } from '../utils/mathEngine';

/** آزمایشگاه هندسه — محیط/مساحت زنده، تقارن و مختصات */
export const GeometryLabV2: React.FC = () => {
  const [w, setW] = useState(6);
  const [h, setH] = useState(4);
  const [showSymmetry, setShowSymmetry] = useState(true);

  const scale = 22; // پیکسل به ازای هر واحد

  return (
    <div className="card p-5 my-4 border-r-4 border-r-sky-400" data-testid="geometry-lab-v2">
      <h4 className="font-black text-sky-900 text-base mb-1">آزمایشگاه هندسه — محیط و مساحت زنده</h4>
      <p className="text-xs text-sky-700 mb-3">طول و عرض مستطیل را تغییر بده؛ شکل، خانه‌های مساحت و محیط با هم تغییر می‌کنند.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-3 border border-sky-100">
          <svg viewBox="0 0 220 160" className="w-full" role="img" aria-label={`مستطیل ${toPersianDigits(w)} در ${toPersianDigits(h)}`}>
            {Array.from({ length: w }).map((_, i) =>
              Array.from({ length: h }).map((_, j) => (
                <rect key={`${i}-${j}`} x={10 + i * scale} y={150 - h * scale + j * scale} width={scale} height={scale}
                  fill={showSymmetry && i === j ? '#7dd3fc' : '#e0f2fe'} stroke="#38bdf8" strokeWidth="0.5" />
              )),
            )}
            <rect x="10" y={150 - h * scale} width={w * scale} height={h * scale} fill="none" stroke="#0369a1" strokeWidth="2.5" />
            {showSymmetry && <line x1="10" y1={150 - (h * scale) / 2} x2={10 + w * scale} y2={150 - (h * scale) / 2} stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 3" />}
          </svg>
          <label className="flex items-center gap-2 text-xs mt-1">
            <input type="checkbox" checked={showSymmetry} onChange={(e) => setShowSymmetry(e.target.checked)} aria-label="نمایش خط تقارن" />
            نمایش خط تقارن
          </label>
        </div>
        <div className="space-y-3">
          <label className="block text-xs" htmlFor="gw">طول: {toPersianDigits(w)}</label>
          <input id="gw" type="range" min={1} max={9} value={w} onChange={(e) => setW(Number(e.target.value))} className="w-full accent-sky-600" aria-label="طول" />
          <label className="block text-xs" htmlFor="gh">عرض: {toPersianDigits(h)}</label>
          <input id="gh" type="range" min={1} max={6} value={h} onChange={(e) => setH(Number(e.target.value))} className="w-full accent-sky-600" aria-label="عرض" />
          <div className="bg-slate-50 rounded-xl p-3 text-sm space-y-1" data-testid="geometry-results">
            <p>محیط: <strong className="text-sky-700">{toPersianDigits(2 * (w + h))}</strong> واحد</p>
            <p>مساحت: <strong className="text-emerald-700">{toPersianDigits(w * h)}</strong> خانه</p>
            <p className="text-xs text-slate-500">هر خانه یک مربع واحد است؛ مساحت = شمردن خانه‌ها = طول × عرض.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
