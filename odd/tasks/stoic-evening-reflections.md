# Daily Stoic Evening Review Reflection Questions

## Objective

Add 3 daily evening reflection questions based on Seneca's evening examination of conscience, configured as dynamic item lists with a minimum requirement of 3 responses each, enabled by default in the daily routine.

## Questions

1. "¿Qué hice mal hoy?"
2. "¿Qué hice bien hoy?"
3. "¿Qué hubiera hecho de modo diferente hoy?"

## Scope & Constraints

- Package: `packages/shared` (`src/modules/reflections/seed.ts`).
- Mobile app: `apps/mobile` (`src/features/reflections/__tests__/e2e-reflection-flow.test.ts`).
- Category: Stoicism (`c1000000-0000-4000-8000-000000000001`).
- Theme: `null`.
- Periodicity: `daily`.
- Preferred time of day: `21:30`.
- Response Type: `item_list`.
- Config: `{ minItems: 3, maxItems: "unlimited" }`.
- Default suggested: `true`.
- Quality gates: `make check-types`, `make check-lint`, `make check-tests`, `make check-format`, `make check-odd`.
- Conventional commit without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled
- **Test Runner**: `make check-tests`
- **Delivery Strategy**: `ask-on-risk`

## Tasks

- [x] **TASK-1**: Add the 3 daily stoic review questions to `SEED_REFLECTION_QUESTIONS` in `packages/shared/src/modules/reflections/seed.ts` with `themeId: null` for all three questions, `minItems: 3`, `maxItems: "unlimited"`, `isDefaultSuggested: true`, `responseType: "item_list"`, and sequential ordering.
- [x] **TASK-2**: Verification & Quality Gates: Run unit and integration tests across monorepo (`make check-tests`), update vertical integration tests (`e2e-reflection-flow.test.ts`), and verify typecheck, lint, formatting, and ODD conformance.

## Evidence & Verification

- `make check-types`: 3 packages typechecked clean without errors (`@myself/api`, `@myself/mobile`, `@myself/shared`).
- `make check-lint`: ESLint and Expo lint passed with 0 errors across all 3 packages.
- `make check-tests`: 294 unit and integration tests passed across 40 files in the monorepo.
- `make check-format`: Prettier format verified clean across the repository.
- `make check-odd`: ODD verification passed with all documents closed.
- **Completion & Delivery**: Delivered on Pull Request [#69](https://github.com/masch/myself/pull/69) for issue [#68](https://github.com/masch/myself/issues/68) on branch `feat/stoic-evening-reflections` (commit `e5e4da8`).
