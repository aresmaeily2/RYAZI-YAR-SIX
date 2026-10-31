import { describe, expect, it } from 'vitest';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';
import { normalizeDigitsToEnglish } from '../src/utils/mathEngine';

/**
 * آزمون اعتبارسنجی طلایی محتوا (Golden Master) — لایه دفاع مستقل از داده‌ها.
 *
 * هر کلید در جدول زیر در فرایند ممیزی دستی فاز صفر، با محاسبه مستقل بازبینی و
 * تأیید شده است (۹۶ پرسش؛ درس عملیات ترکیبی با ۴ پرسش تأییدشده به ۹۶ و سپس با دو
 * پرسش کسری تأییدشدهٔ همان درس به ۹۸ رسید). اگر کسی در آینده پاسخ درست یک پرسش را بدون بازبینی
 * ریاضی تغییر دهد یا پرسش جدیدی با کلید تأییدنشده اضافه کند، این آزمون قرمز
 * می‌شود و تغییر باید ابتدا از نظر ریاضی بازبینی و در جدول طلایی ثبت شود.
 */

const GOLDEN_ANSWERS: Record<string, string> = {
  // فصل ۱ — عدد و الگوهای عددی
  q111: '21',
  q112: '۵۹',
  q113: '۲۹',
  q114: '۷۰۳',
  q121: '۴۰۵٬۰۰۶٬۰۳۰',
  q122: '۷۰۰٬۰۰۰',
  q123: 'نهصد و هشت میلیون و پنجاه هزار و هفت',
  q124: '۸۵۳۰',
  q131: '۱۳۵',
  q132: '۴۵۶۳',
  q133: '۱۹۰',
  q134: '۲',
  q141: '۵ درجه',
  q142: '۳− بزرگ‌تر از ۸− است',
  q143: '۱۶ درجه',
  q144: '۳+',
  // فصل ۲ — کسر
  q211: '2/3',
  q212: '۹/۱۲',
  q213: '۱/۵',
  q214: '۶/۷',
  q221: '۳/۴',
  q222: '۱۱/۱۲',
  q223: '1/3 | 2/6',
  q224: '۳/۴ لیتر',
  q231: '۳/۷',
  q232: '۲/۳',
  q233: '1/4 | 2/8',
  q234: '۴',
  q241: '۵/۱۲',
  q242: '۱/۲',
  q243: '۲/۳',
  q244: '۱/۳',
  // فصل ۳ — اعداد اعشاری
  q311: 'صدم',
  q312: '۵/۶۶',
  q313: '۰/۳۴',
  q314: '۲/۴۵',
  q321: '0.6 | .6',
  q322: '0.35',
  q323: '۱/۴',
  q324: '۷/۸',
  q331: '6.2',
  q332: '2.64',
  q333: '۱/۵',
  q334: '۶/۰۵',
  q341: '۰/۰۰۶',
  q342: '۳۰',
  q343: '40',
  q344: '۶',
  // فصل ۴ — تقارن و مختصات
  q411: 'دایره',
  q412: '۴',
  q413: '۲',
  q414: 'پنج‌ضلعی منتظم',
  q421: 'متوازی‌الاضلاع غیرخاص',
  q422: '(۳− و ۲−)',
  q423: '۲',
  q424: '(۵ و ۴−)',
  q431: '(۰ و ۵)',
  q432: '(۶ و ۲)',
  q433: 'مبدأ',
  q434: '۳',
  // فصل ۵ — اندازه‌گیری
  q511: '۱۰۰',
  q512: '۳۰٬۰۰۰',
  q513: '۵٬۰۰۰٬۰۰۰',
  q514: '۱ هکتار',
  q521: '۷۸/۵',
  q522: '۳۱/۴',
  q523: '28.26',
  q524: '۱۰',
  q531: '۷۸۵',
  q532: '۱۰۰۰',
  q533: '۱۰۸',
  q534: '۲۰',
  // فصل ۶ — تناسب و درصد
  q611: '۳ به ۵',
  q612: '۱۲',
  q613: '۲۱٬۰۰۰ تومان',
  q614: '۳۶ و ۴۸',
  q621: '۱۵ نفر',
  q622: '۲۵٪',
  q623: '۳۴۰٬۰۰۰ تومان',
  q624: '۱۶۰٬۰۰۰ تومان',
  q631: '۵۰٪',
  q632: '۲۵٪',
  q633: 'بیشترین مقدار',
  q634: '۹۰ درجه',
  // فصل ۷ — تقریب و تخمین
  q711: '۸/۵',
  q712: '۱۴/۷',
  q713: '۱۲۳٬۰۰۰',
  q714: '۵٬۱۶۵',
  q721: '۱۲۰۰',
  q722: '۱۰۰۰',
  q723: '۴۹٬۰۰۰',
  q724: '۲۰۰',
  // درس عملیات ترکیبی (ch7l3) — کلیدها با محاسبهٔ مستقل تأیید شده‌اند:
  // ۸−۲×۳ = ۸−۶ = ۲ | (۸−۲)×۳ = ۶×۳ = ۱۸ | (۰/۵+۰/۲)×۶ = ۰/۷×۶ = ۴/۲
  // ۸÷۲+۳×۷+۴×۱۳−۵−۲ = ۴+۲۱+۵۲−۵−۲ = ۷۰
  // کسرها (تمرین ۳ و ۵ کتاب ص ۱۴۱): (۱/۲+۱/۴)×۸ = ۳/۴×۸ = ۶ | ۲+۱/۲×۴ = ۲+۲ = ۴
  q731: '2',
  q732: '۱۸',
  q733: '۴/۲',
  q734: '70',
  q735: '6',
  q736: '۴',
};

