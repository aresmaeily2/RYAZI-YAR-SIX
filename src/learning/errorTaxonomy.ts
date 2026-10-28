import type { McqQuestion, Question } from '../types/curriculum';
import type { MisconceptionCode } from './types';

/**
 * طبقه‌بندی خطاهای ریاضی (مطابق طبقه ده‌گانه مأموریت) با راهنمای اصلاح هر مقوله.
 * یک پاسخ غلط «مدرک قطعی» سوءبرداشت نیست؛ این طبقه‌بندی فرضیه تشخیصی است
 * و در صورت نبود شواهد کافی، سامانه باید سؤال تشخیصی بیشتری مطرح کند.
 */

export interface ErrorCategoryInfo {
  code: MisconceptionCode;
  label: string;
  description: string;
  /** راهنمای اصلاح برای دستیار آموزشی و بازخورد */
  remediation: string;
}

export const ERROR_TAXONOMY: Record<MisconceptionCode, ErrorCategoryInfo> = {
  calculation: {
    code: 'calculation',
    label: 'خطای محاسباتی',
    description: 'روش درست است اما محاسبه اشتباه انجام شده است.',
    remediation: 'محاسبه را گام‌به‌گام و آهسته تکرار کن؛ اعداد را با دقت بنویس و حاصل را با روش دیگری کنترل کن.',
  },
  conceptual: {
    code: 'conceptual',
    label: 'سوءبرداشت مفهومی',
    description: 'درک مفهوم ناقص یا نادرست است، نه فقط محاسبه.',
    remediation: 'مفهوم را با نمایش تصویری و مثال ملموس از نو بساز؛ از «چرا این روش کار می‌کند» بپرس.',
  },
  'place-value': {
    code: 'place-value',
    label: 'اشتباه در ارزش مکانی',
    description: 'جایگاه رقم‌ها نادرست در نظر گرفته شده است.',
    remediation: 'عدد را در جدول ارزش مکانی بنویس و جایگاه هر رقم را با صدای بلند نام ببر.',
  },
  'wrong-method-context': {
    code: 'wrong-method-context',
    label: 'روش درست در موقعیت نامناسب',
    description: 'روشی به‌کار رفته که در این موقعیت کاربرد ندارد.',
    remediation: 'قبل از حل، نوع مسئله را نام ببر؛ بپرس «این مسئله چه چیزی از من می‌خواهد؟» و بعد روش را انتخاب کن.',
  },
  'operation-order': {
    code: 'operation-order',
    label: 'خطا در ترتیب عملیات',
    description: 'ترتیب انجام عملیات رعایت نشده است.',
    remediation: 'اولویت عملیات (پرانتز، ضرب/تقسیم، جمع/تفریق) را روی عبارت علامت‌گذاری کن و بعد حل کن.',
  },
  'unit-conversion': {
    code: 'unit-conversion',
    label: 'ضعف در تبدیل واحد',
    description: 'واحدها نادرست تبدیل شده یا یکسان‌سازی نشده‌اند.',
    remediation: 'واحدها را بنویس و نسبت تبدیل را قبل از محاسبه مشخص کن؛ در واحدهای سطح، نسبت خطی را به توان ۲ برسان.',
  },
  'problem-reading': {
    code: 'problem-reading',
    label: 'برداشت نادرست از متن مسئله',
    description: 'صورت مسئله ناقص یا متفاوت از منظور خوانده شده است.',
    remediation: 'مسئله را یک بار بلند بخوان؛ داده‌ها و پرسش را در دو ستون جدا بنویس و بعد حل کن.',
  },
  'data-selection': {
    code: 'data-selection',
    label: 'خطا در انتخاب داده‌ها',
    description: 'داده‌های نامرتبط استفاده شده یا داده لازم نادیده گرفته شده است.',
    remediation: 'فهرست «داده‌های مسئله» و «چیزی که خواسته شده» را جدا کن و بعد انتخاب کن.',
  },
  'diagram-interpretation': {
    code: 'diagram-interpretation',
    label: 'ناتوانی در تفسیر شکل یا نمودار',
    description: 'خواندن شکل، نمودار یا دستگاه مختصات نادرست بوده است.',
    remediation: 'اجزای نمودار را نام‌گذاری کن (محورها، مقیاس، برچسب‌ها) و بعد مقدارها را بخوان.',
  },
  guessing: {
    code: 'guessing',
    label: 'پاسخ حدسی یا نامطمئن',
    description: 'شواهد کافی برای قضاوت وجود ندارد؛ پاسخ احتمالاً حدسی بوده است.',
    remediation: 'بدون فشار زمان، مسئله را با راهنمای اول دوباره بررسی کن؛ اشکالی ندارد که بگویی «نمی‌دانم».',
  },
};

const ALL_CODES = Object.keys(ERROR_TAXONOMY) as MisconceptionCode[];

