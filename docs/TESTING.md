# Testing Guide

Tooling: **Vitest 5** + jsdom + Testing Library (`@testing-library/react`,
`user-event`, `jest-dom`). Configuration lives in `vite.config.ts`
(`environment: 'jsdom'`, setup file `tests/setup.ts`, include
`tests/**/*.{test,spec}.{ts,tsx}`).

## Running

```bash
npm test            # one-shot run of the whole suite
npm run test:watch  # watch mode for development
npm run typecheck   # tsc -b  (strict type gate)
npm run lint        # eslint .
npm run build       # tsc -b && vite build (production gate)
```

Current baseline: **28 test files ≈ 497 runtime tests, all passing** (some
files loop over curriculum data, so runtime count exceeds textual `it()` count).
CI runs the same gates on every push/PR to `main`.

## Test map (30 files)

### Curriculum & content integrity
| File | Covers |
|---|---|
| `curriculumData.test.ts` | Exactly 7 chapters in order; ≥2 lessons each; ≥1 worked example + ≥3 questions per lesson; **uniqueness of chapter/lesson/question ids**; id ↔ parent consistency; MCQ invariants (correct answer present exactly once, unique options, ≥3 options); exactly 3 hints; misconceptions reference real options; explanations non-trivial; numeric questions typed; difficulty coverage (all 3 levels overall + ≥1 hard per chapter); ≥80 questions, ≥10 numeric; official textbook chapter/lesson titles |
| `contentGolden.test.ts` | **Golden master of all 98 answer keys** (hand-audited table): count = 98, no unknown ids, every key matches, correct answer never duplicated among distractors, no distractor numerically equivalent to the correct answer, every misconception points at a real distractor, deepest hint never leaks the answer |
| `ch7l3Fractions.test.ts` | Dedicated rational recomputation of the two fraction items (`q735`, `q736`, `ex74`), distractor plausibility, hint non-leakage, stage F pass-rule boundary |
| `answerChecking.test.ts` | Grading engine: Persian + ASCII digits, thousands separators, decimal separators (`.` `٫` `/` `,`), tolerated-error path, equivalent fractions & mixed numbers, zero denominator, misconceptions; sweeps every real numeric question's accepted answers |

### Learning engine
| File | Covers |
|---|---|
| `learningEngine.test.ts` | 24 skills ↔ lessons mapping; **DFS cycle detection**; prerequisite chains; question index; state rebuild from evidence; multi-condition mastery (short success streaks never grant mastery; 85% + diversity → temporary; + transfer + delayed review → confirmed); decision rules with reason codes; review scheduler (`REVIEW_INTERVALS_DAYS === [1,3,7,14]`, stage advance/hold/back, cap, due queue); error taxonomy; non-comparative encouragement in assistant replies |
| `auditEngineScenarios.test.ts` | Deterministic scenarios S01–S34: fresh start, weak/strong prereqs, mastery maintenance, transfer, review scheduling (S21–S25), anti-false-mastery (S26–S31), error taxonomy (S32–S34), metrics, review-plan staleness, flow remedial loop; graph integrity (3-color cycle detection, unknown/self prereqs) |
| `auditFixF06.test.ts` | Mastery regression policy: mastered skill + unrecovered consecutive failures → `needsreview` (not catastrophic reset); single mistake never demotes; hint success breaks the chain but is not recovery evidence; 12-attempt re-earn window |
| `auditFixF07.test.ts` | **Review-plan healing**: plan rebuilt deterministically from attempts when missing (old-version data); unordered timestamps irrelevant; partial plans healed; stale entries rejected; hook-level persistence of the heal |
| `auditFixF08.test.tsx` | Prereq-confirmation policy: independence (no hints), learner-history-aware repetition, constructed-response requirement (anti-MCQ-guessing), guided-only → remedial loop, legacy fallback |
| `auditFixF10.test.tsx` | Completion-example missing steps → question/skill index, real numeric checker, evidence recorded as `practice` with hint-ladder counting, error-code classification |
| `mathEngine.test.ts` | `toPersianDigits`, `normalizeDigitsToEnglish` (**Persian ۰-۹ and Arabic ٠-٩ → ASCII**), gcd, fraction arithmetic (zero-denominator throws), XP formula (difficulty weight 15/30/45, hint penalty, retry, wrong), weighted chapter mastery, streak logic, round/truncate, circle/cylinder (π≈3.14), percent |
| `examEngine.test.ts` | Comprehensive vs chapter exams; mixed scoring (correct/wrong/unanswered); 0–100% clamp; result bands; wrong/unanswered id extraction |

