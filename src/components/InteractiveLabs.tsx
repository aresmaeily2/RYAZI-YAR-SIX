import React, { useState } from 'react';
import { toPersianDigits, simplifyFraction } from '../utils/mathEngine';

/** آزمایشگاه مختصات و تقارن مرکزی — نمایش زنده قرینه نقطه نسبت به مبدأ */
export const CoordinateLab: React.FC = () => {
  const [x, setX] = useState<number>(3);
  const [y, setY] = useState<number>(2);
  const [rotated, setRotated] = useState<boolean>(false);

  const rx = rotated ? -x : x;
  const ry = rotated ? -y : y;

  return (
    <div className="card p-5 my-4 border-r-4 border-r-rose-400 animate-rise">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="font-black text-rose-900 text-base">آزمایشگاه تعاملی مختصات و تقارن مرکزی</h4>
          <p className="text-xs text-rose-700 mt-1">مختصات نقطهٔ A را تغییر دهید و قرینهٔ مرکزی آن (چرخش ۱۸۰ درجه حول مبدأ) را ببینید.</p>
        </div>
        <button
          type="button"
          onClick={() => setRotated(!rotated)}
          className="px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-base ease-spring shadow-soft"
        >
          {rotated ? 'بازگشت به نقطهٔ اصلی A' : 'اعمال دوران ۱۸۰ درجه (تقارن مرکزی)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="space-y-3 bg-white p-4 rounded-xl border border-rose-100">
          <label className="block text-sm font-medium text-slate-700" htmlFor="lab-x">
            طول نقطه (محور افقی): <span className="font-bold text-rose-600">{toPersianDigits(x)}</span>
            <input
              id="lab-x"
              type="range"
              min={-5}
              max={5}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
              className="w-full mt-1 accent-rose-600"
              aria-label="طول نقطه روی محور افقی"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700" htmlFor="lab-y">
            عرض نقطه (محور عمودی): <span className="font-bold text-rose-600">{toPersianDigits(y)}</span>
            <input
              id="lab-y"
              type="range"
              min={-5}
              max={5}
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
              className="w-full mt-1 accent-rose-600"
              aria-label="عرض نقطه روی محور عمودی"
            />
          </label>
          <div className="text-xs bg-slate-50 p-3 rounded-lg text-slate-700 space-y-1">
            <div>
              نقطه فعلی: <strong className="ltr-nums">({toPersianDigits(rx)}, {toPersianDigits(ry)})</strong>
            </div>
            <div>
              قرینه نسبت به مبدأ: <strong className="ltr-nums">({toPersianDigits(-x)}, {toPersianDigits(-y)})</strong>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <svg viewBox="-60 -60 120 120" className="w-56 h-56 bg-white rounded-xl border border-slate-200 shadow-inner" role="img" aria-label="نمودار دستگاه مختصات با نقطه و قرینه آن">
            <line x1="-55" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeWidth="1" />
            <line x1="0" y1="-55" x2="0" y2="55" stroke="#94a3b8" strokeWidth="1" />
            <line x1={x * 10} y1={-y * 10} x2={-x * 10} y2={y * 10} stroke="#fda4af" strokeDasharray="2,2" strokeWidth="1" />
            <circle cx={x * 10} cy={-y * 10} r="3.5" fill="#e11d48" />
            <circle cx={-x * 10} cy={y * 10} r="3.5" fill="#0284c7" opacity={rotated ? 1 : 0.45} />
            <circle cx="0" cy="0" r="2" fill="#334155" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/** آزمایشگاه بصری کسر — نمایش هندسی ساده‌سازی و معادل درصدی */
export const FractionLab: React.FC = () => {
  const [num, setNum] = useState(2);
  const [den, setDen] = useState(6);
  const simplified = simplifyFraction(num, den);
  const decimalVal = ((num / den) * 100).toFixed(1);

  return (
    <div className="card p-5 my-4 border-r-4 border-r-emerald-400 animate-rise">
      <h4 className="font-black text-emerald-900 text-base mb-1">آزمایشگاه بصری کسر، ساده‌سازی و درصد</h4>
      <p className="text-xs text-emerald-700 mb-4">صورت و مخرج را تغییر دهید تا شکل هندسی کسر و کسر ساده‌شده را ببینید.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-3">
          <label className="block text-sm" htmlFor="lab-num">
            صورت کسر: <strong>{toPersianDigits(num)}</strong>
            <input
              id="lab-num"
              type="range"
              min={1}
              max={den}
              value={Math.min(num, den)}
              onChange={(e) => setNum(Number(e.target.value))}
              className="w-full mt-1 accent-emerald-600"
              aria-label="صورت کسر"
            />
          </label>
          <label className="block text-sm" htmlFor="lab-den">
            مخرج کسر: <strong>{toPersianDigits(den)}</strong>
            <input
              id="lab-den"
              type="range"
              min={2}
              max={12}
              value={den}
              onChange={(e) => {
                const nextDen = Number(e.target.value);
                setDen(nextDen);
                if (num > nextDen) setNum(nextDen);
              }}
              className="w-full mt-1 accent-emerald-600"
              aria-label="مخرج کسر"
            />
          </label>
          <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg flex flex-wrap justify-between gap-2">
            <span>
              کسر ساده‌شده: <strong className="ltr-nums">{toPersianDigits(simplified.num)}/{toPersianDigits(simplified.den)}</strong>
            </span>
            <span>
              معادل درصدی: <strong>٪{toPersianDigits(decimalVal)}</strong>
            </span>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-emerald-100">
          <div className="grid grid-cols-6 gap-1.5" role="img" aria-label={`نمودار کسر با ${toPersianDigits(num)} قسمت رنگ‌شده از ${toPersianDigits(den)} قسمت`}>
            {Array.from({ length: den }).map((_, idx) => (
              <div
                key={idx}
                className={`h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold transition-all duration-base ease-spring ${
                  idx < num ? 'bg-gradient-to-br from-emerald-500 to-emerald-400 text-white border-emerald-600 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'
                }`}
              >
                {toPersianDigits(idx + 1)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/** آزمایشگاه حجم استوانه — مراحل محاسبه حجم به‌صورت زنده */
export const CylinderLab: React.FC = () => {
  const [radius, setRadius] = useState(4);
  const [height, setHeight] = useState(10);
  const baseArea = Number((radius * radius * 3.14).toFixed(2));
  const volume = Number((baseArea * height).toFixed(2));

  return (
    <div className="card p-5 my-4 border-r-4 border-r-cyan-400 animate-rise">
      <h4 className="font-black text-cyan-900 text-base mb-1">آزمایشگاه محاسبهٔ مساحت دایره و حجم استوانه</h4>
      <p className="text-xs text-cyan-700 mb-4">شعاع قاعده و ارتفاع استوانه را تغییر دهید و مراحل محاسبه حجم را مشاهده کنید.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-cyan-100 space-y-3">
          <label className="block text-sm" htmlFor="lab-r">
            شعاع قاعده: <strong>{toPersianDigits(radius)} سانتی‌متر</strong> (قطر = {toPersianDigits(radius * 2)})
            <input id="lab-r" type="range" min={1} max={10} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-full mt-1 accent-cyan-600" aria-label="شعاع قاعده استوانه" />
          </label>
          <label className="block text-sm" htmlFor="lab-h">
            ارتفاع استوانه: <strong>{toPersianDigits(height)} سانتی‌متر</strong>
            <input id="lab-h" type="range" min={2} max={20} value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full mt-1 accent-cyan-600" aria-label="ارتفاع استوانه" />
          </label>
        </div>
        <div className="bg-white p-4 rounded-xl border border-cyan-100 text-xs space-y-2 flex flex-col justify-center">
          <div>
            ۱. مساحت قاعده (دایره): <strong>{toPersianDigits(radius)} × {toPersianDigits(radius)} × ۳/۱۴ = {toPersianDigits(baseArea)}</strong>
          </div>
          <div>
            ۲. حجم استوانه: <strong>{toPersianDigits(baseArea)} × {toPersianDigits(height)} = {toPersianDigits(volume)} سی‌سی</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

/** شبیه‌ساز تخفیف — جدول تناسب و محاسبه مبلغ پرداختی */
export const PercentageLab: React.FC = () => {
  const [price, setPrice] = useState(200000);
  const [discount, setDiscount] = useState(20);
  const discountAmount = Math.round((price * discount) / 100);
  const finalPrice = price - discountAmount;

  return (
    <div className="card p-5 my-4 border-r-4 border-r-violet-400 animate-rise">
      <h4 className="font-black text-violet-900 text-base mb-1">شبیه‌ساز جدول تناسب و محاسبهٔ تخفیف</h4>
      <p className="text-xs text-violet-700 mb-3">قیمت کالا و درصد تخفیف را تغییر دهید و مبلغ تخفیف و مبلغ پرداختی را ببینید.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
        <div className="bg-white p-4 rounded-xl border border-violet-100 space-y-3">
          <label className="block text-sm" htmlFor="lab-price">
            قیمت اولیه کالا: <strong>{toPersianDigits(price.toLocaleString('en-US'))} تومان</strong>
            <input id="lab-price" type="range" min={50000} max={1000000} step={50000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full mt-1 accent-violet-600" aria-label="قیمت اولیه کالا" />
          </label>
          <label className="block text-sm" htmlFor="lab-disc">
            درصد تخفیف: <strong>٪{toPersianDigits(discount)}</strong>
            <input id="lab-disc" type="range" min={5} max={70} step={5} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} className="w-full mt-1 accent-violet-600" aria-label="درصد تخفیف" />
          </label>
        </div>
        <div className="bg-white p-4 rounded-xl border border-violet-100 text-xs space-y-2 flex flex-col justify-center">
          <div className="text-rose-600">
            مبلغ تخفیف ({toPersianDigits(discount)}٪): <strong>{toPersianDigits(discountAmount.toLocaleString('en-US'))} تومان</strong>
          </div>
          <div className="text-emerald-700 text-sm">
            مبلغ قابل پرداخت ({toPersianDigits(100 - discount)}٪): <strong>{toPersianDigits(finalPrice.toLocaleString('en-US'))} تومان</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
