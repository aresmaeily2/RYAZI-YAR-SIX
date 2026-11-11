import { useEffect } from 'react';

/**
 * useCleanMathCopy — بخش ۳ مأموریت RC1.1
 * =============================================================
 * نمایش عبارت‌های ریاضی در متن فارسی با نویسه‌های کنترلی یونی‌کد
 * (LRI U+2066 / PDI U+2069 و مشابه) محصور می‌شود. این نویسه‌ها برای
 * «نمایش» ضروری‌اند، اما در «متن کپی‌شده» ناخواسته‌اند: در ماشین‌حساب،
 * نوار جست‌وجو یا ویرایشگر، نویسهٔ مخرب/غیرمنتظره حساب می‌شوند.
 *
 * این هوک روی رویداد copy سند گوش می‌دهد و «فقط وقتی» انتخاب کاربر
 * نویسهٔ کنترلی bidi دارد، نسخهٔ پاک‌سازی‌شده را در کلیپ‌بورد می‌نویسد.
 * کپی متن عادی (بدون این نویسه‌ها) کاملاً دست‌نخورده می‌ماند —
 * هیچ preventDefault اضافه‌ای انجام نمی‌شود.
 */

/** نویسه‌های کنترلی جهت‌دهی متن: LRM/RLM، LRE..PDF، LRI/RSI/PDI */
const BIDI_CONTROLS = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/;

/** نسخهٔ جهانیِ همین کلاس‌ها برای replace */
const BIDI_CONTROLS_ALL = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** حذف نویسه‌های کنترلی bidi از متن — پاک (بدون تغییر بقیهٔ نویسه‌ها) */
export function stripBidiControls(text: string): string {
  return text.replace(BIDI_CONTROLS_ALL, '');
}

/** آیا متن شامل نویسهٔ کنترلی bidi است؟ */
export function hasBidiControls(text: string): boolean {
  return BIDI_CONTROLS.test(text);
}

export function useCleanMathCopy(): void {
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      const sel = document.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const text = sel.toString();
      if (!hasBidiControls(text)) return; // متن عادی: هیچ دخالتی نکن
      e.clipboardData?.setData('text/plain', stripBidiControls(text));
      e.preventDefault();
    };
    document.addEventListener('copy', onCopy);
    return () => document.removeEventListener('copy', onCopy);
  }, []);
}
