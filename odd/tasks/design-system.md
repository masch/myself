# Platform-First Design System Roadmap

## Objective

Establish a unified, platform-first design system architecture for the mobile application following issue [#53](https://github.com/masch/myself/issues/53). Implement centralized semantic design tokens (`spacing`, `typography`, `radius`, `shadows`), core primitives (`Surface`/`Card`, `ThemedText`), accessible headless primitives via `@rn-primitives/*`, native platform controls via `@expo/ui`, and a developer showcase screen to eliminate design drift and ad-hoc styling.

## Scope & Constraints

- Monorepo package: `apps/mobile`.
- Architectural boundary enforcement:
  - Tokens layer: pure TypeScript definitions strictly housed under `src/theme/tokens/` (`colors.ts`, `spacing.ts`, `typography.ts`, `radius.ts`, `shadows.ts`), zero React dependencies, 100% unit tested.
  - Strict encapsulation & single public entry point: all consumers must import exclusively from `@/theme` (`src/theme/index.ts`). Deep imports (`@/theme/colors`, `@/theme/tokens/*`) are strictly prohibited.
  - Zero internal backward-compatibility shims: intermediate compatibility layers are rejected; existing codebases must be refactored to canonical architecture.
  - Universal layout layer: `<ScreenContainer>` for safe-area and root layouts, adhering to existing `AGENTS.md` guidelines.
  - Core primitives: `<Card>`/`<Surface>` and `<ThemedText>` enforcing continuous curvature and token scales.
  - Headless layer: `@rn-primitives/*` wrapped in design tokens, zero direct raw imports in screens.
  - Platform-native layer: `@expo/ui` for OS-level controls with SwiftUI (iOS), Compose (Android), and semantic web parity.
- Quality gates: `make check` (`make check-format`, `make check-odd`, `make check-static`, `make check-tests`, `make check-doctor`) must pass cleanly.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR for tokens and primitives)
- **Test Runner**: `bun test` / `make check-tests`
- **Delivery Strategy**: `ask-on-risk` (heuristic: ~400 authored lines per work unit)

## Tasks

- [x] **TASK-1**: Phase 1 — Foundation & Semantic Token System:
  - Define `spacing.ts`, `typography.ts`, `radius.ts`, and `shadows.ts` under `apps/mobile/src/theme/tokens/`.
  - Export tokens and existing `colors.ts` via `apps/mobile/src/theme/index.ts`.
  - Add unit tests verifying token scale completeness and type soundness.
- [x] **TASK-2**: Phase 2 — Core Primitives (Surfaces & Typography):
  - Build `<Surface>` / `<Card>` primitive supporting `elevated`, `outlined`, and `subdued` variants with continuous curvature.
  - Build `<ThemedText>` typography primitive enforcing font sizes, line heights, and weights.
  - Add unit tests for `<Surface>` and `<ThemedText>`.
  - Refactor `index.tsx` (Home) and `readings.tsx` (Readings) to consume the new primitives.
- [x] **TASK-3**: Phase 3 — Headless Accessible Primitives (`@rn-primitives`):
  - Install targeted `@rn-primitives/*` dependencies.
  - Create token-wrapped accessible components in `apps/mobile/src/components/primitives/`.
  - Refactor accordion and collapsible patterns in `reflections.tsx` and `meditation.tsx`.
- [x] **TASK-4**: Phase 4 — Platform-Native Controls (`@expo/ui`):
  - Expand `@expo/ui` usage for settings, form modals, switches, and pickers with cross-platform parity.
- [x] **TASK-5**: Phase 5 — Developer Showcase & Visual Verification:
  - Implement developer showcase screen in `apps/mobile/src/app/dev-showcase.tsx` documenting token scales and primitives.
  - Ensure zero regressions across full test suite and quality gates.

## Evidence & Verification

- Commit `492112d` (`feat(theme): establish platform-first semantic design tokens and unit tests`):
  - `TASK-1`: Established modular design tokens in `apps/mobile/src/theme/tokens/` (`spacing.ts`, `typography.ts`, `radius.ts`, `shadows.ts`).
  - Re-exported semantic tokens and `colors.ts` through unified `@/theme` (`apps/mobile/src/theme/index.ts`).
  - Created unit tests in `apps/mobile/src/theme/__tests__/tokens.test.ts` verifying 4-point spacing grid, Apple HIG typography scales with paired font/lineHeight/weight, radii, and `boxShadow` presets.
  - Verified static analysis (`make check-lint`, `make check-types`, `make check-format`) and unit test suite (181 passed).
- Commit `9c08e37` (`refactor(theme): move colors to tokens/colors and enforce unified @/theme entry point`):
  - Enforced strict architecture: moved `colors.ts` to `apps/mobile/src/theme/tokens/colors.ts`.
  - Re-exported all tokens (`colors`, `spacing`, `typography`, `radius`, `shadows`) exclusively from `@/theme`.
  - Refactored all 25 application files importing `@/theme/colors` to import from `@/theme`.
  - Verified zero remaining deep imports and all verification checks green.
