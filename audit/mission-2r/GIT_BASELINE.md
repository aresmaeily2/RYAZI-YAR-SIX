# GIT_BASELINE.md — وضعیت مبنای Git (Agent 1)

**مأموریت:** MISSION-2R — تکمیل اصلاح هسته RTL و نمایش ریاضی
**تاریخ اجرا:** 2026-11-09 (UTC)
**اجراکننده:** Agent 1 — Git & Backup Guardian

---

## ۱. حقیقت محیط اجرا (یافته بحرانی)

این مأموریت در sandbox تازه‌بازیافت‌شده آغاز شد. فضای کاری `/home/z/my-project` خالی بود
(فقط commit اولیه sandbox). وضعیت ثبت‌شده:

| بررسی | فرمان | نتیجه |
|---|---|---|
| فضای کاری | `ls -la /home/z/my-project` | فاقد پروژه؛ فقط `.git` با commit `4fc62cb` (پوسته sandbox) |
| جستجوی `mathBidi.ts` | `find /tmp /var/tmp /home/z /home/sync -name '*.ts' -path '*math*'` | هیچ فایلی یافت نشد |
| جستجوی باندل SIX | `find ... -name '*.bundle'` | فقط باندل‌های پروژه پایه اول (`riazi_yar_stage-*`)؛ هیچ باندلی برای RYAZI-YAR-SIX |
| جستجوی متن POST-AUDIT / `355a1de` / `MISSION-2` | `rg` روی کل فضاهای نگهداری‌شده | هیچ نشانه‌ای یافت نشد |

**نتیجه:** مخزن محلیِ زنجیره قبلی مأموریت-2 (که POST-AUDIT روی آن اجرا شده بود) در بازیافت sandbox از بین رفته است.
طبق قوانین مأموریت‌های این زنجیره (ممنوعیت Push)، آن کامیت‌ها هرگز به ریموت رانده نشده‌اند.

## ۲. بازیابی از منبع معتبر (ریموت رسمی مالک)

مخزن عمومی رسمی مالک شناسایی و بدون احراز هویت (فقط-خواندنی) بازیابی شد:

```text
URL: https://github.com/aresmaeily2/RYAZI-YAR-SIX
 Clone: git clone https://github.com/aresmaeily2/RYAZI-YAR-SIX.git
 نتیجه: موفق — هیچ تغییر ریموتی انجام نشد (فقط fetch/clone)
```

## ۳. راستی‌آزمایی SHAهای اعلامی مأموریت

روی کل تاریخچه ریموت (شامل همه refها و tagها) بررسی شد:

```text
$ git ls-remote origin
77a5a383e9785be9ce8ad02cdee403cb339e33e3        HEAD
77a5a383e9785be9ce8ad02cdee403cb339e33e3        refs/heads/main
903d0a9a18a02e0466d090cdac8e6cef3815c888        refs/tags/audit-accepted-final
2993c704637ca78594eca6bad9d45bde7f9dee40        refs/tags/audit-accepted-final^{}
```

| SHA اعلامی | ادعا | نتیجه راستی‌آزمایی (`git rev-parse --verify SHA^{commit}` روی همه refها) |
|---|---|---|
| `93680a3` | «نسخه مرجع» | **یافت نشد** — روی ریموت وجود ندارد |
| `15e954a` | «آخرین اصلاح معتبر؛ HEAD فعلی حاوی آن است» | **یافت نشد** — روی ریموت وجود ندارد |
| `355a1de` | (ادعای گزارش قبلی) | **یافت نشد** — با یافته POST-AUDIT سازگار است |

**تفسیر صادقانه:** سه SHA فوق به مخزن محلیِ بازیافت‌شده زنجیره قبلی تعلق داشتند که در بازیافت sandbox نابود شد.
گزارش POST-AUDIT روی آن مخزن محلی اجرا شده بود؛ ادعای «HEAD فعلی حاوی `15e954a`» فقط درباره همان مخزن گمشده صادق بود و امروز قابل بازتولید نیست.

## ۴. مبنای واقعی و قابل اثبات کار

```text
HEAD (main و origin/main): 77a5a383e9785be9ce8ad02cdee403cb339e33e3
پیام: audit(redesign): Math Slate evidence pack — ...
درخت: 252 فایل
ابزار: Node v24.22.2 / npm 11.19.1
تست مبنا: 306/306 PASS (npx vitest run — لاگ خام: raw-logs/baseline_test.log)
```

**نکته درباره «۳۸۶ تست»:** عدد ۳۸۶ مربوط به مخزن محلیِ گمشده بود (۳۰۶ تست ریموت + ~۸۰ تست افزوده‌شده در زنجیره مأموریت-2).
مبنای قابل اثبات امروز ۳۰۶ تست است. تست‌های جدید مأموریت-2 روی همین مبنا اضافه می‌شوند و شمار نهایی پس از اجرا در TEST_RESULTS.md ثبت می‌شود.

**نکته درباره `mathBidi.ts`:** در مبنا `77a5a38` این فایل وجود ندارد (`find . -name '*mathBidi*'` خالی).
تنها قاعده bidi موجود، کلاس CSS `.ltr-nums` (خط ۶۷ `src/index.css`) است که در چهار نقطه استفاده شده
(`App.tsx:341` formulaBox، `StepSolverAnimation.tsx:26,30`، `InteractiveLabs.tsx:59,62,127`، `LessonFlowPlayer.tsx:403`).
مؤلفه‌های نمایش سؤال/گزینه/بازخورد (`QuestionCard.tsx`) هیچ جداسازی bidi ندارند.
بنابراین Agent 2 باید هسته کامل `mathBidi.ts` را **بسازد** — با پوشش کامل ٪/%، ٬/،/، و همه عملگرها طبق §۳ مأموریت.

## ۵. شاخه کاری مستقل

```text
$ git checkout -b mission-2r/rtl-core
Switched to a new branch 'mission-2r/rtl-core'
main        → 77a5a383e9785be9ce8ad02cdee403cb339e33e3  (دست‌نخورده)
origin/main → 77a5a383e9785be9ce8ad02cdee403cb339e33e3  (فقط-خواندنی؛ هیچ push انجام نشد)
```

## ۶. قفل ممنوعیت‌ها

- Push/Merge/Deploy: ممنوع — هیچ فرمان push/merge به مخزن ریموت اجرا نشده است.
- `main` محلی: روی `77a5a38` ثابت می‌ماند (مقایسه نهایی در §۹ همین سند و FINAL_ACCEPTANCE_REPORT).
- `origin/main`: هیچ عملیات نوشتن روی ریموت انجام نشده است.

## ۷. Commit اصلاحی نهایی مأموریت (ثبت‌شده پس از commit واقعی)

```text
FIX COMMIT (هسته + تست‌ها):        ed1892359a35bbfb93eca5b0468df2598841ce15
FIX COMMIT (مثال‌های صفحهٔ درس):   41d57935e7f398a6cbb9929597fdfa50798f4b72
EVIDENCE COMMITS:                  5dc87ad39f1fb6bc7ad272e684ad8725dbb3d7d8
                                   c43a773e78bc367286e626e215034e63c824f83c
BRANCH:                            mission-2r/rtl-core
BASE (دست‌نخورده):                 77a5a383e9785be9ce8ad02cdee403cb339e33e3  (main = origin/main)
```
