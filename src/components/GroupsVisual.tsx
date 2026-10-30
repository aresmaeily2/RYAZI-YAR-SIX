import React from 'react';
import type { RepresentationVisual } from '../learning/flowTypes';

/**
 * نمایش بصری SVG «گروه‌های مساوی + اعضای اضافه» برای کارت‌های مرحلهٔ C.
 * هدف: تطبیق تصویر با عبارت ریاضی — دانش‌آموز شکلِ ۳×۴+۲ را می‌بیند و به عبارت
 * نمادین وصل می‌کند (حرکت CPA: از تصویر به نماد).
 * شکل صرفاً تزئینی نیست؛ نقطه‌گذاری‌ها همان عضوهای مسئله‌اند و دسته‌ها با
 * کادر و رنگ متمایز شده‌اند تا ساختار ضرب+جمع دیده شود.
 */

const GROUP_COLORS = ['bg-sky-100 border-sky-400', 'bg-violet-100 border-violet-400', 'bg-amber-100 border-amber-400', 'bg-emerald-100 border-emerald-400'];

export const GroupsVisual: React.FC<{ visual: RepresentationVisual }> = ({ visual }) => {
  const { groupCount, perGroup, extra, caption } = visual;
  if (groupCount < 1 || groupCount > 6 || perGroup < 1 || perGroup > 10 || extra < 0 || extra > 6) {
    // خارج از محدودهٔ خوانا؛ رندر نمی‌شود (کارت متن خودش را دارد)
    return null;
  }
  const dot = (key: string) => (
    <span key={key} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-indigo-500 inline-block" aria-hidden="true" />
  );

  return (
    <figure className="mt-2" data-testid="groups-visual">
      <div className="flex flex-wrap items-start gap-2" dir="ltr" role="img" aria-label={caption}>
        {Array.from({ length: groupCount }, (_, g) => (
          <div
            key={`g${g}`}
            className={`rounded-xl border-2 border-dashed p-2 grid gap-1.5 ${GROUP_COLORS[g % GROUP_COLORS.length]}`}
            style={{ gridTemplateColumns: `repeat(${Math.min(perGroup, 5)}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: perGroup }, (_, i) => dot(`g${g}i${i}`))}
          </div>
        ))}
        {extra > 0 && (
          <div className="rounded-xl border-2 border-dashed border-rose-300 bg-rose-50 p-2 grid gap-1.5 content-start" style={{ gridTemplateColumns: `repeat(${Math.min(extra, 3)}, minmax(0, 1fr))` }}>
            {Array.from({ length: extra }, (_, i) => dot(`e${i}`))}
          </div>
        )}
      </div>
      <figcaption className="text-[11px] text-slate-500 font-bold mt-1.5">{caption}</figcaption>
    </figure>
  );
};
