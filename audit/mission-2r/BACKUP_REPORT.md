# BACKUP_REPORT.md — پشتیبان‌گیری قابل بازیابی (Agent 1)

**تاریخ:** 2026-11-09 UTC
**مبنای پشتیبان:** `77a5a383e9785be9ce8ad02cdee403cb339e33e3` (HEAD ریموت رسمی)

## ۱. اقلام پشتیبان

| فایل | محتوا | SHA-256 |
|---|---|---|
| `backup/ryazi-yar-six_baseline_77a5a38.bundle` | باندل کامل git (`--all`: main + tag `audit-accepted-final`) | `9f489f22087685961469b80ed01a46ec834576a3441dff2e9ef06b16ef1e1507` |
| `backup/ryazi-yar-six_worktree_77a5a38.tar.gz` | درخت کاری کامل (بدون node_modules/.git/dist) | `5761a6480515e4087a3ff07659f62caf43bf4fc6b72d463bee29049bbed7ae1b` |

`checksums/SHA256SUMS_backup.txt` هر دو هش را ثبت می‌کند.

## ۲. راستی‌آزمایی باندل پیش از پذیرش

```text
$ git bundle verify audit/mission-2r/backup/ryazi-yar-six_baseline_77a5a38.bundle
The bundle records a complete history.
The bundle uses this hash algorithm: sha1
```

## ۳. دریل بازیابی مستقل (Restore Drill) — انجام شد و PASS شد

```text
$ rm -rf /tmp/restore_drill && mkdir -p /tmp/restore_drill
$ git clone <bundle> /tmp/restore_drill/drill        → موفق
$ cd /tmp/restore_drill/drill
$ git fsck --no-progress                              → خروجی خالی، exit 0
$ git rev-parse HEAD                                  → 77a5a383e9785be9ce8ad02cdee403cb339e33e3
$ git ls-files | wc -l                                → 252 فایل
```

نتیجه: پشتیبان **مستقلاً قابل بازیابی** است؛ HEAD بازیابی‌شده عین مبناست و تاریخچه کامل است.

## ۴. سیاست نگهداری

- فایل‌های پشتیبان قبلی پروژه (باندل‌های `riazi_yar_stage-*` پروژه پایه اول) دست‌نخورده ماندند.
- هیچ پشتیبانی حذف نشد؛ پشتیبان جدید فقط افزوده شد.
- مسیر پشتیبان داخل خود مخزن (`audit/mission-2r/backup/`) است تا همراه بسته تحویل مأموریت منتقل شود.
