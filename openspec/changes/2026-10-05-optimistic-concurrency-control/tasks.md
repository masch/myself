# Tasks: Core Optimistic Concurrency Control (OCC) with Entity Versioning

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 120 - 180 lines |
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

| Unit | Goal                                     | Likely PR | Focused test command | Runtime harness | Rollback boundary |
| ---- | ---------------------------------------- | --------- | -------------------- | --------------- | ----------------- |
| 1    | Shared OCC primitive & tests (Red/Green) | PR 1      | `make check-tests`   | `bun test`      | `packages/shared` |
| 2    | Backend OCC service & route tests        | PR 1      | `make check-tests`   | `bun test`      | `apps/api`        |
| 3    | Verification & Quality Gates             | PR 1      | `make check`         | N/A             | N/A               |

---

## Phase 1: Shared OCC Primitive (TDD Red -> Green)

- [x] 1.1 Create failing tests in `packages/shared/src/primitives/__tests__/optimistic-lock.test.ts` for `assertOptimisticLock` and `versionSchema`
- [x] 1.2 Implement `assertOptimisticLock` and `versionSchema` in `packages/shared/src/primitives/optimistic-lock.ts`
- [x] 1.3 Add `version` to `ReadingProps`, `Reading`, `readingPropsSchema`, `updateReadingSchema`, and `ReadingDto`

## Phase 2: Backend OCC Integration (TDD Red -> Green)

- [x] 2.1 Add failing integration tests in `apps/api/src/services/__tests__/reading.service.test.ts` for concurrent version mismatch and version increments
- [x] 2.2 Update `ReadingService.update` to validate `assertOptimisticLock` and increment version monotonically
- [x] 2.3 Verify `PUT /v1/readings/:id` returns 409 on version conflict and 200 with incremented version on success

## Phase 3: Quality & Verification Gate

- [x] 3.1 Run unit and integration tests via `make check-tests`
- [x] 3.2 Run TypeScript typecheck via `make check-types`
- [x] 3.3 Run linter via `make check-lint`
- [x] 3.4 Run format check via `make check-format`
- [x] 3.5 Generate `verify-report.md`
