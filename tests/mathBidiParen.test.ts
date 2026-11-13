import { describe, expect, it } from 'vitest';
import {
  bidiText,
  findMathRuns,
  hasMathExpression,
  LRI,
  PDI,
  wrapMathRuns,
} from '../src/utils/mathBidi';

/** حذف نویسه‌های جداساز — برای اثبات حفظ ترتیب منطقی */
const strip = (s: string) => s.split(LRI).join('').split(PDI).join('');

/**
 * بخش ۳ مأموریت RC1.1 — پرانتزهای متعلق به عبارت ریاضی باید با عبارت
 * در یک جزیرهٔ LTR محصور شوند؛ پرانتزِ حاوی متن فارسی یا عدد بدون عملگر
 * هرگز نباید لمس شود. قواعد حفظ‌شده: بدون معکوس‌سازی، idempotent،
 * ترتیب منطقی، متن فارسی اطراف RTL می‌ماند.
 */

const MUST_ISLAND = [
  '۱۰+۴×(۶−۲)÷۸',
  '(۳ × ۱) + ۱ = ۴',
  '(۲/۵)',
  '(۸ + ۲) × ۵ = ۵۰',
  '(۲۵٪ + ۱۰٪)',
  '۵/۰۶ < ۵/۶ < ۵/۶۶',
  '۱۰٬۰۰۰ + ۲۵۰',
];

const MUST_UNTOUCHED = [
  '(صورت ÷ ب.م.م) / (مخرج ÷ ب.م.م)',
  '(۳ × شماره شکل) + ۱',
  '(مبلغ تخفیف ۶۰٬۰۰۰ تومان است)',
  'قیمت ۱،۵۰۰ تومان بود',
  '(اختلاف ثابت × شماره شکل) + مقدار تنظیم‌کننده',
];

describe('گرامر پرانتز — قطعه‌های الزامی', () => {
  for (const s of MUST_ISLAND) {
    it(`«${s}» → جزیرهٔ واحد شامل پرانتزها`, () => {
      const runs = findMathRuns(s);
      expect(runs.length).toBe(1);
      expect(runs[0].text).toBe(s);
      expect(hasMathExpression(s)).toBe(true);
    });
  }

  for (const s of MUST_UNTOUCHED) {
    it(`«${s}» → کاملاً دست‌نخورده (بدون جداسازی)`, () => {
      expect(bidiText(s)).toBe(s);
      expect(hasMathExpression(s)).toBe(false);
    });
  }

  it('نمونهٔ واقعی ch1 — پرانتز ریاضی جزیره، پرانتز متنی دست‌نخورده', () => {
    const s = 'گام ۳: برای جمله بیستم عدد ۲۰ را جایگزین می‌کنیم: (۳ × ۲۰) + ۱ = ۶۱.';
    const out = bidiText(s);
    expect(strip(out)).toBe(s);
    expect(out).toContain(`${LRI}(۳ × ۲۰) + ۱ = ۶۱${PDI}`);
  });

  it('نمونهٔ واقعی q623 — زنجیرهٔ درصد جزیره، پرانتز توضیحی دست‌نخورده', () => {
    const s = 'مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).';
    const out = bidiText(s);
    expect(strip(out)).toBe(s);
    expect(out).toContain(`${LRI}۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰${PDI} تومان (مبلغ تخفیف ۶۰٬۰۰۰ تومان است).`);
  });

  it('زنجیرهٔ مرکب با پرانتز و بدون فاصله — یک جزیرهٔ کامل', () => {
    const s = '۱۰+۴×(۶−۲)÷۸';
    const out = bidiText(s);
    expect(out).toBe(`${LRI}${s}${PDI}`);
  });

  it('پرانتز تودرتو — رفتار محافظه‌کارانهٔ مستند (سطح داخلی جزیره، پرانتز بیرونی بیرون)', () => {
    const s = '((۱+۲) × ۳)';
    const runs = findMathRuns(s);
    expect(runs.length).toBe(1);
    expect(runs[0].text).toBe('(۱+۲) × ۳');
    expect(strip(bidiText(s))).toBe(s);
  });

  it('پرانتز باز بدون بستن — عدد داخل آن بدون عملگر دست‌نخورده می‌ماند', () => {
    const s = 'مقدار (۲۰ از کل';
    expect(bidiText(s)).toBe(s);
  });

  it('درصد داخل پرانتز — محصور می‌شود', () => {
    const s = '(۲۵٪)';
    expect(findMathRuns(s)[0].text).toBe(s);
  });
});

describe('اصل حفظ ترتیب منطقی و idempotency — روی همهٔ نمونه‌ها', () => {
  const ALL = [...MUST_ISLAND, ...MUST_UNTOUCHED];

  it('حذف نویسه‌های جداساز، دقیقاً متن اصلی را می‌دهد (بدون معکوس‌سازی)', () => {
    for (const s of ALL) expect(strip(bidiText(s))).toBe(s);
  });

  it('دو بار اعمال، نتیجه را تغییر نمی‌دهد (idempotent)', () => {
    for (const s of ALL) {
      const once = bidiText(s);
      expect(bidiText(once)).toBe(once);
    }
  });

  it('wrapMathRuns فقط نویسهٔ کنترلی اضافه می‌کند — طول خروجی = طول ورودی + ۲×تعداد جزیره', () => {
    for (const s of ALL) {
      const out = wrapMathRuns(s);
      const n = findMathRuns(s).length;
      expect(out.length - s.length).toBe(2 * n);
    }
  });
});
