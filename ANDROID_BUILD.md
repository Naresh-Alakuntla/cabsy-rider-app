# Cabsy Rider — Android build guide

## Prereqs
- JDK 17+ (`brew install --cask temurin@17` on macOS)
- Android SDK + platform-tools (Android Studio bundles these)
- `ANDROID_HOME` env var set
- Node 22+ + npm 10+
- The repo's `npm install` already ran successfully

## Required configuration (one-time)

### 1. Firebase
Download `google-services.json` from Firebase Console (rider app, package `com.cabsy.rider`) and place at:
```
android/app/google-services.json
```
This is gitignored and must NEVER be committed.

### 2. Google Maps API key
The Android manifest reads the key via the `GOOGLE_MAPS_API_KEY` Gradle property. Pass it on every build:
```
./gradlew :app:assembleDebug -PGOOGLE_MAPS_API_KEY=AIzaSy…
```
Or persist locally by adding to `~/.gradle/gradle.properties`:
```
GOOGLE_MAPS_API_KEY=AIzaSy…
```
Restrict the key in Google Cloud Console to:
- Android apps with package name `com.cabsy.rider`
- The SHA-1 fingerprint of your release keystore (see step 3)

### 3. Production keystore (release builds only)
Generate once and store securely (1Password, AWS Secrets Manager, etc.):
```
keytool -genkey -v \
  -keystore android/app/release.keystore \
  -alias cabsy \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```
Then export the credentials before each release build:
```
export ANDROID_KEYSTORE_PASSWORD='your-keystore-password'
export ANDROID_KEY_ALIAS='cabsy'
export ANDROID_KEY_PASSWORD='your-key-password'
```
Get the SHA-1 fingerprint (for Maps + Firebase restriction):
```
keytool -list -v -keystore android/app/release.keystore -alias cabsy
```
Add this SHA-1 to:
- Firebase Console → Project Settings → Your apps → SHA certificate fingerprints
- Google Cloud Console → API key → Application restrictions → Android apps

`release.keystore` is gitignored.

## Build commands

| Goal | Command |
|---|---|
| Debug APK (local emulator/device) | `npx react-native run-android` |
| Release APK | `cd android && ./gradlew :app:assembleRelease -PGOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY` |
| Release AAB (Play Store) | `cd android && ./gradlew :app:bundleRelease -PGOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY` |
| Clean | `cd android && ./gradlew clean` |

Output:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

## Permissions declared
See `android/app/src/main/AndroidManifest.xml`. The app requests:
- `INTERNET`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`
- `ACCESS_BACKGROUND_LOCATION` — needed for driver-side tracking; rider only uses foreground
- `POST_NOTIFICATIONS` (Android 13+) — FCM
- `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION` — driver app only

## Play Store submission

1. Increment `versionCode` (must always be unique and increasing) in `android/app/build.gradle`.
2. Build the AAB (see above).
3. Upload to Play Console internal testing track first.
4. Complete the **Data Safety** form (collected data: phone, location, ride history; not shared).
5. Provide Privacy Policy URL.
6. Promote to production when ready.

## Common build issues

| Symptom | Fix |
|---|---|
| `Could not find ../node_modules/...` | Run `npm install` from the repo root first. |
| `Could not resolve com.facebook.react:react-android` | Run `cd android && ./gradlew clean`, then re-build. |
| Maps tiles render blank | `GOOGLE_MAPS_API_KEY` not passed at build time, OR key not restricted to this package + SHA. |
| FCM token never arrives | `google-services.json` missing or wrong package name. |
| Release crash: `ClassNotFoundException` | A library needs ProGuard keep rules — add to `proguard-rules.pro`. |

## CI

Set these GitHub Actions secrets:
- `ANDROID_KEYSTORE_BASE64` — `base64 release.keystore` of the keystore
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`
- `GOOGLE_MAPS_API_KEY`

CI workflow steps:
1. Restore: `echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > android/app/release.keystore`
2. Build: `cd android && ./gradlew :app:bundleRelease -PGOOGLE_MAPS_API_KEY=$GOOGLE_MAPS_API_KEY`
3. Upload to Play Console (Fastlane `supply` lane recommended).
