# Tasks: Frontend REST API Client Library

## Review Workload Forecast

| Field                   | Value           |
| ----------------------- | --------------- |
| Estimated changed lines | 250 - 350 lines |
| 400-line budget risk    | Low             |
| Chained PRs recommended | No              |
| Suggested split         | single-pr       |
| Delivery strategy       | single-pr       |
| Chain strategy          | size-exception  |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                                       | Likely PR | Focused test command                             | Runtime harness  | Rollback boundary                                                              |
| ---- | ---------------------------------------------------------- | --------- | ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------ |
| 1    | Shared API Client library foundation & resource subclients | PR 1      | `bun test --cwd packages/shared`                 | N/A (Unit tests) | `packages/shared/src/client/`                                                  |
| 2    | Mobile adapter integration & verification                  | PR 1      | `bun test --cwd apps/mobile && make check-types` | N/A (Unit tests) | `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts` |

---

## Phase 1: Client Core & Error Hierarchy

- [x] 1.1 Create `packages/shared/src/client/errors.ts` defining `ApiClientError`, `ApiHttpError`, `ApiNetworkError`, `ApiTimeoutError`.
- [x] 1.2 Create `packages/shared/src/client/http-client.ts` encapsulating native `fetch` requests with configurable timeout (`AbortSignal.timeout`), default JSON headers, and status check.
- [x] 1.3 Add unit tests in `packages/shared/src/client/__tests__/http-client.test.ts` verifying request methods, headers, and error normalization.

## Phase 2: Endpoint Resource Clients

- [x] 2.1 Create `packages/shared/src/client/resources/readings.client.ts` with `getAll()`, `create()`, `update()`, and `delete()`.
- [x] 2.2 Create `packages/shared/src/client/resources/authors.client.ts` with `create()` and query endpoints.
- [x] 2.3 Create `packages/shared/src/client/api-client.ts` and update `packages/shared/src/client/index.ts` exporting `ApiClient` and `createApiClient` factory.
- [x] 2.4 Add unit tests in `packages/shared/src/client/__tests__/api-client.test.ts` verifying typed resource calls against mock responses.

## Phase 3: Mobile Adapter Integration

- [x] 3.1 Refactor `apps/mobile/src/features/readings/infrastructure/http-reading-api.adapter.ts` to delegate REST calls to `api.readings` and `api.authors`.
- [x] 3.2 Run mobile unit tests (`bun test --cwd apps/mobile`) to verify zero regressions in reading synchronization or data mapping.

## Phase 4: Verification & Typecheck

- [x] 4.1 Run monorepo typecheck: `make check-types`.
- [x] 4.2 Run monorepo tests: `make check-tests`.
- [x] 4.3 Run linter and formatting: `make check-lint` and `make check-format`.