/** استخراج کلید فعلی هر پرسش از داده‌های واقعی کتاب */
function currentKeyOf(question: { id: string; type: string; correctAnswer?: string; acceptedAnswers?: string[] }): string {
  if (question.type === 'mcq') return question.correctAnswer ?? '';
  return (question.acceptedAnswers ?? []).join(' | ');
}

/**
 * مقادیر عددی ممکنِ یک گزینهٔ فارسی (ممیزی فاز ۲ — آزمون بازگشت هم‌ارزی).
 * قرارداد کتاب: «a/۰۵» با صفرِ ابتدای بخش دوم یعنی اعشار (۶/۰۵ = ۶٫۰۵)؛
 * در غیر این صورت «a/b» هم کسر است و هم می‌تواند اعشار فارسی باشد، پس هر دو مقدار
 * کاندید می‌شوند. علامت منفی فارسی (−) بعد از رقم می‌آید.
 */
function candidateValues(raw: string): number[] {
  const s = normalizeDigitsToEnglish(raw);
  const vals: number[] = [];
  const neg = s.includes('−');
  const unit = s.replace(/[^\d/و.]/g, '');
  const mixed = unit.match(/^(\d+)[وو](\d+)\/(\d+)$/);
  if (mixed) vals.push(Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]));
  const frac = unit.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const [a, b] = [frac[1], frac[2]];
    const looksDecimal = /^0\d/.test(b) || /^0\d/.test(a);
    if (looksDecimal) vals.push(Number(a + '.' + b));
    else {
      if (Number(b) !== 0) vals.push(Number(a) / Number(b));
      vals.push(Number(a + '.' + b));
    }
  }
  const dec = unit.match(/^(\d+)(\.(\d+))?$/);
  if (dec) vals.push(Number(dec[0]));
  return neg ? vals.map((v) => -v) : vals;
}

const allQuestions = CURRICULUM_CHAPTERS.flatMap((c) => c.lessons.flatMap((l) => l.questions));

