# Change Proposal: Anchor Generated Native Folders in Gitignore

## 1. Problem Statement

Following the monorepo restructuring in commit `28f43cd`, generated native folders in `.gitignore` were changed from root-anchored paths (`/ios`, `/android`) to unanchored directory globs (`ios/`, `android/`).

Because gitignore rules without a leading slash match directories at any level of the project tree, EAS CLI build packagers (`vcsClient.makeShallowCopyAsync`) and git ignore filters excluded the native source directories of local Expo modules:
- `apps/mobile/modules/meditation-session/android/`
- `apps/mobile/modules/meditation-session/ios/`
- `apps/mobile/modules/dnd-status/android/`
- `apps/mobile/modules/dnd-status/ios/`

As a result:
- EAS local builds packaged empty `android/` folders for local modules.
- `expo-modules-autolinking` failed to find `build.gradle` inside the module directories and omitted `meditation-session` and `dnd-status` from Gradle settings.
- Staging APK `staging-v2026.09.02-1158` was produced without `MeditationForegroundService`.
- Background meditation execution on locked Android devices broke: Doze mode suspended JS timers without a wake lock, preventing Moment 2 notifications and gong sounds from firing.

## 2. Proposed Solution

1. **Update `.gitignore` Generated Native Patterns**:
   Anchor generated native paths to the mobile app workspace and root:
   ```gitignore
   # generated native folders
   /ios/
   /android/
   /apps/mobile/ios/
   /apps/mobile/android/
   coverage/
   ```
2. **Preserve Local Native Modules**:
   Ensure `apps/mobile/modules/**` is never matched by ignore rules.
3. **Verify Autolinking and Build Packaging**:
   - Run `eas build:inspect -p android -s archive` to ensure `apps/mobile/modules/*/android/build.gradle` and Kotlin sources are preserved in the archive.
   - Run `expo-modules-autolinking resolve --platform android` to guarantee `meditation-session` and `dnd-status` are recognized as active projects.

## 3. Impact Analysis

- **Blast Radius**: Root `.gitignore`.
- **Target Workspaces**: `apps/mobile`.
- **Backward Compatibility**: Fully backward-compatible; prevents local module sources from being ignored while maintaining ignore behavior for generated CNG folders in `apps/mobile/android/` and `apps/mobile/ios/`.

## 4. Verification Strategy

- **Automated / Tooling Validation**:
  - Check `.gitignore` against module paths using `git check-ignore -v apps/mobile/modules/meditation-session/android/build.gradle`. It must return non-zero (not ignored).
  - Check `.gitignore` against generated paths using `git check-ignore -v apps/mobile/android/build.gradle`. It must return matched (ignored).
  - Run `expo-modules-autolinking resolve --platform android` in `apps/mobile` and verify `meditation-session` and `dnd-status` are present in `modules`.
- **Code Quality**:
  - Run `make check` (`bun run lint`, `typecheck`, `test`).
