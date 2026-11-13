# Accessibility & UX Review

Status of the accessibility and child-UX review for the open-source release
train. Much of the hardening below was implemented in the RC1.1 release-candidate
work (branch `mission/release-rc1`, which this train builds on) and is **locked
by tests** — this document maps each requirement to its evidence.

## Requirement → evidence map

| Requirement | Status | Evidence (code + tests) |
|---|---|---|
| Keyboard navigation | ✅ | All interactive controls are native `<button>`/`<input>` (focusable, Enter/Space native); **skip link** "پرش به محتوای اصلی" targets `<main id="main-content">` (`App.tsx:158,213`); tab navigation covered in `app.test.tsx` |
| Screen-reader labels | ✅ | **All 85 MCQs** have accessible name `گزینه N: مقدار` asserted via attribute *and* the accessibility tree (`tests/optionAccessibleName.test.tsx`); numeric inputs have associated `<label for>`; visual badges are `aria-hidden` so they never merge into names; decorative icons `aria-hidden`; nav has `aria-label="ناوبری اصلی"` and tabs set `aria-current="page"` |
| Color contrast | ✅ | 24 WCAG-AA contrast pairs tokenized in `src/utils/contrast.ts` with gradient evaluation at the worst stop (`tests/contrastTokens.test.ts`); 4 historically failing pairs are asserted to stay failing until fixed; source-convention greps prevent class regressions in `QuestionCard`, `DiagnosticDashboard`, `AssistantPanel`, `App` |
| Focus states | ✅ | Global `:focus-visible` style (`src/index.css:60`); skip link becomes visible on focus (`focus:not-sr-only`) |
| Motion reduction | ✅ | `@media (prefers-reduced-motion: reduce)` in CSS; the step-solver animation disables autoplay when the OS preference is set (`useMemo` + `matchMedia`, `StepSolverAnimation.tsx:44-49`) and exposes manual playback; pulse effect uses `motion-reduce:animate-none` — asserted in `tests/reducedMotionAndPaths.test.tsx` |
| Responsive layouts | ✅ | Mobile-first Tailwind breakpoints; 390 px verified with real screenshots (`docs/screenshots/10-dashboard-mobile-390.png`, `11-learn-mobile-390.png`); no horizontal overflow |
| Persian RTL | ✅ | `dir="rtl"`/`lang="fa"` on `<html>` (asserted in `app.test.tsx`); RTL-aware math rendering via LRI…PDI islands (`src/utils/mathBidi.ts` + render tests); clipboard copy strips bidi control characters (`tests/copySanitizer.test.tsx`) |
| Font rendering | ✅ | Local Vazirmatn (6 weights, `woff2`) with `preload` — no FOUT from CDNs, works offline; Persian digits everywhere learner-facing |
| Mobile touch targets | ✅ | Controls sized ≥ ~44 px (e.g. `py-2.5`/`h-11` classes; verified classes in `App.tsx`, `QuestionCard.tsx`); nav is horizontally scrollable without tiny tap zones |

## Age-appropriate UX (child-safety rules)

- **No public rankings, no humiliating comparisons.** The dashboard reports
  the *individual* learner's own progress; the assistant refuses to "challenge"
  weak performers and never makes definitive claims without evidence — asserted
  in `tests/diagnostic.test.tsx`.
- **Errors are treated as information, not failure:** every wrong answer gets a
  misconception-based explanation and a concrete remediation suggestion; the
  taxonomy even names a `guessing` category with the explicit remediation
  "بدون فشار زمان… اشکالی ندارد که بگویی «نمی‌دانم»" (it's okay to say "I don't
  know").
- **Feedback tone is tested** for non-comparative encouragement
  (`learningEngine.test.ts` assistant rules).

## Known remaining items (honest)

1. **No formal audit with real screen-reader sessions** (NVDA/VoiceOver) has
   been recorded; the guarantees above are code-level and Testing-Library
   accessibility-tree level. A recorded NVDA walkthrough is a good first
   external contribution.
2. `role="tablist"` semantics for the 4 top tabs are approximated with
   `aria-current="page"` buttons rather than a true tab pattern (arrow-key
   roving focus not implemented) — acceptable for 4 flat buttons, listed for
   transparency.
3. Contrast pairs that are *intentionally* decorative-only remain excluded from
   the token list (documented in `contrast.ts`).

## How to extend

Any UI change should keep the three a11y test files green
(`optionAccessibleName`, `contrastTokens`, `reducedMotionAndPaths`); new
components should follow the same patterns: native elements first, `aria-hidden`
for decoration, accessible names in Persian with the `گزینه N:` convention, and
contrast-safe tokens from `src/utils/contrast.ts`.
