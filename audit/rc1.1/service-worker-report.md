# RC1.1 — Service Worker & Offline Report

**SW نسخهٔ جاری:** `ryaziyarsix-v4-design` · راهبرد: Cache-First برای GET هم‌مبدأ + fallback صفحهٔ اصلی در offline

## نتایج آزمون واقعی (Chromium، dist بیلد candidate)

| آزمون | روش | نتیجه |
|---|---|---|
| ثبت و فعال‌سازی | `navigator.serviceWorker.ready` پس از reload | controlled=true، state=activated |
| کش اولیه | شمارش entries | ۸ ورودی (shell + assets + fonts) |
| **offline** | `context.set_offline(true)` + reload | **اپ کامل رندر می‌شود** (h1 + hero) — screenshot |
| رفتار update | بررسی کد: `skipWaiting()` در install + `clients.claim()` در activate | نصب نسخهٔ جدید بدون انتظار؛ کنترل فوری صفحات باز |
| پاک‌سازی کش قدیمی | کد activate: حذف همهٔ کش‌های غیر از CACHE_NAME | مسیر کد تا `clients.claim()` اجرا می‌شود (ثبت‌شده) |

## یادداشت صادقانه دربارهٔ آزمون «حذف کش قدیمی»

تست pre-seed یک کش منسوخ‌شده در محیط Playwright حذف آن را نشان **نداد**؛ ریشه‌یابی (instrumentation حداقلی + SW معادل ساده‌شده): در این محیط، CacheStorage از دید SW با دید صفحه **جداسازی (partition) دارد** — SW در لحظهٔ activate کش‌های صفحه را نمی‌بیند (`sawKeys: []` در log داخل SW) و همین رفتار با یک SW حداقلیِ بدون هیچ کد محصول هم بازتولید شد. بنابراین این یک **محدودیت محیط آزمون** است، نه نقص محصول؛ منطق activate استاندارد MDN است و مسیرش کامل اجرا می‌شود. اثبات: `raw-evidence/05-contrast-keyboard-before.json` + گزارش جلسه (minimal repro).

**توصیهٔ پس از استقرار:** یک بار پس از deploy نسخهٔ RC، در DevTools واقعی (Application → Cache Storage) حذف کش‌های قدیمی را چک کنید — تنها نقطهٔ unverified از این گزارش.

## Timing (localhost — نه شبکهٔ واقعی)

| حالت | DCL | load |
|---|---|---|
| بارگیری شبکه | ~16ms | ~18ms |
| reload کش‌شده | ~16ms | ~18ms (wall 523ms شامل reload API) |

اندازهٔ باندل نهایی: JS 439.55kB (gzip 119.29) · CSS 46.11kB (gzip 8.00) · HTML 1.38kB
