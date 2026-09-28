# Feature: ScreenContainer.Tab Compound Component

## Objective

Promote tab safe-area handling to a first-class compound component `<ScreenContainer.Tab>` in the Design System, eliminating the need to pass manual `edges={["top"]}` props at the screen level.

## Problem & Why

Fixed screens inside tab navigators (such as `reflections.tsx` and `settings.tsx` on iOS) sit directly above `NativeTabs`, which already absorbs device bottom safe-area insets. Passing `edges={["top"]}` manually at the screen level is a leaky abstraction. Introducing `<ScreenContainer.Tab>` provides an idiomatic compound component with `DEFAULT_TAB_EDGES: ["top"]`.

## Scope & Constraints

- Implement `TabScreenContainer` in `apps/mobile/src/components/screen-container.tsx` and attach as `ScreenContainer.Tab`.
- Update `reflections.tsx` and `settings.tsx` to use `<ScreenContainer.Tab>`.
- Add unit tests for `ScreenContainer.Tab` and `TabScreenContainer`.
- Update architecture guidelines in `AGENTS.md`.
- Verify all tests, static analysis, and browser E2E suites.

## Tasks

- [x] TASK-1: Implement `TabScreenContainer` & `ScreenContainer.Tab` with unit tests in `screen-container.test.tsx`.
- [x] TASK-2: Migrate `reflections.tsx` and `settings.tsx` to `<ScreenContainer.Tab>`.
- [x] TASK-3: Update `AGENTS.md` and verify all quality checks (`bun run check`, `make check-odd`, `make check-e2e-browser`).

## Verification Evidence

- `bun test src/components/__tests__/screen-container.test.tsx`: 7/7 unit tests passed.
- `bun run test` (apps/mobile): 209 unit tests passed across 28 files (663 assertions).
- `make check-odd`: All ODD task documents completed and closed.
- `make check-static`: Static analysis, ESLint and TypeScript checks passed.
- `make check-e2e-browser`: 5/5 Playwright tests passed.

- **Completion & Delivery**:
  - Implemented `<ScreenContainer.Tab>` (and `TabScreenContainer`) in `apps/mobile/src/components/screen-container.tsx` with `DEFAULT_TAB_EDGES = ["top"]`.
  - Migrated `reflections.tsx` and `settings.tsx` to `<ScreenContainer.Tab>`.
  - Documented compound component guidelines in `AGENTS.md`.
  - Verified 100% test pass rate across unit tests and Playwright E2E browser tests.
  - Delivery committed to feature branch `feat/53-design-system` on PR [#58](https://github.com/masch/myself/pull/58).
