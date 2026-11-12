# RC1.1 — Browser QA Report

**ابزار:** Playwright 1.57 + Chromium (headless) · **build:** candidate HEAD `7f3120c` (dist بازسازی‌شده) · **سرور:** http-server محلی از dist

## خلاصهٔ نتایج (raw-evidence/07-after-browser-verification.json)

| سنجه | نتیجه |
|---|---|
| کنتراست (۳۲۷ نمونه، ۴ تب) | **۰ خطا** |
| فوکوس کیبورد (هر ۱۲ ایست Tab) | 3px #4f46e5، fv:true در همه |
| بدون keyboard trap (۴۰ Tab) | بله |
| q623 — accname گزینهٔ ۱ | «گزینه ۱: ۳۴۰٬۰۰۰ تومان» ✓ |
| q623 — جزیرهٔ DOM زنده | `۸۵٪ × ۴۰۰٬۰۰۰ = ۳۴۰٬۰۰۰` ✓ |
| کپی واقعی (ClipboardEvent) | متن بدون هیچ نویسهٔ کنترلی ✓ |
| SW فعال + offline render | ✓ |
| خطای کنسول / pageerror | ۰ / ۰ |
| overflow افقی موبایل ۳۹۰px | ندارد (خانه و درس‌نامه) |
| ترتیب بصری جزیره‌ها (Range rects) | ۵/۵ MATCH منطقی == بصری |

## اسکرین‌شات‌ها (screenshots/)

- `rtl-paren-before-after-1366.png` — BEFORE/AFTER واقعی چ۱، ترکیبی، q623، اعشاری/کسر
- `after-q623-feedback-correct.png` — بازخورد درست q623 در اپ واقعی (option 1 انتخاب، accname، جزیره)
- `after-q623-mobile-390.png`، `after-home-mobile-390.png`، `after-learn-desktop.png`
- `sw-offline-desktop.png` — بارگیری کامل در حالت offline
- `gradient-pixel-truth.png` — مرجع sampling پیکسلی گرادیان‌ها

## روش‌شناسی

- **کنتراست:** همهٔ leafهای متنی؛ پس‌زمینه با پیمایش تا اولین گرادیان/رنگ توپر؛ مقایسه با همهٔ stopها (کران بدترین حالت، بدون میانگین)؛ حالت‌های hover/disabled از کلاس‌ها؛ sampling پیکسلی برای گرادیان‌های کلیدی.
- **فوکوس:** اندازه‌گیری پس از ۳۰۰ms settle (آزمون دکمهٔ خالی ثابت کرد انتقال `transition-all` باعث خوانش 0px در لحظهٔ اول می‌شود — رفتار مورد انتظار، نه باگ).
- **RTL:** علاوه بر تست‌های jsdom، استخراج ترتیب بصری با Range.getClientRects روی Chromium واقعی (raw-evidence/08).
