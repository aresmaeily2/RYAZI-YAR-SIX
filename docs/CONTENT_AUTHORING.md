# Adding New Lessons, Questions and Flows

A practical guide for content contributors. Content is **typed TypeScript** in
`src/data/` — the compiler and the content-validation tests are the reviewers
that never sleep. If your content is structurally broken, `npm test` and
`npm run build` go red before anything reaches a student.

## 0. Before you start

- Read [docs/DATA_MODEL.md](DATA_MODEL.md) (Persian) for the full type
  reference and [docs/CONTENT_VALIDATION.md](CONTENT_VALIDATION.md) for the
  quality gates.
- Follow the copyright rules: independently authored content only; textbook
  structure/titles/conventions are fine, textbook text/images are not
  (see [CONTENT_VALIDATION.md](CONTENT_VALIDATION.md) §3).

## 1. Adding questions to an existing lesson

Open the chapter file (`src/data/chapters/ch<N>.ts`), find the lesson
(`ch<N>l<M>`), and append to its `questions` array.

**MCQ template:**

```ts
{
  id: 'q<N><M>5',                       // chapter digit, lesson digit, index — see warning below
  chapterId: 'ch<N>',
  lessonId: 'ch<N>l<M>',
  type: 'mcq',
  difficulty: 'medium',                 // easy | medium | hard
  prompt: 'صورت پرسش با ارقام فارسی (۰–۹)',
  options: ['گزینهٔ درست', 'انحراف ۱', 'انحراف ۲', 'انحراف ۳'],
  correctAnswer: 'گزینهٔ درست',          // must exist in options, exactly once
  hints: ['راهنمای جهت‌دهی', 'راهنمای نزدیک‌تر', 'راهنمای نهایی بدون افشای پاسخ'],
  explanation: 'چرا این پاسخ درست است و بقیه نه (≥۱۰ نویسه).',
  misconceptions: [
    {
      wrongOptionValue: 'انحراف ۱',      // must be one of options, never the correct answer
      diagnosis: 'این گزینه چه سوءبرداشتی را لو می‌دهد',
      remedialRule: 'فعالیت اصلاحی مشخص برای همین سوءبرداشت',
    },
    // one entry per documented distractor is welcome; at least one is required
  ],
}
```

**Numeric template:**

```ts
{
  id: 'q<N><M>5',
  chapterId: 'ch<N>',
  lessonId: 'ch<N>l<M>',
  type: 'numeric',
  difficulty: 'hard',
  prompt: 'صورت پرسش با ارقام فارسی',
  answerKind: 'integer',                // integer | decimal | fraction
  acceptedAnswers: ['70'],              // ASCII digits, '.' for decimals, 'a/b' for fractions
  // toleratedError: 0.05,              // optional; currently unused in grading — leave out
  hints: ['…', '…', '…'],
  explanation: '…',
}
```

> ⚠️ **ID width hazard:** the `qCLN` scheme assumes a single-digit lesson and
> ≤9 questions per lesson. If you add a 10th question to a lesson, stop and
> propose a new id scheme in an issue first — `curriculumData.test.ts` will
> catch collisions, but plan ahead.

**Checklist (CI enforces all of these):**

- [ ] Persian digits (۰–۹) in every learner-facing string; ASCII digits only in
      `acceptedAnswers`
- [ ] `correctAnswer` appears exactly once among options; options unique, ≥3
- [ ] Exactly 3 hints; the deepest hint does not reveal the answer
- [ ] Explanation present; each distractor you document has diagnosis +
      remedial rule; the correct answer is never listed as a misconception
- [ ] Question id ↔ `chapterId`/`lessonId` consistent
- [ ] Recompute the answer yourself and note it in the PR description
- [ ] If the answer key changes anywhere: update
      `tests/contentGolden.test.ts` **in the same PR**

## 2. Adding a whole lesson

1. Append the lesson object to the chapter's `lessons` array: `id` (`ch<N>l<M>`),
   `title` (match the official book's lesson title), `summary`, `conceptSteps`
   (≥1), `formulaBox?`, `workedExamples` (≥1, each ≥2 steps), `interactiveLab?`
   (only the four known kinds), `questions` (≥3; see §1).
2. Add the matching skill in `src/learning/skills.ts` with id `sk-ch<N>l<M>`
   (helper `S(...)`): title, description, `prerequisites` (existing skill ids
   only — the graph is cycle-checked), `cognitiveLevel` 1–3,
   `representations`, `teachingSteps` (≥3), and leave `masteryThreshold` at the
   default 0.85 unless you have a documented reason.
3. `tests/curriculumData.test.ts` requires the official book title match,
   worked example structure, question count and difficulty coverage — run
   `npm test` and fix what it reports.

## 3. Adding an instructional flow (A–G)

Flows are data files in `src/data/flows/` (see `ch2l2.flow.ts` for the minimal
complete example):

1. Create `ch<N>l<M>.flow.ts` exporting a `LessonFlow` with `skillId:
   'sk-ch<N>l<M>'` and an ordered `stages` array. Stage kinds (in the intended
   order): `prereq-check` → `intuitive-intro` → `representations` →
   `worked-example` → `completion-example` → (`step-sequencing` optional) →
   `independent-practice` → `transfer-assessment`.
2. Every stage needs `id`, `kind`, `title`, `narrative` and a `passRule`.
   Reuse book questions via `questionRefs`; author inline items with
   `flow-<lesson>-<stage>-<n>` ids; give `prereq-check` stages `retestQuestions`
   and a remedial `remedial` block so failure routes to repair, never to a
   dead end.
3. Register the flow in `src/data/flows/index.ts` (`LESSON_FLOWS`). The app
   then shows the "شروع مسیر آموزشی" button for that lesson automatically and
   persists resume position in `flowProgress`.
4. Tests to extend: golden keys for every inline/retest item
   (`tests/lessonFlow.test.ts` pattern) and a UI path test
   (`tests/flowIntegration.test.tsx` pattern).

## 4. Verifying your change

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

All four must pass. Then open a PR (template provided) listing: what you added,
recomputed answers, and any golden-master updates. CI runs the full gate
including dependency audit and secret scanning.
