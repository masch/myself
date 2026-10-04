# Dynamic Item List Reflection Questions

## Objective

Add support for dynamic item-list reflection questions (e.g. daily gratitude moments), enabling users to record multiple items per question with individual timestamps, configurable constraints (`minItems`), inline dynamic input UX with undo capability, compact/expanded dashboard preview, and diff reconciliation persistence for future sentiment and time-of-day analytics.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`, `e2e`.
- Shared Kernel & Schema (`@myself/shared`):
  - Extend `RESPONSE_TYPES` with `"item_list"`.
  - Add optional `config` (JSON) to `reflectionQuestions` for question-level rules (e.g., `{ minItems: 3, maxItems?: 5 }`).
  - Add normalized table `userReflectionItems` (`id`, `reflection_id`, `order_index`, `content`, `created_at`, `updated_at`).
  - Update `createReflectionInputSchema` with validation for `item_list` and minimum item requirements.
  - SQL migration for schema updates.
- Mobile Repository (`apps/mobile`):
  - Update `SqliteReflectionRepository` with diff/upsert reconciliation within transaction.
  - Hydrate items when querying reflection records.
- Mobile UI & UX (`apps/mobile`):
  - Pattern 2 inline inputs in `ReflectionModal` (initial `minItems` rows, Enter adds next row, delete with 4-second Undo toast).
  - Compact/expanded preview toggle on `PromptCard`.
- Quality Gates:
  - TDD (RED -> GREEN -> REFACTOR).
  - Unit tests in `packages/shared`.
  - Repository integration tests in `apps/mobile`.
  - Component tests in `apps/mobile`.
  - Playwright E2E browser tests in `e2e/reflection-flow.spec.ts`.
  - `make check-types`, `make check-lint`, `make check-tests`, `make check-e2e-web`.
  - Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `make check-tests`, `make check-e2e-web`
- **Delivery Strategy**: `ask-on-risk`

## Tasks

- [x] **TASK-1**: Domain & Schema: Extend `RESPONSE_TYPES`, add `config` to `reflectionQuestions`, define `userReflectionItems` table and types, update Zod input schemas, and create SQL migration.
- [x] **TASK-2**: Seed Data & Persistence Seed: Add daily gratitude question (`item_list` with `minItems: 3`) to `packages/shared` seed and update `apps/mobile` database seed to persist question config.
- [x] **TASK-3**: Repository Layer: Implement item persistence with diff/upsert reconciliation and query hydration in `SqliteReflectionRepository`.
- [x] **TASK-4**: Mobile UI Components: Build `ItemListInput` with Pattern 2 (inline numbered inputs, enter key advance, delete undo toast) and `ItemListPreview` for `PromptCard`.
- [x] **TASK-5**: Verification & Quality Gates: Unit tests, repository integration tests, component tests, Playwright E2E test, typecheck, lint, and conventional commit.

## Evidence & Verification

- `make check-types`: 3 packages typechecked clean without errors.
- `make check-lint`: ESLint and expo lint passed with 0 errors.
- `make check-format`: Prettier format verified clean across the repository.
- `make check-types`: 3 packages typechecked clean without errors.
- `make check-lint`: ESLint and expo lint passed with 0 errors.
- `make check-format`: Prettier format verified clean across the repository.
- `make check-tests`: 285 unit and integration tests passed across 38 files (including item ID preservation on edit and repository min/max validations).
- `make check-e2e-web`: 6 Playwright E2E tests passed (1.2m), including the new daily gratitude dynamic item list flow (validation, add row, delete with undo, SQLite persistence across reload, and expanded list preview).
- **CodeRabbit Review Resolutions**: Addressed all review points (schema FK index, 0-based orderIndex, capacity check on undo, stable row keys, item ID propagation preserving created_at on edits, and repository validation).
- **Completion & Delivery**: Delivered on Pull Request [#66](https://github.com/masch/myself/pull/66) for issue [#65](https://github.com/masch/myself/issues/65) on branch `feat/dynamic-item-list-reflections`.
