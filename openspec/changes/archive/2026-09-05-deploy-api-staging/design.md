# Design: Staging Deployment for API and Database

- **Change**: `deploy-api-staging`
- **Domain**: `infrastructure / backend`
- **Related Specs**: [`specs/api-staging-deployment/spec.md`](specs/api-staging-deployment/spec.md)

---

## 1. Architecture Overview

`apps/api` is built with Hono and runs on Cloudflare Workers using the V8 isolate runtime. The persistence layer follows Hexagonal Architecture: domain repositories (`AuthorRepository`, `ReadingRepository`, `UserRepository`) depend on database drivers instantiated from dynamic environment bindings (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Workers Runtime                       │
│                                                                        │
│  ┌────────────────────────┐             ┌───────────────────────────┐  │
│  │ myself-api (Production) │             │ myself-api-staging (Staging)│  │
│  │ vars: ENVIRONMENT=prod │             │ vars: ENVIRONMENT=staging │  │
│  └───────────┬────────────┘             └─────────────┬─────────────┘  │
└──────────────┼────────────────────────────────────────┼────────────────┘
               │ (Isolated Secrets)                     │ (Isolated Secrets)
               ▼                                        ▼
┌───────────────────────────┐             ┌───────────────────────────┐
│     Turso Production      │             │       Turso Staging       │
│      (myself-db-prod)     │             │    (myself-db-staging)    │
└───────────────────────────┘             └───────────────────────────┘
```

---

## 2. Configuration Design

### 2.1 Cloudflare Workers (`apps/api/wrangler.jsonc`)

Cloudflare Workers provides native multi-environment support via `env.<environment_name>`. The top-level block defines base defaults and production settings, while `env.staging` defines staging overrides:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "myself-api",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "vars": {
    "ENVIRONMENT": "production"
  },
  "env": {
    "staging": {
      "name": "myself-api-staging",
      "vars": {
        "ENVIRONMENT": "staging"
      }
    }
  }
}
```

### 2.2 Application Types & Healthcheck

- **Types (`apps/api/src/types.ts`)**:
  ```typescript
  export type Environment = "production" | "staging" | "development" | "test";

  export type ApiBindings = {
    TURSO_DATABASE_URL?: string;
    TURSO_AUTH_TOKEN?: string;
    ENVIRONMENT?: string;
  };

  export type ApiVariables = {
    authorRepo: AuthorRepository;
    readingRepo: ReadingRepository;
    userRepo: UserRepository;
    environment: Environment;
  };
  ```

- **Health Route (`apps/api/src/index.ts`)**:
  ```typescript
  export const healthRoute = createRoute({
    method: "get",
    path: "/health",
    tags: ["System"],
    summary: "System Health & Uptime",
    description: "Returns health status, runtime environment, and uptime in seconds.",
    responses: {
      [HttpStatus.OK]: {
        description: "Health status ok",
      },
    },
  });

  // Handler:
  .openapi(healthRoute, (c) =>
    ok(c, {
      status: "ok",
      uptime: Math.floor((Date.now() - startedAt) / 1000),
      environment: c.var.environment,
    }),
  )
  ```

---

## 3. Database Migration Strategy

### 3.1 Drizzle Kit Configuration

Drizzle kit is already configured in `apps/api/drizzle.config.ts`. Migrations are generated into `apps/api/drizzle/`.

For remote environments, `drizzle-kit migrate` consumes `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.

### 3.2 Automation Targets (`Makefile`)

To prevent accidental migrations against the wrong database, explicit targets are added:

```makefile
.PHONY: api-db-migrate-staging
api-db-migrate-staging:
	cd apps/api && TURSO_DATABASE_URL="$${TURSO_DATABASE_URL_STAGING:-$${TURSO_DATABASE_URL}}" \
	TURSO_AUTH_TOKEN="$${TURSO_AUTH_TOKEN_STAGING:-$${TURSO_AUTH_TOKEN}}" \
	bunx drizzle-kit migrate

.PHONY: api-deploy-staging
api-deploy-staging:
	cd apps/api && bun run deploy:staging
```

---

## 4. CI/CD Pipeline Design (`.github/workflows/ci.yml`)

The staging deployment job runs automatically on Pull Requests affecting `api` files:

```yaml
  deploy_api_staging:
    name: Deploy API to Cloudflare Workers (Staging)
    needs: [changes, validate]
    if: github.event_name == 'pull_request' && needs.changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Cache Turborepo & Bun
        uses: actions/cache@v4
        with:
          path: |
            .turbo
            apps/*/.turbo
            packages/*/.turbo
            ~/.bun/install/cache
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-

      - name: Install dependencies
        run: make install

      - name: Run Staging Database Migrations
        env:
          TURSO_DATABASE_URL_STAGING: ${{ secrets.TURSO_DATABASE_URL_STAGING }}
          TURSO_AUTH_TOKEN_STAGING: ${{ secrets.TURSO_AUTH_TOKEN_STAGING }}
        if: ${{ env.TURSO_DATABASE_URL_STAGING != '' }}
        run: make api-db-migrate-staging

      - name: Deploy to Cloudflare Workers Staging
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        if: ${{ env.CLOUDFLARE_API_TOKEN != '' }}
        run: make api-deploy-staging
```

---

## 5. Secret Management & Runbook

### 5.1 Cloudflare Worker Secrets
Cloudflare stores production and staging secrets in separate keyrings. Staging secrets must be set with the `--env staging` flag:
- `wrangler secret put TURSO_DATABASE_URL --env staging`
- `wrangler secret put TURSO_AUTH_TOKEN --env staging`

### 5.2 GitHub Repository Secrets
For CI/CD execution:
- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Edit Workers permissions.
- `TURSO_DATABASE_URL_STAGING`: libSQL connection URL for `myself-db-staging`.
- `TURSO_AUTH_TOKEN_STAGING`: Auth token for `myself-db-staging`.
