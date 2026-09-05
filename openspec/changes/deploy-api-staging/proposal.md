# Proposal: Deploy Myself API and Database in Staging

## Intent

The backend API (`apps/api`) and its persistence layer currently run only locally. In order to allow end-to-end integration testing and validation with staging mobile builds, we need a dedicated staging deployment on Cloudflare Workers backed by a remote Turso (libSQL) database.

## Scope

### In Scope
- Configure staging environment in `apps/api/wrangler.jsonc` (`myself-api-staging`) with `ENVIRONMENT: "staging"`.
- Expose runtime environment metadata in `/health` route and `ApiBindings`.
- Add staging deployment and migration commands to `apps/api/package.json` and monorepo `Makefile`.
- Create GitHub Actions CI workflow job for deploying the API to staging on pull requests.
- Provide a runbook for provisioning staging Turso database (`myself-db-staging`) and Cloudflare secrets.

### Out of Scope
- Production deployment rollout changes.
- Ephemeral per-PR database branching.
- Client-side mobile changes to consume the staging API.

## Capabilities

### New Capabilities
- `api-staging-deployment`: Provisioning, database migration pipeline, and Cloudflare Workers deployment for staging backend.

### Modified Capabilities
- None

## Approach

1. Configure `env.staging` in `apps/api/wrangler.jsonc` targeting worker `myself-api-staging` with `vars.ENVIRONMENT = "staging"`.
2. Update `ApiBindings` and `/health` route to expose runtime environment.
3. Add scripts in `apps/api/package.json` (`deploy:staging`) and `Makefile` (`api-deploy-staging`, `api-db-migrate-staging`).
4. Define GitHub Actions CI job `deploy_api_staging` in `.github/workflows/ci.yml`.
5. Document runbook for provisioning `myself-db-staging` in Turso and configuring secrets.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `apps/api/wrangler.jsonc` | Modified | Add `env.staging` configuration and environment vars |
| `apps/api/src/types.ts` | Modified | Add `ENVIRONMENT` to `ApiBindings` |
| `apps/api/src/index.ts` | Modified | Return `environment` in `/health` response |
| `apps/api/package.json` | Modified | Add `deploy:staging` script |
| `Makefile` | Modified | Add `api-deploy-staging` and migration targets |
| `.github/workflows/ci.yml` | Modified | Add `deploy_api_staging` workflow job |
| `apps/api/README.md` | Modified | Document staging setup runbook |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Missing secrets in Cloudflare Workers | Med | Document required secrets clearly; add healthcheck verification |
| Failed migration during deployment | Low | Run migrations prior to worker deploy; abort deploy if migration fails |

## Rollback Plan

Revert `apps/api/wrangler.jsonc` and `.github/workflows/ci.yml`. Delete or roll back Cloudflare Worker deployment via `wrangler rollback --env staging`.

## Dependencies

- Cloudflare account credentials (`CLOUDFLARE_API_TOKEN`).
- Turso account with permissions to create `myself-db-staging`.

## Success Criteria

- [ ] `apps/api/wrangler.jsonc` supports `wrangler deploy --env staging`.
- [ ] Automated migration command can run against staging Turso credentials.
- [ ] `.github/workflows/ci.yml` includes `deploy_api_staging` job.
- [ ] Staging API endpoint `/health` reports `status: "ok"` and `environment: "staging"`.
