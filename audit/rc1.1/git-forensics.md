# RC1.1 — Git Forensics

**تاریخ:** ۲۰۲۶-۱۱-۱۱ (UTC) · **شاخهٔ candidate:** `mission/release-rc1` · **مبنا:** `origin/main@ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0`

## ۱. premise مأموریت — نتیجهٔ جرم‌شناسی

بریف RC1.1 «شاخهٔ محلی `mission/release-rc1` و چهار commit گزارش‌شده» را مبنای کار قرار داده بود. بررسی کامل:

| روش بررسی | نتیجه |
|---|---|
| `git branch -a` | شاخه وجود نداشت |
| `git for-each-ref refs/heads refs/remotes` | فقط: adaptive-learning، main (77a5a38)، prototypes/interactive-learning (93680a3)، origin/main، origin/mission-2r/rtl-core |
| reflog کامل (`git reflog --all`) | هیچ ردی از ساخت/checkout شاخهٔ rc1؛ آخرین رخداد 93680a3 (۱۰ روز قبل) |
| `git worktree list` | یک worktree (اصلی) |
| `git stash list` | خالی |
| `git fsck --no-reflogs` | فقط یک dangling commit قدیمی (2a0f508 — amend مربوط به مأموریت‌های قبل) |
| `git cat-file --batch-all-objects` | ۶۸ commit object — هیچ‌کدام از «چهار commit گزارش‌شده» در object database نیست |

**حکم:** شاخهٔ `mission/release-rc1` و چهار commit گزارش‌شده هرگز وجود نداشتند (fake-claim pattern — سومین مورد در تاریخ پروژه بعد از `b6471d3` و `355a1de`).

## ۲. وضعیت واقعی ریموت (بعد از fetch)

- `origin/main` از `77a5a383` به `ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0` حرکت کرده (merge PR #1 از `mission-2r/rtl-core` — ۲۸ ساعت قبل).
- commitهای rtl-core روی main: `ed18923` (core mathBidi)، `41d5793` (lesson-page)، `5dc87ad` (evidence)، `c43a773` (Agent 5 قبولی)، `a7e1302` (baseline SHAs).
- فیکس `15e954a` محلی (شاخهٔ prototypes) مسیر متفاوت و محتوای متفاوت دارد — فیکس ریموت مستقل و کامل‌تر است (۱۴۸ خط + ۳۹۰ خط تست).

## ۳. بازسازی candidate

```
git fetch origin                     # origin/main → ee0d0db
git branch mission/release-rc1 ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0
```

اثبات پایه (evidence 02): merge-base = HEAD = origin/main = `ee0d0db`، tree یکسان `1f30bc9f…`، صفر انحراف اولیه.

## ۴. reset محیط در میانهٔ مأموریت

سندباکس به snapshot قبل از جلسه برگشت (شاخهٔ candidate و شواهد ناپدید شدند) — ثبت در `raw-evidence/00-env-reset.txt`. همهٔ شواهد با اجرای مجدد در همین جلسه بازتولید شد؛ هیچ ادعایی از جلسهٔ ازدست‌رفته به‌عنوان «تأییدشده» ثبت نشده است.

## ۵. commitهای candidate (پس از اصلاحات)

| SHA | موضوع |
|---|---|
| `febaf4f` | fix(a11y): نام accessible گزینه‌ها «گزینه N: مقدار» + ۸۸ تست |
| `d4eab7d` | feat(rtl): گرامر پرانتز + پوشش کامل مسیرهای رندر + کپی تمیز + ۲۷ تست |
| `3758f9f` | fix(a11y): اصلاحات کنتراست + verification فوکوس + reduced-motion + ۴۷ تست |
| `7f3120c` | fix(a11y): گرادیان emerald کارت گام بعدی + یادداشت دستیار — ۰ خطا در ۳۲۷ نمونه |

**main و origin/main دست‌نخورده:** `main` محلی هنوز `77a5a383` و `origin/main` = `ee0d0db` (فقط fetch؛ هیچ push/merge/tag انجام نشده).

## ۶. diff-check

`git diff --check origin/main...HEAD` → تنها هشدارهای whitespace در فایل‌های evidence **از قبل موجود روی main** (`audit/mission-2/post-audit-evidence/*.patch` — محتوای وراثتی merge PR #1، نه تغییرات RC1.1).
