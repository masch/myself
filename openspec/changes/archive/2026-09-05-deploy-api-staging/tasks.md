# Tasks: Staging Deployment for API and Database

- **Change**: `deploy-api-staging`
- **Domain**: `infrastructure / backend`

---

## Phase 1: Configuration & Types

- [x] 1.1 Update `apps/api/wrangler.jsonc` to define `vars.ENVIRONMENT = "production"` and `env.staging` with worker name `myself-api-staging` and `vars.ENVIRONMENT = "staging"`.
- [x] 1.2 Update `apps/api/src/types.ts` to include `ENVIRONMENT?: string` in `ApiBindings`.
- [x] 1.3 Update `apps/api/src/index.ts` health endpoint to return `environment` field and update health test assertions in `apps/api/src/index.test.ts`.

---

## Phase 2: Scripts & Monorepo Targets

- [x] 2.1 Add `"deploy:staging": "wrangler deploy --env staging"` script to `apps/api/package.json`.
- [x] 2.2 Add `api-deploy-staging` and `api-db-migrate-staging` targets to monorepo `Makefile`.

---

## Phase 3: CI/CD Workflow

- [x] 3.1 Add `deploy_api_staging` job to `.github/workflows/ci.yml` triggered on pull requests with API changes.

---

## Phase 4: Documentation & Runbook

- [x] 4.1 Update `apps/api/README.md` with step-by-step instructions for Turso staging database creation, Cloudflare staging secrets, and GitHub Actions secrets.

---

## Phase 5: Verification

- [x] 5.1 Run typecheck and unit tests across `apps/api`.
- [x] 5.2 Validate `bunx wrangler deploy --dry-run --env staging` in `apps/api`.
