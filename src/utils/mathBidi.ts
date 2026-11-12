/**
 * mathBidi.ts — هستهٔ تشخیص و جداسازی عبارت‌های ریاضی در متن فارسی (RTL)
 * =============================================================
 * هدف: جلوگیری از به‌هم‌ریختگی نمایش عبارت‌های ریاضی (مثل «۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰»)
 * در بستر راست‌به‌چپ، بدون دست‌زدن به متن عادی فارسی و بدون معکوس‌سازی رشته.
 *
 * روش: هر «قطعهٔ ریاضی»ِ محافظه‌کارانه‌تشخیص‌داده‌شده با کاراکترهای استاندارد یونی‌کد
 * LRI (U+2066 LEFT-TO-RIGHT ISOLATE) و PDI (U+2069 POP DIRECTIONAL ISOLATE)
 * به‌صورت یک جزیرهٔ LTR محصور می‌شود. این کاراکترها صفر-عرض‌اند، در همهٔ
 * مرورگرهای مدرن پشتیبانی می‌شوند و به CSS نیازی ندارند.
 *
 * اصول محافظه‌کارانه (غیرقابل نقض):
 *  1. عدد تنها (حتی با جداکنندهٔ هزارگان) هرگز قطعهٔ ریاضی نیست → متن عادی دست‌نخورده می‌ماند.
 *  2. قطعه فقط وقتی ریاضی است که عملگر بین دو عدد/متغیر داشته باشد یا علامت درصد داشته باشد.
 *  3. جداکنندهٔ هزارگان (٬ U+066C و , U+002C) همیشه داخل توکن عدد مصرف می‌شود → عدد هرگز از هم نمی‌پاشد.
 *  4. کلمهٔ «درصد» (متن) هرگز پردازش نمی‌شود؛ فقط نماد ٪ (U+066A) و % (U+0025).
 *  5. ویرگول فارسی «،» (U+060C) نشانهٔ نگارشی است، نه جداکنندهٔ هزارگان → خارج از گرامر.
 *  6. ترتیب منطقی رشته حفظ می‌شود؛ هیچ معکوس‌سازی انجام نمی‌شود.
 *  7. پرانتزِ متعلق به عبارت ریاضی با کل عبارت در همان جزیره محصور می‌شود؛
 *     پرانتزِ حاوی متن فارسی یا عددِ بدون عملگر، هرگز لمس نمی‌شود.
 *  8. پرانتزِ تودرتو پشتیبانی نمی‌شود (رفتار محافظه‌کارانه؛ هر سطح داخلی خودش ارزیابی می‌شود).
 */

/** کاراکترهای جداساز یونی‌کد (صفر-عرض) */
export const LRI = '\u2066'; // LEFT-TO-RIGHT ISOLATE
export const PDI = '\u2069'; // POP DIRECTIONAL ISOLATE

/* ------------------------------------------------------------------ */
/* کلاس‌های کاراکتری — منبع واحد حقیقت برای تست‌ها و مستندات          */
/* ------------------------------------------------------------------ */

/** ارقام لاتین + فارسی (U+06F0..U+06F9) + عربی (U+0660..U+0669) */
export const DIGITS_CLASS = '0-9\u06F0-\u06F9\u0660-\u0669';

/** جداکنندهٔ هزارگان: ویرگول ASCII (U+002C) + ویرگول هزارگان عربی (U+066C ٬) */
export const THOUSANDS_CLASS = ',\u066C';

/** جداکنندهٔ اعشار: نقطهٔ ASCII (U+002E) + ممیز عربی (U+066B ٫) */
export const DECIMAL_CLASS = '.\u066B';

/** درصد: ASCII (U+0025) + عربی (U+066A ٪) */
export const PERCENT_CLASS = '%\u066A';

/** عملگرها: منفی/مثبت/مساوی/ضرب/تقسیم/اعشار/نامساوی/مقایسه/توان + ممیز U+2212 */
export const OPERATORS_CLASS = '+\\-\u2212\u00D7\u00F7*/=\u2248\u2260\u2264\u2265<>^';

/** فاصله‌های مجاز دور عملگر + نویسه‌های جداساز از قبل موجود (برای idempotency) */
export const GLUE_CLASS = ' \u00A0\t\u200E\u200F';

/* ------------------------------------------------------------------ */
/* گرامر                                                              */
/* ------------------------------------------------------------------ */

/** عدد: ارقام + (جداکنندهٔ هزارگان + ارقام)* + (جداکنندهٔ اعشار + ارقام)? */
export const NUM_SRC = `[${DIGITS_CLASS}]+(?:[${THOUSANDS_CLASS}][${DIGITS_CLASS}]+)*(?:[${DECIMAL_CLASS}][${DIGITS_CLASS}]+)?`;

/** عملگر بین دو جمله با فاصلهٔ اختیاری — مفهوم OP_BETWEEN مأموریت */
export const OP_BETWEEN_SRC = `[${GLUE_CLASS}]*[${OPERATORS_CLASS}][${GLUE_CLASS}]*`;

/** جملهٔ عددی با درصد اختیاری دو طرف */
const TERM_SRC = `[${PERCENT_CLASS}]?${NUM_SRC}[${PERCENT_CLASS}]?`;

/** جملهٔ ادامه‌دهنده: عدد (با درصد اختیاری) یا یک حرف لاتین به‌عنوان متغیر */
const NEXT_TERM_SRC = `(?:${TERM_SRC}|[A-Za-z])`;

