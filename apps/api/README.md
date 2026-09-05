# Myself API (`apps/api`)

Backend service built with **Hono** running on **Cloudflare Workers** (V8 isolates), backed by **Turso (libSQL)** and **Drizzle ORM** through a strict **Ports & Adapters (Hexagonal)** architecture.

---

## 1. Architecture Overview

- **Routing & HTTP Layer**: Hono router (`src/routes/`) enforcing `@hono/zod-validator` and standard `ApiResponse<T>` envelopes. Handlers do NOT contain raw SQL or direct DB queries.
- **Domain Ports**: Abstract repository interfaces (`src/repositories/contracts/`) typed exclusively with domain entities from `@myself/shared`.
- **Infrastructure Adapters**:
  - `DrizzleAuthorRepository` / `DrizzleReadingRepository`: Production/remote adapter using Drizzle ORM over HTTP via `@libsql/client/web`.
  - `InMemoryAuthorRepository` / `InMemoryReadingRepository`: Fast, deterministic test doubles for unit testing (`bun test`) without external dependencies.
- **Dependency Injection**: `repositoriesMiddleware` in `src/middleware/repositories.ts` injects repository instances into the Hono context (`c.var.authorRepo`, `c.var.readingRepo`).

---

## 2. Development Workflow (Local vs Remote)

From the monorepo root:

### Offline / Zero-Config Local Mode

Runs against a local zero-config SQLite file without requiring internet or Turso credentials:

```bash
make api-dev-local
```

### Remote Turso Cloud Mode

Runs against your remote Turso database using credentials from `apps/api/.dev.vars`:

```bash
make api-dev-remote
```

### Database Migrations & Studio

```bash
# Generate declarative SQL migrations from Drizzle schemas
make api-db-generate

# Run migrations against local database
make api-db-migrate-local

# Run migrations against remote Turso database
make api-db-migrate-remote

# Open visual Drizzle Studio database browser
make api-db-studio
```

---

## 3. Turso Platform Onboarding Runbook

Follow these steps to create your user account and provision the remote database on Turso:

### Step 1: Install the Turso CLI

```bash
curl -sSfL https://get.tur.so/install.sh | bash
```

### Step 2: Sign Up / Log In

```bash
turso auth signup   # Or 'turso auth login' if you already have an account
```

### Step 3: Create the Database

Create a database in your preferred primary region (e.g., `gru` for São Paulo / South America, or `iad` for US East):

```bash
turso db create myself-db --location gru
```

### Step 4: Retrieve Database URL and Auth Token

```bash
turso db show myself-db --url
turso db tokens create myself-db
```

### Step 5: Configure Local Secrets (`apps/api/.dev.vars`)

Create `apps/api/.dev.vars` (this file is gitignored and read automatically by `wrangler dev`):

```env
TURSO_DATABASE_URL="libsql://myself-db-<org>.turso.io"
TURSO_AUTH_TOKEN="your-secret-token"
```

### Step 6: Deploy Migrations to Turso

```bash
make api-db-migrate-remote
```

### Step 7: Configure Cloudflare Production Secrets

When deploying to Cloudflare Workers production:

```bash
cd apps/api
bunx wrangler secret put TURSO_DATABASE_URL
bunx wrangler secret put TURSO_AUTH_TOKEN
```

---

## 4. Staging Environment Provisioning & Deployment

The staging environment deploys as a dedicated Cloudflare Worker (`myself-api-staging`) backed by an isolated Turso database (`myself-db-staging`).

### Step 1: Create Staging Database in Turso

```bash
turso db create myself-db-staging --location gru
```

### Step 2: Retrieve Staging URL & Token

```bash
turso db show myself-db-staging --url
turso db tokens create myself-db-staging
```

### Step 3: Configure Cloudflare Workers Staging Secrets

Set secrets specifically for the staging environment using the `--env staging` flag:

```bash
cd apps/api
bunx wrangler secret put TURSO_DATABASE_URL --env staging
bunx wrangler secret put TURSO_AUTH_TOKEN --env staging
```

### Step 4: Run Migrations against Staging Database

```bash
TURSO_DATABASE_URL_STAGING="libsql://myself-db-staging-<org>.turso.io" \
TURSO_AUTH_TOKEN_STAGING="your-staging-token" \
make api-db-migrate-staging
```

### Step 5: Deploy API to Staging Manually

```bash
make api-deploy-staging
```

### Step 6: Configure GitHub Actions Secrets for CI/CD

To enable automated migrations and deployments on pull requests, add these repository secrets in GitHub (`Settings -> Secrets and variables -> Actions`):

| Secret Name                  | Description                                        |
| ---------------------------- | -------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`       | Cloudflare API Token with Workers edit permissions |
| `TURSO_DATABASE_URL_STAGING` | `libsql://myself-db-staging-<org>.turso.io`        |
| `TURSO_AUTH_TOKEN_STAGING`   | Staging database auth token                        |
