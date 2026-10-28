import { ERROR_TAXONOMY } from './errorTaxonomy';
import type { MisconceptionCode, SkillDefinition, SkillState } from './types';

/**
 * دستیار آموزشی قاعده‌مند — نقش معلم خصوصی در محدوده مشخص.
 *
 * قواعد ایمنی (مأموریت §۱۰):
 * - ادعای قطعی درباره چیزی که در داده‌ها ندارد نمی‌کند (عدم اطمینان صریح).
 * - پاسخ نهایی را فوراً لو نمی‌دهد؛ راهنمایی تدریجی است.
 * - توضیح با محتوای معتبر مهارت (teachingSteps / representations) هماهنگ است.
 * - راهنمایی متناسب با وضعیت یادگیرنده است، نه یک پاسخ ثابت برای همه.
 * - بدون API خارجی؛ آینده: اتصال کنترل‌شده مدل زبانی پشت همین رابط.
 */

export type AssistantRequestKind =
  | 'simpler'           // ساده‌تر توضیح بده
  | 'other-example'     // مثال متفاوت بده
  | 'step-guide'        // راهنمایی مرحله‌ای
  | 'guiding-question'  // با سؤال هدایت کن
  | 'common-mistakes'   // اشتباه‌های احتمالی چیست؟
  | 'compare-methods'   // دو روش را مقایسه کن
  | 'challenge';        // مسئله چالشی بده

export interface AssistantReply {
  kind: AssistantRequestKind;
  text: string;
  /** اگر سامانه اطمینان ندارد صریح اعلام می‌شود */
  uncertain: boolean;
  /** پیشنهاد اقدام موتور (در صورت وجود) */
  suggestedAction?: string;
}

export interface AssistantContext {
  skill: SkillDefinition;
  state: SkillState;
  /** سوءبرداشت اخیر شناسایی‌شده (اختیاری) */
  recentError?: MisconceptionCode;
  /** نام دانش‌آموز برای لحن شخصی (اختیاری) */
  studentName?: string;
}

const REPRESENTATION_LABEL: Record<string, string> = {
  concrete: 'با اجسام ملموس (مثل برش میوه یا مکعب)',
  'visual-bars': 'با نوارهای کسری',
  'visual-area': 'با مدل مساحت و شکل رنگ‌شده',
  'number-line': 'روی خط اعداد',
  'place-value-table': 'با جدول ارزش مکانی',
  diagram: 'با شکل و نمودار',
  'coordinate-plane': 'روی صفحه مختصات',
  'ratio-table': 'با جدول تناسب',
  'bar-model': 'با مدل میله‌ای',
  symbolic: 'با نمادها و محاسبه رسمی',
};

function firstRepresentation(skill: SkillDefinition, exclude?: string): string | undefined {
  return skill.representations.find((r) => r !== exclude);
}

/**
 * پاسخ دستیار به درخواست یادگیرنده.
 * تابع خالص؛ همه پاسخ‌ها از داده معتبر مهارت تولید می‌شوند.
 */
