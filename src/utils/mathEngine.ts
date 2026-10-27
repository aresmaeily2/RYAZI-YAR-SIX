import type { AttemptRecord, Chapter, ChapterMastery, Difficulty, Lesson } from '../types/curriculum';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** تبدیل ارقام انگلیسی به فارسی برای نمایش */
export function toPersianDigits(input: number | string): string {
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/** تبدیل ارقام فارسی و عربی به انگلیسی برای پردازش */
export function normalizeDigitsToEnglish(input: string): string {
  return input
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d)));
}

/** بزرگ‌ترین شمارنده مشترک؛ برای اعداد منفی قدرمطلق برمی‌گردد و gcd(0,0)=1 تا از تقسیم بر صفر جلوگیری شود */
export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.trunc(a));
  let y = Math.abs(Math.trunc(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x === 0 ? 1 : x;
}

export interface SimplifiedFraction {
  num: number;
  den: number;
}

/** ساده‌سازی کسر؛ مخرج همیشه مثبت می‌ماند */
export function simplifyFraction(numerator: number, denominator: number): SimplifiedFraction {
  if (denominator === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد');
  const sign = denominator < 0 ? -1 : 1;
  const divisor = gcd(numerator, denominator);
  return {
    num: (numerator * sign) / divisor,
    den: Math.abs(denominator) / divisor,
  };
}

/** نمایش استاندارد کسر به‌صورت «صورت/مخرج» با ارقام فارسی */
export function formatFraction(num: number, den: number): string {
  const s = simplifyFraction(num, den);
  return `${toPersianDigits(s.num)}/${toPersianDigits(s.den)}`;
}

/** وزن دشواری: آسان ۱، متوسط ۲، دشوار ۳ */
export function difficultyWeight(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'easy':
      return 1;
    case 'medium':
      return 2;
    case 'hard':
      return 3;
  }
}

/**
 * محاسبه امتیاز XP یک تلاش.
 * پاسخ نادرست ۲ امتیاز تلاش آموزشی دارد؛ پاسخ درست پایه‌ی ۱۵×وزن دشواری
 * با جریمه هر راهنمایی (۳ امتیاز) و ضریب تلاش مجدد ۰٫۴ محاسبه می‌شود.
 */
export function calculateXpForAttempt(
  isCorrect: boolean,
  difficulty: Difficulty,
  hintsUsed: number,
  isFirstAttemptOnQuestion: boolean
): number {
  if (!isCorrect) return 2;
  const base = difficultyWeight(difficulty) * 15;
  const hintPenalty = Math.min(hintsUsed * 3, base - 5);
  const raw = Math.max(5, base - hintPenalty);
  return isFirstAttemptOnQuestion ? raw : Math.round(raw * 0.4);
}

/**
 * شاخص تسلط وزنی فصل:
 * پاسخ درست بدون راهنمایی در اولین تلاش = وزن کامل،
 * پاسخ درست با راهنمایی = ۰٫۸۵ وزن،
 * پاسخ درست بعد از اشتباه = ۰٫۶ وزن،
 * بدون پاسخ درست = صفر و ثبت درس به‌عنوان درسِ نیازمند تمرین.
 */
export function computeChapterMastery(chapter: Chapter, attempts: AttemptRecord[]): ChapterMastery {
  const chapterAttempts = attempts.filter((a) => a.chapterId === chapter.id);
  const allQuestions = chapter.lessons.flatMap((l) => l.questions);

  if (chapterAttempts.length === 0 || allQuestions.length === 0) {
    return {
      chapterId: chapter.id,
      totalAttempts: 0,
      correctFirstTry: 0,
      weightedScore: 0,
      masteryPercent: 0,
      status: 'notstarted',
      weakLessonIds: [],
    };
  }

  let earnedWeight = 0;
  let totalPossibleWeight = 0;
  let correctFirstTry = 0;
  const weakLessons = new Set<string>();

  for (const q of allQuestions) {
    const w = difficultyWeight(q.difficulty);
    totalPossibleWeight += w;
    const qAttempts = chapterAttempts
      .filter((a) => a.questionId === q.id)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (qAttempts.length > 0) {
      const first = qAttempts[0];
      const latest = qAttempts[qAttempts.length - 1];
      if (first.isCorrect && first.hintsUsed === 0) {
        earnedWeight += w;
        correctFirstTry += 1;
      } else if (first.isCorrect) {
        earnedWeight += w * 0.85;
        correctFirstTry += 1;
      } else if (latest.isCorrect) {
        earnedWeight += w * 0.6;
        weakLessons.add(q.lessonId);
      } else {
        weakLessons.add(q.lessonId);
      }
    }
  }

  const masteryPercent = Math.min(100, Math.round((earnedWeight / totalPossibleWeight) * 100));
  let status: ChapterMastery['status'] = 'needspractice';
  if (masteryPercent >= 80) status = 'mastered';
  else if (masteryPercent >= 55) status = 'good';

  return {
    chapterId: chapter.id,
    totalAttempts: chapterAttempts.length,
    correctFirstTry,
    weightedScore: Number(earnedWeight.toFixed(2)),
    masteryPercent,
    status,
    weakLessonIds: Array.from(weakLessons),
  };
}

/** درس‌هایی که تمام پرسش‌هایشان حداقل یک تلاش درست دارد */
export function computeCompletedLessonIds(chapters: Chapter[], attempts: AttemptRecord[]): string[] {
  const correctQuestionIds = new Set(
    attempts.filter((a) => a.isCorrect).map((a) => a.questionId)
  );
  const completed: string[] = [];
  for (const ch of chapters) {
    for (const lesson of ch.lessons) {
      if (lesson.questions.length > 0 && lesson.questions.every((q) => correctQuestionIds.has(q.id))) {
        completed.push(lesson.id);
      }
    }
  }
  return completed;
}

/**
 * به‌روزرسانی زنجیره روزانه مطالعه.
 * اگر آخرین فعالیت امروز بوده، تغییری نمی‌کند؛ اگر دیروز بوده، یک واحد افزایش می‌یابد؛
 * در غیر این صورت زنجیره به ۱ بازنشانی می‌شود.
 */
export function updateStreak(
  lastActiveDate: string,
  streakDays: number,
  todayISO: string
): { streakDays: number; lastActiveDate: string } {
  if (lastActiveDate === todayISO) {
    return { streakDays, lastActiveDate };
  }
  const yesterday = new Date(`${todayISO}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayISO = yesterday.toISOString().slice(0, 10);
  const nextStreak = lastActiveDate === yesterdayISO ? streakDays + 1 : 1;
  return { streakDays: nextStreak, lastActiveDate: todayISO };
}

/** گرد کردن تا مرتبه معین (روش کتاب: رقم بعد ≥ ۵ → افزایش) */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/** قطع کردن تا مرتبه معین (بدون در نظر گرفتن رقم‌های راست) */
export function truncateTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.trunc(value * factor + Number.EPSILON * Math.sign(value)) / factor;
}

/** یافتن کسر وسط دو کسر (میانگین): (کسر اول + کسر دوم) ÷ ۲ */
export function middleFraction(aNum: number, aDen: number, bNum: number, bDen: number): SimplifiedFraction {
  if (aDen === 0 || bDen === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد');
  return simplifyFraction(aNum * bDen + bNum * aDen, 2 * aDen * bDen);
}

/** جمع دو کسر */
export function addFractions(aNum: number, aDen: number, bNum: number, bDen: number): SimplifiedFraction {
  if (aDen === 0 || bDen === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد');
  return simplifyFraction(aNum * bDen + bNum * aDen, aDen * bDen);
}

/** تفریق دو کسر */
export function subtractFractions(aNum: number, aDen: number, bNum: number, bDen: number): SimplifiedFraction {
  if (aDen === 0 || bDen === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد');
  return simplifyFraction(aNum * bDen - bNum * aDen, aDen * bDen);
}

/** ضرب دو کسر */
export function multiplyFractions(aNum: number, aDen: number, bNum: number, bDen: number): SimplifiedFraction {
  if (aDen === 0 || bDen === 0) throw new Error('مخرج کسر نمی‌تواند صفر باشد');
  return simplifyFraction(aNum * bNum, aDen * bDen);
}

/** تقسیم دو کسر (معکوس کردن کسر دوم) */
export function divideFractions(aNum: number, aDen: number, bNum: number, bDen: number): SimplifiedFraction {
  if (aDen === 0 || bDen === 0 || bNum === 0) throw new Error('تقسیم بر کسر با صورت صفر یا مخرج صفر تعریف نمی‌شود');
  return simplifyFraction(aNum * bDen, aDen * bNum);
}

/** محاسبه درصد از یک مقدار */
export function percentOf(value: number, percent: number): number {
  return (value * percent) / 100;
}

/** مساحت دایره با پی ≈ ۳٫۱۴ */
export function circleArea(radius: number, pi = 3.14): number {
  return pi * radius * radius;
}

/** محیط دایره با پی ≈ ۳٫۱۴ */
export function circlePerimeter(radius: number, pi = 3.14): number {
  return 2 * pi * radius;
}

/** حجم استوانه: مساحت قاعده × ارتفاع */
export function cylinderVolume(radius: number, height: number, pi = 3.14): number {
  return circleArea(radius, pi) * height;
}

/** تمام درس‌های یک فصل یا کل کتاب */
export function allLessons(chapters: Chapter[], chapterId?: string): Lesson[] {
  return chapters
    .filter((c) => chapterId === undefined || c.id === chapterId)
    .flatMap((c) => c.lessons);
}
