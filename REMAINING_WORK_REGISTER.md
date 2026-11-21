# REMAINING WORK REGISTER — RYAZI-YAR-SIX

**Date:** 2026-11-21 · **Source:** post-merge forensic pass on `main@b2473c9acd7c9f2ff1d77ccaa9d20288d945bd1b`.
Basis: full TODO/FIXME scan of `src/`, `tests/`, `docs/` (none found), open GitHub issues (none found), and unmet items from the owner's prior requirements and addendum §C/§D.

## P0 — blocks the Android release

| # | Item | Why it is open | Owner decision needed |
|---|---|---|---|
| 1 | **Reproduce the original "RC1.2 app would not open" failure** | APK absent from repo history, tags and release assets; no SHA-256 manifest to check a rebuilt artifact against | Approve the packaging route before any rebuild |
| 2 | **Choose and implement Android packaging** (Capacitor wrap or bubblewrap TWA) | Repo is a Vite PWA only; no `android/`, no Gradle, never existed in any branch | Which route, min Android API level, WebView policy |
| 3 | **Emulator-based verification loop** (install, cold launch, lesson + MCQ, persistence, offline, RTL) | SDK exists but has no emulator/system images; device tests need hardware in hand | Provide emulator resources or a physical device |

## P1 — release hygiene

| # | Item | Why it is open |
|---|---|---|
| 4 | Attach the verified APK (with SHA-256 in a written manifest) to release `v1.0.0` and publish it | Release exists but is **Draft with empty assets**; attaching is blocked by P0 #1–#3 |
| 5 | Install Gradle (or rely on the `gradlew` wrapper a Capacitor/TWA project generates) in the build environment | Not installed; no Android project to generate a wrapper from |
| 6 | Decide whether Dependabot PRs on `main` are auto-merged or reviewed | Workflows are enabled and were running on the merge commit; policy not documented |

## P2 — quality-of-life, non-blocking

| # | Item | Why it is open |
|---|---|---|
| 7 | Speed up the Vitest suite (jsdom re-created 31×, ~11 s / 42 % of run time) | Works correctly today; `pool: 'vmThreads'` or `isolate: false` would cut wall time but changes isolation semantics |
| 8 | Bundle size watch (`index.js` 443.77 kB / 120.18 kB gzip) | Within budget and building clean; revisit if content grows |
| 9 | Document the Windows/macOS desktop packaging decision (PWA install vs Electron/Tauri) | Prior requirement listed it as an option, never decided |

**Nothing on this register may be marked done on trust:** each row needs the evidence class named in the addendum (raw logs, screenshots, checksums) before closure.

---
## UPDATE 2026-11-21 (post-forensics, corrective branch `fix/android-rc13-capacitor`)

### RESOLVED
- **P0 #1 (root cause of "RC1.2 app would not open"):** identified with hard evidence. The RC1.2 APK (SHA-256 `0082d8151d371e36872398988dceaf94a98882b942e2772f244211b2973cb524`, versionCode 12, package `io.ryaziyar.six`) was a 20-line WebView wrapper loading `file:///android_asset/public/index.html`, whose `index.html` contains `<script type="module" crossorigin …>`. **Android WebView blocks ES module scripts on `file://` origins (opaque origin fails the CORS-style requirement), so the app's JavaScript never executed → blank screen on launch.** Signature (v2+v3), assets and paths were all fine — not the cause. Evidence: `aapt2 dump badging`, `apksigner verify`, `dexdump` of `MainActivity`, extracted `assets/public/index.html`.
- **P0 #2 (packaging):** Capacitor route implemented on branch `fix/android-rc13-capacitor` — `@capacitor/core/cli/android` added, `capacitor.config.ts` (appId `com.mathmvp.riaziyarsix`, webDir `dist`), `android/` project generated, **`assembleDebug` BUILD SUCCESSFUL in 37 s**.

### NEWLY OPEN (P0 — needs user, cannot be done in this environment)
- **Emulator/device functional test of the new APK:** no `/dev/kvm` and no VT-x/SVM flags on this host (software emulation impractical). The new APK must be sideloaded by the owner to confirm cold launch, lesson + MCQ, persistence, offline, RTL. Until then the fix is **statically verified, not functionally verified**.
- **Release signing:** current APK is debug-signed (v2 only). A release keystore + `assembleRelease` + v2+v3 signing must be produced before distribution.

### ARTIFACT (local only, per §G no push/tag)
- `android/app/build/outputs/apk/debug/app-debug.apk` — SHA-256 `bbb4faa076c12e605aa4cbd40c79a047fbfba08f748c64167fe81866d729114a`, 4 629 241 B, versionCode 1 (1.0), minSdk 24, targetSdk 36, same web bundle (`index-Dgi25V81.js`) as `main`.
