# Android UI Insets & Keyboard Avoidance

## Objective

Standardize Android and iOS screen layouts by creating a reusable `ScreenContainer` component for safe-area insets (resolving status-bar/clock overlaps) and fixing keyboard avoidance in `AppBottomSheetModal` so inputs and actions remain visible when the soft keyboard is open.

## Scope & Constraints

- Work within `@myself/mobile`.
- Prioritize future-proof architecture over backwards compatibility: introduce breaking changes freely if it yields cleaner contracts and foundations.
- Maintain 100% test pass rate across unit and Playwright test suites.

## Tasks

- [x] **TASK-1**: Create `ScreenContainer` component and unit tests (`apps/mobile/src/components/screen-container.tsx`)
- [ ] **TASK-2**: Integrate `ScreenContainer` across tab screens (`reflections.tsx`, `index.tsx`, `meditation.tsx`, `readings.tsx`, `settings.tsx`)
- [ ] **TASK-3**: Enhance `AppBottomSheetModal` with Android keyboard avoidance (`behavior="height"`, `automaticallyAdjustKeyboardInsets`)
- [ ] **TASK-4**: Verify full quality suite (`make check`, `make check-e2e-browser`)

## Evidence & Verification

- Commits will be recorded per task.
- Automated tests and visual consistency checks.