- Commit `d2c965e` (`feat(ui): implement Surface and ThemedText primitives and migrate tab screens`):
  - `TASK-2`: Added semantic `colors.separator` token for cross-platform borders/dividers.
  - Built `<Surface>` and `<Card>` primitives in `apps/mobile/src/components/surface.tsx` supporting `elevated`, `outlined`, and `subdued` variants with continuous curvature and token padding.
  - Built `<ThemedText>` primitive in `apps/mobile/src/components/themed-text.tsx` enforcing typography token scales with `ColorValue` support.
  - Exported primitives via `apps/mobile/src/components/index.ts`.
  - Added unit tests in `apps/mobile/src/components/__tests__/surface.test.tsx` and `apps/mobile/src/components/__tests__/themed-text.test.tsx` (12 unit tests).
  - Migrated `index.tsx`, `readings.tsx`, and `reading-card.tsx` to `<Card>` and `<ThemedText>`, eliminating ad-hoc styling and hardcoded fonts.
  - Verified quality gates (`make check-format`, `make check-lint`, `make check-types`, `make check-tests`: 193 passed).
- Commit `65f5403` (`feat(ui): implement accessible Accordion and Collapsible primitives with screen refactors`):
  - `TASK-3`: Installed `@rn-primitives/accordion` and `@rn-primitives/collapsible` under `apps/mobile`.
  - Configured Bun test JSX loader for `@rn-primitives` in `test-setup.ts`.
  - Implemented token-wrapped `<Accordion>` and `<Collapsible>` compound components in `apps/mobile/src/components/primitives/`.
  - Exported primitives via `@/components`.
  - Added unit test suite in `apps/mobile/src/components/__tests__/primitives.test.tsx` (5 unit tests covering open/close, `asChild`, and multiple mode).
  - Refactored target time configuration in `apps/mobile/src/app/(tabs)/meditation.tsx` to use `<Collapsible>`.
  - Refactored answered reflections macroblock and completed cohort steps in `apps/mobile/src/app/(tabs)/reflections.tsx` to use `<Collapsible>` and `<Accordion>`.
  - Verified quality gates (`make check-format`, `make check-static`, `make check-tests`: 198 passed, `make check-doctor`: 20/20 passed).
- Commit `406229f` (`feat(ui): implement NativeFieldGroup and NativeSwitch controls and refactor settings screen`):
  - `TASK-4`: Built `NativeSwitch`, `NativeListItem`, `NativeFieldGroup` (with `NativeFieldGroup.Section`), and `NativePicker` in `apps/mobile/src/components/native-controls.tsx`.
  - Refactored `<AppBottomSheetModal>` into a compound component with `<AppBottomSheetModal.Scroll>` enforcing Interface Segregation Principle (ISP) and design tokens.
  - Added `@expo/ui` mocks in `apps/mobile/test-setup.ts` and created unit test suite in `apps/mobile/src/components/__tests__/native-controls.test.tsx` plus updated `bottom-sheet-modal.test.tsx` (7 unit tests).
  - Migrated `apps/mobile/src/app/(tabs)/settings.tsx` to use `NativeFieldGroup.Section`, `NativeListItem`, `NativeSwitch`, and `AppBottomSheetModal.Scroll`.
  - Verified quality gates (`make check-format`, `make check-static`, `make check-tests`: 201 passed).
- Commit `d72e648` (`feat(ui): implement living design system developer showcase`):
  - `TASK-5`: Built living developer showcase screen in `apps/mobile/src/app/dev-showcase.tsx` registered in root Stack navigator documenting and rendering color tokens, typography scales with `<ThemedText>`, spacing grid, corner radii, surface card variants, accessible primitives (`<Collapsible>`, `<Accordion>`), and native controls (`<NativeSwitch>`, `<NativePicker>`, `<NativeListItem>`).
  - Added unit test suite in `apps/mobile/src/app/__tests__/dev-showcase.test.tsx` (1 unit test, 8 expectations).
  - Added developer navigation entry in `apps/mobile/src/app/(tabs)/settings.tsx` for iOS and Android.
  - Enhanced `apps/mobile/test-setup.ts` with test mocks for `expo-image` and `react-native-safe-area-context`.
  - Resolved web React DOM compatibility by applying `StyleSheet.flatten` to `<Accordion>` and `<Collapsible>` primitive styles, preventing `@radix-ui/react-slot` array spread onto DOM `CSSStyleDeclaration`.
  - Verified quality gates (`make check-format`, `make check-static`, `make check-tests`: 202 passed, `make check-doctor`: 20/20 passed).
- **Completion & Delivery**:
  - Successfully executed all 5 roadmap phases for issue [#53](https://github.com/masch/myself/issues/53).
  - All quality gates observed passing in green (`make check-format`, `make check-static`, `make check-tests`: 202 passed, `make check-doctor`: 20/20 passed).
  - Clean architecture enforced with 100% tokens and primitives encapsulation and zero direct deep imports.
  - Delivery completed on feature branch `feat/53-design-system`.
