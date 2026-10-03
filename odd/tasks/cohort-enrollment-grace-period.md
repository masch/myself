# Cohort Enrollment Restriction & Configurable Grace Period

## Objective

Enforce enrollment window restrictions for thematic cohorts in both backend (SQLite repository & domain validations) and frontend (mobile UI), introducing a configurable `enrollmentGraceDays` setting allowing users to join a cohort up to a designated grace period after the program starts.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`.
- Back-end / Shared:
  - Add `enrollmentGraceDays` (integer, required, non-negative, strictly no default value) to `theme_cohorts` schema, Zod schema (`themeCohortSchema`), initial migration `0001_reflections_initial.sql`, and seed data.
  - Domain helper `isCohortEnrollmentOpen(cohort, currentDateStr)` to compute whether today <= min(enrollmentEndDate, programStartDate + enrollmentGraceDays) and today >= enrollmentStartDate.
  - Enforce in `SqliteReflectionRepository`:
    - `getOpenCohorts()` returns only cohorts where enrollment is currently open or returns all with calculated eligibility.
    - `enrollInCohort()` throws a clear error / rejects enrollment if current date is outside the allowed enrollment window.
- Front-end / UI:
  - `CohortEnrollmentCard`: indicate when enrollment is closed, disable "Sumarme a la convocatoria" button, and display enrollment grace period info if configured.
  - `reflections.tsx`: handle closed cohorts and user feedback.
- Quality gates: `bun test`, `typecheck`, and `lint`.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `bun test`
- **Delivery Strategy**: `ask-on-risk` (forecast: ~250 lines)

## Tasks

- [x] **TASK-1**: Schema & Seed: Add `enrollmentGraceDays` to `@myself/shared` (Drizzle schema, Zod validation, initial migration, and seed; strictly required without defaults).
- [x] **TASK-2**: Domain & Repository: Implement `isCohortEnrollmentOpen` and enforce enrollment restrictions in `SqliteReflectionRepository` (`enrollInCohort` and `getOpenCohorts`).
- [x] **TASK-3**: Mobile UI: Update `CohortEnrollmentCard` and `reflections.tsx` to reflect enrollment availability, grace days info, and disabled states.
- [x] **TASK-4**: Verification & Quality Gates: Unit, integration, and E2E tests, typecheck, lint, and commit evidence.
- [x] **TASK-5**: Dynamic Seed Cohort: Enhanced `DateTime` with `.today()`, `.addDays()`, `.toISODate()` and implemented dynamic seed cohort with `ON CONFLICT DO NOTHING`.

## Evidence & Verification

- `TASK-1`: Added `enrollmentGraceDays` (integer, required without defaults, non-negative) to:
  - Zod schema `themeCohortSchema` in [`packages/shared/src/modules/reflections/types.ts`](../../packages/shared/src/modules/reflections/types.ts).
  - Drizzle SQLite table `themeCohorts` in [`packages/shared/src/modules/reflections/schema.ts`](../../packages/shared/src/modules/reflections/schema.ts).
  - Initial SQLite migration `0001_reflections_initial.sql` directly into `theme_cohorts` table definition, removing `0002_cohort_enrollment_grace_days.sql` and keeping journal clean.
  - Seed model and sync upsert in [`packages/shared/src/modules/reflections/seed.ts`](../../packages/shared/src/modules/reflections/seed.ts) and [`apps/mobile/src/infrastructure/persistence/seed.ts`](../../apps/mobile/src/infrastructure/persistence/seed.ts).
  - TDD cycle: Observed RED on schema validation tests, then GREEN with 41 passing tests in `@myself/shared`.
- `TASK-2`: Domain helper and repository validation:
  - Added `addDaysToDate`, `getCohortEnrollmentDeadline`, and `isCohortEnrollmentOpen` in [`apps/mobile/src/features/reflections/domain/time-lock.ts`](../../apps/mobile/src/features/reflections/domain/time-lock.ts).
  - Added unit test suite in [`apps/mobile/src/features/reflections/__tests__/time-lock.test.ts`](../../apps/mobile/src/features/reflections/__tests__/time-lock.test.ts) covering pre-start, start date, grace period, and post-grace expiration.
  - Enforced enrollment window validation in `SqliteReflectionRepository.enrollInCohort` rejecting closed cohorts with `Enrollment for cohort "..." is closed`.
  - Added repository unit tests verifying rejection and grace window enrollment in [`apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts`](../../apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts).
- `TASK-3`: Mobile UI:
  - Updated [`CohortEnrollmentCard`](../../apps/mobile/src/features/reflections/components/CohortEnrollmentCard.tsx) to evaluate `isCohortEnrollmentOpen(cohort, currentDateStr)`.
  - Displayed "Inscripción cerrada" badge and disabled button with variant `secondary` when enrollment has closed.
  - Displayed `⏳ Plazo de gracia para sumarte: X días` and enrollment deadline `⏰ Límite de inscripción: DD/MM`.
  - Added component tests in [`apps/mobile/src/features/reflections/components/__tests__/feature-components.test.tsx`](../../apps/mobile/src/features/reflections/components/__tests__/feature-components.test.tsx).
- `TASK-4`: Verification & Quality Gates:
  - Added E2E time travel test in [`e2e/cohort-dates-timetravel.spec.ts`](../../e2e/cohort-dates-timetravel.spec.ts) covering grace period enrollment and expiration.
  - Unit tests: 45/45 tests passing in `@myself/shared`, 272/272 tests passing in `apps/mobile`.
  - Typecheck: `turbo run typecheck` passed (0 errors across 3 packages).
  - Lint: `turbo run lint` passed (0 warnings/errors).
  - Formatting: `bun run check:format` passed cleanly.
- `TASK-5`: Dynamic Seed Cohort:
  - Enriched `DateTime` Value Object with `DateTime.today()`, `addDays()`, and `toISODate()`.
  - Retained historical closed cohort (`...0001` starting 2026-09-15) and added dynamic cohort (`...0002` starting today) in `createSeedThemeCohorts(baseDateStr?)` and `SEED_THEME_COHORTS`.
  - Updated mobile persistence `seedDatabase(db)` to use `ON CONFLICT(id) DO NOTHING` for `theme_cohorts`, locking the date on first seed / database reset and keeping it immutable across daily app launches.
  - Refactored `time-lock.ts` to use `DateTime` primitive.
  - Added unit tests in `index.test.ts`, `reflections.test.ts`, and `database.test.ts`.

- **Completion & Delivery**: Created Issue [#63](https://github.com/masch/myself/issues/63) and opened Pull Request [#64](https://github.com/masch/myself/pull/64) on branch `feat/cohort-enrollment-grace-period`.
