SHELL := bash
.SHELLFLAGS := -eu -o pipefail -c
.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help menu
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z0-9_-]+:.*?## / {if (length($$1) > max) max = length($$1); targets[$$1] = $$2} END {for (t in targets) printf "  \033[36m%-" (max + 2) "s\033[0m %s\n", t, targets[t]}' $(MAKEFILE_LIST) | sort

# ── Workspace Paths ───────────────────────────

API_DIR     := apps/api
MOBILE_DIR  := apps/mobile
SHARED_DIR  := packages/shared

# ── Monorepo Root Tasks (Turborepo) ──────────

.PHONY: install
install: ## Install dependencies across all workspaces and configure git hooks
	bun install
	@$(MAKE) setup-hooks

.PHONY: setup-hooks
setup-hooks: ## Configure git to use versioned .githooks
	git config core.hooksPath .githooks

.PHONY: dev
dev: ## Run dev servers concurrently via Turborepo
	bun run dev

.PHONY: dev-web
dev-web: ## Run API and Mobile Web dev servers concurrently
	@trap 'kill 0' EXIT INT TERM; \
	(cd $(API_DIR) && bun run dev) & \
	(cd $(MOBILE_DIR) && bun run web)

.PHONY: dev-mobile
dev-mobile: ## Run API and Mobile Native dev servers concurrently
	@trap 'kill 0' EXIT INT TERM; \
	(cd $(API_DIR) && bun run dev) & \
	(cd $(MOBILE_DIR) && bun run start)

.PHONY: build
build: ## Build all workspaces via Turborepo
	bun run build

# ── Verification Tasks (Checks) ───────────────

.PHONY: check-lint
check-lint: ## Run lint via Turborepo
	bun run lint

.PHONY: check-types
check-types: ## Run typecheck via Turborepo
	bun run typecheck

.PHONY: check-tests
check-tests: ## Run unit tests via Turborepo
	bun run test

.PHONY: check-tests-coverage
check-tests-coverage: ## Run tests with coverage
	bun run test-coverage

.PHONY: check-tests-e2e
check-tests-e2e: ## Run end-to-end API tests
	cd $(API_DIR) && bun run test:e2e

.PHONY: check-format
check-format: ## Check code formatting using prettier
	bunx prettier --check .

.PHONY: check-format-staged
check-format-staged: ## Check code formatting on staged files using prettier
	@git diff --cached --name-only -z --diff-filter=d 2>/dev/null | xargs -0 -r bunx prettier --check --ignore-unknown --

.PHONY: check-doctor
check-doctor: ## Run Expo Doctor to verify dependency compatibility
	cd $(MOBILE_DIR) && APP_VERSION_NAME="$(APP_VERSION_NAME)" bunx expo-doctor

.PHONY: check-static
check-static: check-lint check-types ## Run lint + typecheck

.PHONY: check-affected
check-affected: ## Run checks only on packages modified against origin/main
	bunx turbo run lint typecheck test --filter=...[origin/main]

.PHONY: check-api
check-api: ## Run all checks for API workspace
	bunx turbo run lint typecheck test --filter=@myself/api

.PHONY: check-mobile
check-mobile: ## Run all checks for Mobile workspace
	bunx turbo run lint typecheck test --filter=@myself/mobile && $(MAKE) check-doctor

.PHONY: check-shared
check-shared: ## Run all checks for Shared workspace
	bunx turbo run lint typecheck test --filter=@myself/shared

.PHONY: check
check: check-format ## Run full quality check suite via unified Turborepo pipeline
	bunx turbo run lint typecheck test
	$(MAKE) check-doctor

.PHONY: ci
ci: install check

.PHONY: precommit-logs
precommit-logs: ## Show log outputs from the most recent pre-commit run
	@LAST=$$(ls -t /tmp/myself-precommit-*.log 2>/dev/null | head -1 | sed -E 's/.*myself-precommit-(.+)-[^-]+\.log/\1/'); \
	if [ -z "$$LAST" ]; then \
	  echo "No pre-commit logs found in /tmp"; \
	else \
	  for f in /tmp/myself-precommit-$${LAST}-*.log; do \
	    echo "=== $$(basename $$f) ==="; \
	    cat "$$f"; \
	    echo ""; \
	  done; \
	fi

# ── Correction Tasks (Fixes) ──────────────────

.PHONY: fix-format
fix-format: ## Format all files with prettier
	bun run format

.PHONY: fix-format-staged
fix-format-staged: ## Run prettier on staged files only
	@git diff --cached --name-only -z --diff-filter=d 2>/dev/null | xargs -0 -r bunx prettier --write --ignore-unknown --

.PHONY: fix
fix: fix-format ## Run all automated fixes

