# Tasks: Anchor Generated Native Folders in Gitignore

- [x] **Task 1: Update Root `.gitignore`**
  - [x] 1.1 Anchor generated native paths with `/ios/`, `/android/`, `/apps/mobile/ios/`, and `/apps/mobile/android/`.
- [x] **Task 2: Verification**
  - [x] 2.1 Verify ignore engine does not match local module paths (`apps/mobile/modules/**`).
  - [x] 2.2 Verify ignore engine matches generated CNG paths (`apps/mobile/android/`, `apps/mobile/ios/`).
  - [x] 2.3 Verify `expo-modules-autolinking resolve -p android` includes `meditation-session` and `dnd-status`.
  - [x] 2.4 Run `make check` (lint, typecheck, tests).
- [x] **Task 3: Documentation & Verification Report**
  - [x] 3.1 Create `verification.md` documenting validation commands and results.
