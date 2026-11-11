# RC1.1 — Final Release Readiness

**candidate:** `mission/release-rc1` — ممیزی اولیه `aa601b34d77667c208bc2fbd68f39c2aa80ae42e` · بازیابی و re-audit نهایی `37852cea4b23920899461f08460bba35f98c4a6d` (بخش ۹ گزارش ممیز؛ پس از حادثهٔ sandbox) · **مبنا:** origin/main `ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0`

## تصمیم: PASS WITH LIMITATIONS (آمادهٔ RC؛ push فقط با مجوز مالک برای SHA نهایی جدید — بخش ۹ گزارش ممیز)

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
| حادثهٔ sandbox: بازیابی کامل از bundle با اثبات tree-identical | ✅ evidence 10 |
| re-audit پس از بازیابی: 497/497 + باندل سه‌طرفهٔ byte-identical | ✅ evidence 11/12 |
| SHA-256 باندل نهایی در manifest ثبت و تطبیق شد | ✅ `c4879704…` js · `e8e374dc…` css · `baefee6b…` html |
| main/origin-main دست‌نخورده؛ بدون push/merge/tag/deploy | ✅ |

## محدودیت‌های غیرمسدودکننده

1. L3 — Ctrl+F عرض مرز جزیره (بدون نمونهٔ واقعی)
2. L4 — پرانتز تودرتو محافظه‌کارانه
3. ENV-1 — تأیید حذف کش قدیمی SW پس از deploy
4. CI ریموت پس از اجازهٔ push

## محتوای candidate (۵ commit + commit مستنداتِ پس از بازیابی)

`febaf4f` accname گزینه‌ها · `d4eab7d` گرامر پرانتز+پوشش رندر+کپی · `3758f9f` کنتراست+فوکوس+reduced-motion · `7f3120c` گرادیان emerald+دستیار · `aa601b3` شواهد و مستندات · `37852ce` گزارش ممیز+readiness+checksums · (+ commit مستنداتِ بخش ۹ پس از بازیابی — SHA جدید، منتظر مجوز مالک)

## آمار تست نهایی: ۴۹۷/۴۹۷ در ۲۸ فایل (از ۳۴۵ مبنا → +۱۵۲ تست جدید RC1.1)
