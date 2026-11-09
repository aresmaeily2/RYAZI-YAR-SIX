# TEST_RESULTS.md — نتایج رسمی تست‌ها (Agent 3/5)

## ۱. جدول گیت‌های پذیرش — وضعیت نهایی با شواهد

| گیت | شرط مأموریت | وضعیت | شاهد خام |
|---|---|---|---|
| Git | نسخه مرجع و شاخه کاری مشخص | **PASS*** (با یادداشت صادقانه) | `GIT_BASELINE.md` — مبنا واقعی `77a5a38` (ریموت رسمی)؛ سه SHA اعلامی مأموریت روی ریموت وجود ندارند (بازیافت sandbox)؛ شاخه `mission-2r/rtl-core` ساخته شد |
| Backup | بازیابی مستقل موفق | **PASS** | bundle fsck تمیز؛ دریل بازیابی: HEAD=77a5a38، ۲۵۲ فایل (`BACKUP_REPORT.md`) |
| Core | اصلاح واقعی Regex/گرامر | **PASS** | `src/utils/mathBidi.ts` (۱۴۸ خط) — diff واقعی در `git diff 77a5a38..ed18923` |
| Unit | تست‌های مثبت و منفی موفق | **PASS** | ۲۸/۲۸ (`tests/mathBidi.test.ts`) |
| Integration | Render واقعی موفق | **PASS** | ۱۱/۱۱ (`tests/mathBidiRender.test.tsx` — jsdom) |
| E2E | مسیر q622/q623 موفق | **PASS** | مسیر واقعی درس + مسیر آزمون روی بیلد production (`browser-evidence/dom_evidence.jsonl`) |
| Visual | هر پنج اندازه موفق | **PASS** | ۳۲۰×۷۲۰، ۳۹۰×۸۴۴، ۴۳۰×۹۳۲، ۷۶۸×۱۰۲۴، ۱۳۶۶×۷۶۸ — بدون سرریز، بدون پاشیدن عدد، ترتیب درست (`BROWSER_QA.md` + ۲۴ اسکرین‌شات) |
| Regression | تمام تست‌های پروژه موفق | **PASS** | **۳۴۵/۳۴۵** (۳۰۶ مبنای 77a5a38 + ۳۹ جدید) — `raw-logs/final_test_run.log` |
| Build | موفق | **PASS** | tsc -b + vite build پاک — `raw-logs/audit5_independent_build.log` (بازتولید مستقل: باندل یکسان `index-JtwglF6G.js`) |
| Independent Review | PASS | **PASS** | کلون مستقل از باندل پشتیبان → fetch شاخه اصلاح → تکرار کامل گیت‌ها + بازتولید مرورگر q623 (`raw-logs/audit5_*.log`) |

*گیت Git: شرط «نسخه مرجع 93680a3» در این محیط قابل تحقق نبود چون آن commit (و 15e954a) در ریموت رسمی وجود ندارند — یافته مستند و اثبات‌شده در GIT_BASELINE.md §۳؛ کار روی مبنای قابل اثبات رسمی (ریموت مالک) انجام شد.

## ۲. شمارش دقیق تست‌ها

| مرحله | کامیت | فایل‌های تست | تست‌ها | نتیجه |
|---|---|---|---|---|
| مبنا (ریموت رسمی) | `77a5a38` | ۲۱ | **۳۰۶** | ۳۰۶/۳۰۶ PASS — `raw-logs/audit5_independent_baseline_306.log` (اجرای مستقل Agent 5) |
| پس از اصلاح | `ed18923` + `41d5793` | ۲۳ | **۳۴۵** (۳۰۶+۳۹) | ۳۴۵/۳۴۵ PASS — `raw-logs/final_test_run.log` و `raw-logs/audit5_independent_test.log` |

عدد «۳۸۶ تست» در مأموریت به مخزن محلیِ از بین رفته زنجیره قبلی تعلق داشت و در این محیط قابل بازتولید نبود.

## ۳. اجرای مستقل Agent 5 (بدون اتکا به گزارش نویسنده)

```text
منبع:      clone از backup/ryazi-yar-six_baseline_77a5a38.bundle → git fsck OK
شاخه:      fetch از مخزن کاری → checkout audit-branch @ 5dc87ad
npm test:  345/345 PASS (exit 0)          → raw-logs/audit5_independent_test.log
baseline:  306/306 PASS روی 77a5a38       → raw-logs/audit5_independent_baseline_306.log
eslint:    پاک (exit 0)                   → raw-logs/audit5_independent_lint.log
build:     پاک — index-JtwglF6G.js        → raw-logs/audit5_independent_build.log
مرورگر:    بازتولید مستقل q623 روی بیلد همان کلون مستقل:
           needle ۲۵-نویسه‌ای LRI+«۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰»+PDI در بازخورد واقعی یافت شد
           (independent_reproduction_wrapped=true) + بدون سرریز افقی در ۳۹۰×۸۴۴
```

## ۴. وضعیت Git نهایی

```text
main (محلی):        77a5a383e9785be9ce8ad02cdee403cb339e33e3   ← دست‌نخورده
origin/main:        77a5a383e9785be9ce8ad02cdee403cb339e33e3   ← فقط ls-remote؛ هیچ push
mission-2r/rtl-core: 5dc87ad39f1fb6bc7ad272e684ad8725dbb3d7d8  ← نوک شاخه کاری (evidence)
کامیت‌های اصلاحی:   ed18923 (هسته+تست‌ها) ، 41d5793 (مثال‌های صفحهٔ درس) ، 5dc87ad (شواهد)
تغییرات کد:         فقط src/{App.tsx,components/QuestionCard.tsx,components/LessonFlowPlayer.tsx,utils/mathBidi.ts} + tests/{app,mathBidi,mathBidiRender} — خارج از audit/ هیچ فایل دیگری تغییر نکرده است
```
