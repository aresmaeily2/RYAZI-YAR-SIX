# گزارش وضعیت دقیق Git — انتشار کنترل‌شدهٔ تغییرات ممیزی

مأموریت: بستن پروندهٔ ممیزی ریاضی‌یار ششم | تاریخ: 2026-10-30 | اجرا: عامل انتشار مستقل

## ۱. شناسنامهٔ مخزن (ثبت‌شده پیش و پس از push)

| مورد | مقدار |
|---|---|
| Repository | `https://github.com/aresmaeily2/RYAZI-YAR-SIX.git` (origin) |
| Branch فعلی | `main` |
| HEAD پیش از push | `d39c15e0f98ed88f47d65f7f3df3a03b89e7c1f6` |
| origin/main پیش از push | `1a90e4fa383aefb684e852480448aa35acbd7a01` (نسخهٔ ممیزی‌شدهٔ خط مبنا) |
| وضعیت پیش از push | `ahead 18, behind 0` — واگرایی صفر، درخت کار کاملاً تمیز (۰ فایل تغییرنکرده/untracked) |
| عملیات push | `git push origin main` — **fast-forward** `1a90e4f..d39c15e`، **بدون force**، بدون بازنویسی تاریخچه |
| origin/main پس از push | `d39c15e0f98ed88f47d65f7f3df3a03b89e7c1f6` = HEAD محلی (تأیید با `git ls-remote`) |
| نویسندهٔ هر ۱۸ commit | فقط `aresmaeily2 <aresmaeily2@users.noreply.github.com>` |
| Backup پیش از push | `download/ryazi-yar-six-pre-push-20261030-0740.bundle` (git bundle از تمام شاخه‌ها، ~2.7MB) |

## ۲. فهرست کامل ۱۸ commit ممیزی (از قدیم به جدید)

