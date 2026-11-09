import { describe, expect, it } from 'vitest';
import {
  LRI,
  PDI,
  MATH_RUN,
  MATH_RUN_SOURCE,
  DIGITS_CLASS,
  DECIMAL_CLASS,
  OPERATORS_CLASS,
  findMathRuns,
  hasMathExpression,
  bidiText,
} from '../src/utils/mathBidi';

/**
 * تست‌های رگرسیون مأموریت MISSION-2R — هستهٔ RTL و نمایش ریاضی
 *
 * مثبت‌ها: نمونه‌های الزامی مأموریت (§۴) + پوشش ارقام عربی/فارسی/لاتین،
 *          عملگرها، جداکنندهٔ هزارگان، اعشار، درصد دو سویه، متغیر لاتین.
 * منفی‌ها: نمونه‌های الزامی مأموریت (§۴) — هیچ‌کدام نباید به قطعهٔ LTR تبدیل شوند.
 */

const wrap = (s: string) => LRI + s + PDI;

describe('ساختار الگو (MATH_RUN / OP_BETWEEN)', () => {
  it('MATH_RUN شامل پوشش ٪ U+066A و % U+0025 است', () => {
    expect(MATH_RUN_SOURCE).toContain('\u066A');
    expect(MATH_RUN_SOURCE).toContain('%');
  });

  it('MATH_RUN شامل پوشش ٬ U+066C و , U+002C است', () => {
    expect(MATH_RUN_SOURCE).toContain('\u066C');
    expect(MATH_RUN_SOURCE).toContain(',');
  });
  it('کلاس‌های کاراکتری هر سه سامانهٔ عدد را پوشش می‌دهند', () => {
    expect(DIGITS_CLASS).toContain('0-9');
    expect(DIGITS_CLASS).toContain('\u06F0-\u06F9'); // فارسی
    expect(DIGITS_CLASS).toContain('\u0660-\u0669'); // عربی
  });

  it('جداکنندهٔ اعشار (٫ U+066B و .) و عملگرها (+ − = × ÷ /) پوشش داده شده‌اند', () => {
    expect(DECIMAL_CLASS).toContain('\u066B');
    expect(DECIMAL_CLASS).toContain('.');
    for (const op of ['+', '=', '\u00D7', '\u00F7', '/', '\u2212', '-']) {
      expect(OPERATORS_CLASS).toContain(op);
    }
  });

  it('OP_BETWEEN اجازهٔ فاصلهٔ اختیاری دور عملگر را می‌دهد (مثال واقعی q623)', () => {
    const text = 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰';
    MATH_RUN.lastIndex = 0;
    expect(MATH_RUN.test(text)).toBe(true);
    MATH_RUN.lastIndex = 0;
  });
});

describe('حالت‌های مثبت — نمونه‌های الزامی مأموریت', () => {
  const missionCases: Array<[string, string]> = [
    ['۲۵٪ × ۸۰', '۲۵٪ × ۸۰'],
    ['۲۵% × ۸۰', '۲۵% × ۸۰'],
    ['۱۰٬۰۰۰ + ۲۵۰', '۱۰٬۰۰۰ + ۲۵۰'],
    ['10,000 + 250', '10,000 + 250'],
    ['مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰', '۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰'],
  ];

  for (const [input, expectedRun] of missionCases) {
    it(`تشخیص و محصورسازی: «${input}»`, () => {
      expect(hasMathExpression(input)).toBe(true);
      const runs = findMathRuns(input);
      expect(runs).toHaveLength(1);
      expect(runs[0].text).toBe(expectedRun);
      expect(bidiText(input)).toContain(wrap(expectedRun));
    });
  }
});

