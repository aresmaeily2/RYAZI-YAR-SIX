# RC1.1 — Accessibility Report (بخش ۱ و ۲)

## بخش ۲ — نام accessible گزینه‌ها (اصلاح‌شده)

**مشکل (ثبت‌شده در evidence جلسه):** textContent دکمهٔ گزینه = badge «۱» + «۳۴۰٬۰۰۰ تومان» به‌صورت چسبیده (حس‌گری «۱۳۴۰٬۰۰۰ تومان»)؛ attribute قبلی `aria-label={opt}` فقط مقدار را اعلام می‌کرد بدون شمارهٔ گزینه.

**علت ریشه‌ای:** badge عدد فارسی داخل span مجزا کنار مقدار؛ accname پیش‌فرض از محتوا ساخته می‌شد.

**اصلاح (febaf4f، در منبع اصلی — نه workaround تست):** `aria-label={`گزینه ${toPersianDigits(optIdx + 1)}: ${opt}`}` + badge با `aria-hidden="true"` (از قبل بود، حفظ شد).

**تست (شبیه‌سازی معتبر صفحه‌خوان):** `tests/optionAccessibleName.test.tsx` — **۸۸ تست**: هر گزینه از همهٔ سؤال‌های MCQ کل برنامهٔ درسی (۴۰+ سؤال):
- `getByRole('radio', { name: 'گزینه N: مقدار' })` از طریق درخت دسترس‌پذیری مطابقت داده می‌شود (همان محاسبهٔ accname صفحه‌خوان‌ها)
- accname !== متن چسبیدهٔ badge+مقدار
- q623 گزینهٔ ۱: متن بصری دو تکه، accname «گزینه ۱: ۳۴۰٬۰۰۰ تومان»

**تأیید مرورگر زنده:** `[aria-label="گزینه ۱: ۳۴۰٬۰۰۰ تومان"]` در DOM واقعی q623 یافت و کلیک شد (raw-evidence/07: accname.q623_opt1=true).

سؤال‌های عددی: label/htmlFor روی input موجود و تست شد.

## بخش ۱.۱ — کنتراست

**روش:** sweep کامل DOM در ۴ تب (۳۲۷ نمونهٔ متنِ واقعی)؛ پس‌زمینه با حل‌کردن گرادیان‌ها تا نزدیک‌ترین لایه (بدون انتخاب رنگ میانی) + مقایسه با همهٔ stopهای گرادیان + sampling پیکسلی از اسکرین‌شات واقعی برای اثبات.

**موضع‌های FAIL یافت‌شده و اصلاح‌شده (۱۰ مورد):**

| # | موضع | قبل | بعد | حد |
|---|---|---|---|---|
| 1 | دکمهٔ راهنما sun-600 روی sun-50 | 3.07 | 4.84 | 4.5 |
| 2 | hover راهنما sun-700 روی sun-100 | — | 4.51 | 4.5 |
| 3 | «پایه‌ها را محکم کنیم» sun-600 روی sun-50 | 3.07 | 4.84 | 4.5 |
| 4 | «بی‌پاسخ» sun-600 روی sun-50 | 3.07 | 4.84 | 4.5 |
| 5 | badge شماره گزینه slate-500 روی slate-100 | 4.34 | 6.92 | 4.5 |
| 6 | «فقط عدد صحیح…» slate-400 روی سفید | 2.56 | 4.76 | 4.5 |
| 7 | «N درس — M پرسش» slate-400 روی سفید | 2.56 | 4.76 | 4.5 |
| 8 | footer slate-400 روی سفید | 2.56 | 4.76 | 4.5 |
| 9 | badge درس سفید روی گرادیان brand-500→violet-600 (۱۲px/۹۰۰) | 4.47 | 6.29 (brand-600) | 4.5 |
| 10 | کارت «گام بعدی»: سفید/emerald-50/emerald-100 روی گرادیان emerald-700→600 | 3.58–3.77 | 4.84–7.68 (emerald-800→700) | 4.5 |
| 11 | یادداشت تشویق دستیار slate-500 روی brand-50 | 4.26 | ~6.0 (slate-600) | 4.5 |

**false alarmهای اثبات‌شده با شواهد قطعی:** نوار ناوبری فعال و hero داشبورد (متن سفید/brand-100/emerald-50 روی گرادیان‌های indigo/violet) — نسبت‌های واقعی نسبت به stopهای دقیق گرادیان: ۴.۶۳ تا ۹.۹۳ (همه ≥ حد). اثبات پیکسلی: `raw-evidence/05-contrast-keyboard-before.json` + `screenshots/gradient-pixel-truth.png`.

**نتیجهٔ نهایی:** ۳۲۷ نمونه — **۰ خطا** (raw-evidence/07: contrast.fails = []).

**رگرسیون:** `src/utils/contrast.ts` (تابع WCAG + جدول ۳۰ زوج قراردادی شامل بدترین stop گرادیان) + `tests/contrastTokens.test.ts` (۳۰ تست + تست «قدیمی‌ها باید همچنان FAIL بمانند» + قرارداد کلاس‌ها در سورس).

## بخش ۱.۲ — کیبورد و فوکوس

- **حلقهٔ فوکوس:** `:focus-visible` (3px solid #4f46e5 + offset 2px) در CSS بیلد موجود و **روی هر ایست Tab فعال است** — اندازه‌گیری بعد از settle انتقال `transition-all` (پروب اولیه که 0px می‌دید، انتقالِ در جریان را می‌سنجید؛ آزمون کنترل با دکمهٔ خالی + انتظار ۳۰۰ms اثبات کرد: هر ایست Tab → 3px بنفش، fv:true — raw-evidence/07: keyboard.traversal)
- **ترتیب Tab:** skip-link → تب‌های ناوبری → لبهٔ آزمایشگاه → «ادامه آخرین درس» → کارت‌های فصل — منطقی
- **بدون keyboard trap:** ۴۰ گام Tab چرخهٔ کامل را می‌پیماید (unique=10، بازگشت به ابتدا)
- **بدون modal:** هیچ dialog/modal در app نیست (exam نتیجه inline است) — ریسک focus-trap وجود ندارد
- **کنترل‌های disabled:** `disabled` + `disabled:opacity-40` + `disabled:cursor-not-allowed` (از Tab خارج و از کلیک محفوظ)
- **Reduced motion:** با reduce → 0 انیمیشن فعال؛ solver autoplay خاموش (تست رگرسیون reducedMotionAndPaths)

## aria موجود (بازبینی شد)

`nav aria-label`، `aria-current`، `role="progressbar"` با aria-valuenow، `aria-hidden` روی همهٔ آیکون‌های تزئینی، `aria-live="polite"` روی feedback/seq-hint، `role="radiogroup"` + `role="radio"` + `aria-checked`، label/htmlFor روی input عددی، skip-link.
