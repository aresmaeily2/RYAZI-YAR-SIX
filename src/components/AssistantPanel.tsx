import React, { useMemo, useState } from 'react';
import { assistantRespond, encouragingNote, type AssistantRequestKind } from '../learning/assistant';
import { actionLabel } from './DiagnosticDashboard';
import { skillForLesson } from '../learning/skills';
import type { SkillState } from '../learning/types';
import { toPersianDigits } from '../utils/mathEngine';
import { Bot, HelpCircle, Lightbulb, MessageCircleQuestion, Route, Sparkles, Scale, AlertTriangle, Trophy } from 'lucide-react';

/**
 * پنل دستیار آموزشی — معلم خصوصی قاعده‌مند در محدوده مشخص.
 * همه پاسخ‌ها از داده معتبر مهارت و وضعیت یادگیرنده تولید می‌شوند (بدون API خارجی)؛
 * در نبود شواهد کافی، عدم اطمینان صریح اعلام می‌شود و پاسخ نهایی لو داده نمی‌شود.
 */

export interface AssistantPanelProps {
  lessonId: string;
  skillState?: SkillState;
}

const ACTIONS: Array<{ kind: AssistantRequestKind; label: string; icon: React.ElementType }> = [
  { kind: 'simpler', label: 'ساده‌تر توضیح بده', icon: Lightbulb },
  { kind: 'other-example', label: 'مثال دیگری بده', icon: Sparkles },
  { kind: 'step-guide', label: 'راهنمای مرحله‌به‌مرحله', icon: Route },
  { kind: 'guiding-question', label: 'با سؤال هدایتم کن', icon: MessageCircleQuestion },
  { kind: 'common-mistakes', label: 'اشتباه‌های رایج من', icon: AlertTriangle },
  { kind: 'compare-methods', label: 'مقایسه دو روش', icon: Scale },
  { kind: 'challenge', label: 'مسئله چالشی می‌خواهم', icon: Trophy },
];

export const AssistantPanel: React.FC<AssistantPanelProps> = ({ lessonId, skillState }) => {
  const [replies, setReplies] = useState<AssistantRequestKind[]>([]);
  const skill = useMemo(() => skillForLesson(lessonId), [lessonId]);

  if (!skill) return null;

  const latestKind = replies[replies.length - 1];
  const latestReply = latestKind && skill ? assistantRespond(latestKind, { skill, state: skillState ?? fallbackState(latestKind) }) : null;

  return (
    <div className="bg-gradient-to-l from-slate-50 to-indigo-50/60 border border-indigo-200 rounded-2xl p-5 space-y-3" data-testid="assistant-panel">
      <div className="flex items-center gap-2">
        <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
          <Bot className="w-4.5 h-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-extrabold text-sm text-slate-900">دستیار آموزشی ریاضی‌یار</h3>
          <p className="text-[11px] text-slate-500">{encouragingNote(skillState ?? emptyEncouragingState())}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            type="button"
            onClick={() => setReplies((prev) => [...prev.slice(-4), kind])}
            aria-pressed={replies.includes(kind)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition ${
              latestKind === kind
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-indigo-700 border-indigo-200 hover:border-indigo-400'
            }`}
          >
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {latestReply && (
        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 text-xs leading-relaxed text-slate-700 space-y-1.5" data-testid="assistant-reply" aria-live="polite">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-700">
            <HelpCircle className="w-3.5 h-3.5" />
            پاسخ دستیار
          </div>
          {latestReply.text}
          {latestReply.uncertain && (
            <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">
              این پاسخ حدس قطعی نیست؛ بر اساس شواهد فعلی شما تنظیم شده است.
            </div>
          )}
          {latestReply.suggestedAction && (
            <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
              پیشنهاد موتور یادگیری: {actionLabel(latestReply.suggestedAction as never)}
            </div>
          )}
        </div>
      )}

      {replies.length > 1 && (
        <button type="button" onClick={() => setReplies([])} className="text-[11px] font-bold text-slate-400 hover:text-slate-600">
          پاک کردن گفتگو ({toPersianDigits(replies.length)} درخواست)
        </button>
      )}
    </div>
  );
};

/** وضعیت خالی برای مهارت‌های شروع‌نشده */
function fallbackState(_kind: AssistantRequestKind): SkillState {
  return {
    skillId: '',
    status: 'notstarted',
    evidence: [],
    independentCorrect: 0,
    independentTotal: 0,
    distinctIndependentSuccessProfiles: 0,
    transferPassed: false,
    delayedReviewPassed: false,
    prereqChecked: true,
    errorCounts: {},
    lastPracticedAt: null,
    nextReviewAt: null,
    reviewStage: 0,
    confidence: 0,
  };
}

function emptyEncouragingState(): SkillState {
  return fallbackState('simpler');
}
