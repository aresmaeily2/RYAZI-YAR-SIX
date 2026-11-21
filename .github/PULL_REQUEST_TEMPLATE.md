<!--
Thank you for contributing! Please fill in every section — the PR template is
checked by reviewers, and CI gates must be green before merge.
-->

## What does this PR change?

<!-- One or two sentences. Link the issue: Closes #123 -->

## Type of change

- [ ] Bug fix (app behavior)
- [ ] Content fix / new content (question, lesson, flow)
- [ ] Accessibility or UX improvement
- [ ] Documentation
- [ ] Tests / CI
- [ ] Refactor (no behavior change)

## Content checklist (only if content changed)

- [ ] Every new/changed question has: unique id, correct answer, explanation,
      difficulty, resolvable skill, learning objective (via skill), 3 hints,
      error classification where applicable
      (`tests/contentValidation.test.ts` enforces this)
- [ ] Answer keys recomputed independently and noted below
- [ ] `tests/contentGolden.test.ts` updated in this PR if any key changed
- [ ] Persian digits (۰–۹) in learner-facing strings; ASCII in `acceptedAnswers`

## Architecture constraints (always)

- [ ] No new runtime network calls / analytics / external fonts or scripts
      (enforced by `tests/serviceWorker.test.ts`)
- [ ] App stays static + offline-first
- [ ] No test deleted or skipped
- [ ] Adaptive thresholds not changed without an issue discussing it first

## Verification

```bash
npm run typecheck   # ☐ passed
npm run lint        # ☐ passed
npm test            # ☐ passed (… tests)
npm run build       # ☐ passed
```

## Independent recomputation notes (content PRs only)

<!-- e.g. q623: 85% × 400,000 = 340,000 ✔ -->

## Screenshots / recordings (UI changes only)

<!-- Real captures of the change; do not attach mockups presented as real. -->