export function assistantRespond(request: AssistantRequestKind, ctx: AssistantContext): AssistantReply {
  const { skill, state } = ctx;
  const steps = skill.teachingSteps;
  const totalAttempts = state.evidence.length;
  const dominant = ctx.recentError ?? state.dominantError;

  switch (request) {
    case 'simpler': {
      const rep = firstRepresentation(skill, 'symbolic');
      const repLabel = rep ? REPRESENTATION_LABEL[rep] ?? rep : 'با مثال ساده';
      return {
        kind: request,
        text: `بیا «${skill.title}» را ساده‌تر ببینیم: ${repLabel}. ${steps[0] ?? ''} اگر این بخش روشن شد، قدم بعدی را با هم برمی‌داریم.`,
        uncertain: false,
      };
    }

    case 'other-example': {
      const rep = skill.representations[1] ?? skill.representations[0];
      const repLabel = rep ? REPRESENTATION_LABEL[rep] ?? rep : 'با شیوه‌ای دیگر';
      return {
        kind: request,
        text: `همین مفهوم را این‌بار ${repLabel} بررسی می‌کنیم تا بین نمایش‌ها ارتباط بسازی. ${steps[Math.min(1, steps.length - 1)] ?? ''}`,
        uncertain: false,
      };
    }

    case 'step-guide': {
      const numbered = steps.map((s, i) => `${i + 1}. ${s}`).join(' ');
      return {
        kind: request,
        text: `راهنمای مرحله‌به‌مرحله «${skill.title}»: ${numbered} فعلاً فقط مرحله ۱ را انجام بده و بعد ادامه می‌دهیم.`,
        uncertain: false,
      };
    }

    case 'guiding-question': {
      // سؤال هدایتگر بر اساس وضعیت: اگر خطای غالب داریم به همان نقطه اشاره می‌کنیم
      const targetStep = dominant && dominant === 'operation-order' ? 1 : 0;
      const base = steps[targetStep] ?? steps[0] ?? '';
      if (totalAttempts === 0) {
        return {
          kind: request,
          text: `قبل از حل، خودت را بیازما: ${base} به نظرت اولین قدم در این مسئله چیست؟`,
          uncertain: false,
        };
      }
      return {
        kind: request,
        text: `یک پرسش برای هدایت فکرت: در ${base} — کدام داده مسئله به این قدم کمک می‌کند؟ اگر مطمئن نیستی، راهنمای مرحله‌ای را بخواه.`,
        uncertain: false,
      };
    }

    case 'common-mistakes': {
      if (dominant) {
        const info = ERROR_TAXONOMY[dominant];
        return {
          kind: request,
          text: `در کارنامه تو، مقوله «${info.label}» پرتکرارترین خطاست: ${info.description} راه اصلاح: ${info.remediation} این یک فرضیه بر اساس پاسخ‌های قبلی است، نه قطعیت.`,
          uncertain: true,
        };
      }
      return {
        kind: request,
        text: 'هنوز شواهد کافی برای تشخیص خطای خاص تو ندارم. با چند تمرین، الگوی خطاها مشخص می‌شود و راهنمای دقیق‌تری می‌دهم.',
        uncertain: true,
      };
    }

    case 'compare-methods': {
      if (steps.length >= 2) {
        return {
          kind: request,
          text: `دو مسیر برای این مفهوم: مسیر ۱ — ${steps[0]} مسیر ۲ — ${steps[steps.length - 1]} برای مسئله‌های ساده مسیر کوتاه‌تر راحت است؛ برای اعداد بزرگ معمولاً روش ساخت‌یافته کمتر اشتباه دارد. تو کدام را انتخاب می‌کنی و چرا؟`,
          uncertain: false,
        };
      }
      return {
        kind: request,
        text: 'برای این مهارت هنوز دو روش متفاوت در محتوای درس ثبت نشده است؛ فعلاً همان روش درس را با هم مرور کنیم.',
        uncertain: true,
      };
    }

    case 'challenge': {
      const strong =
        state.independentTotal >= 3 &&
        state.independentCorrect / Math.max(1, state.independentTotal) >= 0.8;
      if (!strong) {
        return {
          kind: request,
          text: 'برای مسئله چالشی اول باید پایه محکم شود؛ فعلاً با تمرین‌های سطح فعلی پیش برویم. بعد از چند موفقیت مستقل، چالش می‌دهم.',
          uncertain: false,
          suggestedAction: 'practice-same-level',
        };
      }
      return {
        kind: request,
        text: 'آماده چالشی! مسئله انتقالی با ظاهر متفاوت می‌گیرم؛ سعی کن روش را نه شکل مسئله را بشناسی.',
        uncertain: false,
        suggestedAction: 'transfer-assessment',
      };
    }
  }
}

/** پیام تشویقی متناسب با پیشرفت — بدون مقایسه با دیگران و بدون سازوکار اعتیادآور */
export function encouragingNote(state: SkillState): string {
  if (state.status === 'confirmed-mastery') {
    return 'این مهارت را با مرور تأخیری هم تأیید کردی؛ یادگیری‌ات ماندگار شده است.';
  }
  if (state.status === 'temporary-mastery') {
    return 'پیشرفت خوبی داری؛ فقط باید در مسئله‌های متفاوت و مرور بعدی هم نشان بدهی.';
  }
  if (state.evidence.length === 0) return 'هر وقت آماده بودی شروع کن؛ من قدم‌به‌قدم کنارم.';
  const recent = state.evidence.slice(-3);
  if (recent.every((e) => !e.isCorrect)) {
    return 'اشکالی ندارد؛ اشتباه بخشی از یادگیری است. با راهنمای مرحله‌ای دوباره امتحان می‌کنیم.';
  }
  return 'ادامه بده؛ با هر تمرین شواهد یادگیری‌ات کامل‌تر می‌شود.';
}
