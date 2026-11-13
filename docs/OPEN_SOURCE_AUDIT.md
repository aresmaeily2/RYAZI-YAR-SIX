# Open-Source Audit — RYAZI-YAR-SIX

> Independent audit of the whole application, performed for the open-source release
> preparation (Phase 1 of the master engineering task). Every number below was
> extracted from the code and data at commit time and is re-verified by the test
> suite (`tests/curriculumData.test.ts`, `tests/contentGolden.test.ts`,
> `tests/auditEngineScenarios.test.ts`).

- **Repository:** `aresmaeily2/RYAZI-YAR-SIX` — Persian RTL adaptive mathematics
  platform for sixth-grade elementary students (Iranian national curriculum, book
  code ۶۰۵).
- **Stack:** React 18 + TypeScript 5 + Vite 7 + Tailwind CSS 3 + Vitest 5 +
  Testing Library; static SPA deployed to GitHub Pages; offline-first PWA with a
  hand-written service worker.
- **License:** MIT (`LICENSE`, Copyright (c) 2025 aresmaeily2). Unchanged by this
  audit.
- **Scale:** 7 chapters · **24 lessons** · **98 questions** (85 MCQ + 13 numeric) ·
  24 skills · 25 worked examples · 4 interactive labs · 2 multi-stage lesson
  flows · ~9,000 lines of `src/` · 30 test files (~497 runtime tests).

---

## 1. What was audited

