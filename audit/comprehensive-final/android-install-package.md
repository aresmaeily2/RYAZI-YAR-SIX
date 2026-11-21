# ANDROID INSTALL & ADB PACKAGE — RC1.3 (owner action required)

## What is included (committed)
- `audit/rc1.3/RYAZI-YAR-SIX-v1.0.0-RC1.3-debug.apk` (4 629 245 B)
- `audit/rc1.3/aapt2_badging.txt`, `apksigner_print_certs.txt`, `apk_inventory.txt` (raw tool outputs)
- APK SHA-256: 0e6bc99a6a399bb139560a30387ef2c7ee100c70953cd7c166be5bbda5ca7be8

## Install instructions (Windows/macOS/Linux, USB debugging enabled)
1. Verify hash: `sha256sum RYAZI-YAR-SIX-v1.0.0-RC1.3-debug.apk` → must equal the SHA above.
2. `adb install -r RYAZI-YAR-SIX-v1.0.0-RC1.3-debug.apk` (or sideload by tapping the file and allowing unknown sources).
3. Launch "ریاضی‌یار ششم" from the app drawer.

## Functional checklist — DO NOT mark passed until executed on a device
- [ ] Cold launch reaches dashboard (no blank screen, no crash)
- [ ] Lesson opens; conceptual steps + worked example render RTL
- [ ] Numeric question answered correctly → +15 امتیاز feedback
- [ ] Wrong answer → graceful feedback, no crash
- [ ] Force-stop + relaunch → score/streak persist
- [ ] Airplane mode relaunch → app still loads (SW/offline)
- [ ] Math text, Persian digits and RTL layout correct at phone width
- [ ] Hardware Back button navigates without exiting the app
- Logcat capture: `adb logcat -d > rc13-launch.log` if anything fails.

## Status: NOT RUN here (no KVM/device). Per the completion criterion the Android remediation remains OPEN until this checklist passes.

## Update 2026-11-21 — v1.1.0 release artifacts (versionName aligned)
- Release v1.1.0 now ships `app-release.apk` (versionCode **14**, versionName **1.1.0**) and `app-release.aab`, same signing key (CN=Riazi Yar Six).
- APK SHA-256: `1008789cbd4aab28fa0ef140a19acdef1ab800d7279cf7f382da000a7ef1c57f`; AAB SHA-256: `48bec7eaadcd7a7b2db37d05483eac270cd7090d16c579e464f4231c5b43505c`.
- Hashes above were computed **from the artifacts re-downloaded from the GitHub Release** (evidence: `audit/v1.1.0/`).
- Web-equivalent functional checks passed in browser at 390 px and 1280 px (cold load, 7 chapters, lesson RTL content, correct answer accepted «درست», 0 console/page errors). Device checklist above still requires a physical device (no KVM/emulator in this environment).
