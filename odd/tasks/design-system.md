# Platform-First Design System Roadmap

## Objective

Establish a unified, platform-first design system architecture for the mobile application following issue [#53](https://github.com/masch/myself/issues/53). Implement centralized semantic design tokens (`spacing`, `typography`, `radius`, `shadows`), core primitives (`Surface`/`Card`, `ThemedText`), accessible headless primitives via `@rn-primitives/*`, native platform controls via `@expo/ui`, and a developer showcase screen to eliminate design drift and ad-hoc styling.

## Scope & Constraints

- Monorepo package: `apps/mobile`.
- Architectural boundary enforcement:
  - Tokens layer: pure TypeScript definitions under `src/theme/tokens/`, zero React dependencies, 100% unit tested.
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
- [ ] **TASK-2**: Phase 2 — Core Primitives (Surfaces & Typography):
  - Build `<Surface>` / `<Card>` primitive supporting `elevated`, `outlined`, and `subdued` variants with continuous curvature.
  - Build `<ThemedText>` typography primitive enforcing font sizes, line heights, and weights.
  - Add unit tests for `<Surface>` and `<ThemedText>`.
  - Refactor `index.tsx` (Home) and `readings.tsx` (Readings) to consume the new primitives.
- [ ] **TASK-3**: Phase 3 — Headless Accessible Primitives (`@rn-primitives`):
  - Install targeted `@rn-primitives/*` dependencies.
  - Create token-wrapped accessible components in `apps/mobile/src/components/primitives/`.
  - Refactor accordion and collapsible patterns in `reflections.tsx` and `meditation.tsx`.
- [ ] **TASK-4**: Phase 4 — Platform-Native Controls (`@expo/ui`):
  - Expand `@expo/ui` usage for settings, form modals, switches, and pickers with cross-platform parity.
- [ ] **TASK-5**: Phase 5 — Developer Showcase & Visual Verification:
  - Implement developer showcase screen in `apps/mobile/src/app/(tabs)/dev-showcase.tsx` documenting token scales and primitives.
  - Ensure zero regressions across full test suite and quality gates.

## Evidence & Verification

_(Will be populated with work-unit commits and check results)_
