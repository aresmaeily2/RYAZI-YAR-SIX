# BROWSER QA RUN LOG — 2026-11-21 (final state, HEAD e1eecae)
Environment: headless Chromium via built-in tool, dev server 127.0.0.1:3000, fresh profile per run.
Screenshots referenced are harness-captured (IDs below) — passed states.

## Run A — dashboard + navigation (390×844)
- Steps: load / → assert «ریاضی‌یار» → click tab درس‌نامه و تمرین → assert «الگوهای عددی»
- PASS. pageErrors:0 consoleErrors:0 networkFailures:0 horizontalOverflow:false. Screenshot 1aedb4b573d45eb2.png
- Content verified in DOM: 7 chapters (فصل ۱..فصل ۷), 24 lessons, 98 questions; lesson detail with conceptual steps, worked example (3×20+1=61), golden tip, 4 graded exercises.

## Run B — analytics tab (390×844)
- Steps: click گزارش پیشرفت → assert analytics panel
- PASS. 0/0/0/overflow:false. Screenshot 6fb2271827c8d3ef.png
- Verified: total attempts, correct answers, mastery %, per-chapter bars, error diagnosis area, parent/coach skill report, backup download/restore (device-only privacy note).

## Run C — exam tab + comprehensive exam start (390×844)
- Steps: click آزمون → click «آزمون جامع کل کتاب» → assert «پرسش»
- PASS. 0/0/0/overflow:false. Screenshot 464c04fabf55c09a.png
- Verified: exam picker lists 98-question comprehensive exam + per-chapter exams (16,16,16,12,12,12,14 questions); exam view shows «۰ از ۹۸ پرسش پاسخ داده شده» and end-exam scoring button. Question types rendered: numeric input AND MCQ radio groups.

## Run D — answer flows (390×844)
- Steps: dashboard → «ادامه آخرین درس: الگوهای عددی و رابطه عمومی» → type 21 → بررسی و تصحیح پاسخ → assert «آفرین»
- PASS. 0/0/0/overflow:false. Screenshot f95d4f9ae1d4fd82.png
- Verified: feedback «آفرین! پاسخ درست است (+۱۵ امتیاز).» + step explanation (17+4=21); score went 0→۱۵; streak ۱ روز; exercise re-practice button shown.

## Run E — persistence across reload (390×844)
- Steps: answer correctly → goto / (fresh reload) → assert «۱۵» on dashboard
- PASS. 0/0/0/overflow:false. Screenshot 95a23426c03f8d5e.png
- Verified: score ۱۵ and streak ۱ روز persisted via localStorage after full page reload; recommended next step updated («تمرین همان سطح»).

## Run F — desktop viewport (1280×900)
- Steps: load / → assert «ریاضی‌یار»
- PASS. 0/0/0/overflow:false. Screenshot in earlier run log (acb4cf96…).

## Console/network across ALL runs
0 page errors, 0 console errors, 0 network failures, no horizontal overflow — every run.
