import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SolverAnimationSpec } from '../learning/flowTypes';
import { Pause, Play, RotateCcw, SkipForward, AlertTriangle } from 'lucide-react';
import { toPersianDigits } from '../utils/mathEngine';

/**
 * انیمیشن آموزشی حل مرحله‌به‌مرحلهٔ یک عبارت ریاضی (موشن‌گرافیک هدفمند).
 * هر گام: برجسته‌سازی عمل فعال → نمایش عبارت پس از انجام آن → کپشن «چرا».
 * کنترل‌ها: پخش/توقف، گام بعد، بازپخش، سرعت (۰/۵× ۱× ۲×).
 * دسترس‌پذیری: با فعال‌بودن Reduced Motion پخش خودکار و پالس حرکتی غیرفعال
 * می‌شود و پیشروی فقط با دکمهٔ «گام بعد» (حرکت کنترل‌شده توسط کاربر) انجام می‌شود؛
 * تمام کنترل‌ها دکمهٔ واقعی و قابل‌استفاده با صفحه‌کلید هستند.
 */

const SPEEDS = [
  { value: 0.5, label: 'آهسته ۰/۵×' },
  { value: 1, label: 'معمولی ۱×' },
  { value: 2, label: 'سریع ۲×' },
] as const;

const STEP_DURATION_MS = 2400;

/** برجسته‌سازی زیررشتهٔ اولین رخداد highlight داخل expression */
function renderExpression(expression: string, highlight: string | undefined, pulsing: boolean) {
  if (!highlight || !expression.includes(highlight)) {
    return <span className="ltr-nums">{expression}</span>;
  }
  const idx = expression.indexOf(highlight);
  return (
    <span className="ltr-nums">
      {expression.slice(0, idx)}
      <mark
        className={`rounded-md bg-amber-200/90 px-1.5 text-slate-900 transition-colors ${pulsing ? 'animate-pulse motion-reduce:animate-none' : ''}`}
      >
        {highlight}
      </mark>
      {expression.slice(idx + highlight.length)}
    </span>
  );
}

