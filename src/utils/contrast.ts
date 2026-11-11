/**
 * contrast.ts — ابزار WCAG 2.1 برای مأموریت RC1.1 بخش ۱
 * جدول زوج‌های رنگی واقعی UI (تون‌های استفاده‌شده در کامپوننت‌ها) به‌عنوان
 * قرارداد؛ تست رگرسیون باید همیشه سبز بماند.
 */

export function relativeLuminance(hex: string): number {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255);
  const f = (u: number) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: string, b: string): number {
  const [L1, L2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
}

/** پالت پروژه — از tailwind.config.js (منبع واحد حقیقت) */
export const TOKENS = {
  white: '#ffffff',
  'brand-500': '#6366f1',
  'brand-600': '#4f46e5',
  'brand-700': '#4338ca',
  'violet-600': '#7c3aed',
  'slate-100': '#f1f5f9',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'sun-50': '#fffbEB'.toLowerCase(),
  'sun-100': '#fef3c7',
  'sun-600': '#d97706',
  'sun-700': '#b45309',
  'emerald-50': '#ecfdf5',
  'emerald-100': '#d1fae5',
  'emerald-700': '#047857',
  'emerald-800': '#065f46',
  'brand-100': '#e0e7ff',
  'brand-800': '#3730a3',
} as const;

export type ContrastCase = {
  id: string;
  fg: keyof typeof TOKENS;
  bg: keyof typeof TOKENS | Array<keyof typeof TOKENS>;
  /** بزرگ = ۳٫۰؛ معمولی = ۴٫۵؛ غیرمتنی = ۳٫۰ */
  min: number;
  note?: string;
};

/**
 * زوج‌های واقعی UI بعد از اصلاحات RC1.1 — هر زوج = یک رگرسیون.
 * گرادیان‌ها با بدترین stop سنجیده می‌شوند (کران سخت‌گیرانه، نه میانگین).
 */
export const CONTRAST_CASES: ContrastCase[] = [
  // متن معمولی روی سطوح روشن
  { id: 'prompt-slate900-on-white', fg: 'slate-900', bg: 'white', min: 4.5 },
  { id: 'option-value-slate800-on-white', fg: 'slate-800', bg: 'white', min: 4.5 },
  { id: 'hint-sun700-on-sun50', fg: 'sun-700', bg: 'sun-50', min: 4.5, note: 'دکمهٔ راهنما بعد از اصلاح' },
  { id: 'hint-sun700-on-sun100', fg: 'sun-700', bg: 'sun-100', min: 4.5, note: 'حالت hover راهنما' },
  { id: 'dashboard-sub-sun700-on-sun50', fg: 'sun-700', bg: 'sun-50', min: 4.5 },
  { id: 'small-meta-slate500-on-white', fg: 'slate-500', bg: 'white', min: 4.5, note: 'متادیتای ۱۱px بعد از اصلاح' },
  { id: 'option-badge-slate600-on-slate100', fg: 'slate-600', bg: 'slate-100', min: 4.5, note: 'badge شماره گزینه بعد از اصلاح' },
  { id: 'inactive-tab-slate600-on-slate100', fg: 'slate-600', bg: 'slate-100', min: 4.5 },
  // متن بزرگ (≥18.66px bold یا ≥24px) — حد ۳٫۰
  { id: 'hero-large-white-on-brand600-worststop', fg: 'white', bg: 'brand-600', min: 3.0, note: 'گرادیان hero — بدترین stop' },
  { id: 'hero-large-white-on-violet600-worststop', fg: 'white', bg: 'violet-600', min: 3.0 },
  // گزینهٔ انتخاب‌شده — متن سفید روی گرادیان (بدترین stop)
  { id: 'option-selected-white-on-brand600', fg: 'white', bg: 'brand-600', min: 4.5, note: 'text-xs bold ۱۲px → حد ۴٫۵ با بدترین stop' },
  { id: 'option-selected-white-on-violet600', fg: 'white', bg: 'violet-600', min: 4.5 },
  { id: 'chapter-badge-white-on-brand600', fg: 'white', bg: 'brand-600', min: 4.5, note: 'badge درس ۱۲px/۹۰۰ بعد از اصلاح' },
  { id: 'logo-badge-large-white-on-brand500', fg: 'white', bg: 'brand-500', min: 3.0, note: 'لوگو ۱۸px/۹۰۰ — متن بزرگ' },
  // کارت «گام بعدی» روی گرادیان سبز — بعد از اصلاح RC1.1 (بدترین stop)
  { id: 'nextstep-white-on-emerald800', fg: 'white', bg: 'emerald-800', min: 4.5 },
  { id: 'nextstep-white-on-emerald700', fg: 'white', bg: 'emerald-700', min: 4.5 },
  { id: 'nextstep-emerald50-on-emerald800', fg: 'emerald-50', bg: 'emerald-800', min: 4.5 },
  { id: 'nextstep-emerald50-on-emerald700', fg: 'emerald-50', bg: 'emerald-700', min: 4.5 },
  { id: 'nextstep-emerald100-on-emerald800', fg: 'emerald-100', bg: 'emerald-800', min: 4.5 },
  { id: 'nextstep-emerald100-on-emerald700', fg: 'emerald-100', bg: 'emerald-700', min: 4.5 },
  // hero داشبورد روی گرادیان نیلی (بدترین stop — مستند به evidence پیکسلی)
  { id: 'hero-white-24px-on-violet600', fg: 'white', bg: 'violet-600', min: 3.0 },
  { id: 'hero-brand100-on-violet600', fg: 'brand-100', bg: 'violet-600', min: 4.5 },
  // نشانگر فوکوس — غیرمتنی، ۳٫۰ در برابر پس‌زمینه‌های مجاور
  { id: 'focus-ring-brand600-on-white', fg: 'brand-600', bg: 'white', min: 3.0 },
  { id: 'focus-ring-brand600-on-slate100', fg: 'brand-600', bg: 'slate-100', min: 3.0 },
];
