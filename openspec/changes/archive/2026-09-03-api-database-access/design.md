# Design: API Database Access with Turso & Hexagonal Architecture

## 1. System Topology & Hexagonal Layering

The architecture follows the **Ports & Adapters (Hexagonal)** pattern. Domain contracts and HTTP handlers are decoupled from the persistence infrastructure:

```text
┌─────────────────────────────────────────────────────────────┐
│                     HTTP / Client Request                   │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hono Route Handlers                      │
│                (src/routes/authors.ts, etc.)                │
│  - Input validation with @hono/zod-validator                │
│  - Reads repository from context: c.var.authorRepo          │
│  - Emits ApiResponse<T> envelope via ok() / fail()          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     Domain Ports (Contracts)                │
│              (src/repositories/contracts/*.ts)              │
│  - AuthorRepository interface                               │
│  - ReadingRepository interface                              │
│  - Strictly typed with domain models from @myself/shared    │
└──────────────┬──────────────────────────────┬───────────────┘
               │ (Implements)                 │ (Implements)
               ▼                              ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│    Drizzle Turso Adapter     │ │     In-Memory Adapter      │
│ (src/repositories/drizzle/*) │ │ (src/repositories/memory/*)│
│  - Uses drizzle-orm/libsql   │ │  - Fast array-based double │
│  - @libsql/client/web        │ │  - Used in hermetic unit   │
│  - SQL CHECK constraints     │ │    tests (bun test)        │
└──────────────┬───────────────┘ └────────────────────────────┘
               │
               ▼ (HTTP/WebSockets)
┌──────────────────────────────┐
│       Turso Cloud / DB       │
│  - libSQL edge database      │
│  - Zero cold starts          │
└──────────────────────────────┘
```

---

## 2. Directory Structure & Layer Responsibilities

```text
apps/api/
├── drizzle.config.ts              # Drizzle Kit migration configuration
├── .dev.vars.example              # Template for local Wrangler environment secrets
├── src/
│   ├── db/
│   │   ├── client.ts              # Factory resolving Turso HTTP or local SQLite client
│   │   ├── schema/
│   │   │   ├── authors.ts         # Drizzle SQLite table definitions
│   │   │   ├── readings.ts        # Reading & translation schemas
│   │   │   ├── users.ts           # Users schema
│   │   │   ├── tasks.ts           # Tasks schema
│   │   │   └── index.ts           # Barrel export of all schemas
│   │   └── migrations/            # Generated SQL migration files
│   ├── repositories/
│   │   ├── contracts/
│   │   │   ├── author.ts          # AuthorRepository port interface
│   │   │   ├── reading.ts         # ReadingRepository port interface
│   │   │   └── index.ts
│   │   ├── drizzle/
│   │   │   ├── drizzle-author.ts  # Turso/Drizzle implementation of AuthorRepository
│   │   │   ├── drizzle-reading.ts # Turso/Drizzle implementation of ReadingRepository
│   │   │   └── index.ts
│   │   └── in-memory/
│   │       ├── memory-author.ts   # In-memory test double
│   │       ├── memory-reading.ts  # In-memory test double
│   │       └── index.ts
│   ├── middleware/
│   │   └── repositories.ts        # Injects repos into Hono context variables
│   └── routes/
│       ├── authors.ts             # Consumes c.var.authorRepo
│       └── readings.ts            # Consumes c.var.readingRepo
```

---

## 3. Schema Design & SQL CHECK Constraints

Tables enforce engine-level integrity using SQLite `CHECK` constraints:

```typescript
// Example: src/db/schema/tasks.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const TASK_CATEGORIES = [
  "meditation",
  "exercise",
  "reading",
  "reflection",
] as const;

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  title: text("title").notNull(),
  category: text("category", { enum: TASK_CATEGORIES })
    .notNull()
    .$defaultFn(() => "meditation"),
  description: text("description").default(""),
  isDone: integer("is_done").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});
```

---

## 4. Makefile Development Workflow (Local vs Remote)

The root `Makefile` provides explicit, ergonomic targets for working offline against a local SQLite database or online against the remote Turso cloud:

```makefile
# Run API against local zero-config SQLite file (offline dev)
api-dev-local:
	cd apps/api && TURSO_DATABASE_URL="file:local.db" bun run dev

# Run API against remote Turso database (reads .dev.vars)
api-dev-remote:
	cd apps/api && bun run dev

# Generate declarative Drizzle migration SQL files
api-db-generate:
	cd apps/api && bunx drizzle-kit generate

# Run migrations against local database
api-db-migrate-local:
	cd apps/api && TURSO_DATABASE_URL="file:local.db" bunx drizzle-kit migrate

# Run migrations against remote Turso database
api-db-migrate-remote:
	cd apps/api && bunx drizzle-kit migrate

# Visual Drizzle Studio inspection GUI
api-db-studio:
	cd apps/api && bunx drizzle-kit studio
```

---

## 5. Turso Platform Onboarding & Provisioning Runbook

To establish your user account and provision the remote database on Turso:

1. **Install Turso CLI**:
   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   ```
2. **Account Creation / Login**:
   ```bash
   turso auth signup   # Or 'turso auth login' with GitHub/Google
   ```
3. **Database Creation**:
   ```bash
   turso db create myself-db --location gru   # 'gru' for São Paulo / South America, or 'iad' for US East
   ```
4. **Retrieve Credentials**:
   ```bash
   turso db show myself-db --url
   turso db tokens create myself-db
   ```
5. **Local Secrets Configuration**:
   Create `apps/api/.dev.vars` (automatically read by `wrangler dev`):
   ```env
   TURSO_DATABASE_URL="libsql://myself-db-<org>.turso.io"
   TURSO_AUTH_TOKEN="<token>"
   ```
6. **Cloudflare Production Secrets**:
   ```bash
   cd apps/api && npx wrangler secret put TURSO_DATABASE_URL
   cd apps/api && npx wrangler secret put TURSO_AUTH_TOKEN
   ```

---

## 6. Future Engine Migration Playbook

Because the application strictly enforces the Ports & Adapters pattern:

1. **Zero Route Modifications**: Route handlers depend solely on `AuthorRepository` and `ReadingRepository`.
2. **Plugging a New Engine (e.g. PostgreSQL)**:
   - Create `src/repositories/postgres/postgres-author.ts` implementing `AuthorRepository`.
   - Update the middleware factory in `src/middleware/repositories.ts` to instantiate the new adapter.
   - The entire HTTP layer, validation layer, and domain logic remain completely untouched.