.PHONY: expo-upgrade
expo-upgrade: ## Check recommended versions and upgrade Expo SDK packages
	@./scripts/expo-upgrade.sh


# ── Mobile Tasks (apps/mobile) ───────────────

.PHONY: mobile-start
mobile-start: ## Start Expo development server for mobile
	cd $(MOBILE_DIR) && bun run start

.PHONY: mobile-start-mcp
mobile-start-mcp: ## Start Expo dev server with MCP server enabled
	cd $(MOBILE_DIR) && EXPO_UNSTABLE_MCP_SERVER=1 bun run start

.PHONY: mobile-ios
mobile-ios: ## Start Expo iOS simulator
	cd $(MOBILE_DIR) && bun run ios

.PHONY: mobile-ios-mcp
mobile-ios-mcp: ## Start Expo iOS simulator with MCP server enabled
	cd $(MOBILE_DIR) && EXPO_UNSTABLE_MCP_SERVER=1 bun run ios

.PHONY: mobile-android
mobile-android: ## Start Expo Android emulator
	cd $(MOBILE_DIR) && bun run android

.PHONY: mobile-android-mcp
mobile-android-mcp: ## Start Expo Android emulator with MCP server enabled
	cd $(MOBILE_DIR) && EXPO_UNSTABLE_MCP_SERVER=1 bun run android

.PHONY: mobile-web
mobile-web: ## Start Expo web development server
	cd $(MOBILE_DIR) && bun run web

.PHONY: mobile-web-mcp
mobile-web-mcp: ## Start Expo web dev server with MCP server enabled
	cd $(MOBILE_DIR) && EXPO_UNSTABLE_MCP_SERVER=1 bun run web

.PHONY: mobile-export-web
mobile-export-web: ## Export Expo web static bundle
	cd $(MOBILE_DIR) && bun run export-web

.PHONY: mobile-expo-login
mobile-expo-login: ## Log in to Expo CLI
	cd $(MOBILE_DIR) && (bun run expo whoami || bun run expo login)

.PHONY: mobile-expo-whoami
mobile-expo-whoami: ## Show current Expo CLI authenticated user
	cd $(MOBILE_DIR) && bun run expo whoami

# ── Mobile EAS Deploy ────────────────────────

EAS_CLI_VERSION ?= 20.1.0

.PHONY: mobile-eas-whoami
mobile-eas-whoami: ## Check current EAS authenticated account
	cd $(MOBILE_DIR) && bunx eas-cli@$(EAS_CLI_VERSION) whoami

.PHONY: mobile-eas-list
mobile-eas-list: ## List recent EAS builds
	cd $(MOBILE_DIR) && bunx eas-cli@$(EAS_CLI_VERSION) build:list

.PHONY: mobile-eas-init
mobile-eas-init: ## Initialize EAS project configuration
	cd $(MOBILE_DIR) && bunx eas-cli@$(EAS_CLI_VERSION) init

.PHONY: stg-mobile-deploy
stg-mobile-deploy: mobile-eas-whoami ## Deploy mobile web build to EAS Hosting (staging)
	cd $(MOBILE_DIR) && export APP_ENV=staging APP_VERSION_NAME="$(APP_VERSION_NAME)" EXPO_PUBLIC_API_URL="$(API_STAGING_URL)" && bun run export-web --clear && bunx eas-cli@$(EAS_CLI_VERSION) deploy --alias staging

.PHONY: prd-mobile-deploy
prd-mobile-deploy: mobile-eas-whoami ## Deploy mobile web build to EAS Hosting (production)
	cd $(MOBILE_DIR) && bun run export-web --clear && bunx eas-cli@$(EAS_CLI_VERSION) deploy --prod

.PHONY: mobile-eas-build-android-preview-local
mobile-eas-build-android-preview-local: mobile-eas-whoami ## Build Android APK locally with EAS CLI
	cd $(MOBILE_DIR) && bunx eas-cli@$(EAS_CLI_VERSION) build -p android --profile preview --local $(if $(OUTPUT_APK),--output="$(OUTPUT_APK)")

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
mobile-firebase-login-ci: ## Log in to Firebase CLI for CI
	cd $(MOBILE_DIR) && bun run firebase login:ci

.PHONY: mobile-firebase-distribute
mobile-firebase-distribute: ## Distribute Android APK via Firebase App Distribution
	@if [ -z "$(GROUPS)" ]; then echo "Error: GROUPS parameter is required (e.g. GROUPS=dev-team)"; exit 1; fi
	@if [ -z "$(FIREBASE_TARGET_APP_ID)" ]; then echo "Error: FIREBASE_TARGET_APP_ID is not configured for APP_ENV=$(APP_ENV)"; exit 1; fi
	cd $(MOBILE_DIR) && bun run firebase appdistribution:distribute "$(abspath $(FIREBASE_APK_PATH))" \
		--app "$(FIREBASE_TARGET_APP_ID)" \
		--groups "$(GROUPS)" \
		--release-notes "$$FIREBASE_RELEASE_NOTES" \
		--non-interactive