### Flows (A–G instructional paths)
| File | Covers |
|---|---|
| `lessonFlow.test.ts` | Pilot ch2l2: exact 7-stage A–G sequence; all `questionRefs` exist in the book; **uniqueness of all inline/retest/missing-step ids**; prereq config; worked-example think-aloud; completion hint ladder (no answer leakage); transfer context novelty; `advanceFlow` pass/fail logic incl. boundary; **golden keys for every inline/retest item of both flows** |
| `flowIntegration.test.tsx` | Full successful UI walk of ch2l2 (A→G) with per-stage assertions and evidence sources; corrective path: fail prereq → remedial + retest questions replace originals → pass |
| `auditFlowPaths.test.tsx` | Error-heavy student paths: repeated stage loops, hint-ladder passes, negative evidence recorded without blocking |
| `flowStagePersistence.test.tsx` | `startStageIndex` validation (out-of-range/fractional → 0); stage persist callbacks; `flowProgress` storage validation (invalid → whole-state reset); backup JSON without `flowProgress` accepted (backward compat); real App-level exit/re-enter resume |
| `flowOperationOrder.test.tsx` | ch7l3 8-stage structure (A,B,C,D,E,X,F,G); **independent recomputation of every ch7l3 answer key**; solver-animation chain validity; sequencing UI (correct/wrong placement, evidence, hints); animation playback/pause/speed/mistake toggle + reduced motion; full 22-attempt UI path with per-source assertions |
| `auditFixF08.test.tsx` | (flows-related prereq policies, see above) |

### UI, accessibility, RTL
| File | Covers |
|---|---|
| `app.test.tsx` | Initial render, `dir=rtl`/`lang=fa`, tab navigation, correct/wrong feedback, XP display, empty-input validation, 3-step hints, full exam UI flows (100% and 0% bands, unanswered column), report empty state, **state restored from localStorage after remount** |
| `optionAccessibleName.test.tsx` | For **every MCQ in the book (85)**: accessible name `گزینه N: مقدار` via attribute *and* accessibility-tree query; badge never merges into the name; numeric inputs have associated labels |
| `contrastTokens.test.ts` | WCAG contrast regression: 24 runtime pairs (gradients at worst stop) + source-convention checks preventing class regressions |
| `reducedMotionAndPaths.test.tsx` | `prefers-reduced-motion: reduce` disables autoplay (aria-label assertions); bidi isolation present in rendered DOM |
| `mathBidi.test.ts` | Math-run detection across **all three digit systems** (ASCII/Persian/Arabic-Indic), percent/thousands/decimal integrity (numbers never split), idempotency, 8 negative cases |
| `mathBidiParen.test.ts` | Parenthesis-aware island grammar: math parens join the LTR island, Persian-text parens untouched, nested conservative, length invariant |
| `mathBidiRender.test.tsx` | Real component render regression for q621–q623: only math runs wrapped in LRI…PDI |
| `copySanitizer.test.tsx` | Clipboard copy strips all 11 bidi control codepoints; plain-text copy untouched |

### Storage, privacy, dashboards
| File | Covers |
|---|---|
| `auditStorageSecurity.test.ts` | Corrupted JSON → initial state (no crash); wrong shape → initial state; valid round-trip; `QuotaExceededError` swallowed; **old-version state accepted** (pre-`reviewPlan` data); import validation (negative/infinite XP, malformed attempts/plans, non-string name); unknown question ids ignored; name clamped to 30 chars |
| `dataMigration.test.ts` *(added in this release train)* | Explicit migration scenarios: v1/v2-era keys absent → fresh v3 state; old-shape v3 state (missing `reviewPlan`/`flowProgress`) healed deterministically; deterministic rebuild == incremental recording; staged re-validation |
| `serviceWorker.test.ts` *(added in this release train)* | SW source contract: same-origin-only fetch gating, cache-name version bump purges old caches, navigation fallback to shell; manifest sanity (fa/fa-IR, RTL, icons, start_url) |
| `auditDashboardConsistency.test.tsx` | Dashboard numbers vs raw attempts (weighted chapter mastery, overall, status groups, effectiveness metrics, parent report rows, next-step provenance) |
| `diagnostic.test.tsx` | Effectiveness metrics (empty/small-sample, hint reliance, error repetition, transfer/review separation); dashboard priority-pick (due review first); action labels; assistant tone (no definitive claims without evidence, no challenges for weak performance) |

## Principles

- UI tests simulate real user interaction (`userEvent`), not internal function
  calls.
- `localStorage` is cleared between tests (`tests/setup.ts`) for isolation.
- No test is deleted or `skip`ped; a red test is fixed at its real cause.
- Data-driven loops keep per-question guarantees exhaustive (85 MCQ a11y cases,
  98 golden keys, 24 contrast pairs) without hand-writing hundreds of `it`s.

## Known limits

- No code-coverage tooling is configured (optional; the per-question loops give
  strong implicit coverage).
- jsdom cannot execute the real service worker; the SW is covered by a
  source-contract test (`serviceWorker.test.ts`) that asserts the gating and
  purge logic textually, plus manual offline verification (see
  [PRIVACY.md](PRIVACY.md)).
