import { toPersianDigits } from '../src/utils/mathEngine';
import type { McqQuestion, Question } from '../src/types/curriculum';

/**
 * RC1.1 بخش ۲ — نام قابل‌دسترسی گزینه‌ها بعد از اصلاح a11y:
 * «گزینه N: مقدار» (N = شمارهٔ فارسی همان badge بصری).
 * این helper نقطهٔ واحد حقیقت برای تست‌هایی که با accname کوئری می‌زنند.
 */
export function radioName(opt: string, q: Question): string {
  const mcq = q as McqQuestion;
  const idx = mcq.options.findIndex((o) => o === opt);
  return `گزینه ${toPersianDigits(idx + 1)}: ${opt}`;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** برای سایت‌هایی که فقط مقدار گزینه را دارند — تطبیق کامل «گزینه N: مقدار» */
export function radioNameEndsWith(opt: string): RegExp {
  return new RegExp(`^گزینه [۰-۹]+: ${esc(opt)}$`);
}
