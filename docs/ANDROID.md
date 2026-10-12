# Android app and optional rewarded ads

The Android app loads the deployed game over HTTPS. All game screens, powers, authentication, multiplayer, replays and economy remain in the shared JavaScript application and authoritative server. The small Java activity supplies Android WebView, Google AdMob and Google UMP platform APIs.

## Build and install a test APK

Open the repository's **Actions → Android APK** workflow and run it, or push a change under `mobile/android` to `main`. The job compiles and lints the Android app, then uploads **elemental-arena-android-debug** containing `app-debug.apk` and its SHA-256 checksum. Download and extract that artifact, transfer the APK to an Android 7.0+ phone, and permit installation from the source you use. The debug APK is for testing; it is not a Play Store publication.

For a local build, install JDK 17 and Google's Android SDK platform 36/build tools 35.0.0. Set `ANDROID_HOME` to that SDK and run:

```powershell
cd mobile/android
.\gradlew.bat :app:assembleDebug :app:lintDebug
```

The output is `mobile/android/app/build/outputs/apk/debug/app-debug.apk`. Open `mobile/android` in Android Studio for emulator and device tests. The official Gradle 8.13 wrapper and downloaded distribution have pinned SHA-256 checksums.

GitHub repository **Variables** may override the two public build settings:

| Variable | Purpose | Default |
|---|---|---|
| `ELEMENTAL_GAME_ORIGIN` | Exact HTTPS game origin without path or trailing slash | `https://elemental-arena-production.up.railway.app` |
| `ADMOB_ANDROID_APP_ID` | AdMob Android **app** ID (contains `~`) | Google's official sample app ID |

These are public identifiers, not signing keys or server secrets. Build a new APK after changing either. Live JavaScript game updates at the same origin do not require a new APK. A production store release separately needs an owner-controlled signing key, signed release bundle and Play Console submission.

## AdMob account configuration

1. Register the Android package `com.elementalarena.game` in your AdMob account and set its app ID as `ADMOB_ANDROID_APP_ID` for the APK build.
2. Create a **rewarded** ad unit. Configure the server's rewarded-ad unit setting to that Android ad-unit ID (contains `/`), following `docs/COMMERCE.md`.
3. Set the ad unit's server-side verification callback URL to the deployed `/api/ads/admob/ssv` endpoint. The server validates Google's signature, the opaque issued session token, the user, allowed unit, reward eligibility and duplicate transaction handling before adding coins.
4. Configure the appropriate privacy messages in AdMob **Privacy & messaging**. UMP refreshes consent information on every app launch, displays a required consent form, and exposes **Ad privacy** above the game when privacy options are required.
5. Use Google's official test ad unit or a registered test device during development. Test ads do not prove live production SSV delivery or real revenue. Verify a genuine signed SSV callback and resulting wallet transaction after supplying your own account configuration.

The wrapper requests an ad only after the player explicitly selects the optional rewarded-ad offer. It initializes and loads the AdMob SDK after UMP permits ad requests. There are no banners, forced interstitials or automatic ads on match start. Server eligibility prevents rewarded offers from affecting Ranked.

## Native bridge contract

The bridge exists only on the exact configured HTTPS origin. Calls from other origins or subframes are rejected. The game obtains a server-issued reward session first, then invokes:

```javascript
window.ElementalNative.postMessage(JSON.stringify({
  type: 'rewarded',
  sessionId,
  userId,
  customData, // Opaque token issued by the authenticated JS server.
  adUnit,     // Rewarded Android ad-unit ID returned by that server.
}));
```

The wrapper sets AdMob `ServerSideVerificationOptions.userId` and `customData` before showing the ad. It dispatches `elemental:admob` events with `detail.state` equal to `loading`, `rewarded`, `closed` or `error`, plus the session ID and display information. **No native callback grants coins.** A `rewarded` event tells the web UI to await/poll the verified server settlement.

The optional `{type:'privacy'}` bridge message opens the same UMP privacy-options form when required. The visible native **Ad privacy** button also provides that entry point.

## WebView boundaries and device validation

The app disables file/content access, mixed content, cleartext traffic, third-party cookies, arbitrary intent schemes and automatic new windows. SSL errors are cancelled. Only the trusted game stays in the WebView; external HTTPS links and Google sign-in open the phone's browser. Browser and WebView authentication cookies are separate, so use email/password or a guest account for in-app play; a Google browser sign-in stays in that browser.

Before distributing a release, test on an emulator and a physical device: registration/login, Socket.IO reconnection, all board target styles, audio after a tap, consent acceptance/refusal/privacy reopening, ad no-fill and cancellation, signed SSV reward delivery, app background/resume and network loss. APK compilation confirms SDK/API compatibility; it does not replace those device checks.

## Verified upstream references

- [Google Mobile Ads Android setup](https://developers.google.com/admob/android/quick-start) — supported SDK 25.5.0, app ID and minimum Android API.
- [Rewarded ads](https://developers.google.com/admob/android/rewarded) and [server-side verification](https://developers.google.com/admob/android/ssv).
- [Google UMP integration](https://developers.google.com/admob/android/privacy) — UMP 4.0.0 and consent/privacy-options sequence.
- [AndroidX WebKit releases](https://developer.android.com/jetpack/androidx/releases/webkit) — stable WebKit 1.17.1.
- [Android's origin-scoped JavaScript bridge](https://developer.android.com/develop/ui/views/layout/webapps/native-api-access-jsbridge).
- [AGP 8.13 compatibility](https://developer.android.com/build/releases/agp-8-13-0-release-notes) — Gradle 8.13/JDK 17/Android API 36.
