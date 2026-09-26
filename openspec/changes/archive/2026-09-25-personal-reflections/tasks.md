# Tasks: Personal Reflections System

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 450 - 550 lines |
| 400-line budget risk    | Medium          |
| Chained PRs recommended | No              |
| Suggested split         | Single PR       |
| Delivery strategy       | single-pr       |
| Chain strategy          | size-exception  |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                         | Likely PR | Focused test command       | Runtime harness  | Rollback boundary                         |
| ---- | ---------------------------- | --------- | -------------------------- | ---------------- | ----------------------------------------- |
| 1    | Domain entities & migrations | PR 1      | `bun test packages/shared` | `bun run build`  | `packages/shared/src/modules/reflections` |
| 2    | Mobile repository & UI       | PR 1      | `bun test apps/mobile`     | `npx expo start` | `apps/mobile/src/features/reflections`    |

---

## Phase 1: Shared Domain Models & Migrations

- [x] 1.1 Create domain types and Zod schemas with text vs scale 1-10 response types, skip, window, cohort, preferences, and cycle run models in `packages/shared/src/modules/reflections/types.ts`
- [x] 1.2 Define Drizzle SQLite tables (`reflection_categories`, `reflection_themes`, `theme_cohorts`, `reflection_questions`, `user_question_preferences`, `user_theme_progress`, `user_reflections`) in `packages/shared/src/modules/reflections/schema.ts`
- [x] 1.3 Export reflection domain module from `packages/shared/src/modules/reflections/index.ts` and `packages/shared/src/modules/index.ts`
- [x] 1.4 Generate SQLite migration bundle and seed data with curated questions (text & scale), themes, active cohorts, suggested routines, and windows in `packages/shared/src/migrations/`
- [x] 1.5 Add domain unit tests validating text vs scale 1-10 schemas in `packages/shared/src/modules/reflections/__tests__/reflections.test.ts`

## Phase 2: Mobile Infrastructure & Repository

- [x] 2.1 Define repository port and notification port in `apps/mobile/src/features/reflections/domain/ports/reflection.repository.port.ts` and `apps/mobile/src/features/reflections/domain/ports/notification.service.port.ts`
- [x] 2.2 Implement SQLite repository adapter supporting text responses, numeric scores (1-10), skip with reason, routine opt-out, ad-hoc shortcuts, cohort enrollment, and cycle advance in `apps/mobile/src/features/reflections/infrastructure/sqlite-reflection.repository.ts`
- [x] 2.3 Implement notification adapter for local time-of-day reminders in `apps/mobile/src/features/reflections/infrastructure/expo-notification.adapter.ts`
- [x] 2.4 Add repository integration tests verifying text vs scale responses, routine opt-out, cohort enrollment, and answer/skip states in `apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts`

## Phase 3: Mobile Hooks & Presentational UI

- [x] 3.1 Implement `useDailyReflections` and `useThemeCohort` hooks with opt-out and shortcut actions in `apps/mobile/src/features/reflections/hooks/use-daily-reflections.ts` and `apps/mobile/src/features/reflections/hooks/use-theme-cohort.ts`
- [x] 3.2 Create UI components (`PromptCard`, `ScaleSelector1To10`, `CohortEnrollmentCard`, `ReflectionModal`, `SkipReasonSheet`, `CycleProgressBadge`) in `apps/mobile/src/features/reflections/components/`
- [x] 3.3 Create Unified Daily Queue screen with scale input support, opt-out controls, and Theme/Cohort detail views in `apps/mobile/src/app/(tabs)/reflections.tsx`
- [x] 3.4 Wire Reflections tab trigger into `apps/mobile/src/app/(tabs)/_layout.tsx`

## Phase 4: Integration Verification

- [x] 4.1 Run full test suite with `bun test` across monorepo
- [x] 4.2 Run typecheck with `bun run typecheck` (`tsc --noEmit`)
- [x] 4.3 Run linter with `bun run lint` (`expo lint`)

## Phase 5: Humanized Dates, FIFO Queue, & Functional E2E Suite

- [x] 5.1 Implement dynamic relative date formatting (`formatRelativeMissedDate`) with configurable catch-up window and deadline indicator in `apps/mobile/src/features/reflections/domain/time-lock.ts`
- [x] 5.2 Implement FIFO ordering (oldest first: $T-2 \rightarrow T-1$) for missed questions in `SqliteReflectionRepository`
- [x] 5.3 Implement macro-block UI separation ("Por Responder" vs "Respondidas Hoy"), toggle switch, and clean archive cards in `apps/mobile/src/app/(tabs)/reflections.tsx`
- [x] 5.4 Implement E2E time-travel suite: cohort pre-launch locking, 7-day daily progression, and 2-day grace period expiration in `e2e/cohort-dates-timetravel.spec.ts`
- [x] 5.5 Implement functional E2E validation: negative rejection of empty/whitespace inputs, positive verification of rendered scores/texts, and hard reload (`page.reload()`) persistence in `e2e/reflection-flow.spec.ts`
- [x] 5.6 Retain completed cohorts in active views (`status IN ('in_progress', 'completed')`) with celebratory badge and full step history
