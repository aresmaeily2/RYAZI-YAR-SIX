import React from 'react';
import { toPersianDigits } from '../utils/mathEngine';

export interface LessonSummaryData {
  concept: string;
  skill: string;
  explain: string;
  transfer: string;
  nextPath: string;
}

/** کارت جمع‌بندی پایان درس — چهار سنجش دستور + مسیر تمرین بعدی */
export const LessonSummaryCard: React.FC<{ data: LessonSummaryData; masteryPct: number }> = ({ data, masteryPct }) => {
  const next = masteryPct >= 80 ? data.nextPath : 'برای تثبیت مفهوم، همین درس را یک بار دیگر از «نمایش‌ها» تکرار کن و بعد به تمرین برگرد.';

  return (
    <div className="card p-5 my-4 border-r-4 border-r-emerald-500 bg-gradient-to-bl from-emerald-50 to-white" data-testid="lesson-summary">
      <h4 className="font-black text-emerald-900 text-base mb-2">جمع‌بندی درس — چه یاد گرفتی؟</h4>
      <ul className="space-y-2 text-sm text-slate-800">
        <li><span className="font-bold text-emerald-700">مفهوم: </span>{data.concept}</li>
        <li><span className="font-bold text-emerald-700">مهارت محاسباتی: </span>{data.skill}</li>
        <li><span className="font-bold text-emerald-700">توضیح روش حل: </span>{data.explain}</li>
        <li><span className="font-bold text-emerald-700">انتقال به مسئله جدید: </span>{data.transfer}</li>
      </ul>
      <div className="mt-3 rounded-xl bg-white border border-emerald-200 p-3" data-testid="next-path">
        <p className="text-sm font-bold text-slate-800">
          تسلط فعلی: ٪{toPersianDigits(Math.round(masteryPct))} — مسیر بعدی:
        </p>
        <p className="text-sm text-slate-700 mt-1">{next}</p>
      </div>
    </div>
  );
};
