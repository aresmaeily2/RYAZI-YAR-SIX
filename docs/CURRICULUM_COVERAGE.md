# Curriculum Coverage — Official Grade-6 Mathematics Textbook

Coverage of the Iranian sixth-grade mathematics textbook (book code **۶۰۵**).
"Coverage" means structural coverage: every chapter and main topic has lesson
pages, worked examples and adaptive practice. All question content is
**independently authored** — only chapter/lesson titles and notation conventions
follow the official book; no textbook text or imagery is reproduced (copyright
compliance). Depth is **not uniform** across lessons — see the implementation
tiers below.

**Totals (verified by `tests/curriculumData.test.ts`):** 7 chapters · **24
lessons** · **98 questions** (85 MCQ + 13 numeric) · 25 worked examples ·
4 interactive labs · **2 full instructional flows**.

## Chapter map

| Ch | Official topic | Coverage | Content | Lessons (questions) |
|---|---|---|---|---|
| 1 | عدد و الگوهای عددی — patterns, place value to billions, divisibility, integers | Full (structural) | Lesson + example + 16 questions | `ch1l1` patterns (4) · `ch1l2` place value (4) · `ch1l3` divisibility (4) · `ch1l4` integers (4) |
| 2 | کسر — fractions: simplification, add/subtract, multiply/divide, mixed numbers, fraction between two fractions | Full (structural) | Lesson + example + 16 questions + fraction lab + **pilot flow** | `ch2l1` (4) · `ch2l2` (4) · `ch2l3` (4) · `ch2l4` (4) |
| 3 | اعداد اعشاری — decimals: place value, comparison, fraction↔decimal, operations | Full (structural) | Lesson + example + 16 questions | `ch3l1`–`ch3l4` (4 each) |
| 4 | تقارن و مختصات — axial/central symmetry, coordinate plane | Full (structural) | Lesson + example + 12 questions + coordinate lab | `ch4l1` (4) · `ch4l2` (4) · `ch4l3` (4) |
| 5 | اندازه‌گیری — area units (hectare), circle, volume/capacity | Full (structural) | Lesson + example + 12 questions + cylinder lab | `ch5l1` (4) · `ch5l2` (4) · `ch5l3` (4) |
| 6 | تناسب و درصد — ratio tables, percent (discount/profit/tax), statistical charts | Full (structural) | Lesson + example + 12 questions + discount simulator | `ch6l1` (4) · `ch6l2` (4) · `ch6l3` (4) |
| 7 | تقریب و تخمین — rounding/truncation, estimation in computation, combined operations | Full (structural **+ flow**) | Lesson + examples (incl. fraction example) + 14 questions + 8-stage flow with solver animation & step sequencing | `ch7l1` (4) · `ch7l2` (4) · `ch7l3` (6, incl. two fraction items per textbook p. 141 exercises 3 & 5) |

## Implementation tiers (explicit — depth is not uniform)

| Tier | Count | Lessons | What students get |
|---|---|---|---|
| **Pilot flows — full A–G instructional flow** | **2** | `ch2l2` (جمع و تفریق کسرها), `ch7l3` (عملیات ترکیبی) | Complete staged flow: **A** prereq-check (with retest + remedial loop) → **B** intuitive intro (real-life scenario) → **C** multiple representations (visual/number-line/symbolic) → **D** worked example with think-aloud steps (ch7l3 adds a **solver animation** with playback controls and a deliberate-mistake mode) → **E** completion example (fill-the-missing-step with hint ladder) → **X** step-sequencing challenge (ch7l3 only) → **F** independent practice → **G** transfer assessment. Every stage has a pass rule; failures route to remediation instead of blocking. |
| **Standard lessons** | **22** | all remaining lessons | Lesson page (summary, concept steps, formula box, worked example), optional interactive lab, then engine-driven adaptive practice: MCQ/numeric questions with 3-step hint ladders, misconception diagnosis per wrong option, adaptive difficulty and review scheduling. **No staged narrative flow.** |
| **Interactive labs** | 4 | `ch2l3` fraction, `ch4l2` coordinate, `ch5l3` cylinder, `ch6l2` percentage | Free-play manipulatives bound to their lesson concepts. |

The two pilots are the reference implementation of the A–G flow
(`src/data/flows/` + `src/components/LessonFlowPlayer.tsx`). Lessons without a
flow are not broken — the standard path is fully supported by the adaptive
engine — but they are objectively **less scaffolded** than the pilots. Adding
new flows is a data-only task (see [CONTRIBUTING.md](../CONTRIBUTING.md)).

## Question-level quality (all 98 questions audited)

- Unique ids (`q<C><L><N>`, flow items `flow-<lesson>-<stage>-<n>`) — uniqueness
  test-enforced.
- 98/98 have an `explanation`, exactly 3 scaffolded hints, and a difficulty
  level (easy 26 / medium 47 / hard 25).
- 94/98 MCQs carry misconception diagnoses for their distractors (91
  diagnosis entries total). The 4 without (`q433`, `q532`, `q631`, `q633`) are
  trivial-recall items.
- Every answer key is locked by a hand-audited golden master
  (`tests/contentGolden.test.ts`) and spot-recomputed independently (see
  [OPEN_SOURCE_AUDIT.md](OPEN_SOURCE_AUDIT.md) §2).
- Numeric questions accept Persian/Arabic digits, multiple decimal separators
  and equivalent fractions/mixed numbers.

## Known gaps (honest list)

1. **22 of 24 lessons have no staged flow** — covered by the standard tier above.
2. **`toleratedError` is declared but never populated** (0/13 numeric questions);
   grading currently uses exact-match-with-normalization for numeric answers.
3. **ch4 and ch6 have no numeric-entry questions** (all MCQ); ch3 is
   numeric-heaviest (5/16). Overall 87% MCQ.
4. **No free-text (long-answer) questions** — automated grading reliability was
   prioritized; writing-heavy skills are out of scope for v1.
5. **Textbook "growth pace"** (exact intra-chapter lesson ordering of the
   current print edition) is not formally verified; structure follows the
   book's public table of contents.
6. Three data strings reference textbook exercise *numbers* (inspiration
   attribution, not copied text): `ex74`, `q735`, and the `ch7l3` stage-F
   narrative. Tracked in [RELEASE_READINESS.md](RELEASE_READINESS.md).
