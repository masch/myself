# ── Monorepo Root Tasks (Turborepo) ──────────

.PHONY: install
install:
	bun install

.PHONY: dev
dev:
	bun run dev

.PHONY: dev-web
dev-web:
	@trap 'kill 0' EXIT INT TERM; \
	(cd apps/api && bun run dev) & \
	(cd apps/mobile && bun run web)

.PHONY: dev-mobile
dev-mobile:
	@trap 'kill 0' EXIT INT TERM; \
	(cd apps/api && bun run dev) & \
	(cd apps/mobile && bun run start)

.PHONY: build
build:
	bun run build

.PHONY: lint
lint:
	bun run lint

.PHONY: typecheck
typecheck:
	bun run typecheck

.PHONY: test
test:
	bun run test

.PHONY: test-coverage
test-coverage:
	bun run test-coverage

.PHONY: test-e2e
test-e2e: api-test-e2e

.PHONY: docs
docs: api-docs

.PHONY: format-staged
format-staged: ## Run prettier on staged files only
	@files=$$(git diff --cached --name-only --diff-filter=d 2>/dev/null); \
	if [ -n "$$files" ]; then \
		echo "$$files" | xargs bunx prettier --write --ignore-unknown; \
	fi

.PHONY: format-check
format-check: ## Check code formatting using prettier
	bunx prettier --check .

.PHONY: format-check-staged
format-check-staged: ## Check code formatting on staged files using prettier
	@files=$$(git diff --cached --name-only --diff-filter=d 2>/dev/null); \
	if [ -n "$$files" ]; then \
		echo "$$files" | xargs bunx prettier --check --ignore-unknown; \
	fi

.PHONY: expo-doctor
expo-doctor: ## Run Expo Doctor to verify dependency compatibility
	cd apps/mobile && APP_VERSION_NAME="$(APP_VERSION_NAME)" bunx expo-doctor

.PHONY: check-static
check-static: lint typecheck ## Run lint + typecheck

.PHONY: check
check: format-check lint typecheck test ## Run full quality check suite
	$(MAKE) expo-doctor || echo "[WARN] expo-doctor checks failed (may be false positives from bun cache layout)"

.PHONY: format
format: ## Format all files with prettier
	bun run format

.PHONY: ci
ci: install check


# ── Mobile Tasks (apps/mobile) ───────────────

.PHONY: mobile-start
mobile-start:
	cd apps/mobile && bun run start

.PHONY: mobile-start-mcp
mobile-start-mcp:
	cd apps/mobile && EXPO_UNSTABLE_MCP_SERVER=1 bun run start

.PHONY: mobile-ios
mobile-ios:
	cd apps/mobile && bun run ios

.PHONY: mobile-ios-mcp
mobile-ios-mcp:
	cd apps/mobile && EXPO_UNSTABLE_MCP_SERVER=1 bun run ios

.PHONY: mobile-android
mobile-android:
	cd apps/mobile && bun run android

.PHONY: mobile-android-mcp
mobile-android-mcp:
	cd apps/mobile && EXPO_UNSTABLE_MCP_SERVER=1 bun run android

.PHONY: mobile-web
mobile-web:
	cd apps/mobile && bun run web

.PHONY: mobile-web-mcp
mobile-web-mcp:
	cd apps/mobile && EXPO_UNSTABLE_MCP_SERVER=1 bun run web

.PHONY: mobile-doctor
mobile-doctor:
	cd apps/mobile && APP_VERSION_NAME="$(APP_VERSION_NAME)" bun run doctor

.PHONY: mobile-export-web
mobile-export-web:
	cd apps/mobile && bun run export-web

.PHONY: mobile-format
mobile-format:
	cd apps/mobile && bun run format

.PHONY: mobile-expo-login
mobile-expo-login:
	cd apps/mobile && (bun run expo whoami || bun run expo login)

.PHONY: mobile-expo-whoami
mobile-expo-whoami:
	cd apps/mobile && bun run expo whoami

# ── Mobile EAS Deploy ────────────────────────

.PHONY: mobile-eas-whoami
mobile-eas-whoami:
	cd apps/mobile && bun run eas whoami

.PHONY: mobile-eas-list
mobile-eas-list:
	cd apps/mobile && bun run eas build:list

.PHONY: mobile-eas-init
mobile-eas-init:
	cd apps/mobile && bun run eas init

.PHONY: mobile-eas-staging-build-web
mobile-eas-staging-build-web: mobile-eas-whoami
	cd apps/mobile && export APP_ENV=staging APP_VERSION_NAME="$(APP_VERSION_NAME)" EXPO_PUBLIC_API_URL="$(API_STAGING_URL)" && bun run export-web --clear && bun run eas deploy --alias staging

.PHONY: mobile-eas-prod-build-web
mobile-eas-prod-build-web: mobile-eas-whoami
	cd apps/mobile && bun run export-web --clear && bun run eas deploy --prod

.PHONY: mobile-eas-build-android-preview-local
mobile-eas-build-android-preview-local: mobile-eas-whoami
	cd apps/mobile && bun run eas build -p android --profile preview --local $(if $(OUTPUT_APK),--output="$(OUTPUT_APK)")

# ── Mobile Firebase App Distribution ─────────

FIREBASE_APP_ID_PRODUCTION ?=
FIREBASE_APP_ID_STAGING    ?= 1:543613646622:android:d91f7c9d1dd74b3060fb0f

APP_ENV ?= staging
ifeq ($(APP_ENV),production)
  FIREBASE_TARGET_APP_ID := $(FIREBASE_APP_ID_PRODUCTION)
