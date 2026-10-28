import type { AttemptRecord } from '../types/curriculum';
import type { MisconceptionCode } from './types';

/**
 * سنجه‌های اثربخشی (مأموریت §۱۳) — محاسبه شفاف از شواهد.
 * هشدار علمی: بهبود امتیاز در همان تمرین، اثبات یادگیری ماندگار نیست؛
 * آزمون فوری و آزمون تأخیری جدا نگه داشته شده‌اند و این سنجه‌ها برای
 * پایش محصول‌اند، نه ادعای برتری نسبت به پلتفرم‌های دیگر.
 */

export interface EffectivenessMetrics {
  /** دقت مستقل (بدون راهنما) در کل تلاش‌ها */
  independentAccuracy: number;
  /** میزان وابستگی به راهنما (سهم تلاش‌های با راهنما) */
  hintRelianceRate: number;
  /** نرخ تکرار مقوله خطای قبلی در پاسخ‌های نادرست */
  errorRepetitionRate: number;
  /** موفقیت در سنجش انتقال (مسئله با ظاهر متفاوت) */
  transferSuccessRate: number | null;
  /** موفقیت در مرور تأخیری */
  delayedReviewSuccessRate: number | null;
  /** تعداد تلاش‌ها که مبنای محاسبه است */
  totalAttempts: number;
  /** هشدار نمونه کوچک */
  smallSample: boolean;
}

const SMALL_SAMPLE_THRESHOLD = 10;

export function computeEffectivenessMetrics(attempts: AttemptRecord[]): EffectivenessMetrics {
  if (attempts.length === 0) {
    return {
      independentAccuracy: 0,
      hintRelianceRate: 0,
      errorRepetitionRate: 0,
      transferSuccessRate: null,
      delayedReviewSuccessRate: null,
      totalAttempts: 0,
      smallSample: true,
    };
  }

  const sorted = [...attempts].sort((a, b) => a.timestamp - b.timestamp);

  // دقت مستقل و وابستگی به راهنما
  const independent = sorted.filter((a) => a.hintsUsed === 0);
  const independentAccuracy = independent.length > 0 ? independent.filter((a) => a.isCorrect).length / independent.length : 0;
  const hintRelianceRate = sorted.filter((a) => a.hintsUsed > 0).length / sorted.length;

  // نرخ تکرار خطا: در پاسخ نادرست، آیا مقوله خطای قبلاً دیده‌شده تکرار شده است؟
  // مقوله از متن تشخیص استخراج می‌شود؛ تلاش‌های بدون تشخیص در این سنجه دخیل نیستند.
  const seenErrors = new Set<string>();
  let wrongWithDiagnosis = 0;
  let repeatedErrors = 0;
  for (const a of sorted) {
    if (a.isCorrect) continue;
    const key = a.diagnosedMisconception ?? `no-diagnosis:${a.questionId}`;
    if (a.diagnosedMisconception) {
      wrongWithDiagnosis += 1;
      if (seenErrors.has(key)) repeatedErrors += 1;
      seenErrors.add(key);
    }
  }
  const errorRepetitionRate = wrongWithDiagnosis > 0 ? repeatedErrors / wrongWithDiagnosis : 0;

  // انتقال و مرور تأخیری (جدا از آزمون فوری)
  const transfer = sorted.filter((a) => a.source === 'transfer');
  const transferSuccessRate = transfer.length > 0 ? transfer.filter((a) => a.isCorrect).length / transfer.length : null;
  const reviews = sorted.filter((a) => a.source === 'review');
  const delayedReviewSuccessRate = reviews.length > 0 ? reviews.filter((a) => a.isCorrect).length / reviews.length : null;

  return {
    independentAccuracy,
    hintRelianceRate,
    errorRepetitionRate,
    transferSuccessRate,
    delayedReviewSuccessRate,
    totalAttempts: sorted.length,
    smallSample: sorted.length < SMALL_SAMPLE_THRESHOLD,
  };
}

/** تجمیع مقوله‌های خطا در کل تلاش‌ها (برای گزارش والد) */
export function aggregateErrorCounts(
  attempts: AttemptRecord[],
  mapDiagnosis: (diagnosis: string) => MisconceptionCode
): Partial<Record<MisconceptionCode, number>> {
  const counts: Partial<Record<MisconceptionCode, number>> = {};
  for (const a of attempts) {
    if (a.isCorrect) continue;
    const code = a.diagnosedMisconception ? mapDiagnosis(a.diagnosedMisconception) : undefined;
    if (code) counts[code] = (counts[code] ?? 0) + 1;
  }
  return counts;
}
