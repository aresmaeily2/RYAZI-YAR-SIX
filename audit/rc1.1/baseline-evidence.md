# RC1.1 — Baseline Evidence (gates روی مبنا)

**مبنا:** `ee0d0db798c6a767f8fcbf2c9c636468a3d6a8c0` (origin/main پس از merge PR #1)

## گیت‌های اجراشده روی مبنا (قبل از هر اصلاح)

| گیت | فرمان | نتیجه |
|---|---|---|
| Typecheck | `npx tsc -b` | exit 0، بدون خروجی |
| Lint | `npx eslint .` | exit 0، بدون خروجی |
| Test | `npx vitest run` | **۳۴۵/۳۴۵** (۲۳ فایل) در ۲۰.۲۹s — exit 0 |
| Build | `npm run build` | ۱۶۰۲ ماژول، ۲.۶۲s — exit 0 |

## خروجی build مبنا

```
dist/index.html                   1.38 kB │ gzip:   0.67 kB
dist/assets/index-v3mMmXNW.css   46.11 kB │ gzip:   8.00 kB
dist/assets/index-JtwglF6G.js   438.89 kB │ gzip: 118.99 kB
```

SHA-256 خروجی‌های مبنا:
- `b710e80e3bfd802c114a5d3bcc8ddc7c08d2610ea089cd7b55398e6b661b7c87`  dist/index.html
- `bad59578e35438cd6cdec1fa4abbedcc61cae68934b4dc89c8fe2073e010149b`  dist/assets/index-v3mMmXNW.css
- `4eea3267f5030cfb933e8acf3d4cfd3303fa8fe55f4d062ef044222e856c41f8`  dist/assets/index-JtwglF6G.js

## ماتریس RTL مستقل روی مبنا (Agent 2 — قبل از اصلاحات)

اسکریپت مستقل (esbuild-bundle از `src/utils/mathBidi.ts` مبنا + دادهٔ واقعی curriculum):
- **۳۳/۳۳ PASS** — نمونه‌های الزامی، idempotency، حفظ ترتیب منطقی، edge caseها
- ۲۵۸۷ رشتهٔ محتوایی: صفر بازچینی؛ ۶۸۶ رشته جزیره می‌گیرند؛ بقیه byte-identical
- یافته‌ها: L1 (پرانتز بیرون جزیره — همان موردی که بخش ۳ directive اصلاح شد)، L2 (کپی حاوی نویسهٔ کنترلی — با useCleanMathCopy حل شد)، L3 (جست‌وجوی عرض مرز جزیره — محدودیت مستند)

شواهد خام: `raw-evidence/04-agent2-rtl-matrix.txt` (متعلق به جلسهٔ قبل از reset — نمونهٔ نتیجه؛ اجرای معادل در candidate نهایی با تست‌های vitest 497 و 08-visual-order.json بازتولید و قطعی شد).
