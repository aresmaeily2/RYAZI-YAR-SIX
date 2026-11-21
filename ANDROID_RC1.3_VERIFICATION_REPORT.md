# ANDROID RC1.3 VERIFICATION REPORT

**Date:** 2026-11-21 · **Status: NOT BUILT — NOT VERIFIED**

## Verdict up front

**No RC1.3 APK was built, and no Android verification was performed.** Producing one was attempted in spirit but is blocked on two hard prerequisites that this environment cannot satisfy on its own; they need an owner decision and tooling that is not installed.

## What exists (verified)

| Prerequisite | State |
|---|---|
| Android SDK (build-tools, platforms, platform-tools, cmdline-tools, licenses) | present at `/vercel/sandbox/android-sdk` |
| JDK | OpenJDK 21 (`java -version`) |
| Gradle | not installed; no `gradlew` in the repo (there is no Android project) |
| Android emulator / system images | **absent** — `sdk/` has no `emulator/` or `system-images/` |
| APK to verify | **absent** — see `RC1.2_ANDROID_ROOT_CAUSE_REPORT.md` |
| Android project in repo | **absent** in all branches and full history |

## What §C.9–§C.11 asks for and why it cannot be completed here

1. **Reproducible build (§C.9):** the repository has no Android packaging at all. The first step is a packaging route, e.g.:
   - **Capacitor**: `npm i @capacitor/core @capacitor/cli @capacitor/android` → `npx cap init` → `npx cap add android` → `npx cap sync` → `./gradlew assembleRelease`;
   - or **TWA/bubblewrap** (`npx @bubblewrap/cli init --manifest https://…/manifest.webmanifest` → `bubblewrap build`), which signs a wrapper APK from the live PWA.
2. **Emulator install/launch (§C.3, §C.10):** requires `sdkmanager "emulator" "system-images;android-34;google_apis;x86_64"` + `avdmanager create avd` + `adb install` + Logcat capture. The SDK is present but the emulator and system images are not, and downloading them plus running an emulator is beyond what this workspace can reliably host (no KVM check performed; 16 GB RAM, no GPU).
3. **Physical-device testing (§D last row):** requires a device in hand; impossible from this cloud workspace.

## Checklist that must pass before the Android issue may be called resolved

Per the addendum's final rule, all of the following must be evidenced (APK + raw logs + screenshots), none of which exists yet:

- [ ] SHA-256 of the produced APK matches a written manifest
- [ ] `adb install` succeeds on a clean emulator/device
- [ ] Cold launch reaches the dashboard (no crash in full startup Logcat)
- [ ] Navigation into a lesson and answering an MCQ works
- [ ] Progress persists after force-stop + relaunch
- [ ] Offline relaunch (airplane mode) serves the app from the service worker
- [ ] RTL rendering and math content correct at phone width

Nothing above has been checked off. No merge, push, tag, release, deploy or destructive operation was performed (§G).
