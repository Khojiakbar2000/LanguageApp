# Add Panda to your Home Screen

## Delivered experience

`/panda-widget` is the optional invitation screen. It uses the supplied `public/imagePanda.png` without generating or replacing the panda. Its existing phone mockup remains the hero artwork. A cream sheet enters over a pale-blue background, with gentle illustration/heart movement, press feedback, a small/medium selector and reduced-motion support. Every action is connected: Add opens the available native flow or instructions; Maybe Later returns to the existing cozy Home.

After the first successfully completed authenticated practice, the existing panda celebrates for 1.1 seconds, then the app offers the widget. Failed completion never prompts. Navigating away cancels the transition. An invitation shown/dismissed/requested flag persists locally, so it does not repeat unnecessarily. Profile offers “Add Panda to Home Screen” at any time. Authentication, existing lessons, conversation completion, review and Supabase stay intact.

## Actual operating-system widgets

These are separate implementations from the onboarding phone picture:

- iOS: `expo-widgets` 58.0.26 generates a WidgetKit extension using native SwiftUI through Expo UI. `PandaCompanion.ios.tsx` registers a small widget; `DailyKorean.ios.tsx` registers a medium widget. Both use the original V2 panda face, readable Korean text, light/dark colors and `harukorean://widget`. Medium includes an English translation, reply progress and streak.
- Android: `modules/panda-widgets` is a local Expo module with native Kotlin `AppWidgetProvider` / RemoteViews implementations. Small and medium receivers, layouts, artwork, light/dark resources and pinning are included. The iOS-only Expo widget/UI modules are excluded from Android autolinking to avoid shipping unused Glance infrastructure.
- `/widget` handles the shared deep-link destination and opens the existing Home tab. Paid conversation features retain their authentication checks.

The real widget artwork is the original V2 face. The supplied smartphone illustration is promotional art only; the whole phone is never placed in an OS widget. Home screen widgets use OS-managed snapshots rather than Rive or continuously animated React Native views.

## Installation behavior

Android calls `isRequestPinAppWidgetSupported` and `requestPinAppWidget` through the local module on supported launchers. An accepted request is described as a request, not a confirmed installation. Unsupported launchers and errors receive manual instructions. No permissions or notifications are requested for widget installation.

iOS presents an illustrated step-by-step guide to the Home Screen widget gallery. It does not claim to silently install a widget or open a nonexistent installation API. Browser, Expo Go and older native binaries without the required modules clearly identify themselves as previews requiring a new native build.

## Shared data and refresh

`WidgetDataSync` observes existing learning stats and app foreground events; it adds no Supabase requests. The whitelist contains only `practiceDay`, `streak`, and `turns`. The widget phrase comes from a small public Korean/English catalog. No tokens, names, user IDs, conversations or saved private phrases are shared.

iOS stores public timeline props in the App Group `group.app.harukorean.mobile.panda`, configured for both app and extension by the official plugin. Android stores only those whitelisted aggregates in private widget preferences. A serial queue ensures an older in-flight update cannot overwrite newer sign-out data. Failed updates retry on subsequent app foreground or learning-state changes.

Dates match the app’s existing UTC learning-day convention. Reply progress resets at midnight; a streak expires after two inactive calendar days. Future entries never invent progress. iOS receives 31 local daily entries whenever the app syncs. After that horizon, the last phrase can remain until the app opens again; no background network service is added. Android requests 30-minute OS updates, and also updates immediately when the app writes stats. WidgetKit and Android control actual refresh timing and may delay updates.

## Native generation

The project retains Expo Continuous Native Generation; generated `ios/` and `android/` directories are not committed.

```sh
# Node 24, installed dependencies
npm run test:widgets:prebuild

# On a configured native-development machine
npx expo prebuild
npx expo run:ios
npx expo run:android
```

`withPandaWidgetAssets` must precede `expo-widgets` in the plugin array because mod execution is wrapped in reverse order. It copies the panda asset catalog and explicitly includes it in the widget target’s Resources phase. The prebuild verification runs twice in an isolated temporary project, checking both widget families, target/resource membership and asset existence. It preserves the working repository’s native configuration.

For a signed iOS build, configure your Apple team and enable/provision the App Group for the main app and widget extension. If bundle identifiers change, update the corresponding widget bundle/App Group identifiers. Android requires an installed build containing the local module; Expo Go cannot acquire this module at runtime.

## Verification and remaining device checks

TypeScript, lint, public-data/expiry/queue unit tests, invitation/skip/guide/deep-link browser tests, first-practice integration and repeated native prebuild generation are automated. Android autolinking discovers `HaruPandaWidgets` and excludes the unused iOS-only widget modules. Expo exports verify JavaScript/native asset bundling, not Swift/Kotlin compilation.

This machine has Command Line Tools but no full Xcode installation, Android SDK/adb or configured device. Swift/Kotlin compilation, signing, actual WidgetKit/launcher image rendering, pin confirmation, native deep-link delivery and widget refresh after killing the app remain unverified. Test both sizes and light/dark modes on real devices before release; none of this is claimed to work inside Expo Go.

References: [Expo Widgets](https://docs.expo.dev/versions/latest/sdk/widgets/), [local Expo modules](https://docs.expo.dev/modules/get-started/), [Android widget pinning](https://developer.android.com/develop/ui/views/appwidgets/discoverability), [Apple widget installation](https://support.apple.com/en-ie/118610).
