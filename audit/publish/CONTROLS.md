# شاخص شواهد کنترل‌های کیفیت و انتشار — نسخهٔ منتشرشده

مأموریت: بستن پروندهٔ ممیزی | تاریخ: 2026-10-30 | کد محصول: `d39c15e0f98ed88f47d65f7f3df3a03b89e7c1f6`

## ۱. کنترل‌های محلی روی دقیقاً همان SHA منتشرشده (کد محصول)

اجرا: 2026-10-30T07:40:49Z روی HEAD `d39c15e` با درخت کار تمیز (تنها فایل untracked، خودِ پوشهٔ خروجی) — شواهد کامل: `audit/publish/controls/`

| کنترل | نتیجه | خروجی |
|---|---|---|
| آزمون‌ها (vitest run) | **۲۲۰/۲۲۰ سبز** — ۱۴ فایل آزمون | `controls/test-full-output.txt` |
| typecheck (tsc -b) | PASS (exit 0) | `controls/controls-local.txt` |
| lint (eslint .) | PASS (exit 0) | `controls/controls-local.txt` |
| build تولیدی | PASS — `dist/assets/index-8Q5aoPxI.js` (385.46 kB) | `controls/controls-local.txt` |
| هش باندل build | SHA-256 = `111b9c62ca2dc0087423a51f190b657f9de3683871bad9d2534611b26726db5b` | همان فایل |

تطبیق عدد ادعاشده: ۱۵۷ آزمون خط مبنا (تأییدشده در فاز ۱) + ۶۳ آزمون جدید ممیزی (۶۰ آزمون در ۴ فایل اختصاصی + ۳ آزمون رگرسیون در contentGolden که از ۵ به ۸ رسید) = **۲۲۰** ✓

## ۲. CI و Deployment روی SHA منتشرشده

| گردش‌کار | SHA | نتیجه | زمان | لینک عمومی |
|---|---|---|---|---|
| CI | `d39c15e` | ✅ success | 2026-10-30T07:42:02Z → 07:42:37Z | https://github.com/aresmaeily2/RYAZI-YAR-SIX/actions/runs/41021683845 |
| Deploy to GitHub Pages | `d39c15e` | ✅ success | 2026-10-30T07:42:02Z → 07:42:54Z | https://github.com/aresmaeily2/RYAZI-YAR-SIX/actions/runs/41021683761 |

JSON رسمی هر دو اجرا: `audit/publish/ci/ci-run-d39c15e.json` و `deploy-run-d39c15e.json`

## ۳. مقایسهٔ SHA محلی و remote پس از push

- push نوع **fast-forward** `1a90e4f..d39c15e` (بدون force، بدون بازنویسی تاریخچه).
- `git ls-remote origin main` = `d39c15e0f98e…` = HEAD محلی ✓ (ثبت در `GIT_STATE.md` بخش ۱).

## ۴. تأیید زندهٔ نسخهٔ منتشرشده (deployment evidence)

اجرا: 2026-10-30T07:54Z — شواهد: `audit/publish/live-check/`

| کمیت | مقدار |
|---|---|
| نشانی زنده | https://aresmaeily2.github.io/RYAZI-YAR-SIX/ — HTTP **200** |
| باندل سرو‌شده | `assets/index-8Q5aoPxI.js` |
| SHA-256 باندل زنده | `111b9c62ca2dc0087423a51f190b657f9de3683871bad9d2534611b26726db5b` |
| SHA-256 build محلی d39c15e | `111b9c62ca2dc0087423a51f190b657f9de3683871bad9d2534611b26726db5b` |
| مقایسهٔ بایت‌به‌بایت (cmp) | **BYTE-IDENTICAL ✓** |

نتیجه: نسخهٔ زندهٔ GitHub Pages دقیقاً همان SHA منتشرشدهٔ `d39c15e` است.

## ۵. اجرای CI پس از انتشار مستندات تحویل (به‌روزرسانی نهایی)

commit مستندات تحویل `dd24bc45cf108773531291741dd70a2567de72d0` (فقط audit/ — بدون تغییر `src/`):

| گردش‌کار | SHA | نتیجه | زمان | لینک عمومی |
|---|---|---|---|---|
| CI | `dd24bc4` | ✅ success | 2026-10-30T07:56:45Z | https://github.com/aresmaeily2/RYAZI-YAR-SIX/actions/runs/41023187995 |
| Deploy to GitHub Pages | `dd24bc4` | ✅ success | 2026-10-30T07:56:45Z | https://github.com/aresmaeily2/RYAZI-YAR-SIX/actions/runs/41023187987 |

JSON رسمی: `audit/publish/ci/ci-run-dd24bc4.json` و `deploy-run-dd24bc4.json`
بازتأیید زندهٔ پس از deploy: باندل سرو‌شده همچنان `assets/index-8Q5aoPxI.js` با همان SHA-256 `111b9c62…db5b` — بایت‌به‌بایت یکسان (مطابق انتظار: commitهای مستندسازی باندل را تغییر نمی‌دهند).

## ۶. تصاویر تازهٔ نسخهٔ زندهٔ نهایی

`audit/publish/screenshots-final/` (گرفته‌شده 2026-10-30 با مرورگر خودکار، بدون هیچ دادهٔ شخصی):
- `09-live-final-home.png` — داشبورد/خانه (نمای پیش‌فرض) نسخهٔ زندهٔ نهایی
- `10-live-final-parent-report.png` — تب گزارش پیشرفت (گزارش والد) نسخهٔ زندهٔ نهایی

> یادداشت: تمام commitهای پس از `d39c15e` صرفاً مستندسازی‌اند (بدون تغییر `src/`)؛ هش باندل محصول همان `index-8Q5aoPxI.js` است و مقایسهٔ زندهٔ بخش ۴ معتبر می‌ماند.