| Area | Inspected |
|---|---|
| Curriculum data | `src/data/chapters/ch1..ch7.ts`, `src/data/curriculumData.ts`, `src/types/curriculum.ts` |
| Learning engine | `src/learning/{skills,builder,engine,mastery,review,errorTaxonomy,metrics,assistant,flowLogic,flowTypes,types}.ts` |
| Lesson flows | `src/data/flows/{index,ch2l2.flow,ch7l3.flow}.ts`, `src/components/LessonFlowPlayer.tsx` |
| Assessment | `src/utils/examEngine.ts`, `src/utils/answerChecking.ts` |
| Dashboards | `src/components/DiagnosticDashboard.tsx`, `src/learning/metrics.ts` |
| Persistence | `src/utils/storage.ts`, `src/hooks/useLearnerState.ts` |
| Offline | `public/sw.js`, `public/manifest.webmanifest`, `src/main.tsx` |
| Tests | all 30 files in `tests/` |
| CI / deployment | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml`, `vite.config.ts` |
| Privacy | full grep of `src/`, `public/`, `index.html` for network/telemetry surface |

## 2. Curriculum data findings

**Schema is strict and mostly enforced by the type system.** Every question
requires: unique `id`, `chapterId`, `lessonId`, `difficulty`
(`easy|medium|hard`), `prompt`, **exactly three** `hints` (tuple type),
`explanation`. MCQs additionally require `options`, `correctAnswer` and a
`misconceptions[]` array (per-wrong-option diagnosis + remedial rule). Numeric
questions require `answerKind` and `acceptedAnswers[]`.

Verified coverage over all 98 questions:

| Field | Coverage | Notes |
|---|---|---|
| `explanation` | 98/98 | non-empty |
| `difficulty` | 98/98 | easy 26 · medium 47 · hard 25 |
| `hints` | 98/98 | exactly 3 each (type-enforced) |
| error classification | 94/98 | 91 misconception entries; 4 "trivial fact" MCQs have empty arrays (`q433`, `q532`, `q631`, `q633`) |
| `toleratedError` | 0/13 | declared in schema, consumed with default 0, **never populated** — dead field |
| per-question `skillId` | — | **field does not exist**; skill linkage is lesson-mediated (`lessonId → sk-<lessonId>`) |

**Identifiers.** Question ids follow `q<C><L><N>` (e.g. `q623`); flow-authored
items use `flow-<lesson>-<stage>-<n>`. Global uniqueness was verified by script
(`sort | uniq -d` → zero duplicates) and is asserted by tests. One structural
hazard: the fixed-width `qCLN` scheme collides if a lesson ever grows to a
10th question — fine today (max 6), should be watched when authoring new content.

**Numerals.** All learner-facing strings use Persian digits (۰–۹); all
machine-graded fields (`acceptedAnswers`) use ASCII. Persian/Arabic-Indic
normalization is implemented (`src/utils/mathEngine.ts` →
`normalizeDigitsToEnglish`) and tested. The Iranian textbook convention of `/`
as decimal separator (e.g. `۲/۵` = 2.5) is faithfully preserved — note it is
context-dependent: `۳/۴` means *three-quarters* in ch1/ch2 and *3.4* in
ch3/ch5/ch6/ch7 contexts. Grading is never ambiguous (numeric answers are ASCII
with `.`), but plain-text readers need context.

**Mathematical correctness.** An independent recomputation pass (outside the
existing golden-master test) re-derived ~20 sampled answers across all chapters
and both flows — including `q112`, `q124`, `q134`, `q223`, `q331`, `q342`,
`q521`, `q523`, `q614`, `q714`, `q734`, `q736`, flow transfers `flow-ch2l2-g-t1`,
`flow-ch7l3-c-q2`, `flow-ch7l3-g-t1`. **All correct.** The full 98-key answer
table is additionally locked by a hand-audited golden master
(`tests/contentGolden.test.ts`), and distractors are checked to be non-equivalent
to the correct answer.

**Content ownership.** Content is independently authored, following only the
*structure* of the official textbook (chapter/lesson titles, book code ۶۰۵).
Three data strings cite specific textbook exercises (`ex74` step 4 "طبق تمرین ۳
کتاب", `q735` explanation "تمرین ۵ کتاب، ص ۱۴۱", flow F narrative "تمرین‌های ۳ و
۵ کتاب، ص ۱۴۱") — these reference *which* exercise inspired the item; the item
text itself is not copied. Flagged for owner review in
[RELEASE_READINESS.md](RELEASE_READINESS.md) §Attribution.

## 3. Learning engine findings

The engine is **rule-based, pure and explainable** — a deliberate engineering
choice, documented in code comments as "transparent, rule-based, testable".
Every decision carries a human-readable `reason` **and** a machine-readable
`reasonCode` (16 codes: `PREREQ_NOT_READY`, `FRESH_START_INTUITIVE`,
`REPEATED_MISCONCEPTION`, `LOW_ACC_EASIER`, `TRANSFER_PENDING`,
`CONFIRMED_MASTERY`, …), so any adaptive step can be explained to a teacher or
parent.

- **Mastery policy** (`src/learning/mastery.ts`) is multi-conditional:
  independent (hint-free) accuracy ≥ **0.85** over ≥ **4** independent attempts,
  success in ≥ **2 distinct** question-type/difficulty profiles, a passed
  **transfer assessment** (different-looking problem), and a passed **delayed
  review**. Confidence is a weighted ratio of met conditions (accuracy 3,
  variety 2, transfer 1, review 1 → /7). Three statuses:
  `confirmed-mastery` / `temporary-mastery` / `needspractice`.
- **Review scheduler** (`src/learning/review.ts`): simplified Leitner with
  intervals **[1, 3, 7, 14] days**; hint-free success advances one stage,
  hint-assisted success holds, failure drops two stages (floor 0).
- **Error taxonomy** (`src/learning/errorTaxonomy.ts`): 10 codes
  (`calculation`, `conceptual`, `place-value`, `wrong-method-context`,
  `operation-order`, `unit-conversion`, `problem-reading`, `data-selection`,
  `diagram-interpretation`, `guessing`). Classification is explicitly documented
  as a *hypothesis*: blank answers and heavy hint use classify as `guessing`;
  textbook-style diagnosis texts map to codes via an ordered keyword table.
- **Decision order** (`src/learning/engine.ts`): 0) fresh start / prereq gate →
  1) weak prereq + recent failures → 2) consecutive failures (repeated
  misconception → alternative representation; low accuracy → easier practice;
  else guided practice) → 3) due review → 4) mastery evaluation → 5) good
  recent performance → independent/harder practice → 6) same-level practice.
- **Prerequisite graph** (`src/learning/skills.ts`): 24 skills, one per lesson,
  24 prerequisite edges, 4 roots (`ch1l2`, `ch2l1`, `ch4l1`, `ch4l3`), 7
  cross-chapter edges (e.g. `ch3l1 ← ch1l2 + ch2l1`, `ch6l2 ← ch6l1 + ch3l1`).
  Cycle detection (3-color DFS) runs in tests and at build of the engine state.

**Honest limitation:** these thresholds are **configurable engineering
assumptions**, not validated pedagogical constants. The code comments say so,
and this audit repeats it: the values (0.85 accuracy, 4 attempts, [1,3,7,14]
intervals) are reasonable starting points awaiting real-world recalibration.
See [RELEASE_READINESS.md](RELEASE_READINESS.md) §Unverified assumptions.

## 4. Lesson flows — implementation depth is NOT uniform

The task explicitly warns against describing all lessons as having identical
depth. Reality, precisely:

| Tier | Lessons | What they have |
|---|---|---|
| **Pilot flows (full A–G instructional flow)** | **2**: `ch2l2` (جمع و تفریق کسرها), `ch7l3` (عملیات ترکیبی) | Full staged flows in `src/data/flows/`: `ch2l2` = 7 stages A–G (prereq-check, intuitive-intro, representations, worked-example, completion-example, independent-practice, transfer-assessment); `ch7l3` = 8 stages adding **X** (step-sequencing) and a **solver animation** in stage D. Flow items carry per-item ids, retest questions, remedial loops, hint ladders, pass rules per stage. |
| **Standard lessons** | **22** | Lesson page with summary, concept steps, formula box, worked example(s), optional interactive lab, then adaptive graded practice (MCQ/numeric) driven by the engine. The engine's decision actions (guided practice, easier/harder practice, review…) apply to them, but there is no staged narrative flow. |
| **Interactive labs** | 4 lessons | `ch2l3` fraction lab, `ch4l2` coordinate lab, `ch5l3` cylinder lab, `ch6l2` percentage (discount) simulator. |

Flow mode is opt-in per lesson (`flowForLesson(id)` + a "شروع مسیر آموزشی"
button in `App.tsx`); resume position persists in `LearnerState.flowProgress`.
Lessons *without* flows are not "reduced quality" — the design note in
`flows/index.ts` says standard practice + engine covers them — but they are
**objectively less scaffolded** than the two pilots. This distinction is
carried into [CURRICULUM_COVERAGE.md](CURRICULUM_COVERAGE.md) and the README.

## 5. Persistence, offline and privacy findings

- **Single localStorage key** `ryaziyarsix.state.v3`. Loading wraps parse +
  structural validation in try/catch → any corruption yields a fresh initial
  state (never a crash). Import validation rejects negative/infinite XP,
  malformed attempts, unknown shapes; unknown question ids are ignored by the
  engine (tamper resistance). Student name is clamped to 30 chars.
- **State is evidence-derived:** skill states are recomputed from the recorded
  attempt list, which is why old saved data (pre-`reviewPlan` versions)
  continues to work; a missing review plan is *healed* deterministically from
  attempts (`tests/auditFixF07.test.ts`). There is **no key-level migration**
  (v1/v2 keys are not transformed — they are effectively discarded in favor of
  a fresh v3 state); see gaps below.
- **Export / deletion:** full user-data lifecycle exists locally —
  `exportStateJson()` (pretty JSON), `importStateJson()` (validated),
  `clearLearnerState()` (wipe). No data ever leaves the device.
- **Zero external network requests at runtime** (verified by exhaustive grep):
  the only `fetch` in the whole codebase is the service worker's same-origin
  cache handler (`public/sw.js`, gated by an origin check). No analytics, no
  telemetry, no CDN fonts (6 Vazirmatn woff2 files are local), no external
  scripts or iframes in `index.html`, no `dangerouslySetInnerHTML`/`eval`/`_blank`.
- **Service worker:** cache-first for same-origin GETs; `activate` purges every
  cache whose name ≠ current `CACHE_NAME` (`ryaziyarsix-v4-design`) — the old
  cache purge is real and tested indirectly, but the SW itself has **no test
  coverage** (gap, addressed in this release train). No precache list: first
  visit requires network once; afterwards the app shell + assets serve offline.

## 6. Tests and CI findings

- 28 test files + 2 helpers ≈ **497 runtime tests**, all passing at audit time.
  Coverage matrix and per-file map: [TESTING.md](TESTING.md).
- Strong: curriculum shape/uniqueness invariants, 98-key golden master, engine
  scenarios (S01–S34), anti-false-mastery guards, flow paths incl. failure
  paths, storage security/corruption, bidi isolation, WCAG contrast tokens,
  per-MCQ accessible names (all 85).
- Gaps found by this audit (all closed or scheduled in this release train):
  1. **Service worker / manifest / offline behavior — untested** → new
     `tests/serviceWorker.test.ts`.
  2. **No true data-migration test** (old-version data is accepted via
     validation, but the "old key → fresh state" path and the review-plan heal
     were not exercised as an explicit migration scenario) → new
     `tests/dataMigration.test.ts`.
  3. No coverage tooling configured (optional, not blocking).
- **CI** (`ci.yml`): node 20, `npm ci` → typecheck → lint → test → build →
  upload `dist` artifact. Solid baseline; extended in this release train with
  dependency auditing and secret scanning.
- **Deploy** (`deploy.yml`): push-to-main only; its `build` job runs the full
  test suite + production build **before** `upload-pages-artifact`, and
  `deploy` is `needs: build` — a red build can never reach Pages. Extended with
  typecheck/lint and a post-deploy verification step in this release train.

## 7. Documentation findings

- Existing docs (`docs/ARCHITECTURE.md`, `CURRICULUM_COVERAGE.md`, `TESTING.md`,
  `AUDIT.md`, `DATA_MODEL.md`, …) are Persian, thin (21–42 lines each) and
  partially stale — e.g. README says **"۲۳ درس"** while the data contains
  **24 lessons**, and TESTING.md says "Vitest 2" while the project uses
  Vitest 5. This release train replaces the three core docs with accurate
  English versions and adds `OPEN_SOURCE_AUDIT.md` (this file) and
  `RELEASE_READINESS.md`.
- Real product screenshots exist (`docs/screenshots/` — 11 PNGs incl. mobile
  390 px; `docs/lesson-ch7l3/` — 18 PNGs of the pilot flow stages) and are
  referenced by the new README. No fabricated statistics anywhere.

## 8. Verdict

| Aspect | Verdict |
|---|---|
| Curriculum structure & integrity | **PASS** — schema-enforced, ids unique, titles match the official book, 98/98 explanations & hints, math spot-checks clean |
| Mathematical correctness | **PASS** — golden master + independent recomputation agree |
| Learning engine | **PASS (as engineering)** — explainable, pure, well-tested; thresholds documented as configurable assumptions |
| Flows | **PASS** for 2 pilot lessons; 22 lessons are the standard tier — documented honestly |
| Privacy | **PASS** — zero runtime external requests, local-only data, full export/wipe |
| Offline | **PASS** functionally; SW test coverage added in this train |
| Tests & CI | **PASS** with gaps closed in this train (SW, migration, CI hardening) |
| Release readiness | **PASS with prerelease flag** — see `RELEASE_READINESS.md` |
