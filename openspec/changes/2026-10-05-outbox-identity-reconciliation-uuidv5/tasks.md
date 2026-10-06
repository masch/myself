# Tasks: Deterministic UUID v5 for Author Identity Reconciliation

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

| Unit | Goal                                      | Likely PR | Focused test command | Runtime harness | Rollback boundary |
| ---- | ----------------------------------------- | --------- | -------------------- | --------------- | ----------------- |
| 1    | UUID v5 generator & tests in shared       | PR 1      | `make check-tests`   | `bun test`      | `packages/shared` |
| 2    | Backend adoption & service tests          | PR 1      | `make check-tests`   | `bun test`      | `apps/api`        |
| 3    | Mobile persistence adoption & outbox test | PR 1      | `make check-tests`   | `bun test`      | `apps/mobile`     |
| 4    | Verification & Quality Gates              | PR 1      | `make check`         | N/A             | N/A               |

---

## Phase 1: Shared Domain Primitive (TDD Red -> Green)

- [x] 1.1 Create failing unit tests in `packages/shared/src/primitives/__tests__/author-id.test.ts` for `normalizeAuthorName` and `generateAuthorId`
- [x] 1.2 Implement `normalizeAuthorName` and `generateAuthorId` in `packages/shared/src/primitives/author-id.ts`
- [x] 1.3 Export `normalizeAuthorName` and `generateAuthorId` in `packages/shared/src/index.ts`

## Phase 2: Backend Integration (TDD Red -> Green)

- [x] 2.1 Add failing unit test in `apps/api/src/services/__tests__/author.service.test.ts` asserting deterministic ID generation when ID is omitted
- [x] 2.2 Update `AuthorService.create` in `apps/api/src/services/author.service.ts` to use `generateAuthorId`

## Phase 3: Mobile Persistence Integration (TDD Red -> Green)

- [x] 3.1 Add failing integration test in `apps/mobile/src/infrastructure/persistence/__tests__/database.test.ts` asserting `addAuthor` produces deterministic UUID v5
- [x] 3.2 Update `addAuthor` in `apps/mobile/src/infrastructure/persistence/database.ts` to use `generateAuthorId`
- [x] 3.3 Verify `SyncEngine` with deterministic author IDs

## Phase 4: Quality & Verification Gate

- [x] 4.1 Run unit and integration tests via `make check-tests`
- [x] 4.2 Run TypeScript typecheck via `make check-types`
- [x] 4.3 Run linter via `make check-lint`
- [x] 4.4 Run format check via `make check-format`
- [x] 4.5 Generate `verify-report.md`