/** نگاشت متن تشخیص سوءبرداشت داده‌های کتاب به مقوله استاندارد */
const DIAGNOSIS_KEYWORDS: Array<{ code: MisconceptionCode; patterns: RegExp[] }> = [
  { code: 'operation-order', patterns: [/اولویت عملیات/i, /قبل از ضرب/i, /ترتیب/i] },
  { code: 'place-value', patterns: [/ارزش مکانی/i, /جایگاه/i, /ممیز/i, /صفر/i, /جابه\u200cجایی مرتبه/i] },
  { code: 'unit-conversion', patterns: [/واحد/i, /تبدیل/i, /هکتار/i, /سی\u200cسی/i, /لیتر/i] },
  { code: 'wrong-method-context', patterns: [/معکوس/i, /متقابل/i, /به\u200cجای/i, /استفاده از روش/i, /گرد کردن به\u200cجای قطع/i, /قطع کردن به\u200cجای گرد/i] },
  { code: 'conceptual', patterns: [/مفهوم/i, /مخرج مشترک/i, /بدون مخرج/i, /کسر/i, /نسبت/i, /درصد/i, /قرینه/i, /تقارن/i, /مقایسه/i] },
  { code: 'problem-reading', patterns: [/صورت سؤال/i, /خواندن/i, /نادیده گرفتن شرط/i, /توجه/i, /کلمات کلیدی/i] },
  { code: 'data-selection', patterns: [/داده/i, /انتخاب مضرب/i, /شمارش/i] },
  { code: 'diagram-interpretation', patterns: [/نمودار/i, /شکل/i, /محور/i, /زاویه/i] },
  { code: 'calculation', patterns: [/محاسبه/i, /جمع کردن/i, /کم کردن/i, /ضرب/i, /تقسیم/i, /تفریق/i] },
];

/** نگاشت متن تشخیص کتاب به مقوله استاندارد؛ پیش‌فرض: conceptual */
export function mapDiagnosisTextToCode(diagnosis: string): MisconceptionCode {
  for (const entry of DIAGNOSIS_KEYWORDS) {
    if (entry.patterns.some((p) => p.test(diagnosis))) return entry.code;
  }
  return 'conceptual';
}

export interface ClassifyInput {
  /** پرسش مرتبط (اختیاری؛ برای توسعه آینده قواعد وابسته به نوع سؤال) */
  question?: Question;
  /** متن تشخیص سوءبرداشت (خروجی findMisconception) یا undefined */
  diagnosisText?: string;
  /** تعداد راهنمای استفاده‌شده در این تلاش */
  hintsUsed: number;
  /** آیا پاسخ خالی یا بسیار کوتاه بوده است */
  blankLike: boolean;
}

/**
 * تشخیص مقوله خطا برای یک پاسخ غلط.
 * اولویت: (۱) پاسخ حدسی/خالی، (۲) تشخیص مشخص کتاب برای گزینه انتخابی، (۳) پیش‌فرض مفهومی.
 * خروجی «فرضیه» است؛ در صورت تکرار باید با سؤال تشخیصی تأیید شود.
 */
export function classifyWrongAnswer(input: ClassifyInput): MisconceptionCode {
  if (input.blankLike) return 'guessing';
  if (input.hintsUsed >= 3) return 'guessing';
  if (input.diagnosisText) return mapDiagnosisTextToCode(input.diagnosisText);
  // برای پرسش عددی بدون تشخیص مشخص: اگر راهنما زیاد مصرف شده احتمال حدس بالا
  if (input.hintsUsed >= 2) return 'guessing';
  return 'conceptual';
}

/** برچسب فارسی مقوله خطا */
export function errorLabel(code: MisconceptionCode): string {
  return ERROR_TAXONOMY[code]?.label ?? code;
}

/** کدهای معتبر (برای اعتبارسنجی داده) */
export function allErrorCodes(): MisconceptionCode[] {
  return [...ALL_CODES];
}

/** یافتن مقوله غالب از شمارنده خطاها (برای داشبورد و والد) */
export function dominantError(counts: Partial<Record<MisconceptionCode, number>>): MisconceptionCode | undefined {
  let best: MisconceptionCode | undefined;
  let bestCount = 0;
  for (const code of ALL_CODES) {
    const c = counts[code] ?? 0;
    if (c > bestCount) {
      best = code;
      bestCount = c;
    }
  }
  return best;
}

/** بررسی اینکه گزینه انتخابی کاربر واقعاً یکی از گزینه‌های انحرافی دارای تشخیص است (MCQ) */
export function hasSpecificDiagnosis(q: Question, selected: string): string | undefined {
  if (q.type !== 'mcq') return undefined;
  const mcq = q as McqQuestion;
  const hit = mcq.misconceptions.find((m) => m.wrongOptionValue === selected);
  return hit?.diagnosis;
}
