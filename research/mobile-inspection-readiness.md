# Kigaru mobile inspection: readiness and required access

Checked 2 November 2026. This is a prerequisite assessment, not a completed mobile UX investigation. No new dependencies or application code were installed in this pass.

## Verified local capabilities

| Capability | Result |
|---|---|
| Host | Apple Silicon / arm64; 8 GiB RAM; approximately 29 GiB available on the workspace volume |
| REA | Installed 6.8.0; direct stdio MCP initialization and tools/list succeeded |
| Android inspection tools | REA advertises package/class/method analysis, adb inspection, screen capture, package resolution and app launch tools |
| adb | Not on PATH or at the conventional user SDK path; MCP `inspect_adb_client` returned `capability_unavailable` |
| Android runtime | No Android Studio, SDK, emulator executable or configured AVD found in checked conventional locations |
| Java | Full OpenJDK 25.0.1 including javac already installed in the user Java directory |
| JADX bridge | Not configured; REA doctor requests supplied `jadx-headless-mcp` 0.7.1 |
| Apple development tooling | Command Line Tools selected; full Xcode not found in checked application directories; simctl and devicectl unavailable |
| Apple observation apps | iPhone Mirroring and QuickTime Player are present; device pairing and permissions were not established |
| Connected phones | macOS USB inspection reported no iPhone/iPad/Android/Pixel/Samsung name matches; this is not a complete inventory of wireless or unusually named devices |
| Kigaru installation/package | No matching installed app in checked application directories; no Kigaru-named APK/APKS/XAPK/IPA found at the top level of Downloads or the workspace |

The application's framework remains unknown. No running Kigaru mobile screen or voice session was observed in this pass. The marketing website findings do not resolve that gap.

MCP verification and tool descriptions are recorded in [mobile-capability-mcp.json](evidence/mobile-capability-mcp.json). A tool being advertised does not mean its external provider or device is ready.

## Available routes and exact prerequisites

### Physical Android phone

Needed: a phone with Kigaru installed from Google Play, USB cable, developer options and USB debugging enabled, explicit acceptance of the Mac's debugging authorization, and Google's platform-tools package supplying adb. No emulator, Android Studio or JADX is necessary for the initial UX walkthrough. The user handles account sign-in; inspection begins with a dedicated test account or public/free state.

REA can then inspect the selected package, capture visible screens and observe permitted device state. User actions or ordinary device UI input exercise onboarding and lessons. Device identifiers and credentials should be excluded from the report.

This is the preferred route for representative voice timing and animation smoothness on the current 8 GiB Mac.

### Dedicated Android emulator

Proposed installation scope, requiring approval: Google's SDK command-line tools, platform-tools, emulator, and one compatible ARM64 Google Play system image, plus one dedicated virtual-device profile. Use an isolated research SDK directory and AVD; leave the system PATH and unrelated SDKs unchanged. No Android Studio IDE, build toolchain, root access or decompiler is needed initially.

