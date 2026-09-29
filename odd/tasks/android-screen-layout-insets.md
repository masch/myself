# Feature: Android Screen Layout, Full Width & Insets Optimization

## Objective

Fix layout rendering issues on Android native where reflection questions do not take advantage of full available screen width due to nested card padding, and remove dead bottom space while enabling edge-to-edge transparent system navigation bar.

## Problem & Why

1. In `apps/mobile/src/app/(tabs)/reflections.tsx`, missed routine questions were rendered inside an outer `<Card>` (`missedNotice`) with 14dp padding, which in turn contained `<PromptCard>` components (each with 16dp internal padding). Combined with the screen's 16dp horizontal padding, questions had 46dp margin per side (92dp total wasted horizontal width), making prompt text squished into a narrow column.
2. In native Android, the 3-button system navigation bar renders as a solid black block because `android:navigationBarColor` is not set to `@android:color/transparent` and `android:enforceNavigationBarContrast` is not disabled. Furthermore, `ScreenContainer` in `reflections.tsx` applied default bottom safe-area insets even though the screen is rendered inside `NativeTabs`, and the inner `ScrollView` added an extra 40dp bottom padding, creating massive dead space at the bottom.

## Scope & Constraints

- Keep `PromptCard` component intact and standard across all sections.
- Transform `missedNotice` into a clean full-width callout banner, rendering missed `PromptCard`s as siblings with standard width.
- Configure `ScreenContainer` in `reflections.tsx` with `edges={["top"]}` to avoid double-inset padding above `NativeTabs`.
- Add Android styles configuration in `plugins/with-android-tab-height.js` for `@android:color/transparent` navigation bar and `enforceNavigationBarContrast = false`.
- Keep 100% test pass rate across unit tests and Playwright E2E browser suite.

## Tasks

- [x] TASK-1: Flatten `reflections.tsx` card nesting (`missedNotice` banner + sibling `PromptCard` list) and configure `ScreenContainer` `edges={["top"]}`.
- [x] TASK-2: Update `plugins/with-android-tab-height.js` config plugin to configure transparent Android navigation bar and disable contrast enforcement.
- [x] TASK-3: Run unit tests, typecheck, lint, and browser E2E tests to verify zero regressions.

## Verification Evidence

- `bun run test` (apps/mobile): 207 unit tests passed across 28 files (661 assertions).
- `bun run check` (monorepo root): 9/9 turbo tasks passed (tsc, eslint, prettier, unit tests).
- `bunx expo config --type prebuild`: Validated that config plugin cleanly configures `android:navigationBarColor` and `android:enforceNavigationBarContrast`.
- `make check-e2e-browser`: 5/5 Playwright tests passed (45.8s), verifying full UI flows including missed reflections and cohort progression.
- **Completion & Delivery**:
  - Unnested `PromptCard` components from `missedNotice` `<Card>` container in `reflections.tsx` to restore full width.
  - Configured `edges={["top"]}` on `ScreenContainer` in `reflections.tsx` to eliminate double safe-area insets over `NativeTabs`.
  - Configured transparent navigation bar and disabled contrast enforcement via `with-android-tab-height.js` config plugin.
  - All automated checks and quality gates verified passing.
  - Delivery committed to branch `feat/53-design-system` on PR [#58](https://github.com/masch/myself/pull/58).
