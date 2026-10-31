import React, { useMemo } from 'react';
import { SKILLS, SKILL_BY_ID } from '../learning/skills';
import { skillStatusLabel } from '../learning/builder';
import { decideForSkill } from '../learning/engine';
import { dueSkillIds, reviewDueLabel } from '../learning/review';
import { computeEffectivenessMetrics, aggregateErrorCounts } from '../learning/metrics';
import { ERROR_TAXONOMY, mapDiagnosisTextToCode } from '../learning/errorTaxonomy';
import type { SkillState, NextStepAction } from '../learning/types';
import type { AttemptRecord } from '../types/curriculum';
import { toPersianDigits } from '../utils/mathEngine';
import { AlertTriangle, ArrowLeft, CalendarClock, ShieldCheck, TrendingUp } from 'lucide-react';

/**
 * داشبورد تشخیصی یادگیری — به‌جای نمایش صرف امتیاز، به چهار پرسش کلیدی پاسخ می‌دهد:
 * چه یاد گرفته‌ام؟ کجا نیاز به تمرین دارم؟ کدام مرورها سررسید شده‌اند؟ گام بعدی چیست؟
 * بدون مقایسه تحقیرآمیز، رتبه‌بندی و سازوکار اعتیادآور.
 */

export interface DiagnosticDashboardProps {
  skillStates: Record<string, SkillState>;
  attempts: AttemptRecord[];
  completedLessonCount: number;
  totalLessons: number;
  onOpenSkill: (lessonId: string) => void;
}

/** برچسب فارسی اقدام موتور برای نمایش به دانش‌آموز */
export function actionLabel(action: NextStepAction): string {
  switch (action) {
    case 'prerequisite-check':
      return 'سنجش پیش‌نیاز';
    case 'intuitive-intro':
      return 'شروع درک شهودی مفهوم';
    case 'continue-teaching':
      return 'ادامه آموزش';
    case 'alternative-representation':
      return 'نمایش متفاوت مفهوم';
    case 'guided-practice':
      return 'تمرین با راهنمای مرحله‌ای';
    case 'review-prerequisite':
      return 'مرور پیش‌نیاز';
    case 'practice-same-level':
      return 'تمرین همان سطح';
    case 'easier-practice':
      return 'تمرین ساده‌تر';
    case 'harder-practice':
      return 'مسئله دشوارتر';
    case 'mixed-review':
      return 'مرور ترکیبی';
    case 'independent-assessment':
      return 'ارزیابی مستقل';
    case 'transfer-assessment':
      return 'سنجش انتقال';
    case 'schedule-review':
      return 'مرور برنامه‌ریزی‌شده';
    case 'maintain-mastery':
      return 'حفظ تسلط با مرور';
  }
}

/** انتخاب «مهم‌ترین» مهارت برای کارت گام بعدی:
 *  اولویت: مرور سررسید ← در حال یادگیری ← نخستین مهارت شروع‌نشده با پیش‌نیاز آماده */
export function pickPrioritySkillId(
  states: Record<string, SkillState>,
  now: number
): string | null {
  const due = dueSkillIds(states, now);
  if (due.length > 0) return due[0];
  const learning = SKILLS.find((s) => {
    const st = states[s.id];
    return st && st.status === 'learning' && st.evidence.length > 0;
  });
  if (learning) return learning.id;
  const nextFresh = SKILLS.find((s) => {
    const st = states[s.id];
    if (!st || st.evidence.length > 0) return false;
    // پیش‌نیازها یا نداریم یا شواهدشان کافی است
    return s.prerequisites.every((p) => (states[p]?.evidence.length ?? 0) === 0 || (states[p]?.status === 'temporary-mastery' || states[p]?.status === 'confirmed-mastery' || (states[p]?.independentTotal ?? 0) >= 2));
  });
  return nextFresh?.id ?? SKILLS[0]?.id ?? null;
}

const pct = (x: number): string => `٪${toPersianDigits(Math.round(x * 100))}`;

