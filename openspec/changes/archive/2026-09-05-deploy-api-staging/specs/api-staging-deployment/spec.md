# Capability: API Staging Deployment

## 1. Overview

The `api-staging-deployment` capability provides infrastructure configuration, automated database migrations, and CI/CD pipelines to deploy `apps/api` to a dedicated staging environment on Cloudflare Workers backed by an isolated Turso (libSQL) database.

---

## 2. Requirements & Scenarios

### REQ-1: Cloudflare Workers Staging Environment Configuration

- `apps/api/wrangler.jsonc` SHALL declare an `env.staging` environment with:
  - `name`: `"myself-api-staging"`
  - `vars`: `{ "ENVIRONMENT": "staging" }`
- The top-level `name` SHALL remain `"myself-api"` for production.
- `apps/api/src/types.ts` SHALL update `ApiBindings` to include `ENVIRONMENT?: string` and `ApiVariables` to include `environment: Environment`.
- `apps/api/src/index.ts` `/health` endpoint SHALL return:
  - `status`: `"ok"`
  - `uptime`: uptime in seconds (integer)
  - `environment`: `c.var.environment` (strongly typed from `AppEnv`)

#### Scenario: Querying Staging Health Endpoint

- **Given** the API worker is deployed with `env.staging`
- **When** a `GET /health` request is received
- **Then** the response status code SHALL be `200 OK`
- **And** the JSON response SHALL include `"status": "ok"` and `"environment": "staging"`.

---

### REQ-2: Isolated Database Migration Pipeline

- The staging API SHALL connect to an independent Turso database (`myself-db-staging`).
- Database migrations SHALL run before worker deployment using `drizzle-kit migrate`.
- Monorepo `Makefile` SHALL provide `api-db-migrate-staging` accepting `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
- If migrations fail, subsequent deployment steps SHALL NOT execute.

#### Scenario: Executing Staging Migrations

- **Given** valid staging Turso credentials (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
- **When** `make api-db-migrate-staging` is invoked
- **Then** Drizzle migrations SHALL apply to the remote staging database schema
- **And** local files (`local.db`) or production databases SHALL NOT be touched.

---

### REQ-3: CLI & Monorepo Automation Scripts

- `apps/api/package.json` SHALL include:
  - `"deploy:staging": "wrangler deploy --env staging"`
- Monorepo `Makefile` SHALL include:
  - `api-deploy-staging`: runs staging deployment within `apps/api`
  - `api-db-migrate-staging`: runs remote database migrations against staging Turso database

#### Scenario: Deploying to Staging via CLI

- **Given** configured Cloudflare credentials and staging secrets
- **When** `make api-deploy-staging` is executed
- **Then** `wrangler deploy --env staging` SHALL deploy the worker as `myself-api-staging`.

---

### REQ-4: GitHub Actions CI/CD Staging Job

- `.github/workflows/ci.yml` SHALL declare a job `deploy_api_staging`.
- The job SHALL satisfy the following conditions:
  - `needs: [changes, validate]`
  - `if: github.event_name == 'pull_request' && needs.changes.outputs.api == 'true'`
  - Runs on `ubuntu-latest`
  - Installs Bun dependencies
  - Runs `make api-db-migrate-staging` if staging Turso secrets are set
  - Deploys worker via `make api-deploy-staging` if `CLOUDFLARE_API_TOKEN` is set

#### Scenario: Pull Request with API Changes

- **Given** an open Pull Request targeting `main` with modified files in `apps/api/**`
- **When** the `validate` job passes
- **Then** `deploy_api_staging` SHALL execute
- **And** staging database migrations and worker deployment SHALL be executed in sequence.

---

### REQ-5: Staging Provisioning Runbook

- `apps/api/README.md` SHALL include a comprehensive guide detailing:
  - How to create `myself-db-staging` in Turso (via CLI or web dashboard).
  - How to obtain database URL and auth token.
  - How to set Cloudflare Workers staging secrets via `bunx wrangler secret put <KEY> --env staging`.
  - How to add repository secrets to GitHub for CI/CD.

#### Scenario: Referencing Staging Provisioning Documentation

- **Given** a developer setting up a new staging environment
- **When** `apps/api/README.md` is consulted
- **Then** actionable instructions for Turso database provisioning and Cloudflare secret configuration SHALL be available.
