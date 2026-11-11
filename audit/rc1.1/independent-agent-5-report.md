# RC1.1 — گزارش ممیز مستقل (Agent 5)

**هویت ممیز:** ایجنت مستقل، بدون سهم در تولید کد RC1.1 · **روش:** clone تازه و تمیز از شاخهٔ candidate + اجرای شخصی همهٔ گیت‌ها و بازتولید نمونه‌ها · **SHA مورد ممیزی:** `aa601b34d77667c208bc2fbd68f39c2aa80ae42e` (candidate HEAD)

## ۱. تاریخچه و SHA مبنا

- clone: `git clone --branch mission/release-rc1 <local-repo> /tmp/agent5-clone` → HEAD = `aa601b34…`
- زنجیره: `aa601b3 → 7f3120c → 3758f9f → d4eab7d → febaf4f → ee0d0db (merge PR #1) → …`
- مبنا درست: والدِ اولین commit یعنی `ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0` = origin/main fetch‌شده ✅

## ۲. عدم تغییر main

`git rev-parse origin/main` = `ee0d0db…` (فقط fetch؛ صفر push/merge/tag) · `main` محلی = `77a5a383` دست‌نخورده ✅

## ۳. گیت‌های اجرای شخصی از clone تازه

| گیت | نتیجه |
|---|---|
| `npx tsc -b` | exit 0 |
| `npx eslint .` | exit 0 |
| `npx vitest run` | **497/497** (۲۸ فایل) |
| `npm run build` | JS 439.55kB (gzip 119.29) · CSS 46.11kB · HTML 1.38kB |
| SHA-256 باندل clone | `c4879704…f2f2f2` (js) · `e8e374dc…` (css) — **byte-identical با build شاخهٔ اصلی** ✅ |

## ۴. بازتولید مستقل RTL و q623 (خروجی خام: raw-evidence/09-agent5-reproduction.json)

- جزیرهٔ DOM زندهٔ q623: `۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰` ✅
- accname گزینهٔ ۱: `گزینه ۱: ۳۴۰٬۰۰۰ تومان` ✅
- کپی واقعی: بدون هیچ نویسهٔ کنترلی bidi ✅
- ترتیب بصری ۵ جزیرهٔ الزامی (Range rects): **۵/۵ MATCH** ✅ (شامل پرانتز `۱۰+۴×(۶−۲)÷۸` و `۵/۰۶ < ۵/۶ < ۵/۶۶`)

## ۵. دسترس‌پذیری و reduced motion

- فوکوس کیبورد پس از settle: 3px `rgb(79,70,229)` + matches(':focus-visible')=true ✅
- sweep کنتراست مستقل (۲۰۴ نمونه، ۳ تب): **۰ خطا** ✅
- reduced-motion: ۰ انیمیشن فعال؛ solver autoplay خاموش (تست 497 شامل آن) ✅

## ۶. Service Worker و offline

- activated، controlled؛ reload در حالت offline → اپ کامل رندر می‌شود ✅
- محدودیت محیطی partitioned CacheStorage مستند (تأیید post-deploy در DevTools واقعی توصیه می‌شود) ⚠️

## ۷. موارد حل‌نشده / محدودیت‌ها (صریح)

1. **L3** — جست‌وجوی Ctrl+F که از مرز جزیره عبور می‌کند، match نمی‌شود (بدون نمونهٔ واقعی در محتوا؛ راه‌حل آینده: Text Search API/segmented text)
2. **L4** — پرانتز تودرتو >۱ سطح پشتیبانی نمی‌شود (محافظه‌کارانه؛ در محتوای فعلی نیست)
3. **ENV-1** — تأیید حذف کش‌های قدیمی SW فقط post-deploy ممکن است (محدودیت محیط تست)
4. **CI ریموت** — به‌دلیل ممنوعیت push، اجرای CI روی GitHub انجام نشده؛ گیت‌ها به‌صورت محلی از clone تازه اجرا و بازتولید شد
5. دادهٔ قبلی مأموریت‌های گذشته (bug-registerهای mission-2/2r) بازبینی نشد — خارج از scope این RC

## ۸. رأی نهایی

# PASS WITH LIMITATIONS

کد، تست‌ها، build و بازتولیدهای مستقل همه سبز و byte-identical هستند؛ انتشار RC برای stage داخلی/آزمون مجاز است. محدودیت‌های بالا مسدودکننده نیستند اما قبل از انتشار عمومی گسترده، تأیید post-deploy کش SW و یک اجرای CI ریموت (پس از اجازهٔ push) توصیهٔ صریح ممیز است.