export const StepSolverAnimation: React.FC<{ spec: SolverAnimationSpec }> = ({ spec }) => {
  const reducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);
  const [stepIdx, setStepIdx] = useState(0); // 0 = عبارت آغازین؛ n = پس از اجرای گام n
  const [playing, setPlaying] = useState(!reducedMotion);
  const [speed, setSpeed] = useState(1);
  const [showMistake, setShowMistake] = useState(false);
  const timerRef = useRef<number | null>(null);

  const totalSteps = spec.steps.length;
  const finished = stepIdx >= totalSteps;
  const currentExpression = stepIdx === 0 ? spec.expression : spec.steps[stepIdx - 1].expressionAfter;
  const nextStep = finished ? undefined : spec.steps[stepIdx];

  // پیشروی خودکار فقط با اجازهٔ کاربر (دکمهٔ پخش) و بدون Reduced Motion
  useEffect(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (!playing || reducedMotion || finished) return;
    timerRef.current = window.setTimeout(() => setStepIdx((i) => i + 1), STEP_DURATION_MS / speed);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [playing, speed, stepIdx, reducedMotion, finished]);

  const replay = () => {
    setStepIdx(0);
    setShowMistake(false);
    setPlaying(!reducedMotion);
  };

  return (
    <div
      className="rounded-2xl border-2 border-brand-200 bg-gradient-to-l from-brand-50/80 via-white to-violet-50/40 p-4 space-y-3 shadow-soft"
      data-testid="solver-animation"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-bold text-brand-700 bg-brand-100 rounded-full px-3 py-1.5 shadow-sm flex items-center gap-1">
          <Play className="w-3 h-3" aria-hidden="true" />
          انیمیشن حل مرحله‌به‌مرحله
        </span>
        <div className="flex items-center gap-1.5" role="group" aria-label="کنترل انیمیشن">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            disabled={finished || reducedMotion}
            className="p-2.5 rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white hover:from-brand-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-fast shadow-soft"
            aria-label={playing ? 'توقف انیمیشن' : 'پخش انیمیشن'}
            data-testid="anim-play"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              setPlaying(false);
              setStepIdx((i) => Math.min(i + 1, totalSteps));
            }}
            disabled={finished}
            className="p-2.5 rounded-xl bg-white border-2 border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-400 disabled:opacity-40 transition-all duration-fast"
            aria-label="گام بعد"
            data-testid="anim-next"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={replay}
            className="p-2.5 rounded-xl bg-white border-2 border-brand-200 text-brand-700 hover:bg-brand-50 hover:border-brand-400 transition-all duration-fast"
            aria-label="بازپخش از ابتدا"
            data-testid="anim-replay"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="text-[11px] font-bold rounded-xl border-2 border-brand-200 bg-white px-2 py-2 text-brand-700"
            aria-label="سرعت انیمیشن"
            data-testid="anim-speed"
          >
            {SPEEDS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* نمایش عبارت فعلی با برجسته‌سازی عمل فعال */}
      <div
        key={stepIdx}
        className={`solver-pop bg-white/90 backdrop-blur rounded-xl border-2 border-brand-100 py-5 text-center text-2xl font-black text-slate-900 tracking-wide shadow-soft`}
        dir="ltr"
        aria-live="polite"
        data-testid="anim-expression"
      >
        {renderExpression(currentExpression, nextStep?.highlight, playing && !reducedMotion)}
      </div>

      {/* نوار پیشرفت گام‌ها */}
      <div className="flex gap-1.5" role="progressbar" aria-valuenow={stepIdx} aria-valuemin={0} aria-valuemax={totalSteps}>
        {spec.steps.map((_, i) => (
          <div
            key={i}
            className={`h-2 flex-1 rounded-full transition-all duration-slow ease-glide ${i < stepIdx ? 'bg-gradient-to-l from-emerald-500 to-emerald-400' : 'bg-slate-200'}`}
          />
        ))}
      </div>

      {/* فهرست گام‌های اجراشده با کپشن آموزشی */}
      <ol className="space-y-1.5">
        {spec.steps.slice(0, stepIdx).map((st, i) => (
          <li
            key={i}
            className="solver-pop text-xs font-bold text-slate-700 bg-emerald-50/70 border border-emerald-100 rounded-lg px-3 py-2 flex items-center gap-2"
          >
            <span className="text-[10px] text-white bg-emerald-600 rounded-full w-5 h-5 flex items-center justify-center shrink-0" aria-hidden="true">
              {toPersianDigits(i + 1)}
            </span>
            <span>{st.caption}</span>
          </li>
        ))}
      </ol>

      {finished && (
        <div className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center gap-1.5 animate-pop">
          <span aria-hidden="true">✓</span>
          عبارت کامل حل شد: {spec.steps[totalSteps - 1].expressionAfter} — حالا خودت قبل از هر محاسبه عمل اول را پیدا کن.
        </div>
      )}

      {/* نمایش اشتباه رایج */}
      {spec.mistake && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowMistake((v) => !v)}
            className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-100 transition flex items-center gap-1.5"
            aria-expanded={showMistake}
            data-testid="anim-mistake-toggle"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {showMistake ? 'بستن اشتباه رایج' : 'اشتباه رایج را ببین'}
          </button>
          {showMistake && (
            <div className="solver-pop mt-2 rounded-xl border border-rose-200 bg-rose-50/80 p-3 space-y-2" data-testid="anim-mistake">
              <div className="text-xs font-bold text-rose-900 leading-relaxed">{spec.mistake.caption}</div>
              <div className="bg-white rounded-lg border border-rose-200 py-2.5 text-center text-lg font-extrabold text-rose-700" dir="ltr">
                {renderExpression(spec.mistake.expression, spec.mistake.highlight, false)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
