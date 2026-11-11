# RC1.1 — Final Release Readiness

**candidate:** `mission/release-rc1` @ `aa601b34d77667c208bc2fbd68f39c2aa80ae42e` · **مبنا:** origin/main `ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0`

## تصمیم: PASS WITH LIMITATIONS (آمادهٔ RC؛ push/merge/tag/deploy منتظر تأیید مالک)

## چک‌لیست انتشار

| مورد | وضعیت |
|---|---|
| premise جعلی مأموریت ثبت و بازسازی شد (rc1 هرگز وجود نداشت) | ✅ git-forensics.md |
| candidate دقیقاً از آخرین origin/main ساخته شده (tree یکسان در مبنا) | ✅ evidence 02 |
| گیت‌ها از clone تازه: tsc/lint/497 تست/build | ✅ byte-identical `c4879704…` |
| RTL: گرامر پرانتز + پوشش کامل مسیرها + اثبات ماشینی ترتیب بصری ۵/۵ | ✅ render-path-matrix.md |
| کپی تمیز (بدون نویسهٔ کنترلی) | ✅ + تست |
| a11y: accname گزینه‌ها، کنتراست ۰/۳۲۷+۲۰۴، فوکوس 3px، reduced-motion | ✅ accessibility-report.md |
| SW/offline از بیلد واقعی | ✅ (تأیید کش post-deploy pending) |
| مستندات ۱۱گانه + شواهد خام + اسکرین‌شات | ✅ audit/rc1.1/ |
| رأی ممیز مستقل از clone تازه | ✅ PASS WITH LIMITATIONS |
| main/origin-main دست‌نخورده؛ بدون push/merge/tag/deploy | ✅ |

## محدودیت‌های غیرمسدودکننده

1. L3 — Ctrl+F عرض مرز جزیره (بدون نمونهٔ واقعی)
2. L4 — پرانتز تودرتو محافظه‌کارانه
3. ENV-1 — تأیید حذف کش قدیمی SW پس از deploy
4. CI ریموت پس از اجازهٔ push

## محتوای candidate (۵ commit)

`febaf4f` accname گزینه‌ها · `d4eab7d` گرامر پرانتز+پوشش رندر+کپی · `3758f9f` کنتراست+فوکوس+reduced-motion · `7f3120c` گرادیان emerald+دستیار · `aa601b3` شواهد و مستندات

## آمار تست نهایی: ۴۹۷/۴۹۷ در ۲۸ فایل (از ۳۴۵ مبنا → +۱۵۲ تست جدید RC1.1)
