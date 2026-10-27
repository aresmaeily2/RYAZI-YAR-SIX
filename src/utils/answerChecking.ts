import type { McqQuestion, NumericQuestion, Question } from '../types/curriculum';
import { normalizeDigitsToEnglish } from './mathEngine';

/**
 * تصحیح پاسخ‌ها با نرمال‌سازی کامل ورودی کاربر.
 * این لایه جلوی پذیرش جواب غلط به‌عنوان جواب درست را می‌گیرد:
 * - MCQ: مقایسه دقیق گزینه انتخابی با گزینه درست
 * - عددی: نرمال‌سازی ارقام فارسی/عربی، جداکننده‌های هزارگان و اعشار
 */

/** پاک‌سازی عمومی ورودی: حذف فاصله‌ها، جداکننده هزارگان فارسی و آپاستروف (ویرگول انگلیسی در parse بررسی می‌شود) */
export function normalizeAnswerInput(raw: string): string {
  return normalizeDigitsToEnglish(raw)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[٬'']/g, '');
}

/** تبدیل یک رشته عددی (با جداکننده اعشار فارسی) به عدد */
function parseDecimalString(s: string): number | null {
  let cleaned = s.replace(/٫/g, '.');
  // جداکننده هزارگان: ویرگول با دقیقاً سه رقم بعد و بدون رقم اضافه (مثل 30,000)
  cleaned = cleaned.replace(/,(\d{3})(?!\d)/g, '$1');
  // ویرگول اعشاری باقی‌مانده (مثل 28,26)
  cleaned = cleaned.replace(/,/g, '.');
  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** تجزیه کسر به صورت «صورت/مخرج» یا عدد مخلوط «صحت a/b» */
function parseFractionString(s: string): { num: number; den: number } | null {
  // عدد مخلوط: ۲و۱/۳ یا 2 و 1/3
  const mixedMatch = s.match(/^([+-]?\d+)[وو](\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const num = Number(mixedMatch[2]);
    const den = Number(mixedMatch[3]);
    if (den === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return { num: sign * (Math.abs(whole) * den + num), den };
  }
  const fracMatch = s.match(/^([+-]?\d+)\/(\d+)$/);
  if (fracMatch) {
    const num = Number(fracMatch[1]);
    const den = Number(fracMatch[2]);
    if (den === 0) return null;
    return { num, den };
  }
  return null;
}

/** بررسی صحت پاسخ عددی بر اساس نوع پاسخ مورد انتظار */
export function isNumericAnswerCorrect(q: NumericQuestion, rawInput: string): boolean {
  const input = normalizeAnswerInput(rawInput);
  if (input.length === 0) return false;
  const tolerance = q.toleratedError ?? 0;

  for (const acceptedRaw of q.acceptedAnswers) {
    const accepted = normalizeAnswerInput(acceptedRaw);

    if (q.answerKind === 'integer') {
      const inputValue = parseDecimalString(input);
      const acceptedValue = parseDecimalString(accepted);
      if (inputValue === null || acceptedValue === null) continue;
      if (Math.abs(inputValue - acceptedValue) <= tolerance) return true;
    } else if (q.answerKind === 'decimal') {
      // در پاسخ اعشاری، جداکننده «/» هم به معنای ممیز پذیرفته می‌شود (رسم فارسی ۷۸/۵)
      const inputValue = parseDecimalString(input.replace(/\//g, '.'));
      const acceptedValue = parseDecimalString(accepted.replace(/\//g, '.'));
      if (inputValue === null || acceptedValue === null) continue;
      if (Math.abs(inputValue - acceptedValue) <= tolerance) return true;
    } else {
      // fraction: مقایسه دقیق با ضرب متقاطع؛ اعشار هم به کسر تبدیل می‌شود
      const frac = parseFractionString(input) ?? decimalToFraction(input);
      const target = parseFractionString(accepted) ?? decimalToFraction(accepted);
      if (!frac || !target) continue;
      if (frac.num * target.den === target.num * frac.den) return true;
    }
  }
  return false;
}

/** تبدیل عدد اعشاری محدود به کسر (برای مقایسه) */
function decimalToFraction(s: string): { num: number; den: number } | null {
  const value = parseDecimalString(s);
  if (value === null) return null;
  const scaled = value * 1000000;
  if (!Number.isInteger(scaled)) return null;
  return { num: scaled, den: 1000000 };
}

/** بررسی صحت پاسخ هر پرسش (MCQ یا عددی) */
export function isAnswerCorrect(q: Question, selected: string): boolean {
  if (selected.trim().length === 0) return false;
  if (q.type === 'mcq') {
    const mcq = q as McqQuestion;
    return normalizeAnswerInput(selected) === normalizeAnswerInput(mcq.correctAnswer);
  }
  return isNumericAnswerCorrect(q as NumericQuestion, selected);
}

/** یافتن تشخیص اشتباه رایج برای گزینه انتخابی (فقط MCQ) */
export function findMisconception(q: Question, selected: string) {
  if (q.type !== 'mcq') return undefined;
  const mcq = q as McqQuestion;
  const chosen = normalizeAnswerInput(selected);
  const hit = mcq.misconceptions.find(
    (m) => normalizeAnswerInput(m.wrongOptionValue) === chosen
  );
  return hit;
}
