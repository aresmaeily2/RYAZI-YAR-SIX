# RC1.1 — Bug Register

قالب هر مورد: شناسه · شدت · مسیر · بازتولید · قبل · اصلاح · رگرسیون · وضعیت

---

## A11Y-H1 — نام accessible گزینه‌ها
- **شدت:** High (صفحه‌خوان مقدار را بدون شمارهٔ گزینه می‌خواند؛ DOM بصری badge را به مقدار می‌چسباند)
- **مسیر:** src/components/QuestionCard.tsx (option button، خط ~142)
- **بازتولید:** DOM زندهٔ q623 → textContent دکمهٔ گزینهٔ ۱ = «۱۳۴۰٬۰۰۰ تومان» (badge+مقدار چسبیده)
- **قبل:** aria-label فقط مقدار؛ accname بدون شمارهٔ گزینه
- **اصلاح:** `aria-label={`گزینه ${toPersianDigits(optIdx+1)}: ${opt}`}` (febaf4f)
- **رگرسیون:** tests/optionAccessibleName.test.tsx (۸۸ تست، همهٔ گزینه‌های MCQ کل curriculum، از طریق درخت دسترس‌پذیری)
- **وضعیت:** ✅ بسته — تأیید در مرورگر زنده

## A11Y-M1 — کنتراست متن‌های کوچک روی tinted backgrounds (۸ موضع)
- **شدت:** Medium (WCAG AA برای متن <18.66px bold: حد 4.5)
- **مسیرها:** QuestionCard.tsx (راهنما، helper عددی، badge گزینه)، App.tsx (متادیتای فصل‌ها، «بی‌پاسخ»، footer، badge درس)، DiagnosticDashboard.tsx («پایه‌ها را محکم کنیم»)
- **قبل/بعد:** 2.56–4.47 → 4.51–6.92 (جدول کامل در accessibility-report.md)
- **رگرسیون:** tests/contrastTokens.test.ts (۳۰ زوج + قرارداد کلاس سورس)
- **وضعیت:** ✅ بسته

## A11Y-M2 — گرادیان کارت «گام بعدی» (سبز) زیر حد AA
- **شدت:** Medium — سفید 18px/900 روی emerald-600 = 3.77؛ emerald-50 12px = 3.58
- **مسیر:** DiagnosticDashboard.tsx:141
- **اصلاح:** گرادیان `from-emerald-800 to-emerald-700` (3758f9f+7f3120c) → همهٔ متن‌های کارت ≥4.84
- **رگرسیون:** contrastTokens (emerald pairs) + قرارداد سورس
- **وضعیت:** ✅ بسته

## A11Y-M3 — یادداشت تشویق دستیار
- **شدت:** Medium — slate-500 روی brand-50 = 4.26
- **مسیر:** AssistantPanel.tsx:48
- **اصلاح:** slate-600 (7f3120c) → ~6.0
- **رگرسیون:** قرارداد سورس در contrastTokens
- **وضعیت:** ✅ بسته

## RTL-H1 — پرانتزهای عبارت ریاضی بیرون جزیره
- **شدت:** High (نمایش `(۳ × ۲۰) + ۱ = ۶۱` در RTL: پرانتزها/عملگرها بین دو جزیره گیر می‌کردند)
- **مسیر:** src/utils/mathBidi.ts (گرامر MATH_RUN)
- **قبل:** فقط زنجیرهٔ ساده؛ پرانتز بیرون جزیره
- **اصلاح:** گرامر گروه پرانتزی یک‌سطح (d4eab7d)؛ محافظه‌کاری حفظ: پرانتزِ متن فارسی/عددِ بدون عملگر دست‌نخورده
- **رگرسیون:** tests/mathBidiParen.test.ts (۲۱) + به‌روزرسانی مستند assertion رندر + visual-order machine check
- **وضعیت:** ✅ بسته

## RTL-H2 — مسیرهای رندر بدون جداسازی (۶ مسیر)
- **شدت:** High (متن ریاضی‌دار بدون جزیره در RTL)
- **مسیرها:** StepSolverAnimation (کپشن گام‌ها، خط پایان، اشتباه رایج)، AssistantPanel (متن پاسخ)، LessonFlowPlayer (narrative/remedial/scenario/rep.label/rep.content/برچسب‌های sequencing)
- **اصلاح:** bidiText روی همه (d4eab7d)
- **رگرسیون:** tests/reducedMotionAndPaths.test.tsx + ماتریس render-path-matrix.md (همه PASS)
- **وضعیت:** ✅ بسته

## RTL-M1 — کپی حاوی نویسهٔ کنترلی bidi
- **شدت:** Medium (چسباندن در ماشین‌حساب/جست‌وجو نویسهٔ نامرئی می‌آورد)
- **اصلاح:** hook `useCleanMathCopy` در App — بازنویسی کلیپ‌بورد بدون کنترل‌ها فقط وقتی انتخاب کنترل دارد (d4eab7d)
- **رگرسیون:** tests/copySanitizer.test.tsx (۶) + تأیید مرورگر واقعی (ClipboardEvent → متن پاک)
- **وضعیت:** ✅ بسته

## ENV-1 — محدودیت محیط آزمون: partitioned CacheStorage (SW vs page)
- **شدت:** Info — محیط Playwright/headless، نه محصول (SW حداقلی هم همان رفتار)
- **وضعیت:** ⚠️ مستند؛ تأیید پس از deploy در DevTools واقعی توصیه‌شده

## LIMIT-1..3 — محدودیت‌های غیرمسدودکنندهٔ محصول
- L2 (قبلاً): حل شد (کپی تمیز)؛ L3: جست‌وجوی عرض مرز جزیره در Ctrl+F؛ L4: پرانتز تودرتو محافظه‌کارانه — هر دو مستند و بدون نمونهٔ واقعی در محتوای فعلی
- **وضعیت:** ⚠️ پذیرفته‌شده
