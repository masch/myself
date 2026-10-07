# Tasks: Outbox Mutation Coalescing (Pre-Sync Squashing)

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 100 - 150 lines |
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

| Unit | Goal                                     | Likely PR | Focused test command | Runtime harness | Rollback boundary                   |
| ---- | ---------------------------------------- | --------- | -------------------- | --------------- | ----------------------------------- |
| 1    | Repository Coalescing Unit Tests (Red)   | PR 1      | `make check-tests`   | `bun test`      | `apps/mobile/src/features/readings` |
| 2    | Implement Outbox Squashing Logic (Green) | PR 1      | `make check-tests`   | `bun test`      | `apps/mobile/src/features/readings` |
| 3    | Verification & Quality Gates             | PR 1      | `make check`         | N/A             | N/A                                 |

---

## Phase 1: Test Suite (TDD Red)

- [x] 1.1 Create `apps/mobile/src/features/readings/infrastructure/__tests__/sqlite-reading.repository.test.ts` testing the 4 coalescing scenarios (`CREATE+DELETE`, `CREATE+UPDATE`, `UPDATE+UPDATE`, `UPDATE+DELETE`)
- [x] 1.2 Verify tests fail on existing un-coalesced codebase

## Phase 2: Implementation (TDD Green)

- [x] 2.1 Implement mutation coalescing helper or logic in `SqliteReadingRepository.save` and `SqliteReadingRepository.delete`
- [x] 2.2 Verify tests pass on updated repository

## Phase 3: Quality & Verification Gate

- [x] 3.1 Run unit and integration tests via `make check-tests`
- [x] 3.2 Run TypeScript typecheck via `make check-types`
- [x] 3.3 Run linter via `make check-lint`
- [x] 3.4 Run format check via `make check-format`
- [x] 3.5 Generate `verify-report.md`