describe('حالت‌های مثبت — پوشش تکمیلی الزامات Agent 2', () => {
  it('ارقام عربی با درصد: «٥٠٪ × ٢٠٠» (U+066A با ارقام U+0660)', () => {
    const runs = findMathRuns('٥٠٪ × ٢٠٠');
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('٥٠٪ × ٢٠٠');
    expect(MATH_RUN_SOURCE).toContain('\u066A');
    expect(MATH_RUN_SOURCE).toContain('\u0660-\u0669');
  });

  it('منفی و مثبت: «۱۰۰ − ۴۰ = ۶۰» و «−۵ + ۱۰»', () => {
    expect(findMathRuns('۱۰۰ − ۴۰ = ۶۰').map((r) => r.text)).toEqual(['۱۰۰ − ۴۰ = ۶۰']);
    // منفیِ پیشوندی: عدد «۵» تنها باقی می‌ماند (محافظه‌کارانه)؛ «+ ۱۰» با عملگر تشخیص داده می‌شود
    const runs = findMathRuns('−۵ + ۱۰');
    expect(runs.some((r) => r.text.includes('+'))).toBe(true);
  });

  it('تقسیم و کسر: «۲۰/۸۰ = ۱/۴ = ۲۵/۱۰۰»', () => {
    const runs = findMathRuns('۲۰/۸۰ = ۱/۴ = ۲۵/۱۰۰');
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('۲۰/۸۰ = ۱/۴ = ۲۵/۱۰۰');
  });

  it('اعشار: «۳/۱۴ × ۲ = ۶/۲۸» (اعشار سبک فارسی با ممیز خط‌کشی)', () => {
    const runs = findMathRuns('۳/۱۴ × ۲ = ۶/۲۸');
    expect(runs).toHaveLength(1);
  });

  it('جداکنندهٔ هزارگان هرگز عدد را نمی‌پاشد — «۱۰٬۰۰۰» و «۱,۰۰۰,۰۰۰» توکن یکپارچه‌اند', () => {
    for (const num of ['۱۰٬۰۰۰', '۱٬۰۰۰٬۰۰۰', '10,000,000']) {
      const runs = findMathRuns(`${num} + ۲۵۰`);
      expect(runs).toHaveLength(1);
      expect(runs[0].text).toContain(num);
      // در خروجی محصورشده، هیچ جداسازی داخل خود عدد نیست و عدد یکپارچه است
      const wrapped = bidiText(`${num} + ۲۵۰`);
      const inner = wrapped.replaceAll(LRI, '').replaceAll(PDI, '');
      expect(inner).toBe(`${num} + ۲۵۰`);
      expect(wrapped.includes(LRI + num)).toBe(true);
    }
  });

  it('درصد دو سویه: «٪۲۵» و «۲۵٪» هر دو تشخیص داده می‌شوند', () => {
    expect(hasMathExpression('٪۲۵ تخفیف')).toBe(true);
    expect(hasMathExpression('تخفیف ۲۵٪')).toBe(true);
  });

  it('متغیر لاتین در زنجیرهٔ ریاضی: «محیط = D × ۳/۱۴»', () => {
    const runs = findMathRuns('محیط = D × ۳/۱۴');
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('۳/۱۴');
  });

  it('توضیح واقعی q623: فقط قطعهٔ ریاضی محصور می‌شود؛ کلمات فارسی و عددِ بدون عملگر دست‌نخورده می‌مانند', () => {
    const explanation = 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).';
    const runs = findMathRuns(explanation);
    expect(runs).toHaveLength(1);
    expect(runs[0].text).toBe('۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰');
    const wrapped = bidiText(explanation);
    expect(wrapped).toContain(wrap('۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰'));
    // «۶۰٬۰۰۰» بدون عملگر — نباید محصور شود
    expect(wrapped.includes(wrap('۶۰٬۰۰۰'))).toBe(false);
  });

  it('ترتیب منطقی حفظ می‌شود — حذف نویسه‌های جداساز، متن اصلی را می‌دهد (بدون معکوس‌سازی)', () => {
    const samples = [
      'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).',
      '۲۵٪ × ۸۰',
      'قیمت کیفی ۴۰۰٬۰۰۰ تومان است و فروشنده ۱۵٪ تخفیف می‌دهد.',
      '۱۰٬۰۰۰ + ۲۵۰',
    ];
    for (const s of samples) {
      const stripped = bidiText(s).replaceAll(LRI, '').replaceAll(PDI, '');
      expect(stripped).toBe(s);
    }
  });

  it('idempotent است — دو بار اعمال، نتیجه را تغییر نمی‌دهد', () => {
    const s = 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان';
    expect(bidiText(bidiText(s))).toBe(bidiText(s));
  });
});

describe('حالت‌های منفی — الزامی مأموریت', () => {
  it('متن فارسی فاقد عبارت ریاضی', () => {
    const t = 'در این درس با مفهوم نسبت و تناسب آشنا می‌شویم.';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
  });

  it('درصد در متن عادی (کلمهٔ «درصد»، بدون نماد)', () => {
    const t = 'در کلاسی ۲۵ نفره، ۶۰ درصد دانش‌آموزان در المپیاد ریاضی شرکت کرده‌اند. چند نفر شرکت کرده‌اند؟';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
  });

  it('اعداد دارای جداکننده بدون عملگر', () => {
    const t = 'قیمت کیفی ۴۰۰٬۰۰۰ تومان است';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
    expect(bidiText('۱۰٬۰۰۰ تومان')).toBe('۱۰٬۰۰۰ تومان');
  });

  it('متن فارسی و لاتین ترکیبی', () => {
    const t = 'این برنامه با React و Vite ساخته شده است.';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
  });

  it('اعداد عربی و فارسی در یک رشته — بدون عملگر فقط متن است، با عملگر محصور می‌شود', () => {
    const plain = 'اعداد ٥ و ۵ با هم فرق ندارند.';
    expect(hasMathExpression(plain)).toBe(false);
    expect(bidiText(plain)).toBe(plain);
    const math = '٥ + ۵ = ۱۰';
    expect(hasMathExpression(math)).toBe(true);
    expect(findMathRuns(math).map((r) => r.text)).toEqual(['٥ + ۵ = ۱۰']);
  });

  it('رشتهٔ خالی', () => {
    expect(hasMathExpression('')).toBe(false);
    expect(bidiText('')).toBe('');
  });

  it('رشتهٔ دارای نشانه‌گذاری عادی', () => {
    const t = 'سلام! چطوری؟ (سؤال ۱) — «موفق باشی.»';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
  });

  it('ویرگول فارسی «،» جداکنندهٔ هزارگان نیست و کلمات را نمی‌پاشد', () => {
    const t = '۲۰، ۳۰ و ۴۰';
    expect(hasMathExpression(t)).toBe(false);
    expect(bidiText(t)).toBe(t);
  });
});
