# Design System Components & Common Primitives Refactor

## Objective

Refactor domain feature components (`src/features/reflections/components/`), common button primitives (`src/components/`), and atomic form elements to strictly consume design system tokens (`@/theme`) and design system primitives (`<ThemedText>`, `<Card>`, `<ThemedTextInput>`, `<Divider>`), eliminating raw `<Text>` in feature code and enforcing architectural consistency following issue [#57](https://github.com/masch/myself/issues/57).

## Scope & Constraints

- Monorepo package: `apps/mobile`.
- Architectural boundary enforcement:
  - Tokens layer: pure definitions under `src/theme/tokens/`, single public import `@/theme`.
  - Headless accessible primitives: any `@rn-primitives/*` must be strictly wrapped inside `src/components/primitives/` with design tokens before consumption.
  - Zero raw `<Text>` in `src/features/`.
  - Continuous curvature & design tokens (`radius`, `spacing`, `typography`, `colors`) on all buttons and atomic inputs.
- Quality gates: `make check` (`make check-format`, `make check-odd`, `make check-static`, `make check-tests`, `make check-doctor`) must pass cleanly.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR for primitives and components)
- **Test Runner**: `bun test` / `make check-tests`
- **Delivery Strategy**: `ask-on-risk` (heuristic: ~400 authored lines per work unit)

## Tasks

- [x] **TASK-1**: New Atomic Primitives (`<Divider>` and `<ThemedTextInput>`):
  - Implement `<Divider>` in `apps/mobile/src/components/divider.tsx` using `colors.separator` and token margins.
  - Implement `<ThemedTextInput>` in `apps/mobile/src/components/themed-text-input.tsx` enforcing token padding, continuous curvature radius, typography variant, and placeholder color tokens.
  - Export from `apps/mobile/src/components/index.ts`.
  - Add unit tests in `apps/mobile/src/components/__tests__/divider.test.tsx` and `themed-text-input.test.tsx`.
- [x] **TASK-2**: Common Button Primitives Alignment (`AppButton`, `ChipButton`, `IconButton`, `HeaderButton`, `StepperButton`):
  - Refactor `AppButton`, `ChipButton`, `IconButton`, `HeaderButton`, and `StepperButton` in `apps/mobile/src/components/` to use typography, radius, and spacing design tokens.
  - Replace internal raw `<Text>` with `<ThemedText>`.
  - Add/update unit tests for button primitives.
- [x] **TASK-3**: Feature Components Migration (`src/features/reflections/components/`):
  - Refactor `PromptCard.tsx` to use `<ThemedText>`, `<Card>`, and design tokens.
  - Refactor `CohortEnrollmentCard.tsx` to use `<ThemedText>`, `<Card>`, and design tokens.
  - Refactor `CycleProgressBadge.tsx` to use `<ThemedText>` and design tokens.
  - Refactor `ScaleSelector1To10.tsx` to use token scales and `<ThemedText>`.
  - Refactor `ReflectionModal.tsx` and `SkipReasonSheet.tsx` to use `<ThemedText>`, `<Card>`, `<ThemedTextInput>`, and button tokens.
  - Update or add unit tests for migrated feature components.
- [x] **TASK-4**: Quality Gate Verification & Developer Showcase Update:
  - Add examples of `<Divider>` and `<ThemedTextInput>` to `apps/mobile/src/app/dev-showcase.tsx`.
  - Verify zero raw `<Text>` occurrences in `src/features/`.
  - Run full quality gates (`make check`).

## Evidence & Verification

- `TASK-1`: Implemented canonical `<Divider>` and `<ThemedTextInput>` primitives enforcing design system tokens (`colors.separator`, `spacing`, `radius.md` with continuous curvature, and `typography` variants).
  - Exported primitives via `apps/mobile/src/components/index.ts`.
  - Created unit tests in `apps/mobile/src/components/__tests__/divider.test.tsx` and `themed-text-input.test.tsx` (7 unit tests).
  - Observed TDD RED prior to implementation, then GREEN across unit test suite (220 tests passed) and clean quality gates (`make check-format`, `make check-static`, `make check-tests`, `make check-doctor`: 20/20 passed).
- `TASK-2`: Refactored common button primitives (`AppButton`, `ChipButton`, `IconButton`, `HeaderButton`, and `StepperButton`) to systematically consume design system tokens (`radius`, `spacing`, `typography`, `colors`) and replaced 100% of internal raw `<Text>` with `<ThemedText>`.
  - Added unit test suite in `apps/mobile/src/components/__tests__/buttons.test.tsx` (5 unit tests).
  - Verified clean quality gates (`make check-format`, `make check-static`, `make check-tests`: 225 passed, `make check-doctor`: 20/20 passed).
- `TASK-3`: Refactored all domain feature components (`PromptCard`, `CohortEnrollmentCard`, `CycleProgressBadge`, `ScaleSelector1To10`, `ReflectionModal`, and `SkipReasonSheet`) to consume canonical primitives (`<ThemedText>`, `<Card>`, `<ThemedTextInput>`) and design tokens (`@/theme`).
  - Completely eliminated raw `<Text>` in `src/features/` (0 remaining occurrences).
  - Added unit test suite in `apps/mobile/src/features/reflections/components/__tests__/feature-components.test.tsx` (5 unit tests).
  - Verified clean quality gates (`make check-format`, `make check-static`, `make check-tests`: 230 passed, `make check-doctor`: 20/20 passed).
- `TASK-4`: Updated Developer Showcase (`apps/mobile/src/app/dev-showcase.tsx`) with interactive examples of canonical `<Divider>` and `<ThemedTextInput>`.
  - Updated showcase unit test suite (`apps/mobile/src/app/__tests__/dev-showcase.test.tsx`).
  - Confirmed 0 raw `<Text>` in `src/features/`.
  - Verified all quality gates in green (`make check-format`, `make check-odd`, `make check-static`, `make check-tests`: 230 passed, `make check-doctor`: 20/20 passed).
- **Completion & Delivery**:
  - Successfully completed all 4 tasks planned for issue [#57](https://github.com/masch/myself/issues/57).
  - All quality gates observed passing in green (`make check-format`, `make check-odd`, `make check-static`, `make check-tests`: 230 passed, `make check-doctor`: 20/20 passed).
  - Clean design system architecture enforced with zero raw `<Text>` in `src/features/`.
  - Delivered on feature branch `feature/refactor-design-system-components`.
