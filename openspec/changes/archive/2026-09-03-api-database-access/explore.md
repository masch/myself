# Exploration: API Database Access & Architecture

- **Change**: `api-database-access`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid` (OpenSpec + Engram)
- **Delivery Strategy**: `single-pr`
- **Review Budget**: 800 lines

---

## 1. Current State & Architecture

### Backend Workspace (`apps/api`)

- **Runtime**: Cloudflare Workers (V8 isolates edge environment) managed via `wrangler` v4.
- **Framework**: Hono (`hono` v4) with `@hono/zod-validator`.
- **Response Format**: Strict standardized envelope via `ok(c, data)` and `fail(c, error, status)` implementing `ApiResponse<T>` from `@myself/shared`.
- **Current Persistence**: In-memory mocks (`mockAuthors: SeedAuthor[]` in `src/routes/authors.ts`, static fixtures in `src/routes/readings.ts`). State is transient and lost across worker cold starts and isolate recycles.
- **Testing**: `bun test` running unit tests against Hono route endpoints.

### Client & Shared Domains

- **Mobile (`apps/mobile`)**: Expo SDK 57 app currently using `expo-sqlite` (`src/db/database.ts`). The architecture will transition in future phases to consume the API as the Single Source of Truth (SSOT), with potential future offline sync.
- **Shared (`packages/shared`)**: Canonical Zod schemas and TypeScript interfaces for domain entities (`Author`, `MeditationReading`, `User`, pagination schemas).

---

## 2. Technical Constraints & Multi-Engine Evaluation

1. **V8 Isolates on Cloudflare Workers**:
   - Cloudflare Workers cannot run standard Node.js TCP drivers. All external database communication must occur over HTTP or WebSockets.
2. **Comparison of Candidates**:
   - **Cloudflare D1**: Native SQLite inside Cloudflare. High vendor lock-in; bounded by strict daily quotas (100k writes/day).
   - **Neon (PostgreSQL)**: True Postgres 16 via WebSockets. Excellent for advanced relational features, but introduces cold starts (~500ms-1.5s) on the free plan and 500 MB disk cap.
   - **Turso (libSQL / SQLite Open Source) (Selected)**:
     - _Hosting_: Independent global edge infrastructure (Fly.io / AWS).
     - _Vendor Lock-in_: **CERO**. 100% open-source libSQL engine. Can run anywhere (Docker `sqld`, VPS, or local file).
     - _Performance_: **Cero cold starts**, instant response over HTTP.
     - _Free Quotas_: **10.000.000 filas escritas/mes** (~333.000/día), 500M reads/mes, 5 GB storage.
     - _Enums_: Enforced via `TEXT` + `CHECK(column IN (...))` constraints and TypeScript string union types.
     - _Offline / Sync Alignment_: Direct dialect parity with SQLite in mobile (`expo-sqlite`).

---

## 3. Architectural Design Decisions

1. **Hexagonal Architecture (Ports & Adapters)**:
   - The database engine MUST remain an interchangeable infrastructure detail.
   - **Ports (Contracts)**: Pure TypeScript interfaces in the domain/repository layer (`AuthorRepository`, `ReadingRepository`). Routes never depend on SQL or ORM specifics.
   - **Adapters**:
     - `DrizzleTursoAuthorRepository`: Production and remote edge persistence using `drizzle-orm/libsql`.
     - `InMemoryAuthorRepository`: Hermetic test doubles for lightning-fast unit testing (`bun test`) without external network dependencies.
2. **Dependency Injection**:
   - Repositories are injected into Hono context (`c.var.authorRepo`), completely isolating HTTP route handlers from infrastructure adapters.
3. **Declarative Schemas & Migrations**:
   - `drizzle-kit` manages declarative schemas (`src/db/schema/`) and generates immutable SQL migration files.
