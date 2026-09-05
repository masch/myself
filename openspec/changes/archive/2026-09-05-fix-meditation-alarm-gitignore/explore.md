# Exploration: Fix Local Native Modules Exclusion in Gitignore

## 1. Context & Architecture

- **Repository Structure**: Monorepo using Bun workspaces and Turborepo.
  - `apps/mobile`: Expo SDK 57 / React Native 0.86 application using Continuous Native Generation (CNG).
  - `apps/mobile/modules/`: Local Expo modules written with the Expo Modules API:
    - `meditation-session`: Native background execution runner. Contains `MeditationForegroundService` with `PARTIAL_WAKE_LOCK`, notification channel, and lifecycle management for Android.
    - `dnd-status`: Native Android module for checking and requesting Do Not Disturb (DND) notification policy permissions.
  - Native Build Model:
    - EAS CLI (`eas build -p android --profile preview --local`) handles APK creation.
    - Prior to build execution, EAS CLI packages the workspace archive using `vcsClient.makeShallowCopyAsync`, filtering files through repository `.gitignore` patterns via `Ignore.createForCopyingAsync`.
    - Gradle evaluates `settings.gradle` with `expoAutolinking.useExpoModules()`, which executes `expo-modules-autolinking resolve --platform android`.
    - Autolinking validates each module with `isAndroidProject` by checking for the existence of `build.gradle` or `build.gradle.kts` within `modules/<name>/android`.

## 2. Problem & Motivation

- In commit `28f43cd` (_chore: consolidate into single root gitignore for monorepo_), the generated native directory patterns in root `.gitignore` were modified from root-anchored paths to relative, unanchored globs:
  ```diff
  - /ios
  - /android
  + ios/
  + android/
  ```
- **Pattern Matching Regression**:
  - According to gitignore specifications, an unanchored pattern `android/` matches any directory named `android/` anywhere in the repository hierarchy.
  - During `eas build --local`, the file copy filter treated `apps/mobile/modules/meditation-session/android/` and `apps/mobile/modules/dnd-status/android/` as generated native directories and excluded their contents (`build.gradle`, source Kotlin files, AndroidManifest).
  - During Gradle configuration, `expo-modules-autolinking` inspected `apps/mobile/modules/meditation-session/android`, found no `build.gradle`, and silently discarded both modules.
  - The resulting release APK (`staging-v2026.09.02-1158`) lacked `MeditationForegroundService` and `DndStatusModule` in `classes.dex`.
  - At runtime, `MeditationSessionModule.startSession()` defaulted to the fallback stub. When the device screen was locked during Moment 2, Android Doze mode suspended the JavaScript thread. Without a Foreground Service holding a `WakeLock`, the timer froze, the gong never sounded, and the transition notification never fired.

## 3. Target State

1. Root `.gitignore` must anchor generated native output directories to `/apps/mobile/ios/` and `/apps/mobile/android/` (plus `/ios/` and `/android/` if present at root).
2. Patterns must explicitly avoid matching `apps/mobile/modules/*/android/` or `apps/mobile/modules/*/ios/`.
3. Validation must verify that `expo-modules-autolinking resolve --platform android` detects and links both `meditation-session` and `dnd-status` within the prebuild and build workflows.
