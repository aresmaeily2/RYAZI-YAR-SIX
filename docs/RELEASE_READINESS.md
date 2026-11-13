# Release Readiness — v1.0.0

Status: **READY AS PRERELEASE** (draft `v1.0.0` prepared; publish gated on the
open-source release PR being reviewed and merged by the owner).

## 1. Acceptance criteria scorecard

| Criterion | Status | Evidence |
|---|---|---|
| All automated checks pass | ✅ | typecheck, ESLint, Vitest (~497 tests), production build — green locally and in CI |
| Production build succeeds | ✅ | `tsc -b && vite build`; deterministic asset hashes (`index-CrETePCt.js`, `index-HPYyQBai.css`) |
| GitHub Pages deployment succeeds | ✅ | `deploy.yml` runs tests+build before upload; `needs: build` guardrail; live at https://aresmaeily2.github.io/RYAZI-YAR-SIX/ |
| MIT License intact | ✅ | `LICENSE` (Copyright (c) 2025 aresmaeily2) unchanged |
| Educational content validated | ✅ | 98/98 questions with explanation + 3 hints + difficulty; 98-key golden master; independent recomputation; see [OPEN_SOURCE_AUDIT.md](OPEN_SOURCE_AUDIT.md) |
| Adaptive logic tested | ✅ | ~120 engine tests: scenarios S01–S34, cycle detection, mastery transitions, review scheduler, healing, anti-false-mastery |
| Privacy claims verified | ✅ | Zero runtime external requests (grep-verified + `serviceWorker.test.ts` contract); local-only storage; export/wipe; see [PRIVACY.md](PRIVACY.md) |
| English documentation complete | ✅ | `README.md` (+ `README.fa.md`), `docs/{OPEN_SOURCE_AUDIT,ARCHITECTURE,CURRICULUM_COVERAGE,TESTING,RELEASE_READINESS,PRIVACY}.md` |
| Release version consistent | ✅ | `package.json` `1.0.0`; draft release `v1.0.0` (prerelease) notes prepared |

## 2. Why prerelease (and not final)

Important acceptance work remains open, so per the release policy the draft is
marked **prerelease**:

1. The open-source release PR (documentation + community files + CI hardening +
   new tests) awaits owner review and merge.
2. Two pilot lessons implement the full A–G instructional flow (`ch2l2`,
   `ch7l3`); the other 22 lessons are the standard tier. Widening flow coverage
   is the main content roadmap item.
3. Adaptive thresholds (0.85 accuracy, 4 independent attempts, 2 distinct
   profiles, [1,3,7,14]-day review intervals) are **configurable engineering
   assumptions**, not validated pedagogical constants — they need
   recalibration against real learner data.

## 3. What v1.0.0 contains

- Complete structural coverage of the official book: 7 chapters, 24 lessons,
  98 questions, 25 worked examples, 4 interactive labs.
- Adaptive engine: prerequisite graph (24 skills, cycle-checked), multi-condition
  mastery policy, spaced repetition ([1,3,7,14] days), 10-code error taxonomy,
  explainable decisions (`reasonCode`), diagnostic dashboards, parent report.
- 2 pilot A–G flows with solver animation, step-sequencing challenge, remedial
  loops and transfer assessment.
- Offline-first PWA (cache-first SW, RTL/fa manifest, local Vazirmatn fonts).
- Privacy by architecture: zero external requests, single localStorage key,
  JSON export/import, one-click wipe.
- Test suite ~497 runtime tests incl. curriculum integrity, golden answer keys,
  engine scenarios, storage corruption/migration, accessibility (85 per-MCQ
  accessible-name cases, 24 contrast pairs), RTL bidi isolation.

## 4. Browser support

| Browser | Support |
|---|---|
| Chrome / Edge (Chromium) ≥ 90 | ✅ target |
| Firefox ≥ 90 | ✅ target |
| Safari ≥ 15 (macOS/iOS) | ✅ target (IndexedDB-free app; localStorage + SW standard) |
| Samsung Internet ≥ 15 | ✅ expected, untested in CI |
| IE 11 | ❌ not supported |

Build target: Vite `esnext`-ish defaults for modern browsers; the app uses no
experimental APIs. Service worker requires HTTPS (GitHub Pages provides it).
Recommended screens: ≥ 360 px wide (mobile-first RTL; 390 px verified in
screenshots).

## 5. Live demo

**https://aresmaeily2.github.io/RYAZI-YAR-SIX/** — installable PWA; after the
first online visit it keeps working offline.

Real screenshots: `docs/screenshots/` (desktop + 390 px mobile) and
`docs/lesson-ch7l3/` (all pilot-flow stages).

## 6. Honest limitations (release notes wording)

- Only the 2 pilot lessons have the full A–G instructional flow; the other 22
  lessons use the standard lesson + adaptive practice path. **No claim is made
  that every lesson implements the full flow.**
- No user studies, no learning-effectiveness claims, no usage statistics —
  none exist. The "effectiveness metrics" in the dashboard monitor product
  usage only and are explicitly labeled as such.
- Adaptive thresholds are engineering assumptions pending recalibration.
- No long-answer question type; automated grading covers MCQ + numeric only.
- `toleratedError` is declared but unused (numeric grading is exact after
  normalization).
- Service worker behavior is covered by source-contract tests, not jsdom
  execution; offline behavior is verified manually.
- Three content strings cite textbook exercise numbers as inspiration
  attribution (not copied content) — flagged for owner review.

## 7. Release process (owner checklist)

1. Review and merge the open-source release PR (feature branch
   `mission/oss-release-prep`).
2. Publish the prepared **draft release `v1.0.0`** (prerelease flag can be
   dropped once flows widen beyond the pilots).
3. Tag `v1.0.0` is created automatically by publishing the release.
4. Verify the Pages deployment from `main` (Actions → Deploy → environment URL).

## 8. Attribution note (owner decision required)

The curriculum is independently authored; structure/titles follow the official
book (code ۶۰۵). Items `ex74`, `q735` and the ch7l3 stage-F narrative mention
textbook exercise numbers (۳ و ۵، ص ۱۴۱) as inspiration provenance. Options:
(a) keep as honest attribution, (b) rephrase to remove page-level references.
Default in this train: kept, clearly documented.
