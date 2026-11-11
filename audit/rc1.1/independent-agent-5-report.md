# RC1.1 — گزارش ممیز مستقل (Agent 5)

**هویت ممیز:** ایجنت مستقل، بدون سهم در تولید کد RC1.1 · **روش:** clone تازه و تمیز از شاخهٔ candidate + اجرای شخصی همهٔ گیت‌ها و بازتولید نمونه‌ها · **SHA مورد ممیزی:** `aa601b34d77667c208bc2fbd68f39c2aa80ae42e` (ممیزی اولیه) و `37852cea4b23920899461f08460bba35f98c4a6d` (re-audit نهایی پس از بازیابی — بخش ۹)

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

## ۹. تأیید نهایی پیش از push — پس از حادثهٔ sandbox و بازیابی کامل

تاریخ: 2026-11-11 · **وضعیت: متوقف تا صدور مجوز push برای SHA نهایی جدید** · شواهد خام: `raw-evidence/10-incident-recovery.txt`، `11-agent5-fresh-reaudit.txt`، `12-final-prepush-state.txt`

### ۹-۰. حادثه و بازیابی (شفاف و کامل)

- بین دو جلسهٔ کاری، sandbox بازیافت شد: `/tmp` (شامل bundle، cloneهای تازه، node_modules) پاک شد و نسخهٔ پایدارِ volume به وضعیت ≈08:31 UTC برگشت — یعنی تمام commitهای RC1.1، بستهٔ audit و نتیجهٔ تأیید پیش از push (commit `304e6be`) از بین رفتند؛ reflog هیچ اثری از commitهای RC1.1 نداشت.
- منبع بازیابی: `candidate-bundle-37852ce.bundle` (git bundle با تاریخچهٔ کامل، ساخته 10:17 UTC، حفظ‌شده در mirror جلسهٔ قبلی و اکنون در `download/mission-rc1.1/`).
- بازیابی با `git fetch` از bundle و fast-forward سادهٔ `ee0d0db → 37852ce` (بدون force) انجام شد؛ HEAD و tree بازیابی‌شده **دقیقاً** برابر مقادیر ثبت‌شدهٔ پیش از حادثه است: `37852cea…` / `8d63f2c1…` — اثبات رمزنگارانهٔ یکسانی.
- صحت بستهٔ audit: `sha256sum -c` exit 0 (۲۷ فایل)؛ نسخهٔ mirror با repo هم‌بایت است (diff خالی).
- **غیرقابل بازیابی:** commit `304e6be5172952ff63a88a981813b5d6a953f10e` (commit مستنداتِ تأیید پیش از push، ساخته ≈11:41 یعنی بعد از bundle). object محلی حذف، هرگز push نشده، و timestamp دقیقِ commit برای بازتولید بایت‌به‌بایت در هیچ‌جا ثبت نشده است. بنابراین **SHA مصوب مالک قابل push نیست** و طبق بند ۴ دستور، push متوقف شد.

### ۹-۱. کنترل پیش از push روی candidate بازیابی‌شده (هر چهار دستور، خروجی کامل در شواهد خام)

| محیط | HEAD | tree | وضعیت |
|---|---|---|---|
| candidate — مخزن اصلی (بازیابی‌شده) | `37852cea4b23920899461f08460bba35f98c4a6d` | `8d63f2c13be022037fad8ab30057e9c98fea9cbc` | تمیز |
| clone اولیهٔ Agent 5 (`/tmp/agent5-clone`) | `aa601b34d77667c208bc2fbd68f39c2aa80ae42e` | `94535c1ead90a22e377ff109ca2d278a1186370f` | **با sandbox از بین رفت** — معادل‌سازی با نتایج ثبت‌شدهٔ آن در این گزارش (بخش ۳ و ۴) و بازتولید مستقل در ۹-۲ |

- origin/main = `ee0d0db…` (دست‌نخورده) و در مخزن اصلی ancestorِ HEAD است ✅
- remote فاقد شاخهٔ `mission/release-rc1` است (هدف push آزاد)؛ tag از پیش‌موجود `audit-accepted-final` دست‌نخورده.

### ۹-۲. re-clone از صفر و ممیزی مجدد (node v24.22.2 · npm 11.19.1 · git 2.47.3)

clone تازه: `git clone --branch mission/release-rc1 <repo> /tmp/agent5-clone-final` → HEAD و tree دقیقاً برابر candidate (`37852cea…` / `8d63f2c1…`) ✅

| گیت (اجراهای شخصی ممیز از clone تازه) | نتیجه |
|---|---|
| `npm ci` | exit 0 |
| `npx tsc -b` | exit 0 |
| `npx eslint .` | exit 0 |
| `npx vitest run` | **497/497 در ۲۸ فایل** exit 0 |
| `npm run build` | exit 0 — JS 439.55kB (gzip 119.29) · CSS 46.11kB (gzip 8.00) · HTML 1.38kB (gzip 0.67) |

### ۹-۳. محاسبهٔ مجدد SHA-256 باندل نهایی — سه‌طرفهٔ byte-identical (بند ۶ دستور)

| منبع | index js | index css | index html |
|---|---|---|---|
| A — build تازهٔ clone در `37852ce` | `c48797041e43cf55b07b483c1081c374e9ffbd962de10ecb3e49187b75c2f2f2` | `e8e374dc68492e7a27298fe2ab9c9f57f5c8edcec661d19d0374404a8b620f56` | `baefee6b3546fe5ff9fb24006c2a14d769541c1262109f16263cce1693bfeca1` |
| B — build مجدد مخزن اصلی | همان مقدار | همان مقدار | همان مقدار |
| C — مقادیر ثبت‌شدهٔ جلسهٔ پیش از حادثه | همان مقدار | همان مقدار | همان مقدار |

- manifest `checksums.sha256` بازتولید شد و سه فایل `dist/` را هم پوشش می‌دهد؛ `sha256sum -c` در مخزن اصلی exit 0.
- **همان‌بایتیِ سه‌طرفه اثبات می‌کند بازیابی کامل است و باندلِ تولیدی دقیقاً همان باندل مصوب پیش از حادثه است.**

### ۹-۴. وضعیت SHA و شرط ادامه (بند ۴ دستور — صریح)

1. SHA مصوب مالک (`304e6be…`) دیگر وجود ندارد و قابل بازتولید بایت‌به‌بایت نیست (۹-۰).
2. commit مستنداتِ حامل همین بخش ۹ و شواهد ۱۰/۱۱/۱۲ یک SHA **جدید** می‌سازد که پس از commit به مالک گزارش می‌شود.
3. طبق دستور: «اگر SHA متفاوت است … متوقف شو» → **هیچ push، merge، tag و deploy انجام نشده است**؛ ادامه فقط با مجوز کتبی مالک برای SHA جدید.
4. self-reference: اختلاف tree بین snapshot ممیزی‌شده (`37852ce`) و HEAD نهایی فقط فایل‌های `audit/rc1.1/` است (اثبات با `git diff --name-status` پس از commit)؛ چون صفر فایل سورس تغییر می‌کند، باندل byte-identical باقی می‌ماند.
5. احراز هویت GitHub از پیکربندی gh بازیابی‌شده موجود و معتبر است (حساب `aresmaeily2`، scopes: repo/workflow)؛ token هرگز چاپ یا در کد/گزارش/commit ذخیره نشده است.