describe('آزمون طلایی اعتبارسنجی کلید پاسخ‌ها (ممیزی دستی فاز صفر)', () => {
  it('تعداد پرسش‌های کتاب با جدول طلایی برابر است (۹۸)', () => {
    expect(allQuestions.length).toBe(Object.keys(GOLDEN_ANSWERS).length);
  });

  it('هیچ پرسشی خارج از جدول طلایی وجود ندارد', () => {
    const unknown = allQuestions.filter((q) => !(q.id in GOLDEN_ANSWERS));
    expect(unknown.map((q) => q.id)).toEqual([]);
  });

  it('هیچ شناسه اضافه‌ای در جدول طلایی نیست', () => {
    const dataIds = new Set(allQuestions.map((q) => q.id));
    const extra = Object.keys(GOLDEN_ANSWERS).filter((id) => !dataIds.has(id));
    expect(extra).toEqual([]);
  });

  it('کلید پاسخ هر پرسش با مقدار تأییدشده ممیزی دستی مطابقت دارد', () => {
    const mismatches: string[] = [];
    for (const q of allQuestions) {
      const actual = currentKeyOf(q);
      if (GOLDEN_ANSWERS[q.id] !== actual) {
        mismatches.push(`${q.id}: طلایی="${GOLDEN_ANSWERS[q.id]}" داده="${actual}"`);
      }
    }
    expect(mismatches).toEqual([]);
  });

  it('گزینه درست هیچ پرسش چهارگزینه‌ای با هیچ گزینه انحرافی یکسان نیست', () => {
    const collisions: string[] = [];
    for (const q of allQuestions) {
      if (q.type !== 'mcq') continue;
      const correct = GOLDEN_ANSWERS[q.id];
      const distractors = q.options.filter((o) => o !== correct);
      if (distractors.length !== q.options.length - 1) collisions.push(q.id);
    }
    expect(collisions).toEqual([]);
  });

  it('هیچ گزینه انحرافی هم‌ارز عددیِ گزینه درست نیست (ممیزی مستقل فاز ۲)', () => {
    const collisions: string[] = [];
    for (const q of allQuestions) {
      if (q.type !== 'mcq') continue;
      const correctVals = candidateValues(q.correctAnswer);
      for (const o of q.options) {
        if (o === q.correctAnswer) continue;
        for (const cv of correctVals)
          for (const ov of candidateValues(o))
            if (Math.abs(cv - ov) < 1e-9) collisions.push(`${q.id} — «${o}» ≡ «${q.correctAnswer}» (${ov})`);
      }
    }
    expect(collisions).toEqual([]);
  });

  it('هر تشخیص سوءبرداشت به یک گزینه انحرافیِ واقعی وصل است (ممیزی مستقل فاز ۲)', () => {
    const broken: string[] = [];
    for (const q of allQuestions) {
      if (q.type !== 'mcq') continue;
      for (const m of q.misconceptions) {
        if (!q.options.includes(m.wrongOptionValue) || m.wrongOptionValue === q.correctAnswer)
          broken.push(`${q.id} — ${m.wrongOptionValue}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it('عمیق‌ترین راهنما پاسخ نهایی را لو نمی‌دهد (قرارداد types/curriculum؛ ممیزی فاز ۲)', () => {
    // قرارداد در types: «سه راهنمایی پله‌پله؛ بدون لو دادن پاسخ نهایی».
    // قانون: توکن پاسخ (ارقام + / . − پس از حذف واحدها؛ حداقل ۲ رقم برای پاسخ‌های عددی)
    // نباید به‌صورت پاره‌توکنِ مستقل در عمیق‌ترین راهنما (hints[2]) باشد؛
    // علامت‌های + × ÷ = جداکننده پاره‌توکن‌ها هستند (۴+۵+۶+۳ ≠ ۴۵۶۳)؛
    // پاسخ‌های متنی نیز به‌صورت عبارت کامل چک می‌شوند.
    const leaks: string[] = [];
    const segments = (s: string): string[] =>
      normalizeDigitsToEnglish(s)
        .replace(/−/g, '-')
        .replace(/[^\d/.+-]/g, '|')
        .split('|')
        .filter(Boolean);
    for (const q of allQuestions) {
      const deepest = q.hints[2] ?? '';
      const answers = q.type === 'mcq' ? [q.correctAnswer] : (q.acceptedAnswers ?? []);
      for (const a of answers) {
        const tok = normalizeDigitsToEnglish(a).replace(/−/g, '-').replace(/[^\d/.-]/g, '');
        const digitCount = (tok.match(/\d/g) ?? []).length;
        if (digitCount === 0) {
          const text = normalizeDigitsToEnglish(a).replace(/\s+/g, '');
          const hint = normalizeDigitsToEnglish(deepest).replace(/\s+/g, '');
          if (text.length >= 2 && hint.includes(text)) leaks.push(`${q.id} — «${a}»`);
        } else if (digitCount >= 2) {
          if (segments(deepest).some((seg) => seg === tok)) leaks.push(`${q.id} — «${a}»`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });
});
