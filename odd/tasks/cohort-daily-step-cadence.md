# Cohort Daily Step Cadence & Progressive Pacing

## Objective

Enforce progressive daily pacing for thematic cohorts so that users unlock at most 1 step per calendar day (`maxUnlockedStep = daysElapsedSinceStart + 1`). Users behind schedule can catch up on past unlocked steps, but cannot jump ahead of the group schedule for future days.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`.
- Shared Kernel (`DateTime`):
  - Add `diffInDays(other: DateTime): number` to compute calendar day differences.
- Mobile Domain (`time-lock.ts`):
  - `getMaxUnlockedStep(programStartDate: string, currentDateStr: string, totalSteps?: number): number`
  - `isCohortStepUnlocked(programStartDate: string, step: number, currentDateStr: string): boolean`
  - `getCohortStepUnlockDate(programStartDate: string, step: number): string`
- Mobile Repository (`sqlite-reflection.repository.ts`):
  - In `saveReflection`, guard premature cohort step submission against `isCohortStepUnlocked(cohort.programStartDate, question.orderIndex, validated.forDate)`.
- Mobile UI (`reflections.tsx`):
  - When `currentStep > maxUnlockedStep` and `status !== 'completed'`, show waiting card: "Paso de hoy completado" and date when the next step unlocks.
- Quality gates: `bun test`, `typecheck`, and `lint`.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `bun test`
- **Delivery Strategy**: `ask-on-risk` (forecast: ~150 lines)

## Tasks

- [x] **TASK-1**: Primitives & Domain: Add `diffInDays` to `DateTime` and implement step unlock helpers (`getMaxUnlockedStep`, `isCohortStepUnlocked`, `getCohortStepUnlockDate`) in `time-lock.ts`.
- [x] **TASK-2**: Repository Guard: Enforce step unlock validation in `SqliteReflectionRepository.saveReflection`.
- [x] **TASK-3**: Mobile UI: Render waiting card in `reflections.tsx` when today's step is done and next step is locked.
- [x] **TASK-4**: Verification & Quality Gates: Full unit tests, typecheck, lint, format, and commit evidence.

## Evidence & Verification

- `bun test` in `packages/shared`: 46 pass, 0 fail.
- `bun test` in `apps/mobile`: 279 pass, 0 fail (including 52 tests covering cadence domain logic, repository step lock guard, and full reflection registration e2e).
- `bun run typecheck`: 3 packages typechecked clean without errors.
- `bun run check:lint`: ESLint and expo lint passed with 0 errors.
- `bun run check:format`: Prettier format verified clean across the repository.
- Work-unit commit: `d642e44` (`feat(reflections): enforce progressive daily step cadence for cohorts`).
