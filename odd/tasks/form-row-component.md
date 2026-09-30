# FormRow Compound Component & Grouped Form Cards Refactor

## Objective

Implement a canonical compound component `<FormRow>` (`apps/mobile/src/components/form-row.tsx`) according to Design System architecture guidelines in `AGENTS.md` (_Compound Components over Boolean Flags_ and _Interface Segregation_), eliminating duplicated ad-hoc input row styles and manual divider math across modal form screens ([#60](https://github.com/masch/myself/issues/60)).

## Scope & Constraints

- Monorepo package: `apps/mobile`.
- Architectural boundary enforcement:
  - Tokens layer: pure definitions under `src/theme/tokens/`, imported via `@/theme`.
  - Component architecture: Compound pattern (`FormRow`, `FormRow.Leading`, `FormRow.Input`, `FormRow.Trailing`).
  - No container borders or background on `FormRow.Input` so it embeds natively in grouped `<Card>` surfaces.
  - Accessible touch target heights (minimum 44pt).
- Quality gates: `bun test` and `apps/mobile` typecheck/lint.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `bun test`
- **Delivery Strategy**: `ask-on-risk` (forecast: ~250 lines)

## Tasks

- [x] **TASK-1**: Compound Primitive `<FormRow>`:
  - Create `apps/mobile/src/components/form-row.tsx` with `FormRow`, `FormRow.Leading`, `FormRow.Input`, `FormRow.Trailing`.
  - Export from `apps/mobile/src/components/index.ts`.
  - Create unit test suite in `apps/mobile/src/components/__tests__/form-row.test.tsx`.
- [x] **TASK-2**: Screens Migration (`modal.tsx` & `reading-modal.tsx`):
  - Refactor `modal.tsx` to use `<FormRow>` compound components.
  - Refactor `reading-modal.tsx` author form to use `<FormRow>` compound components.
  - Clean up dead inline row styles (`inputRow`, `inputIcon`, `input`).
- [x] **TASK-3**: Developer Showcase & Quality Verification:
  - Add interactive `<FormRow>` example to `apps/mobile/src/app/dev-showcase.tsx`.
  - Verify unit test suite (`bun test`) and typecheck/lint.

## Evidence & Verification

- `TASK-1`: Implemented canonical `<FormRow>` compound component with subcomponents (`FormRow.Leading`, `FormRow.Input`, `FormRow.Trailing`) strictly consuming design system tokens (`colors.label`, `colors.secondaryLabel`, `spacing.md`, `typography.body`) with accessible touch target heights (44pt) and `useScrollContainer` focus support.
  - Exported from `apps/mobile/src/components/index.ts`.
  - Added unit test suite in `apps/mobile/src/components/__tests__/form-row.test.tsx` (5 unit tests).
  - TDD cycle: Observed RED (missing module error), then GREEN (5 passing tests).
- `TASK-2`: Refactored `apps/mobile/src/app/modal.tsx` and `apps/mobile/src/app/reading-modal.tsx` to consume `<FormRow>` and `<Divider>`, removing raw `<TextInput>` and duplicate inline styles (`inputRow`, `input`, manual divider height).
- `TASK-3`: Added Section 9 to Developer Showcase (`apps/mobile/src/app/dev-showcase.tsx`) with interactive `<FormRow>` card examples.
  - Test suite: `bun test` passed cleanly with 237 passing tests (0 failures).
  - Static analysis: `bun run typecheck` passed (0 errors) and `bun run lint` passed (0 warnings).

- **Completion & Delivery**: Closed and verified under branch `feat/60-form-row`, fulfilling all requirements of issue [#60](https://github.com/masch/myself/issues/60).
