# Exploration: Staging Deployment for API and Database

- **Change**: `deploy-api-staging`
- **Execution Mode**: `interactive`
- **Artifact Store**: `openspec`
- **Domain**: `infrastructure / backend`

---

## 1. Current State

- **Backend (`apps/api`)**:
  - Hono v4 application configured to run on Cloudflare Workers via `wrangler.jsonc`.
  - Database access layer uses Drizzle ORM and `@libsql/client` (Turso / libSQL) using Hexagonal Architecture (`AuthorRepository`, `ReadingRepository`).
  - Currently only local configuration exists: `apps/api/.dev.vars` points to `http://127.0.0.1:8080` or `file:local.db`.
  - No remote database is provisioned on Turso for staging.
  - `apps/api/wrangler.jsonc` does not define an `env.staging` configuration; only top-level `name = "myself-api"`.
- **CI / CD (`.github/workflows/ci.yml`)**:
  - Contains `deploy_mobile_staging` (EAS Hosting on PR) and `deploy_api_production` (Cloudflare Workers on push to `main`).
  - **No staging deploy job** exists for `apps/api`.
- **Monorepo Automation (`Makefile`)**:
  - Contains `api-deploy` (`wrangler deploy`), but lacks staging-specific deploy and migration targets (`api-deploy-staging`, `api-db-migrate-staging`).

---

## 2. Affected Areas

- `apps/api/wrangler.jsonc`: Add staging environment block (`env.staging` with worker name `myself-api-staging`).
- `apps/api/package.json`: Add `deploy:staging` script (`wrangler deploy --env staging`).
- `apps/api/README.md`: Document staging provisioning runbook for Turso & Cloudflare Secrets.
- `Makefile`: Add `api-deploy-staging` and `api-db-migrate-staging` targets.
- `.github/workflows/ci.yml`: Add `deploy_api_staging` workflow job triggered on PRs / staging branches with required Cloudflare & Turso secret checks.

---

## 3. Approaches & Analysis

### Approach 1: Native Cloudflare Workers Environment (`env.staging`) + Turso Database (Recommended)
- Configure `env.staging` directly in `wrangler.jsonc` with distinct worker name `myself-api-staging`.
- Provision remote Turso database `myself-db-staging` in region `gru` (São Paulo) to match South American latency requirements.
- Run migrations using `drizzle-kit migrate` against staging Turso URL/token.
- Bind secrets `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to the `staging` worker environment.
- **Pros**: Clean isolation from production, native Wrangler v4 multi-env support, zero cold starts on Workers + Turso.
- **Cons**: Requires initial manual creation of the Turso database and setting Cloudflare secrets (one-time setup).

### Approach 2: Ephemeral Preview Environments per PR (Cloudflare Workers Preview + Turso Branching)
- Use Turso database branching (`turso db branch`) per PR.
- **Pros**: Isolated test data per PR.
- **Cons**: Over-engineering for current stage; adds complexity and operational overhead while staging is not yet live.

---

## 4. Recommendation

Adopt **Approach 1**: Establish a stable, persistent `staging` environment with `myself-api-staging` and `myself-db-staging`. Create the declarative configuration, Makefile targets, and CI workflow, along with the onboarding runbook for database creation.

---

## 5. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Missing secrets in Cloudflare Workers staging | API returns 500 on startup | Fail-fast check during startup and validate worker health after deploy |
| Out-of-sync migrations between schema and staging DB | Runtime SQL errors | Enforce automated migration execution prior to worker deployment |
| Secret leakage in CI logs | High security risk | Use GitHub Actions encrypted secrets and masked environment variables |

---

## 6. Ready for Proposal

**Yes**. Technical requirements and architectural layout are well-defined.