| # | SHA کامل | عنوان | فایل‌های تغییرکرده | علت تغییر |
|---|---|---|---|---|
| ۱ | `5b2c0c79a81f489d0c25a18681c3440b5c71791c` | audit(phase1): baseline doc + real control outputs | `audit/phase1/BASELINE.md`، `test-output.txt`، `typecheck-lint-output.txt`، `build-output.txt`، `bundle-comparison.txt` (۵ فایل جدید) | تثبیت خط مبنا: اثبات نسخهٔ `1a90e4f`، یکسانی بایت‌به‌بایت باندل زنده، ذخیرهٔ خروجی واقعی ۱۵۷/۱۵۷ آزمون |
| ۲ | `48e70fe09c2d259ed31e63d66cbe802ab61d57b8` | fix(content): q212 two numerically-correct options | `src/data/chapters/ch2.ts`، `tests/contentGolden.test.ts` | ایراد مهم F01: دو گزینهٔ هم‌ارزِ درست (۶/۸≡۳/۴) → جایگزینی با ۶/۷ + آزمون دائمی هم‌ارزی عددی |
| ۳ | `ac03b82d67fb186dfcf5fc5d1f39b9beff729f85` | fix(content): q334 hints taught wrong carry arithmetic | `src/data/chapters/ch3.ts` | ایراد مهم F02: راهنماها حمل امانت نادرست آموزش می‌دادند (۰۵+۶۰=۶۵) + ابهام «تومان هزار» در صورت سؤال |
| ۴ | `29146d646a7f78efce1e9a076e05ded9eb576178` | fix(content): deepest hints leaked final answers | `ch2.ts, ch3.ts, ch4.ts, ch5.ts, ch6.ts` + `tests/contentGolden.test.ts` (۶ فایل، ۱۶ خط راهنما) | ایراد مهم F03: لو رفتن پاسخ نهایی در عمیق‌ترین راهنمای ۱۶ شناسهٔ سؤال (فهرست در پیام commit) نقض قرارداد «بدون افشای پاسخ»؛ + آزمون دائمی نشت روی همهٔ ۹۲ سؤال |
| ۵ | `9fa8badf0d3f292aaa573f8a4e2c4abf5de3cdcb` | fix(content): misconception diagnoses aligned | `src/data/chapters/ch1.ts`، `ch6.ts` | یافتهٔ F16: متن تشخیص سوءبرداشت با سازوکار واقعی گزینهٔ انحرافی نمی‌خواند (q113: 27=3×(n−1)؛ q114: جابه‌جایی مرتبه؛ q621: تخمین ذهنی) |
| ۶ | `804402fabafc544a1e9329344b719600a82c7e7d` | audit(phase2): independent content audit | `audit/phase2/CONTENT_ERRORS.md`، `COVERAGE_MATRIX.md`، `content-scan-output.txt` | مستندسازی ممیزی مستقل ۹۲ سؤال + ماتریس پوشش کتاب (۲۰/۲۷ کامل) |
| ۷ | `83ba8ad5b938084b03407b0ec44d9209ffa9a130` | fix(learning): diagram-interpretation unreachable | `src/learning/errorTaxonomy.ts` | ایراد F04: مقولهٔ «تفسیر نمودار» هرگز فعال نمی‌شد چون کلیدواژه‌های «درصد/مقایسه» پیش از «نمودار/زاویه» ارزیابی می‌شدند |
| ۸ | `acdca19372251801298929759cb1179b93581892` | audit(phase3): 43 independent engine tests | `tests/auditEngineScenarios.test.ts` (جدید، ۴۳ آزمون) | آزمون مستقل گراف مهارت، ۲۰ سناریوی تصمیم، زمان‌بند مرور، تسلط چندشرطی ضدتسلط‌کاذب، طبقه‌بندی خطا |
| ۹ | `d22c3aa83a35c1412e12b2ea2ae9e03eb3c442c9` | audit(phase3): engine correctness report | `audit/phase3/ENGINE_AUDIT.md` | گزارش صحت موتور با جدول‌های تصمیم S01–S20 + اشکالات فاز ۳ |
| ۱۰ | `565d37a427f56391cc183c4dc9ba3e3c2270f82a` | fix(flow)+audit(phase4) | `src/data/flows/ch2l2.flow.ts`، `tests/auditFlowPaths.test.tsx` (جدید) | ایراد مهم F05: ۳ نشت پاسخ در راهنماهای inline جریان پایلوت (a-r1، c-q2، e-m1) + افزودن ۲ مسیر دانش‌آموزی جدید (مجموعاً ۴ مسیر) |
| ۱۱ | `89f2e7ae44537083b96b5369cfc8049a6e3677bf` | audit(phase4): pilot lesson flow report | `audit/phase4/FLOW_AUDIT.md` | گزارش ممیزی A–G درس `ch2l2` با ۴ مسیر شبیه‌سازی‌شدهٔ واقعی |
| ۱۲ | `60f2228b2755ff1a9d50bd2cc7a370ef08569abc` | audit(phase5): dashboard number consistency | `tests/auditDashboardConsistency.test.tsx` (جدید، ۶ آزمون) | تطبیق ۸ کمیت داشبورد/گزارش والد با محاسبهٔ مستقل از دادهٔ واقعی تلاش‌ها |
| ۱۳ | `bdc5d46d86891dae62fb3b0eadd78a1256327f29` | audit(phase5): dashboard audit report | `audit/phase5/DASHBOARD_AUDIT.md` | گزارش ممیزی داشبورد و گزارش والد |
| ۱۴ | `21adf802af313d4a22fbd43033994297f97d2714` | audit(phase6): storage security tests | `tests/auditStorageSecurity.test.ts` (جدید، ۹ آزمون) | خرابی داده→بازسازی ایمن، تاب‌آوری خطای quota، سازگاری دادهٔ نسخهٔ قدیم، رد دستکاری (xp منفی/بی‌نهایت، منبع مفقود، reviewPlan بد)، شناسهٔ ناشناخته |
| ۱۵ | `bb8b5784b46fff018f7b2eb46cf9c4357f1143e9` | audit(phase6): security/privacy report | `audit/phase6/SECURITY_AUDIT.md` | گزارش امنیت، حریم خصوصی و پایداری |
| ۱۶ | `29385e398c70378490ece29183003bc48c54fe1f` | audit(phase7): fix TS/lint issues in audit test files | ۳ فایل آزمون ممیزی + `audit/phase7/final-controls.txt` | پاک‌سازی import/param بلااستفاده در آزمون‌های ممیزی + اجرای مجدد کنترل‌های نهایی (۲۲۰/۲۲۰) |
| ۱۷ | `ffcb643b91bd7155c3d6a0d1db9b198d9030e95e` | audit(phase7): real live-site screenshots | `audit/phase7/screenshots/01..08.png` (۸ فایل) | ۸ تصویر واقعی از نسخهٔ زندهٔ `1a90e4f` فقط با دادهٔ ساختگی آزمایشی |
| ۱۸ | `d39c15e0f98ed88f47d65f7f3df3a03b89e7c1f6` | audit(phase7): FINAL REPORT | `audit/phase7/FINAL_REPORT.md` | گزارش نهایی ممیزی ۷ فاز — تصمیم: ACCEPTED WITH MINOR ISSUES |

