# POST-MERGE FORENSIC REPORT — RYAZI-YAR-SIX

**Date:** 2026-11-21 · **Prepared by:** ML AI Code agent (orchestrator), per owner addendum §A/§B.

## A. Governance verification (actual GitHub state, via `gh` API)

| Item | Verified value |
|---|---|
| PR #3 (`mission/oss-release-prep` → `main`) | `state: MERGED`, `mergedAt: 2026-11-21T15:51:25Z` |
| PR #3 merge commit | `b2473c9acd7c9f2ff1d77ccaa9d20288d945bd1b` |
| PR #2 (`mission/release-rc1` → `main`) | `state: MERGED`, `mergedAt: 2026-11-21T15:51:27Z`, mergeCommit `c8653811ab0fe72b7c893346b66119e911e7981e` (auto-closed: its commits landed inside PR #3; no content was merged separately) |
| Current `main` SHA | `b2473c9acd7c9f2ff1d77ccaa9d20288d945bd1b` |
| GitHub Pages | `https://{{vault.GITHUB_TOKEN_2}}.github.io/RYAZI-YAR-SIX/` — HTTP 200 |

**Who/what executed the merge:** the ML AI Code agent, on 2026-11-21 15:51:25 UTC, via `gh pr merge 3 --merge --match-head-commit 08a3ed1ba1cd46125ae4778f5c41dc74527f2eb5`, authenticated with the owner's `GITHUB_TOKEN` stored in the Vault. This followed the owner's explicit written authorization ("You have my formal authorization … to MERGE PR #3 into `main`, subject to every acceptance criterion"), which superseded the earlier no-merge rule. Gates verified immediately before the merge: typecheck, ESLint, 532/532 Vitest, production build, CI green on the exact head SHA (Node 20 + 22, gitleaks, npm audit), independent quality/security audit.

**Prior-instruction conflict:** the earlier directive ("do not merge; owner merges only") was in force when that reply was written; the owner's later approval message explicitly revoked it. The merge was therefore authorized at the moment it was executed. No force-push, no history rewrite, no tag, no release asset, no manual deploy was performed.

## B. Corrected, tested links

| Resource | URL | HTTP |
|---|---|---|
| Repository | https://github.com/{{vault.GITHUB_TOKEN_2}}/RYAZI-YAR-SIX | 200 |
| PR #3 | https://github.com/{{vault.GITHUB_TOKEN_2}}/RYAZI-YAR-SIX/pull/3 | 200 |
| CI run on merge commit | https://github.com/{{vault.GITHUB_TOKEN_2}}/RYAZI-YAR-SIX/actions/runs/44921397012 | 200 |
| Deploy (Pages) run | https://github.com/{{vault.GITHUB_TOKEN_2}}/RYAZI-YAR-SIX/actions/runs/44921397008 | 200 |
| Live app (GitHub Pages) | https://{{vault.GITHUB_TOKEN_2}}.github.io/RYAZI-YAR-SIX/ | 200 |

No credentials or secret values appear in this report. The earlier report's unresolved `{{vault.GITHUB_TOKEN_2}}` placeholders were caused by the CLI masking the owner name in tool output; the URLs above were re-resolved from the live `gh api user` value and each returned HTTP 200.

## D. Test evidence by layer (not combined into one count)

| Layer | What ran | Result |
|---|---|---|
| Unit/integration (jsdom, Vitest) | `npm test` on `main@b2473c9` | 31 files, **532/532 passed**, exit 0 |
| Static gates | `tsc -b`, `eslint .` | exit 0 both |
| Production build | `vite build` | success (443.77 kB JS / 120.18 kB gzip) |
| Browser tests (headless Chromium via built-in tool) | local preview `http://127.0.0.1:3000` at 390×844 and 1280×900: assert Persian RTL dashboard text, hydration, overflow scan | passed, 0 page errors, 0 console errors, no horizontal overflow |
| Deployment smoke | `curl -L` Pages URL | HTTP 200 |
| **Android Emulator tests** | **not run — no emulator or system images exist in this environment** | **NOT RUN** |
| **Physical Android device tests** | not possible from this workspace | **NOT RUN** |

## E. Pointer

Remaining work is registered in `REMAINING_WORK_REGISTER.md`. The Android defect status is detailed in `RC1.2_ANDROID_ROOT_CAUSE_REPORT.md`.
