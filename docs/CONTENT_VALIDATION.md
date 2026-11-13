# Content Validation Process

How educational content gets in, gets checked, and gets released. This is the
enforceable process behind [CURRICULUM_COVERAGE.md](CURRICULUM_COVERAGE.md);
its hard gates live in `tests/curriculumData.test.ts`,
`tests/contentValidation.test.ts`, `tests/contentGolden.test.ts` and
`tests/answerChecking.test.ts`. **A PR that adds broken content fails CI — it
cannot reach students.**

## 1. Required fields per question (hard gate)

Every question must provide all of the following. `tests/contentValidation.test.ts`
loops over all 98 questions and fails on any violation:

| # | Requirement | Where checked |
|---|---|---|
| 1 | Unique id — `q<C><L><N>` for book questions, `flow-<lesson>-<stage>-<n>` for flow items | `contentValidation` + `curriculumData` |
| 2 | Correct answer present — MCQ: `correctAnswer` ∈ `options`; numeric: ≥1 `acceptedAnswers` | `contentValidation` |
| 3 | Explanation (non-trivial, ≥10 chars) | `contentValidation` |
| 4 | Difficulty ∈ `easy / medium / hard`; all three levels present overall + ≥1 hard per chapter | `contentValidation` + `curriculumData` |
| 5 | Relevant skill resolvable — via lesson→skill linkage (`sk-<lessonId>`) or the flow question index; skill must belong to the question's lesson | `contentValidation` |
| 6 | Learning objective available — the linked skill's `description` + `teachingSteps` (≥3 steps) | `contentValidation` |
| 7 | Appropriate hints — exactly 3, non-empty, deepest hint never leaks the answer | `contentValidation` + `contentGolden` |
| 8 | Error classification where applicable — every MCQ carries ≥1 misconception (diagnosis + remedial rule) tied to a real distractor; numeric questions are classified by the engine (hint-use/blank → `guessing`) | `contentValidation` + `errorTaxonomy` |

Notes on scope of #8: per-option misconception diagnosis is applicable to MCQs
(coverage is 98/98 MCQs since this release train — previously 94/98; the four
trivial-recall items `q433`, `q532`, `q631`, `q633` gained proper
misconceptions). Numeric questions cannot have per-answer option diagnosis by
design; the engine classifies their failures (see `classifyWrongAnswer`).

## 2. Mathematical correctness (independent review)

- **Golden master:** all 98 answer keys are locked against a hand-audited
  table (`tests/contentGolden.test.ts`) which also asserts that no distractor
  is numerically equivalent to the correct answer (fraction/decimal ambiguity
  handled) and that the deepest hint does not leak the answer.
- **Independent recomputation:** a separate audit pass (outside the test
  suite) re-derived a cross-chapter sample of ~20 keys — including the hardest
  fraction items (`q735`, `q736`, `ex74`) and both flows' transfer items — and
  all agreed. New content PRs should include recomputation notes for new keys
  in the PR description (see [CONTENT_AUTHORING.md](CONTENT_AUTHORING.md)).
- **Grading sweep:** `tests/answerChecking.test.ts` passes every real numeric
  key through the actual grading engine, including its Persian-digit form.

## 3. Authoring rules (copyright & tone)

- Content is **independently authored**: chapter/lesson titles and notation
  conventions follow the official textbook (code ۶۰۵); textbook text, images
  and exercise wording are **not** reproduced.
- If an item was *inspired* by a specific textbook exercise, cite it in a
  comment (e.g. "بر اساس تمرین ۳ کتاب، ص ۱۴۱") — inspiration attribution, not
  copying. Current citations: `ex74`, `q735`, ch7l3 stage-F narrative.
- Tone must stay age-appropriate and encouraging (no humiliating comparisons,
  no public rankings). Assistant replies are tested for this
  (`tests/diagnostic.test.tsx`).

## 4. Threshold honesty (what is NOT claimed)

Adaptive thresholds — 0.85 independent accuracy, 4 independent attempts, 2
distinct success profiles, [1,3,7,14]-day review intervals — are
**configurable engineering assumptions** (`MasteryPolicy`,
`REVIEW_INTERVALS_DAYS`), documented as such in code comments and in
[RELEASE_READINESS.md](RELEASE_READINESS.md). No documentation in this repo
may present them as scientifically proven values, and no learning-effectiveness
claims may be made without an actual study.

## 5. Release gate (what CI runs)

```
typecheck → lint → tests (incl. content gates) → build
           → dependency audit → secret scan → (deploy on main)
```

Adding or editing content touches only `src/data/` — if the suite stays green,
the content gate is passed. The golden-master test must be updated **in the
same PR** as any answer-key change, with the recomputation note.

## 6. Current validation status

| Check | Status |
|---|---|
| 98/98 explanations, 3-hint triples, difficulty levels | ✅ enforced |
| 98/98 answer keys locked by golden master | ✅ enforced |
| MCQ misconception coverage | ✅ 98/98 MCQs (was 94/98) |
| Skill linkage + learning objective resolvable | ✅ enforced (lesson-mediated) |
| Independent math recomputation (sample) | ✅ done for this release |
| `toleratedError` populated | ❌ 0/13 numeric items (declared, unused) — documented gap |
