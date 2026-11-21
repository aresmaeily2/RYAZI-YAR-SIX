# FINAL DELIVERY — RYAZI-YAR-SIX v1.1.0

Date: 2026-11-21 · Git `main` at `16cb35e` (clean, synced with origin) · CI green (run 44937361830) · Pages deploy green (run 44937361849)

## Release page
Tag `v1.1.0` — assets (all verified by download over the public URL, `sha256sum -c` OK):

| Asset | Bytes | SHA-256 |
|---|---|---|
| `RYAZI-YAR-SIX-v1.1.0-android.apk` | 6,984,197 | `1008789cbd4aab28fa0ef140a19acdef1ab800d7279cf7f382da000a7ef1c57f` |
| `RYAZI-YAR-SIX-v1.1.0-android.aab` | 6,838,859 | `48bec7eaadcd7a7b2db37d05483eac270cd7090d16c579e464f4231c5b43505c` |
| `RYAZI-YAR-SIX-v1.1.0-web-pwa.zip` | 481,381 | see `RYAZI-YAR-SIX-v1.1.0-SHA256SUMS.txt` |
| `RYAZI-YAR-SIX-v1.1.0-source.zip` | 58,433,875 | (git archive of `16cb35e`, no keystores/secrets) |
| `RYAZI-YAR-SIX-v1.1.0-SHA256SUMS.txt` | 395 | checksum manifest for the four files above |
| `README-PWA.md` | — | how to serve/install the PWA package |

## Version identity (resolved)
- `android/app/build.gradle`: `versionCode 14`, `versionName "1.1.0"` — matches tag v1.1.0.
- AAB metadata: `androidGradlePluginVersion=8.13.0`, versionName `1.1.0`.

## Signing (apksigner verify, build-tools 36.0.0)
- APK: **verified**, Signer `CN=Riazi Yar Six, OU=Learning, O=RYAZI-YAR, L=Tehran, C=IR`
- Cert SHA-256: `C6:9D:D8:C2:38:FF:12:4E:86:67:0B:F2:E1:A9:D8:DF:21:AC:97:8B:C6:41:60:D8:25:92:70:EC:2F:7A:07:54`
- AAB: signed (v1/JAR, Signflinger).

## Gates re-run fresh this pass
- `npm run typecheck` (tsc -b) — pass
- `npm run lint` (eslint) — pass
- `npm test` — **536/536 passed in 32 files**
- `npm run build` — pass (bundle `index-kxp87qXn.js`, 447.67 kB / 121.43 kB gzip)
- `gitleaks detect` (worktree + full `--all` history, 113 commits) — **no leaks, exit 0**

## Web / PWA verification
- App served from the released `web-pwa.zip`; checked via browser at **390px and 1280px**: page loads, interactive, Persian RTL dashboard with all 7 chapters, zero console errors, zero page errors, no horizontal overflow.
- All bundle references in `dist/index.html` are relative (`src="./assets/…"`), so the build works on the GitHub Pages subpath.
- The one prior "browser preview path" failure did **not** reproduce and is attributed to transient preview-host availability, not app code (relative paths verified above).

## Live Web/PWA
GitHub Pages (built by CI from `main`): link recorded on the release page. Local PWA: unzip `web-pwa.zip`, `python3 -m http.server`, or install via browser "Add to Home Screen".

## Android real-device test — limitation (explicit)
This environment has **no `/dev/kvm`, no VT-x/AMD-V, no adb, no attached device**. Installing and running on a real Android device or emulator is **not executable here** and remains the single open item; the 8-step checklist in `audit/comprehensive-final/android-install-package.md` is logged as NOT-RUN (no KVM/device). Provide `adb logcat -d` output from any phone to triage instantly.