export const DiagnosticDashboard: React.FC<DiagnosticDashboardProps> = ({
  skillStates,
  attempts,
  completedLessonCount,
  totalLessons,
  onOpenSkill,
}) => {
  const now = Date.now();

  const prioritySkillId = useMemo(() => pickPrioritySkillId(skillStates, now), [skillStates, now]);
  const priorityDecision = useMemo(
    () => (prioritySkillId ? decideForSkill(prioritySkillId, skillStates, now) : null),
    [prioritySkillId, skillStates, now]
  );
  const prioritySkill = prioritySkillId ? SKILL_BY_ID.get(prioritySkillId) : undefined;

  const due = useMemo(() => dueSkillIds(skillStates, now), [skillStates, now]);

  const statusGroups = useMemo(() => {
    const groups: Record<string, string[]> = {
      'confirmed-mastery': [],
      'temporary-mastery': [],
      learning: [],
      needspractice: [],
      'notstarted': [],
    };
    for (const s of SKILLS) {
      const st = skillStates[s.id];
      if (!st) continue;
      if (st.status === 'confirmed-mastery') groups['confirmed-mastery'].push(s.id);
      else if (st.status === 'temporary-mastery') groups['temporary-mastery'].push(s.id);
      else if (st.status === 'learning') groups.learning.push(s.id);
      else if (st.status === 'needspractice' || st.status === 'needsreview' || st.status === 'prereq-check-needed') groups.needspractice.push(s.id);
      else groups['notstarted'].push(s.id);
    }
    return groups;
  }, [skillStates]);

  const metrics = useMemo(() => computeEffectivenessMetrics(attempts), [attempts]);
  const errorsAgg = useMemo(
    () => aggregateErrorCounts(attempts, mapDiagnosisTextToCode),
    [attempts]
  );
  const topErrors = useMemo(
    () =>
      Object.entries(errorsAgg)
        .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
        .slice(0, 3)
        .map(([code, count]) => ({ info: ERROR_TAXONOMY[code as keyof typeof ERROR_TAXONOMY], count: count ?? 0 })),
    [errorsAgg]
  );

  return (
    <div className="space-y-5" data-testid="diagnostic-dashboard">
      {/* ===== کارت گام پیشنهادی بعدی ===== */}
      {prioritySkill && priorityDecision && priorityDecision.action !== 'maintain-mastery' && (
        <div className="relative overflow-hidden bg-gradient-to-l from-emerald-700 to-emerald-600 text-white rounded-3xl p-5 shadow-lift" data-testid="next-step-card">
          <span className="absolute -top-8 left-10 w-28 h-28 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
          <div className="relative flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1 min-w-60">
              <div className="text-xs font-bold text-emerald-100 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                گام پیشنهادی بعدی برای تو
              </div>
              <h3 className="font-black text-lg mt-1.5">{prioritySkill.title}</h3>
              <p className="text-xs text-emerald-50 mt-1.5 leading-relaxed">
                {actionLabel(priorityDecision.action)} — {priorityDecision.reason}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenSkill(prioritySkill.lessonId)}
              className="px-5 py-2.5 rounded-xl bg-white text-emerald-700 text-xs font-black hover:bg-emerald-50 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-base ease-spring shadow-lift flex items-center gap-1.5"
            >
              شروع
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ===== وضعیت مهارت‌ها ===== */}
        <div className="card p-5 space-y-3">
          <h3 className="font-black text-sm text-slate-900">چه یاد گرفته‌ای و کجا نیاز به تمرین داری؟</h3>
          <div className="grid grid-cols-2 gap-2 text-xs" data-testid="status-groups">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 shadow-soft">
              <div className="font-black text-emerald-800">{toPersianDigits(statusGroups['confirmed-mastery'].length)} تسلط تأییدشده</div>
              <div className="text-emerald-700 mt-0.5">با مرور تأخیری موفق</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 shadow-soft">
              <div className="font-black text-sky-800">{toPersianDigits(statusGroups['temporary-mastery'].length)} تسلط موقت</div>
              <div className="text-sky-700 mt-0.5">نیازمند انتقال و مرور</div>
            </div>
            <div className="bg-brand-50 border border-brand-200 rounded-xl p-3 shadow-soft">
              <div className="font-black text-brand-800">{toPersianDigits(statusGroups.learning.length)} در حال یادگیری</div>
              <div className="text-brand-700 mt-0.5">مسیر ادامه دارد</div>
            </div>
            <div className="bg-sun-50 border border-sun-200 rounded-xl p-3 shadow-soft">
              <div className="font-black text-sun-700">{toPersianDigits(statusGroups.needspractice.length)} نیازمند تمرین</div>
              <div className="text-sun-600 mt-0.5">پایه‌ها را محکم کنیم</div>
            </div>
          </div>
          <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            پیشرفت واقعی: {toPersianDigits(completedLessonCount)} درس از {toPersianDigits(totalLessons)} درس کتاب — تسلط با معیار چندشرطی (دقت مستقل + تنوع + انتقال + مرور تأخیری) سنجیده می‌شود، نه درصد خام.
          </div>
        </div>

        {/* ===== مرورهای سررسید ===== */}
        <div className="card p-5 space-y-3">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-lg bg-violet-100 flex items-center justify-center" aria-hidden="true"><CalendarClock className="w-4 h-4 text-violet-600" /></span>
            مرورهای فاصله‌دار
          </h3>
          {due.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              مرور سررسیدشده‌ای نداری. پس از هر تمرین، برنامه مرور بعدی به‌طور خودکار تنظیم می‌شود (۱، ۳، ۷ و ۱۴ روز — بر اساس عملکردت).
            </p>
          ) : (
            <ul className="space-y-2" data-testid="due-reviews">
              {due.slice(0, 4).map((id) => {
                const skill = SKILL_BY_ID.get(id);
                const st = skillStates[id];
                return (
                  <li key={id} className="flex items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-rose-900">{skill?.title ?? id}</span>
                    <span className="text-[11px] font-bold text-rose-700 whitespace-nowrap">{reviewDueLabel(st?.nextReviewAt ?? null, now)}</span>
                    <button
                      type="button"
                      onClick={() => skill && onOpenSkill(skill.lessonId)}
                      className="text-[11px] font-bold text-rose-800 hover:underline"
                    >
                      مرور کن
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            مرور تأخیری شرط «تسلط تأییدشده» است؛ موفقیت در یک آزمون کوتاه به‌تنهایی تسلط پایدار ثبت نمی‌شود.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ===== خطاهای پرتکرار ===== */}
        <div className="card p-5 space-y-3">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-lg bg-sun-100 flex items-center justify-center" aria-hidden="true"><AlertTriangle className="w-4 h-4 text-sun-600" /></span>
            الگوی خطاهای تو
          </h3>
          {topErrors.length === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">
              هنوز الگوی خطای مشخصی ثبت نشده است. با حل تمرین‌ها، تحلیل هوشمند خطاها اینجا نمایش داده می‌شود.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {topErrors.map(({ info, count }) => (
                <li key={info.code} className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-amber-900">{info.label}</span>
                    <span className="text-[11px] font-bold text-amber-700">{toPersianDigits(count)} بار</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">راه اصلاح: {info.remediation}</p>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            یک پاسخ غلط مدرک قطعی سوءبرداشت نیست؛ این تحلیل فرضیه تشخیصی است و با سؤال‌های تشخیصی بیشتر دقیق‌تر می‌شود.
          </p>
        </div>

        {/* ===== سنجه‌های اثربخشی ===== */}
        <div className="card p-5 space-y-3">
          <h3 className="font-black text-sm text-slate-900 flex items-center gap-1.5">
            <span className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center" aria-hidden="true"><ShieldCheck className="w-4 h-4 text-teal-600" /></span>
            سنجه‌های اثربخشی یادگیری
          </h3>
          {metrics.totalAttempts === 0 ? (
            <p className="text-xs text-slate-500 leading-relaxed">پس از نخستین تمرین‌ها، سنجه‌های یادگیری اینجا محاسبه می‌شود.</p>
          ) : (
            <div className="space-y-2 text-xs" data-testid="metrics">
              <MetricRow label="دقت مستقل (بدون راهنما)" value={pct(metrics.independentAccuracy)} />
              <MetricRow label="میزان وابستگی به راهنما" value={pct(metrics.hintRelianceRate)} lowerIsBetter />
              <MetricRow label="نرخ تکرار خطای قبلی" value={pct(metrics.errorRepetitionRate)} lowerIsBetter />
              {metrics.transferSuccessRate !== null && (
                <MetricRow label="موفقیت در سنجش انتقال" value={pct(metrics.transferSuccessRate)} />
              )}
              {metrics.delayedReviewSuccessRate !== null && (
                <MetricRow label="موفقیت در مرور تأخیری" value={pct(metrics.delayedReviewSuccessRate)} />
              )}
            </div>
          )}
          {metrics.smallSample && metrics.totalAttempts > 0 && (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 leading-relaxed">
              نمونه هنوز کوچک است ({toPersianDigits(metrics.totalAttempts)} تلاش)؛ این اعداد را با احتیاط تفسیر کن.
            </p>
          )}
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
            آزمون فوری و آزمون تأخیری جدا محاسبه می‌شوند؛ بهبود در همان تمرین، اثبات یادگیری ماندگار نیست.
          </p>
        </div>
      </div>
    </div>
  );
};

const MetricRow: React.FC<{ label: string; value: string; lowerIsBetter?: boolean }> = ({ label, value, lowerIsBetter }) => (
  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 transition-colors duration-fast hover:bg-slate-100/70">
    <span className="text-slate-600 font-medium">{label}</span>
    <span className={`font-black ${lowerIsBetter ? 'text-sun-700' : 'text-teal-700'}`}>{value}</span>
  </div>
);

/** فهرست کامل وضعیت مهارت‌ها (برای گزارش والد) */
export const ParentSkillReport: React.FC<{ skillStates: Record<string, SkillState> }> = ({ skillStates }) => {
  const rows = SKILLS.map((s) => ({ skill: s, state: skillStates[s.id] }));
  return (
    <div className="overflow-x-auto" data-testid="parent-skill-report">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-slate-500 border-b-2 border-slate-200 bg-slate-50 rounded-lg">
            <th className="text-right py-2.5 px-2.5 font-black">مهارت</th>
            <th className="text-right py-2.5 px-2.5 font-black">وضعیت</th>
            <th className="text-right py-2.5 px-2.5 font-black">اطمینان سامانه</th>
            <th className="text-right py-2.5 px-2.5 font-black">مرور بعدی</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ skill, state }) => (
            <tr key={skill.id} className="border-b border-slate-100 transition-colors duration-fast hover:bg-brand-50/40">
              <td className="py-2 px-2 font-bold text-slate-800">{skill.title}</td>
              <td className="py-2 px-2 text-slate-600">{state ? skillStatusLabel(state.status) : '—'}</td>
              <td className="py-2 px-2 text-slate-600">{state ? `٪${toPersianDigits(Math.round(state.confidence * 100))}` : '—'}</td>
              <td className="py-2 px-2 text-slate-600">{state ? reviewDueLabel(state.nextReviewAt, Date.now()) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
