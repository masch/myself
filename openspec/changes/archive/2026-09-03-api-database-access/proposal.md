# Change Proposal: API Database Access with Turso (libSQL) & Ports-and-Adapters Architecture

## 1. Problem Statement

The backend service (`apps/api`) currently relies on in-memory mock arrays (`mockAuthors`, static fixtures) for all endpoints. Consequently:

- Any data mutations (`POST /v1/authors`, etc.) are volatile and discarded whenever Cloudflare Workers instances recycle or scale.
- The API cannot serve as a persistent source of truth for the mobile client (`apps/mobile`).
- Handlers are tightly coupled to raw memory arrays rather than an extensible persistence architecture.
- Using proprietary cloud bindings (such as Cloudflare D1) would induce vendor lock-in, restricting future cloud and database engine migrations.

We need a persistent, edge-compatible data layer with strong typing, zero vendor lock-in, automated migrations, and strict architectural decoupling.

## 2. Proposed Solution

1. **Vendor-Agnostic Edge Persistence Engine (Turso / libSQL)**:
   - Connect `apps/api` to Turso via `@libsql/client/web` using standard environment variables (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
   - Support zero-config local SQLite files (`file:local.db`) or in-memory persistence during local development.
2. **Ports & Adapters (Hexagonal Architecture)**:
   - Define domain repository port interfaces (`AuthorRepository`, `ReadingRepository`) typed solely with domain contracts from `@myself/shared`.
   - Provide concrete infrastructure adapters (`DrizzleTursoAuthorRepository`, `DrizzleTursoReadingRepository`) utilizing Drizzle ORM.
   - Inject repository instances into Hono context via middleware (`c.var.authorRepo`), ensuring HTTP handlers never know or care which database engine is executing underneath.
3. **Type-Safe ORM & Declarative Migrations (Drizzle ORM)**:
   - Introduce `drizzle-orm` (with `libsql` driver) and `drizzle-kit`.
   - Define domain tables (`authors`, `meditation_readings`, `users`, `tasks`, `reading_logs`) with UUID primary keys and SQL `CHECK` constraints for enums.
   - Generate automated, versioned SQL migration scripts.
4. **Hermetic Testing**:
   - Provide `InMemoryAuthorRepository` and test doubles for `bun test` suites, keeping test runs instantaneous and isolated from network or cloud credentials.

## 3. Impact & Blast Radius

- **Runtime & Performance**: Instant response times without cold starts; high write quota (10M rows/month).
- **Vendor Independence**: Complete freedom to migrate to PostgreSQL, Docker, or self-hosted servers in the future by swapping only the repository adapter layer.
- **Dependencies**: Adds `@libsql/client`, `drizzle-orm`, and `drizzle-kit` to `apps/api`.
- **Breaking Changes**: None for API consumers. Endpoints maintain existing URLs, request schemas, and `ApiResponse<T>` envelopes.
