# Privacy & Child Safety

This platform is used by **children**. Its privacy model is *architectural*,
not a policy promise: the app is a static site with **no server, no account
system, and no outbound data transfer** — so most privacy guarantees are
true by construction and enforced by tests. Verified for this release train
(method below); re-verify any claim before editing this file.

## Summary for parents and teachers

| Question | Answer |
|---|---|
| Does the app send any data anywhere? | **No.** Zero external network requests at runtime. The only `fetch` in the entire codebase is the service worker's cache handler, which is hard-gated to same-origin requests. |
| Where is progress stored? | Only in the browser's `localStorage` on the child's device, under the single key `ryaziyarsix.state.v3`. |
| Is there registration / login / accounts? | **No.** No sign-up, no email, no third-party account systems. |
| Is there advertising or tracking? | **No.** No ad SDKs, no analytics, no telemetry, no cookies for tracking, no fingerprinting scripts. |
| What personal data exists? | Only what the child (or parent) types: an optional display name, clamped to 30 characters, stored locally only. No birthdates, no contacts, no photos, no location. |
| Can data be moved or erased? | Yes — export to a JSON file, import it back (validated), or wipe everything, from the app's Report section. Wiping removes the single localStorage key. |
| Does it work offline? | Yes — installable PWA; after the first online visit, a service worker serves the app from cache. Offline use sends nothing, by definition. |

## How each guarantee is verified (technical)

1. **Zero external requests** — exhaustive grep of `src/`, `public/`,
   `index.html`: the string `fetch(` appears exactly once (`public/sw.js`),
   behind the `url.origin !== self.location.origin` gate; zero occurrences of
   `XMLHttpRequest`, `WebSocket`, `navigator.sendBeacon`, `gtag`, `analytics`
   SDKs, or any `http(s)://` URL in shipped code (the only URL literal is the
   SVG `xmlns` namespace identifier, which is never fetched). This is now a
   **running test**: `tests/serviceWorker.test.ts` re-verifies the surface on
   every CI run and fails if a network call or external URL is introduced.
2. **Local-only storage** — `src/utils/storage.ts` writes exactly one key.
   Loading is wrapped in try/catch with structural validation; corrupted or
   tampered data yields a fresh state (never a crash, never a leak).
3. **Data lifecycle** — `exportStateJson()` / `importStateJson()` /
   `clearLearnerState()`; import rejects malformed, negative-XP or
   wrong-typed payloads (`tests/auditStorageSecurity.test.ts`,
   `tests/dataMigration.test.ts`).
4. **Child-safety tone** — feedback avoids humiliating comparisons and public
   rankings; the assistant explicitly declines to make claims without
   evidence and never "challenges" weak performers
   (`tests/diagnostic.test.tsx`).
5. **Fonts/icons are local** — six Vazirmatn `.woff2` files ship in
   `public/fonts/`; `index.html` contains no external scripts, fonts, CDNs or
   iframes.

## Third-party dependencies

Runtime dependencies are exactly three: `react`, `react-dom`, `lucide-react`
(icon components compiled into the bundle — no runtime icon fetches).
Dev/test tooling is locked by `package-lock.json`, audited in CI
(`npm audit` gate) and updated via Dependabot. No dependency ships code that
executes at page runtime beyond the bundle itself.

## Service worker & cache

The SW (`public/sw.js`) caches **same-origin GET responses only** to make the
app offline-capable. It stores app assets (HTML/JS/CSS/fonts/icons) — never
learner data, which lives in localStorage. Bumping `CACHE_NAME` deletes all
older caches on `activate`. The cache is device-local and cleared with the
browser's site data.

## Known limits (honest)

- GitHub Pages (the host) serves the site over HTTPS and sees standard web
  server logs (IP address, user agent, requested URLs) for the initial asset
  downloads — same as any static site. The app adds nothing to that, and once
  cached, nothing further is requested.
- No CSP / X-Frame-Options headers are configurable on GitHub Pages; the app
  mitigates by shipping no inline event handlers that process remote input and
  by having **no remote input at all** (no `dangerouslySetInnerHTML`, no
  `eval`, no `target="_blank"` links).
- localStorage is readable by anything running on the same origin; since the
  origin hosts only this app and accepts no third-party scripts, the exposure
  is limited to someone with device access (the same person whose data it is).

## Reporting a privacy or child-safety concern

See [SECURITY.md](../SECURITY.md) — private reporting via GitHub Security
Advisories. A verified privacy regression (any new outbound request) is a
release blocker and will fail the `serviceWorker` test first.
