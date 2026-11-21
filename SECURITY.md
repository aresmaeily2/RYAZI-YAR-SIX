# Security Policy

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x (current `main`) | ✅ |
| < 1.0 | ❌ (pre-release history only) |

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Use GitHub's **private vulnerability reporting**: repository →
*Security* tab → *Report a vulnerability*. If you cannot use it, contact the
maintainer (`aresmaeily2`) via a GitHub issue asking for a private channel —
please do not include details in the issue itself.

Include: what is affected, how to reproduce, impact (especially anything
affecting children's data or safety), and a suggested fix if you have one.

You can expect an initial response within **7 days**. We will credit reporters
in release notes unless they prefer anonymity. Please do not test
vulnerabilities against the live GitHub Pages deployment in ways that affect
other users.

## Scope

**In scope:**

- Any outbound network request or third-party code appearing at runtime
  (the app's core guarantee is **zero external requests** — a regression here
  is critical and also fails `tests/serviceWorker.test.ts`)
- XSS vectors in the UI (note: React-escaped rendering, no
  `dangerouslySetInnerHTML`, no `eval` — any bypass is critical)
- `localStorage` persistence attacks: state tampering that crashes the app,
  escapes validation, or corrupts learner data
- Supply-chain issues in the three runtime dependencies
  (`react`, `react-dom`, `lucide-react`)
- Content integrity: a way to alter answer keys or grading so the app teaches
  something mathematically wrong

**Out of scope:**

- GitHub Pages infrastructure itself (report to GitHub)
- Self-XSS / social engineering of the device owner
- The host's standard server-side access logs (static hosting reality,
  documented in [docs/PRIVACY.md](docs/PRIVACY.md))

## Security design notes

- **Static, serverless, offline-first:** no backend, no auth, no sessions —
  the classic web attack surface (injection, auth bypass, IDOR) does not
  exist by construction.
- **Zero external requests:** no CDN, no analytics, no fonts from third
  parties; the single `fetch` is the service worker's same-origin cache
  handler. Enforced by test on every CI run.
- **Validated persistence:** every load/import of learner state passes
  structural validation (`isValidState`); corrupt/tampered data resets to a
  fresh state instead of executing or leaking. Unknown question ids in
  imported data are ignored by the engine; numeric ranges (XP ≥ 0 and finite,
  `flowProgress` 0–64 integers, name ≤ 30 chars) are bounded.
- **Dependency hygiene:** `npm audit` gate in CI, Dependabot updates, lockfile
  installs only (`npm ci`).
- **CI hardening:** secret scanning (gitleaks) runs on every push/PR;
  deployments build and test before publishing and cannot deploy a red build.

## Data handling statement

The app processes no personal data on any server. All learner data stays in
the device's `localStorage` under `ryaziyarsix.state.v3`, with user-controlled
export/import/wipe. See [docs/PRIVACY.md](docs/PRIVACY.md) for the verified
guarantees.
