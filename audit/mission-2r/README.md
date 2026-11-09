# README.md — بسته تحویل MISSION-2R

**پروژه:** RYAZI-YAR-SIX (ریاضی‌یار ششم)
**مأموریت:** MISSION-2R — تکمیل اصلاح هسته RTL و نمایش ریاضی
**شاخه کاری:** `mission-2r/rtl-core` (مبنای `77a5a383e9785be9ce8ad02cdee403cb339e33e3` = ریموت رسمی)
**کامیت اصلاحی:** `ed1892359a35bbfb93eca5b0468df2598841ce15` (+ `41d57935e7f398a6cbb9929597fdfa50798f4b72`، شواهد: `5dc87ad39f1fb6bc7ad272e684ad8725dbb3d7d8`)
**حکم پذیرش مستقل:** PASS — `FINAL_ACCEPTANCE_REPORT.md`

## خلاصهٔ یک‌پاراگرافی

شکست نمایشی q623 («مبلغ پرداختی = ۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰ تومان») ریشه در نبودِ جداسازی bidi برای عبارت‌های ریاضی و بستر LTR اجباری formulaBox داشت. هستهٔ جدید `src/utils/mathBidi.ts` با گرامر محافظه‌کارانهٔ `MATH_RUN`/`OP_BETWEEN` (پوشش ٪ U+066A و %، ٬ U+066C و ,، هر سه سامانهٔ عدد، همهٔ عملگرها؛ عدد با جداکنندهٔ هزارگان اتمی؛ بدون معکوس‌سازی؛ idempotent) ساخته و در تمام مسیرهای نمایش (QuestionCard، LessonFlowPlayer، formulaBox و مثال‌های درس) با نویسه‌های استاندارد LRI/PDI ادغام شد. ۳۹ تست رگرسیون جدید (۳۴۵/۳۴۵ کل)، پنج اندازهٔ مرورگر بدون سرریز، مسیر آزمون، و بازتولید مستقل کامل — همه با شواهد خام.

## نقشهٔ فایل‌ها

```text
audit/mission-2r/
├── README.md                     ← همین سند
├── GIT_BASELINE.md               ← Agent 1: وضعیت Git، راستی‌آزمایی SHAها، شاخه کاری
├── BACKUP_REPORT.md              ← Agent 1: bundle + tar + SHA-256 + دریل بازیابی
├── CORE_RTL_FIX.md               ← Agent 2: طراحی گرامر، قواعد محافظه‌کارانه، نقاط ادغام
├── REGRESSION_TESTS.md           ← Agent 3: ۳۹ تست جدید (مثبت/منفی/رندر)
├── BROWSER_QA.md                 ← Agent 4: پنج اندازه، مسیر واقعی + آزمون، شواهد DOM
├── TEST_RESULTS.md               ← جدول گیت‌ها + شمارش تست‌ها + اجرای مستقل
├── FINAL_ACCEPTANCE_REPORT.md    ← Agent 5: حکم نهایی مبتنی بر شواهد خام
├── BUG_REGISTER.csv              ← ۵ یافته (وضعیت هر یک)
├── FIX_REGISTER.csv              ← ۶ اصلاح ↔ یافته ↔ کامیت ↔ شاهد
├── screenshots/                  ← ۲۴ اسکرین‌شات (۵ اندازه × گروه‌ها + مسیر آزمون)
├── browser-evidence/
│   └── dom_evidence.jsonl        ← شواهد خام DOM (JSON در هر اندازه)
├── raw-logs/
│   ├── browser_qa_run.log        ← لاگ کامل مرورگر (۶۹۵ خط)
│   ├── browser_qa_script.sh      ← اسکریپت بازتولیدپذیر QA
│   ├── final_test_run.log        ← ۳۴۵/۳۴۵ (نویسنده)
│   └── audit5_independent_*.log  ← کلون مستقل: test/baseline306/lint/build
├── checksums/
│   ├── SHA256SUMS_backup.txt     ← هش پشتیبان‌ها
│   └── SHA256SUMS_package.txt    ← هش همهٔ اقلام این بسته
└── backup/
    ├── ryazi-yar-six_baseline_77a5a38.bundle
    └── ryazi-yar-six_worktree_77a5a38.tar.gz
```

## نحوهٔ بازتولید (برای ممیز بعدی)

```bash
git clone <این مخزن> && git checkout mission-2r/rtl-core
npm install && npm test        # 345/345
npm run build && npm run preview -- --port 4173
# مسیر: درسنامه و تمرین → فصل ۶ → درصد و کاربردهای آن → q623 → گزینه «۳۴۰٬۰۰۰ تومان» → بررسی
# بازخورد باید شامل قطعهٔ محصور «۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰» باشد (نویسه‌های U+2066…U+2069)
```

## ممنوعیت‌های رعایت‌شده

Push/Merge/Deploy انجام نشد؛ `main` و `origin/main` روی `77a5a38` دست‌نخورده‌اند؛ پشتیبان‌های قبلی حذف نشدند؛ هیچ تست یا مدرکی جعل نشده است.
