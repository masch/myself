# Android UI Insets & Keyboard Avoidance

## Objective

Standardize Android and iOS screen layouts by creating a reusable `ScreenContainer` component for safe-area insets (resolving status-bar/clock overlaps) and fixing keyboard avoidance in `AppBottomSheetModal` so inputs and actions remain visible when the soft keyboard is open.

## Scope & Constraints

- Work within `@myself/mobile`.
- Prioritize future-proof architecture over backwards compatibility: introduce breaking changes freely if it yields cleaner contracts and foundations.
- Maintain 100% test pass rate across unit and Playwright test suites.

## Tasks

- [x] **TASK-1**: Create `ScreenContainer` component and unit tests (`apps/mobile/src/components/screen-container.tsx`)
- [x] **TASK-2**: Integrate `ScreenContainer` across tab screens (`reflections.tsx`, `index.tsx`, `meditation.tsx`, `readings.tsx`, `settings.tsx`)
- [x] **TASK-3**: Enhance `AppBottomSheetModal` with Android keyboard avoidance (`behavior="height"`, `automaticallyAdjustKeyboardInsets`)
- [x] **TASK-4**: Verify full quality suite (`make check`, `make check-e2e-browser`)
- [x] **TASK-5**: Position web native tabs at the bottom (`apps/mobile/src/app/(tabs)/_layout.web.tsx`, `tabs-web.css`)
- [x] **TASK-6**: Compact native Android tabs height to 56dp via Expo config plugin (`apps/mobile/plugins/with-android-tab-height.js`, `app.json`)

## Evidence & Verification

- `TASK-1`: commit `eca9e8d` (`feat(mobile): add reusable ScreenContainer for safe-area insets`)
- `TASK-2`: commit `0858df5` (`refactor(mobile): integrate ScreenContainer across all tab screens`)
- `TASK-3`: commit `9f0ddf1` (`fix(mobile): enable Android keyboard avoidance in bottom sheet modals`)
- `TASK-4`: verified via `make check` (prettier, 166 unit tests, lint, tsc, expo-doctor 20/20) and `make check-e2e-browser` (5/5 Playwright e2e tests passing).
- `TASK-5`: commit `45c549b` (`feat(mobile): position web native tabs at the bottom`)
- `TASK-6`: commit `6d41da6` (`feat(mobile): compact native android tabs height to 56dp via config plugin`)
