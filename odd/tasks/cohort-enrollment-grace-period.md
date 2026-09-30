# Cohort Enrollment Restriction & Configurable Grace Period

## Objective

Enforce enrollment window restrictions for thematic cohorts in both backend (SQLite repository & domain validations) and frontend (mobile UI), introducing a configurable `enrollmentGraceDays` setting allowing users to join a cohort up to a designated grace period after the program starts.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`.
- Back-end / Shared:
  - Add `enrollmentGraceDays` (integer, default 0, non-negative) to `theme_cohorts` schema, Zod schema (`themeCohortSchema`), migration, and seed data.
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

- [x] **TASK-1**: Schema & Seed: Add `enrollmentGraceDays` to `@myself/shared` (Drizzle schema, Zod validation, migrations, and seed).
- [x] **TASK-2**: Domain & Repository: Implement `isCohortEnrollmentOpen` and enforce enrollment restrictions in `SqliteReflectionRepository` (`enrollInCohort` and `getOpenCohorts`).
- [x] **TASK-3**: Mobile UI: Update `CohortEnrollmentCard` and `reflections.tsx` to reflect enrollment availability, grace days info, and disabled states.
- [x] **TASK-4**: Verification & Quality Gates: Unit, integration, and E2E tests, typecheck, lint, and commit evidence.

## Evidence & Verification

- `TASK-1`: Added `enrollmentGraceDays` (integer, default 0, non-negative) to:
  - Zod schema `themeCohortSchema` in [`packages/shared/src/modules/reflections/types.ts`](file:///var/home/masch/dev/js/myself/packages/shared/src/modules/reflections/types.ts).
  - Drizzle SQLite table `themeCohorts` in [`packages/shared/src/modules/reflections/schema.ts`](file:///var/home/masch/dev/js/myself/packages/shared/src/modules/reflections/schema.ts).
  - SQLite migration `0002_cohort_enrollment_grace_days.sql` and journal in [`packages/shared/src/migrations/`](file:///var/home/masch/dev/js/myself/packages/shared/src/migrations/).
  - Seed model and sync upsert in [`packages/shared/src/modules/reflections/seed.ts`](file:///var/home/masch/dev/js/myself/packages/shared/src/modules/reflections/seed.ts) and [`apps/mobile/src/infrastructure/persistence/seed.ts`](file:///var/home/masch/dev/js/myself/apps/mobile/src/infrastructure/persistence/seed.ts).
  - TDD cycle: Observed RED on schema validation tests, then GREEN with 40 passing tests in `@myself/shared`.
- `TASK-2`: Domain helper and repository validation:
  - Added `addDaysToDate`, `getCohortEnrollmentDeadline`, and `isCohortEnrollmentOpen` in [`apps/mobile/src/features/reflections/domain/time-lock.ts`](file:///var/home/masch/dev/js/myself/apps/mobile/src/features/reflections/domain/time-lock.ts).
  - Added unit test suite in [`apps/mobile/src/features/reflections/__tests__/time-lock.test.ts`](file:///var/home/masch/dev/js/myself/apps/mobile/src/features/reflections/__tests__/time-lock.test.ts) covering pre-start, start date, grace period, and post-grace expiration.
  - Enforced enrollment window validation in `SqliteReflectionRepository.enrollInCohort` rejecting closed cohorts with `Enrollment for cohort "..." is closed`.
  - Added repository unit tests verifying rejection and grace window enrollment in [`apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts`](file:///var/home/masch/dev/js/myself/apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts).
- `TASK-3`: Mobile UI:
  - Updated [`CohortEnrollmentCard`](file:///var/home/masch/dev/js/myself/apps/mobile/src/features/reflections/components/CohortEnrollmentCard.tsx) to evaluate `isCohortEnrollmentOpen(cohort, currentDateStr)`.
  - Displayed "Inscripción cerrada" badge and disabled button with variant `secondary` when enrollment has closed.
  - Displayed `⏳ Plazo de gracia para sumarte: X días` and enrollment deadline `⏰ Límite de inscripción: DD/MM`.
  - Added component tests in [`apps/mobile/src/features/reflections/components/__tests__/feature-components.test.tsx`](file:///var/home/masch/dev/js/myself/apps/mobile/src/features/reflections/components/__tests__/feature-components.test.tsx).
- `TASK-4`: Verification & Quality Gates:
  - Added E2E time travel test in [`e2e/cohort-dates-timetravel.spec.ts`](file:///var/home/masch/dev/js/myself/e2e/cohort-dates-timetravel.spec.ts) covering grace period enrollment and expiration.
  - Unit tests: 40/40 tests passing in `@myself/shared`, 51/51 tests passing in `apps/mobile/src/features/reflections/`.
  - Typecheck: `turbo run typecheck` passed (0 errors across 3 packages).
  - Lint: `turbo run lint` passed (0 warnings/errors).
  - Formatting: `bun run check:format` passed cleanly.