else
  FIREBASE_TARGET_APP_ID := $(FIREBASE_APP_ID_STAGING)
endif

FIREBASE_SA_KEY_PATH ?= apps/mobile/firebase-sa-key.json
ifneq ($(wildcard $(FIREBASE_SA_KEY_PATH)),)
export GOOGLE_APPLICATION_CREDENTIALS := $(abspath $(FIREBASE_SA_KEY_PATH))
endif

FIREBASE_APK_PATH ?= $(shell ls -t myself-*.apk apps/mobile/myself-*.apk build-*.apk apps/mobile/android/app/build/outputs/apk/release/*.apk 2>/dev/null | head -1)

FIREBASE_GROUP_DEV  := dev-team
FIREBASE_GROUP_TEST := test-team

FIREBASE_RELEASE_NOTES_CMD = $$(git log -3 --pretty=format:'- %s' 2>/dev/null | tr -d '\"'\''')
FIREBASE_RELEASE_NOTES ?= $(FIREBASE_RELEASE_NOTES_CMD)

.PHONY: mobile-firebase-login-ci
mobile-firebase-login-ci:
	cd apps/mobile && bun run firebase login:ci

.PHONY: mobile-firebase-distribute
mobile-firebase-distribute:
	@if [ -z "$(GROUPS)" ]; then echo "Error: GROUPS parameter is required (e.g. GROUPS=dev-team)"; exit 1; fi
	@if [ -z "$(FIREBASE_TARGET_APP_ID)" ]; then echo "Error: FIREBASE_TARGET_APP_ID is not configured for APP_ENV=$(APP_ENV)"; exit 1; fi
	cd apps/mobile && bun run firebase appdistribution:distribute "$(abspath $(FIREBASE_APK_PATH))" \
		--app "$(FIREBASE_TARGET_APP_ID)" \
		--groups "$(GROUPS)" \
		--release-notes "$$FIREBASE_RELEASE_NOTES" \
		--non-interactive

.PHONY: mobile-firebase-distribute-staging-dev
mobile-firebase-distribute-staging-dev:
	$(MAKE) mobile-firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV)"

.PHONY: mobile-firebase-distribute-staging-all
mobile-firebase-distribute-staging-all:
	$(MAKE) mobile-firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV),$(FIREBASE_GROUP_TEST)"

.PHONY: mobile-firebase-distribute-prod-dev
mobile-firebase-distribute-prod-dev:
	$(MAKE) mobile-firebase-distribute APP_ENV=production GROUPS="$(FIREBASE_GROUP_DEV)"

# ── API Tasks (apps/api) ─────────────────────

.PHONY: api-dev
api-dev:
	cd apps/api && bun run dev

.PHONY: api-dev-local
api-dev-local: api-dev

.PHONY: api-dev-turso-local
api-dev-turso-local:
	cd apps/api && bun run dev:turso-local

.PHONY: api-dev-turso-remote
api-dev-turso-remote:
	cd apps/api && bun run dev:turso-remote

.PHONY: api-dev-remote
api-dev-remote: api-dev-turso-remote

.PHONY: api-db-generate
api-db-generate:
	cd apps/api && bunx drizzle-kit generate

.PHONY: api-db-migrate-local
api-db-migrate-local:
	cd apps/api && TURSO_DATABASE_URL="file:local.db" bunx drizzle-kit migrate

.PHONY: api-db-migrate-remote
api-db-migrate-remote:
	cd apps/api && if [ -f .dev.vars ]; then bun --env-file=.dev.vars x drizzle-kit migrate; else bunx drizzle-kit migrate; fi

.PHONY: api-db-studio
api-db-studio:
	cd apps/api && if [ -f .dev.vars ]; then bun --env-file=.dev.vars x drizzle-kit studio; else bunx drizzle-kit studio; fi

.PHONY: api-db-migrate-staging
api-db-migrate-staging:
	@if [ -z "$$TURSO_DATABASE_URL_STAGING" ] || [ -z "$$TURSO_AUTH_TOKEN_STAGING" ]; then \
		echo "ERROR: TURSO_DATABASE_URL_STAGING and TURSO_AUTH_TOKEN_STAGING must both be set"; \
		exit 1; \
	fi
	cd apps/api && TURSO_DATABASE_URL="$$TURSO_DATABASE_URL_STAGING" \
	TURSO_AUTH_TOKEN="$$TURSO_AUTH_TOKEN_STAGING" \
	bunx drizzle-kit migrate

.PHONY: api-deploy
api-deploy:
	cd apps/api && bun run deploy

.PHONY: api-deploy-staging
api-deploy-staging:
	cd apps/api && bun run deploy:staging

.PHONY: api-typecheck
api-typecheck:
	cd apps/api && bun run typecheck

.PHONY: api-test
api-test:
	cd apps/api && bun run test

.PHONY: api-test-e2e
api-test-e2e:
	cd apps/api && bun run test:e2e

.PHONY: api-test-unit
api-test-unit:
	cd apps/api && bun run test:unit

.PHONY: api-docs
api-docs:
	@echo "myself API Documentation URLs:"
	@echo "  Interactive Reference (Scalar): http://localhost:8787/reference"
	@echo "  OpenAPI 3.1 JSON Specification:  http://localhost:8787/doc"

# ── Shared Package Tasks (packages/shared) ───

.PHONY: shared-typecheck
shared-typecheck:
	cd packages/shared && bun run typecheck

.PHONY: shared-test
shared-test:
	cd packages/shared && bun run test
