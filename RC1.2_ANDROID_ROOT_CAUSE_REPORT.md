# RC1.2 ANDROID ROOT CAUSE REPORT

**Date:** 2026-11-21 · **Status: INVESTIGATION BLOCKED — REPRODUCTION NOT POSSIBLE IN THIS ENVIRONMENT**

## Finding: the "RC1.2 APK" does not exist anywhere that I can reach

Per addendum §C, before claiming any root cause I searched every source available:

1. **Working tree** (`/vercel/sandbox/repo` and `/vercel/sandbox/uploads`): no `.apk` or `.aab` file exists.
2. **Full Git history, all branches** (`origin/main`, `origin/mission/oss-release-prep`, `origin/mission/release-rc1`, `origin/mission-2r/rtl-core`): `git log --all --name-only -- "*android*" "*capacitor*" "*.apk"` returned **nothing**. The repository has never contained an `android/` directory, Capacitor/Cordova/Tauri packaging, a Gradle project, or an APK.
3. **Tags:** only `audit-accepted-final` exists. No `rc1.2` tag.
4. **GitHub Releases:** one release `v1.0.0 — ریاضی‌یار ششم (prerelease)`, state **Draft**, **assets: empty** — no APK was ever attached.
5. **Delivery manifests:** `audit/rc1.1/checksums.sha256` exists and covers web-audit artifacts only; no Android SHA-256 manifest is recorded anywhere in `docs/` or `audit/`.
6. **Android SDK present locally** (`/vercel/sandbox/android-sdk`: build-tools, platforms, platform-tools, cmdline-tools, licenses) but it contains **no emulator and no system images**, so §C.3 (install/launch in emulator) cannot be executed here even if an APK were found.

## Conclusion on root cause

The exact root cause of the reported "RC1.2 application would not open" failure **cannot be identified from this environment**, because:

- The APK itself is not retrievable (no file, no release asset, no tag, no manifest to verify a SHA-256 against);
- There is no evidence any Android build of this app was ever produced — the project is a Vite PWA whose deploy target is GitHub Pages;
- Plausible hypotheses (untriaged, no evidence either way): WebView without the required feature/API level, missing HTTPS on the WebView origin blocking the service worker, TWA/bubblewrap wrapper misconfiguration, corrupted APK, or unsigned/uninstallable build.

Per the addendum's final rule, the Android failure **remains OPEN**: it has not been reproduced, and a green web CI pipeline is not proof of a working Android app.

## What §C.7/§C.8 requires next

Since no verified fix can exist for a build that cannot be found, implementing §C.8 (corrective branch) requires a **documented, reproducible Android packaging decision** first — e.g. wrap the PWA with Capacitor + Gradle, or produce a TWA via bubblewrap — and is explicitly outside this environment's current capability (no emulator/system images; the repo has no Android project). **This decision and the packaging route belong to the owner.**

No Git history was altered; no merge, push, tag, release or deploy was performed (§G).

---
## RESOLUTION UPDATE — 2026-11-21 (root cause now CONFIRMED, not just hypothesised)

The owner supplied the original artifacts. Forensic inspection with the Android build tools:

| Artifact | Verified |
|---|---|
| `RYAZI-YAR-SIX-v1.0.0-RC1.2.apk` | SHA-256 `0082d8151d371e36872398988dceaf94a98882b942e2772f244211b2973cb524`, package `io.ryaziyar.six`, versionCode 12, versionName `1.0.0-RC1.2`, minSdk 24, target 34 |
| Signature | v2 + v3 schemes verify (`apksigner verify` exit 0) — **signature was not the failure** |
| `classes.dex` | 1 960 B, single class `io.ryaziyar.six.MainActivity` — a ~20-line `android.webkit.WebView` wrapper |
| Loaded URL | `file:///android_asset/public/index.html` (from dex bytecode + layout) |
| `index.html` | `<script type="module" crossorigin src="./assets/index-Dgi25V81.js">` |

### ROOT CAUSE (proven)
**Android WebView refuses to execute `<script type="module">` from `file://` origins.** Module scripts are subject to the same-origin policy with CORS; `file://` is an opaque origin, so Chromium blocks the module fetch. The entire app is one ESM bundle → the bootstrap script never runs → **blank screen on every launch**, exactly the reported failure. Secondary factors ruled out: signature (v2/v3 valid), asset presence (bundle `index-Dgi25V81.js` inside the APK), relative paths (`base: './'`), service-worker registration (wrapped in `.catch()`, cannot crash startup).

### FIX (implemented, statically verified)
Wrap the PWA with **Capacitor**, which loads the app through `WebViewAssetLoader` under an `https://`-shaped local origin — modules execute, and the SW can register. Built on corrective branch `fix/android-rc13-capacitor`:
- `assembleDebug` **BUILD SUCCESSFUL** (Gradle 8+, AGP 8.7, SDK 36, JDK 21, 37 s)
- Output `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 `bbb4faa076c12e605aa4cbd40c79a047fbfba08f748c64167fe81866d729114a`, same web bundle SHA-verified (`index-Dgi25V81.js`) as `main@b2473c9`.

### STILL OPEN (per the final rule, not closed on trust)
- **Functional reproduction on emulator/device remains impossible here** (no `/dev/kvm`, no VT-x/SVM). The owner must sideload `app-debug.apk` to confirm launch, lesson + MCQ, persistence, offline and RTL.
- **Release signing** (keystore + `assembleRelease`, v2+v3) before distribution.
- No push, tag, release or deploy was performed (§G respected).