.PHONY: stg-mobile-firebase-distribute-dev
stg-mobile-firebase-distribute-dev: ## Distribute staging APK to dev team via Firebase
	$(MAKE) mobile-firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV)"

.PHONY: stg-mobile-firebase-distribute-all
stg-mobile-firebase-distribute-all: ## Distribute staging APK to dev and test teams via Firebase
	$(MAKE) mobile-firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV),$(FIREBASE_GROUP_TEST)"

.PHONY: prod-mobile-firebase-distribute-dev
prod-mobile-firebase-distribute-dev: ## Distribute production APK to dev team via Firebase
	$(MAKE) mobile-firebase-distribute APP_ENV=production GROUPS="$(FIREBASE_GROUP_DEV)"

# ── API Tasks (apps/api) ─────────────────────

.PHONY: api-dev
api-dev: ## Run API development server
	cd $(API_DIR) && bun run dev

.PHONY: api-dev-local
api-dev-local: api-dev ## Run API development server locally

.PHONY: api-dev-turso-local
api-dev-turso-local: ## Run API dev server against local Turso database
	cd $(API_DIR) && bun run dev:turso-local

.PHONY: api-dev-turso-remote
api-dev-turso-remote: ## Run API dev server against remote Turso database
	cd $(API_DIR) && bun run dev:turso-remote

.PHONY: api-dev-remote
api-dev-remote: api-dev-turso-remote ## Alias for api-dev-turso-remote

.PHONY: api-db-generate
api-db-generate: ## Generate Drizzle SQL migrations from schema
	cd $(API_DIR) && bunx drizzle-kit generate

.PHONY: api-db-migrate-local
api-db-migrate-local: ## Apply Drizzle migrations to local SQLite database
	cd $(API_DIR) && TURSO_DATABASE_URL="file:local.db" bunx drizzle-kit migrate

.PHONY: api-db-migrate-remote
api-db-migrate-remote: ## Apply Drizzle migrations to remote database
	cd $(API_DIR) && if [ -f .dev.vars ]; then bun --env-file=.dev.vars x drizzle-kit migrate; else bunx drizzle-kit migrate; fi

.PHONY: api-db-studio
api-db-studio: ## Launch Drizzle Studio web UI
	cd $(API_DIR) && if [ -f .dev.vars ]; then bun --env-file=.dev.vars x drizzle-kit studio; else bunx drizzle-kit studio; fi

.PHONY: stg-api-db-migrate
stg-api-db-migrate: ## Run database migrations against staging Turso database
	@if [ -z "$$TURSO_DATABASE_URL_STAGING" ] || [ -z "$$TURSO_AUTH_TOKEN_STAGING" ]; then \
		echo "ERROR: TURSO_DATABASE_URL_STAGING and TURSO_AUTH_TOKEN_STAGING must both be set"; \
		exit 1; \
	fi
	cd $(API_DIR) && TURSO_DATABASE_URL="$$TURSO_DATABASE_URL_STAGING" \
	TURSO_AUTH_TOKEN="$$TURSO_AUTH_TOKEN_STAGING" \
	bunx drizzle-kit migrate

.PHONY: prd-api-deploy
prd-api-deploy: ## Deploy API to Cloudflare Workers (production)
	cd $(API_DIR) && bun run deploy

.PHONY: stg-api-deploy
stg-api-deploy: ## Deploy API to Cloudflare Workers (staging)
	cd $(API_DIR) && bun run deploy:staging

.PHONY: api-test-e2e
api-test-e2e: check-tests-e2e ## Run API end-to-end test suite

.PHONY: api-test
api-test: check-api ## Run full verification for API workspace

.PHONY: api-typecheck
api-typecheck: ## Run typecheck for API only
	bunx turbo run typecheck --filter=@myself/api

.PHONY: shared-test
shared-test: check-shared ## Run full verification for Shared workspace

.PHONY: shared-typecheck
shared-typecheck: ## Run typecheck for Shared only
	bunx turbo run typecheck --filter=@myself/shared

.PHONY: api-docs
api-docs: ## Display local API documentation endpoints
	@echo "myself API Documentation URLs:"
	@echo "  Interactive Reference (Scalar): http://localhost:8787/reference"
	@echo "  OpenAPI 3.1 JSON Specification:  http://localhost:8787/doc"