**جمع:** ۳۵ فایل، ۱۷۹۴ سطر افزودن، ۲۸ سطر حذف. ۶ commit اصلاحی (۲،۳،۴،۵،۷،۱۰) + ۱۲ commit مستندسازی/شواهد (۱،۶،۸،۹،۱۱،۱۲،۱۳،۱۴،۱۵،۱۶،۱۷،۱۸).

## ۳. توضیح اختلاف اعداد اعلام‌شده (۱۲، ۱۷، ۱۸)

هر سه عدد با یک شمارش مستقل فعلی سازگارند و مربوط به لحظات مختلف نگارش گزارش‌ها هستند:

- **۱۸** = شمار نهایی و واقعی commitهای ممیزی روی خط مبنا (`1a90e4f..d39c15e` = ۱۸، تأییدشده با `git rev-list --count`).
- **۱۷** = شمار commitها در لحظهٔ نگارش «گزارش نهایی ممیزی»؛ متن همان گزارش (بند ۱ و ۹) تصریح می‌کند «۱۷ commit ممیزی (HEAD: `ffcb643`)» — یعنی پیش از commitشدن خودِ گزارش نهایی (که خودش commit شمارهٔ ۱۸ است).
- **۱۲** = شمار commitهای «مستندسازی/شواهد» در تقسیم‌بندی نوع کار (۱۲ مستندسازی + ۶ اصلاحی = ۱۸)؛ گزارش نهایی جدول commitها را با همین تفکیک «۱۱ مستندسازی + ۶ اصلاح» تا `ffcb643` آورده که با افزودن گزارش نهایی به ۱۲ مستندسازی می‌رسد.
- **نتیجه:** هیچ commit گم‌شده یا اضافه‌ای وجود ندارد؛ اعداد، تصاویر لحظه‌ای از یک زنجیرهٔ در حال تکمیل بودند. شمارش مرجع و نهایی: **۱۸**.

## ۴. شاخهٔ نگهدارندهٔ تغییرات ممیزی

- تمام ۱۸ commit ممیزی روی شاخهٔ **`main`** قرار دارند و اکنون در `origin/main` منتشر شده‌اند.
- شاخهٔ محلی `adaptive-learning` در `5c179cb` (پایهٔ پیش از ارتقا) مانده و **هیچ commit ممیزی روی آن نیست** (شواهد: `git merge-base main adaptive-learning` = `5c179cb`؛ `git rev-list --count adaptive-learning..main` = ۲۰ شامل merge ارتقا و `1a90e4f` و ۱۸ commit ممیزی). این شاخه صرفاً بقایای فرایند ارتقاست و با خط ممیزی تداخلی ندارد.

## ۵. عدم ورود تغییرات از پروژهٔ دیگر

- هر ۳۵ فایل تغییرکرده در محدودهٔ همین پروژه‌اند: `src/data/chapters/*` (۶)، `src/learning/*` (۱)، `src/data/flows/*` (۱)، `tests/*` (۵)، `audit/*` (۲۲). **هیچ مسیری خارج از محدودهٔ مخزن وجود ندارد** (بررسی الگویی: صفر مورد).
- نویسندهٔ تمام commitها یک نفر است (aresmaeily2/noreply)؛ هیچ submodule، پوشهٔ خارجی یا فایل آورده‌شده از پروژهٔ دیگری (مثل RIAZI-YAR فلاتر) در diff نیست.
- هیچ تغییری در `src/utils`، `src/components`، `index.html`، workflowها یا تنظیمات build رخ نداده است — یعنی رفتار محصول جز با ۶ اصلاح مستندشده تغییر نکرده است.

## ۶. اصل حفظ تاریخچه

- عملیات push از نوع fast-forward بود؛ **هیچ force-push، rebase تاریخچهٔ منتشرشده یا amend انجام نشد** (`git reflog` بدون تغییر ریشه؛ commitهای مبنا `1a90e4f` و قبل از آن دست‌نخورده باقی هستند).
- گزارش وضعیت پس از هر push در `audit/publish/CONTROLS.md` به‌روزرسانی می‌شود.