/* ------------------------------------------------------------------ */
/* گرامر پرانتز — بخش ۳ مأموریت RC1.1                                */
/* پرانتزهای متعلق به عبارت ریاضی باید «با عبارت» ایزوله شوند،        */
/* نه بیرون جزیره بمانند (رفتار محافظه‌کارانهٔ قبلی).                 */
/* ------------------------------------------------------------------ */

/** صفر یا چند فاصلهٔ مجاز — خارج از کلاس کاراکتری، برای گرامر پرانتز */
const GLUE_STAR = `[${GLUE_CLASS}]*`;

/** زنجیرهٔ داخلی بدون پرانتز — همان بدنهٔ قدیمی MATH_RUN */
const INNER_CHAIN_SRC = `${TERM_SRC}(?:${OP_BETWEEN_SRC}${NEXT_TERM_SRC})*`;

/** گروه پرانتزی — یک سطح (بدون تو در تو)؛ محتوا باید زنجیرهٔ ریاضی باشد */
const GROUP_SRC = `\\(${GLUE_STAR}${INNER_CHAIN_SRC}${GLUE_STAR}\\)`;

/** واحد زنجیره: گروه پرانتزی یا جملهٔ ساده */
const UNIT_SRC = `(?:${GROUP_SRC}|${TERM_SRC})`;

/** واحد ادامه‌دهنده: گروه پرانتزی، جملهٔ ساده، یا حرف لاتین */
const NEXT_UNIT_SRC = `(?:${GROUP_SRC}|${TERM_SRC}|[A-Za-z])`;

/**
 * MATH_RUN — الگوی قطعهٔ ریاضی: یک واحد (گروه پرانتزی یا جمله) که با عملگرها
 * به واحدهای بعدی زنجیره شده است.
 * مثال منطبق: «۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰» ، «۱۰٬۰۰۰ + ۲۵۰» ، «۲۰/۸۰» ، «۲۵%» ،
 * «۱۰+۴×(۶−۲)÷۸» ، «(۳ × ۱) + ۱ = ۴» ، «(۲/۵)»
 * مثال غیرمنطبق (عمدی): «۴۰۰٬۰۰۰» تنها ، «۲۰ از ۸۰» ، «۶۰ درصد» ، متن عادی فارسی،
 * «(۳ × شماره شکل)» (کلمهٔ فارسی داخل پرانتز → خارج از گرامر)،
 * «(مبلغ تخفیف ۶۰٬۰۰۰ تومان است)» (عدد بدون عملگر داخل پرانتز).
 */
export const MATH_RUN = new RegExp(
  `${UNIT_SRC}(?:${OP_BETWEEN_SRC}${NEXT_UNIT_SRC})*`,
  'g',
);

/** شرط محافظه‌کارانه: قطعه باید عملگر یا درصد داشته باشد */
const RUN_MUST_HAVE = new RegExp(`[${OPERATORS_CLASS}${PERCENT_CLASS}]`);

/* ------------------------------------------------------------------ */
/* API                                                                */
/* ------------------------------------------------------------------ */

export interface MathRun {
  start: number;
  end: number;
  text: string;
}

/** رشتهٔ خام الگوی MATH_RUN (برای تست‌های ساختاری) */
export const MATH_RUN_SOURCE = MATH_RUN.source;

/** آیا متن شامل حداقل یک قطعهٔ ریاضی معتبر است؟ */
export function hasMathExpression(text: string): boolean {
  if (!text) return false;
  MATH_RUN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RUN.exec(text)) !== null) {
    if (m[0].length > 0 && RUN_MUST_HAVE.test(m[0])) return true;
    if (m[0].length === 0) MATH_RUN.lastIndex += 1; // محافظت از حلقهٔ بی‌پایان
  }
  return false;
}

/** همهٔ قطعه‌های ریاضی معتبر متن — با موقعیت دقیق، بدون معکوس‌سازی */
export function findMathRuns(text: string): MathRun[] {
  const runs: MathRun[] = [];
  if (!text) return runs;
  MATH_RUN.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RUN.exec(text)) !== null) {
    if (m[0].length === 0) {
      MATH_RUN.lastIndex += 1;
      continue;
    }
    if (RUN_MUST_HAVE.test(m[0])) {
      runs.push({ start: m.index, end: m.index + m[0].length, text: m[0] });
    }
  }
  return runs;
}

/**
 * متن را با قطعه‌های ریاضی محصور در LRI…PDI برمی‌گرداند.
 * - ترتیب منطقی دقیقاً حفظ می‌شود (بدون معکوس‌سازی).
 * - عدد با جداکنندهٔ هزارگان همیشه یک‌پارچه می‌ماند.
 * - قطعه‌های از قبل محصورشده دوباره محصور نمی‌شوند (idempotent).
 */
export function wrapMathRuns(text: string): string {
  if (!text) return text;
  const runs = findMathRuns(text);
  if (runs.length === 0) return text;
  let out = '';
  let cursor = 0;
  for (const run of runs) {
    // محافظت idempotency: اگر قطعه از قبل بین LRI و PDI محصور شده، دست نمی‌زنیم
    const before = run.start > 0 ? text[run.start - 1] : '';
    const after = run.end < text.length ? text[run.end] : '';
    const alreadyIsolated = before === LRI && after === PDI;
    out += text.slice(cursor, run.start);
    out += alreadyIsolated ? run.text : LRI + run.text + PDI;
    cursor = run.end;
  }
  out += text.slice(cursor);
  return out;
}

/** نقطهٔ ورود اصلی برای مؤلفه‌ها: متن امن برای نمایش در بستر RTL */
export function bidiText(text: string | null | undefined): string {
  if (!text) return '';
  return wrapMathRuns(text);
}
