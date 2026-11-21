# RC1.1 — Render-Path Matrix (بخش ۳)

وضعیت هر مسیر رندر متن ریاضی‌دار. **قبل** = وضعیت روی مبنا ee0d0db؛ **بعد** = وضعیت candidate (HEAD) پس از اصلاحات RC1.1. مکانیزم: `bidiText()` → جزیرهٔ LRI (U+2066)…PDI (U+2069)؛ برای عبارات خالصِ math-only: CSS `.ltr-nums` (direction:ltr + unicode-bidi:isolate).

| # | مسیر رندر | فایل | قبل | بعد | شاهد |
|---|---|---|---|---|---|
| 1 | صورت سؤال (prompt) | QuestionCard.tsx:76,121 | PASS | PASS | tests/mathBidiRender.test.tsx |
| 2 | گزینه‌های MCQ (opt) | QuestionCard.tsx:162 | PASS | PASS | همان + optionAccessibleName |
| 3 | راهنمایی‌ها (hints) | QuestionCard.tsx:128 | PASS | PASS | q623 hints test |
| 4 | توضیح (explanation) + بازخورد + پزشک خطا | QuestionCard.tsx:92,250,254 | PASS | PASS | q623 feedback test |
| 5 | پاسخ قفل‌شده / پاسخ درست | QuestionCard.tsx:80,84 | PASS | PASS | locked test |
| 6 | مثال حل‌شدهٔ درس (formulaBox/problem/steps/finalAnswer) | App.tsx:342,379,384,390 | PASS | PASS | mathBidiRender |
| 7 | worked example جریان (problem/steps text/why/check/commonMistake/finalAnswer) | LessonFlowPlayer.tsx:311-326 | PASS | PASS | mathBidiRender (ch2l2) |
| 8 | completion example + groups + prompts + hint | LessonFlowPlayer.tsx:335-380 | PASS | PASS | همان |
| 9 | sequencing hint | LessonFlowPlayer.tsx:474 | PASS | PASS | همان |
| 10 | **narrative مرحله** | LessonFlowPlayer.tsx:276 | **NOT COVERED** | PASS (اصلاح d4eab7d) | تست جدید flowOperationOrder (seq-slot) |
| 11 | **remedial** | LessonFlowPlayer.tsx:283 | **NOT COVERED** | PASS | اصلاح d4eab7d |
| 12 | **scenario** | LessonFlowPlayer.tsx:289 | **NOT COVERED** | PASS | اصلاح d4eab7d |
| 13 | **rep.label / rep.content (کارت‌های نمایش مرحله C)** | LessonFlowPlayer.tsx:299,301 | **NOT COVERED** | PASS | اصلاح d4eab7d |
| 14 | **برچسب گام‌های sequencing (slot + card)** | LessonFlowPlayer.tsx:424,457 | **FAIL** (متن ریاضی بدون جداسازی) | PASS | flowOperationOrder — assertion به‌روز `۱۲÷۲` جزیره |
| 15 | **کپشن گام‌های solver** | StepSolverAnimation.tsx:165 | **FAIL** | PASS | reducedMotionAndPaths — «اول ضرب: ⁦۲ × ۳⁩» |
| 16 | **خط پایان solver (expressionAfter)** | StepSolverAnimation.tsx:173 | **FAIL** | PASS | همان — «حالا جمع: ⁦۴ + ۶ = ۱۰⁩» |
| 17 | **کپشن اشتباه رایج solver** | StepSolverAnimation.tsx:192 | **FAIL** | PASS | همان — دو جزیرهٔ کامل |
| 18 | عبارت اصلی solver (anim-expression) + mistake.expression | StepSolverAnimation.tsx:24-40,193 | PASS (CSS isolate `ltr-nums` + `dir="ltr"`) | PASS | بدون تغییر — عبارت خالص |
| 19 | **متن پاسخ دستیار** | AssistantPanel.tsx:77 | **FAIL** | PASS | reducedMotionAndPaths — ch6l2 با «درصد = ⁦(زاویه ÷ ۳۶۰) × ۱۰۰⁩» |
| 20 | برگردان narrative/نمودارها/اعداد تزئینی | App/Dashboard | بدون ریاضی (N/A) | N/A | — |

## گرامر — رفتار پرانتز (الزام directive)

| نمونه | قبل | بعد |
|---|---|---|
| `(۳ × ۱) + ۱ = ۴` | پرانتز بیرون جزیره | **یک جزیرهٔ کامل با پرانتزها** |
| `۱۰+۴×(۶−۲)÷۸` | دو جزیرهٔ تکه‌تکه | **یک جزیرهٔ کامل** |
| `(۲/۵)` | جزیرهٔ ۲/۵ + پرانتز بیرون | جزیره با پرانتزها |
| `(۳ × شماره شکل) + ۱` | دست‌نخورده | دست‌نخورده (کلمهٔ فارسی داخل پرانتز — حفظ شد) |
| `(مبلغ تخفیف ۶۰٬۰۰۰ تومان است)` | دست‌نخورده | دست‌نخورده (عدد بدون عملگر داخل پرانتز) |
| پرانتز تودرتو `((۱+۲) × ۳)` | — | سطح داخلی جزیره، بیرونی بیرون (محافظه‌کارانه، مستند در اصل ۸) |

تست رگرسیون: `tests/mathBidiParen.test.ts` (۲۱ تست)؛ assertion قدیمی `mathBidiRender` که رفتار قبل را الزامی می‌کرد، با دلیل مستند به الزام جدید directive به‌روزرسانی شد (تضعیف نشده — الزام عوض شده است).

## نمونه‌های الزامی directive — همه PASS (تست + ماشین)

`مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان` · `۱۰+۴×(۶−۲)÷۸` · `(۳ × ۱) + ۱ = ۴` · `(۲/۵)` · `۵/۰۶ < ۵/۶ < ۵/۶۶` · `۱۰٬۰۰۰ + ۲۵۰`

شاهد ماشینی ترتیب بصری: `raw-evidence/08-visual-order.json` (Range.getClientRects به‌ازای هر نویسه؛ ۵/۵ MATCH + اثبات چیدمان سگمنت‌ها).