Allow several GB for downloads, unpacked system images and virtual-device data; exact size depends on the selected release. Official guidance recommends 16 GB RAM and 16 GB disk for the emulator in Android Studio. This Mac has less RAM, so performance may be constrained. [Android emulator requirements](https://developer.android.com/studio/run/emulator).

The user must complete Play Store sign-in. Install Kigaru through the ordinary store flow if available to that account, region and device profile. Compatibility and free practice availability cannot be guaranteed before trying. A Google APIs image is not interchangeable with a Google Play image when store access is required. [Virtual device guide](https://developer.android.com/studio/run/managing-avds).

For voice testing, enable host microphone access and grant macOS/app microphone permissions. Emulator microphone input is disabled by default. Emulator latency includes host resource contention and audio virtualization, so report it separately from phone measurements. [Official audio controls](https://developer.android.com/studio/run/emulator-extended-controls).

### iPhone/iPad

Needed: a user-operated device with the ordinary App Store app, account access, and a way to observe the screen and audio. Existing QuickTime or iPhone Mirroring may provide a route if device/OS requirements and permissions are satisfied. These apps being installed does not establish a usable connection. REA's native UI tools observe the Mac surface, not an unrestricted iOS automation API. Mirroring must not be assumed to reproduce every microphone or audio behavior.

Installing Xcode alone does not supply Kigaru or a simulator-compatible build. A normal App Store device package is not a substitute for a developer-supplied simulator build. Do not download or decrypt protected IPAs to bridge that gap.

### Kigaru's iPhone/iPad edition on this Mac

Apple Silicon Macs can run developer-enabled iPhone/iPad apps obtained through the Mac App Store. Availability of Kigaru for this Mac/account must be confirmed in the store before relying on this route. It would need approval to install Kigaru and user-handled Apple Account authentication, but potentially no SDK. Record all observations as the iOS/iPadOS edition running on macOS; touch, audio and lifecycle behavior may differ on a phone. [Apple's guidance](https://support.apple.com/en-ca/guide/app-store/-fird2c7092da/mac).

### APK or IPA supplied through an authorized source

An artifact can help establish technology but cannot demonstrate the live user journey or latency. Prefer metadata and execution-free package inventory. Multiple coherent fingerprints can support React Native (React/Hermes/framework and bundle metadata), Flutter (Flutter/Dart libraries and engine identifiers), or other frameworks. A single filename or absence of markers does not prove native development; hybrid components and obfuscation remain possible.

No proprietary media extraction or source reconstruction is proposed. Deeper APK inspection would require separate approval for the pinned JADX bridge; a compatible full JDK is already present. No additional native decompiler is needed for initial artifact inventory. [REA Android prerequisites](https://github.com/morluto/rea/blob/main/docs/android-analysis.md), [REA Apple artifact limits](https://github.com/morluto/rea/blob/main/docs/apple-application-analysis.md).

## Runtime investigation procedure

Once an approved route is usable, record app version, platform, account state, region, free/paid entitlement and device conditions. Keep observed runtime behavior, artifact evidence, developer claims and inference separate.

1. Follow first launch, welcome, account/guest options, goals, proficiency questions, any actual diagnostic, permissions and first lesson. Record each observed screen and transition; do not infer that a placement test exists.
2. Map lesson discovery, categories, recommended items, locked content, scenario details and the route to Free Talk if present.
3. Run a permitted free conversation. Record instructions, mic states, push-to-talk or hands-free controls, captions, replay, hints, interruption, retry and end-session behavior.
4. Observe corrections in context: timing, original versus revised phrase, grammar explanation, pronunciation evidence, replay and follow-up exercise. Distinguish displayed scores from verified acoustic assessment.
5. Revisit progress, history and profile after the session. Document actual changes and personalization options. A changed recommendation alone does not prove an adaptive-learning algorithm.
6. Record screen hierarchy as an observed functional navigation graph, including modal/overlay/back behavior. Android activities are not equivalent to app screens, especially for React Native, Flutter and single-activity native apps.
7. Capture short transition recordings where authorized. Describe motion properties, triggers, sequencing and interruption behavior; label animation-library identification unknown unless artifact evidence establishes it.
8. For voice timing, target about 30 ordinary turns if the free allowance permits. Measure end of learner speech or button release, visible transcript availability, and first audible response separately. Report sample count, median/p90, failures, device/network conditions and capture precision. Do not infer separate server/STT/model/TTS processing times from client timing alone.

Stop at unavailable account access, a payment requirement, denied permissions or an app compatibility restriction. Record the limitation and request the necessary access; do not bypass it.

## Deliverable status and implementation recommendations

| Requested deliverable | Current status |
|---|---|
| Verified mobile framework | Unresolved, no selected app artifact or runtime |
| Screen-by-screen UX and hierarchy | Pending running application access |
| Interaction/animation breakdown | Pending mobile screen observation; earlier website motion findings remain website-only |
| Voice behavior and latency | Not measured |
| Kigaru versus Korean app comparison | Keep earlier Kigaru entries as published claims until runtime evidence exists |
| Updated build recommendations | Retain architecture as a proposal; defer decisions based on supposed Kigaru onboarding, progression, pronunciation scoring or latency |

Next development decision should follow a short mobile evidence pass. Prioritize confirming the speaking loop and correction usefulness over expanding feature scope. Validate our own Korean voice quality independently; Kigaru's Japanese results would not establish Korean model performance. Preserve TOPIK and admissions as independent planned features, with no implication that Kigaru implements comparable workflows.

Approval is requested solely because the user explicitly prohibited additional dependency installation without approval. No application development is authorized by approving an inspection runtime.
