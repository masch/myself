# Tasks: Daily Reflections Routine Opt-Out Undo & Generic Toast

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 250 - 350 lines |
| 400-line budget risk    | Low             |
| Chained PRs recommended | No              |
| Suggested split         | Single PR       |
| Delivery strategy       | ask-on-risk     |
| Chain strategy          | single-pr       |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: single-pr
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                     | Likely PR | Focused test command | Runtime harness   | Rollback boundary                      |
| ---- | ---------------------------------------- | --------- | -------------------- | ----------------- | -------------------------------------- |
| 1    | Generic Toast system & root provider     | PR 1      | `make check-tests`   | `make dev-mobile` | `apps/mobile/src/components/toast`     |
| 2    | Repository & hook opt-out recovery query | PR 1      | `make check-tests`   | `make dev-mobile` | `apps/mobile/src/features/reflections` |
| 3    | Screen undo action & paused section      | PR 1      | `make check-tests`   | `make dev-mobile` | `apps/mobile/src/app/(tabs)`           |
| 4    | Verification & Quality Gates             | PR 1      | `make check`         | `make dev-mobile` | N/A                                    |

---

## Phase 1: Generic Toast System

- [x] 1.1 Create toast types (`ToastOptions`, `ToastAction`, `ToastVariant`, `ToastContextValue`) in `apps/mobile/src/components/toast/types.ts`
- [x] 1.2 Implement `ToastProvider` and `useToast` hook in `apps/mobile/src/components/toast/toast-context.tsx`
- [x] 1.3 Implement animated, accessible `ToastBanner` in `apps/mobile/src/components/toast/toast-banner.tsx`
- [x] 1.4 Export toast components and hook from `apps/mobile/src/components/toast/index.ts` and `apps/mobile/src/components/index.ts`
- [x] 1.5 Mount `ToastProvider` in root layout `apps/mobile/src/app/_layout.tsx`
- [x] 1.6 Add unit test suite for Toast in `apps/mobile/src/components/__tests__/toast.test.tsx`

## Phase 2: Repository & Hook Opt-Out Recovery

- [x] 2.1 Add `getOptedOutRoutineQuestions` method declaration to `ReflectionRepositoryPort` in `apps/mobile/src/features/reflections/domain/ports/reflection.repository.port.ts`
- [x] 2.2 Implement `getOptedOutRoutineQuestions` query in `SqliteReflectionRepository` (`apps/mobile/src/features/reflections/infrastructure/sqlite-reflection.repository.ts`)
- [x] 2.3 Add unit/integration test for `getOptedOutRoutineQuestions` in `apps/mobile/src/features/reflections/__tests__/sqlite-reflection.repository.test.ts`
- [x] 2.4 Update `useDailyReflections` hook to fetch and expose `optedOutRoutineQuestions` in `apps/mobile/src/features/reflections/hooks/use-daily-reflections.ts`

## Phase 3: Reflections Screen Integration

- [x] 3.1 Update `handleToggleRoutineOptOut` in `apps/mobile/src/app/(tabs)/reflections.tsx` to display immediate Toast with "Deshacer" action on opt-out and confirmation on reactivation
- [x] 3.2 Add collapsible `"Preguntas pausadas"` section with count badge and chevron in `apps/mobile/src/app/(tabs)/reflections.tsx`
- [x] 3.3 Render opted-out questions using `PromptCard` with `"Reactivar"` action inside the collapsible section

## Phase 4: Quality & Verification Gate

- [x] 4.1 Run unit and integration tests via `make check-tests`
- [x] 4.2 Run TypeScript typecheck via `make check-types`
- [x] 4.3 Run linter via `make check-lint`
- [x] 4.4 Run format check via `make check-format`
- [x] 4.5 Generate `verify-report.md` adhering to `schema: gentle-ai.verify-result/v1`
