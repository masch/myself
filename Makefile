EAS_CLI_VERSION ?= 20.1.0

# Dependencies
.PHONY: install
install:
	bun install --frozen-lockfile

# Start Expo dev server normally
.PHONY: start
start:
	bunx expo start -c

# Start Expo dev server with MCP server enabled for agent tools & inspection
.PHONY: start-mcp
start-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start -c

# Platform shortcuts with MCP enabled
.PHONY: android-mcp
android-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --android

.PHONY: ios-mcp
ios-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --ios

.PHONY: web-mcp
web-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --web

# Platform shortcuts (normal)
.PHONY: android
android:
	bunx expo start --android

.PHONY: ios
ios:
	bunx expo start --ios

.PHONY: web
web:
	bunx expo start --web

# Authentication
.PHONY: expo-login
expo-login:
	bunx expo whoami || bunx expo login

.PHONY: expo-whoami
expo-whoami:
	bunx expo whoami

# Quality checks
.PHONY: lint
lint:
	bunx expo lint

.PHONY: typecheck
typecheck:
	bunx tsc --noEmit

.PHONY: format
format:
	bunx prettier --write .

.PHONY: test
test:
	bun test

.PHONY: test-coverage
test-coverage:
	bun test --coverage

.PHONY: check
check: lint typecheck test

# Build & Export
.PHONY: export-web
export-web:
	bunx expo export --platform web

# Complete CI validation pipeline
.PHONY: ci
ci: install check export-web

.PHONY: expo-doctor
expo-doctor: ## Run Expo Doctor to verify dependency compatibility
	APP_VERSION_NAME="$(APP_VERSION_NAME)" bunx expo-doctor

# ── EAS Deploy ───────────────────────────────

.PHONY: eas-whoami
eas-whoami: ## Verify EAS authentication (uses EXPO_TOKEN from .env or CI)
	bunx eas-cli@$(EAS_CLI_VERSION) whoami

.PHONY: eas-list
eas-list: ## List recent EAS builds
	bunx eas-cli@$(EAS_CLI_VERSION) build:list

.PHONY: eas-init
eas-init: ## Initialize EAS for this project (first-time setup)
	bunx eas-cli@$(EAS_CLI_VERSION) init

.PHONY: eas-staging-build-web
eas-staging-build-web: eas-whoami ## Export web app and deploy to EAS Hosting staging (alias: staging)
	export APP_ENV=staging APP_VERSION_NAME="$(APP_VERSION_NAME)" EXPO_PUBLIC_API_URL="$(API_STAGING_URL)" && bunx expo export --clear --platform web && bunx eas-cli@$(EAS_CLI_VERSION) deploy --alias staging

.PHONY: eas-prod-build-web
eas-prod-build-web: eas-whoami ## Export web app and deploy to EAS Hosting production
	bunx expo export --clear --platform web && bunx eas-cli@$(EAS_CLI_VERSION) deploy --prod

# ── Android Build ────────────────────────────

.PHONY: eas-build-android-preview-local
eas-build-android-preview-local: eas-whoami ## Build APK locally inside runner/machine
	bunx eas-cli@$(EAS_CLI_VERSION) build -p android --profile preview --local $(if $(OUTPUT_APK),--output="$(OUTPUT_APK)")

# ── Firebase App Distribution ────────────────

# Firebase project App IDs by environment
FIREBASE_APP_ID_PRODUCTION ?=
FIREBASE_APP_ID_STAGING    ?= 1:543613646622:android:d91f7c9d1dd74b3060fb0f

# Dynamic App ID lookup based on APP_ENV (defaults to staging)
APP_ENV ?= staging
ifeq ($(APP_ENV),production)
  FIREBASE_TARGET_APP_ID := $(FIREBASE_APP_ID_PRODUCTION)
else
  FIREBASE_TARGET_APP_ID := $(FIREBASE_APP_ID_STAGING)
endif

# Service account key path — auto-sets GOOGLE_APPLICATION_CREDENTIALS if file exists
FIREBASE_SA_KEY_PATH ?= firebase-sa-key.json
ifneq ($(wildcard $(FIREBASE_SA_KEY_PATH)),)
export GOOGLE_APPLICATION_CREDENTIALS := $(abspath $(FIREBASE_SA_KEY_PATH))
endif

# APK path — auto-picks the newest apk found
FIREBASE_APK_PATH ?= $(shell ls -t myself-*.apk build-*.apk android/app/build/outputs/apk/release/*.apk 2>/dev/null | head -1)

# Firebase App Distribution groups
FIREBASE_GROUP_DEV  := dev-team
FIREBASE_GROUP_TEST := test-team

# Release notes — dynamically generates list of the last 3 commit messages
FIREBASE_RELEASE_NOTES_CMD = $$(git log -3 --pretty=format:'- %s' 2>/dev/null | tr -d '\"'\''')
FIREBASE_RELEASE_NOTES ?= $(FIREBASE_RELEASE_NOTES_CMD)

.PHONY: firebase-login-ci
firebase-login-ci: ## Firebase CI login — generates a token for FIREBASE_TOKEN
	bunx firebase-tools login:ci

.PHONY: firebase-distribute
firebase-distribute: ## Upload APK to Firebase App Distribution. Requires: GROUPS. Optional: APP_ENV (staging|production), FIREBASE_RELEASE_NOTES
	@if [ -z "$(GROUPS)" ]; then echo "Error: GROUPS parameter is required (e.g. GROUPS=dev-team)"; exit 1; fi
	@if [ -z "$(FIREBASE_TARGET_APP_ID)" ]; then echo "Error: FIREBASE_TARGET_APP_ID is not configured for APP_ENV=$(APP_ENV)"; exit 1; fi
	bunx firebase-tools appdistribution:distribute "$(abspath $(FIREBASE_APK_PATH))" \
		--app "$(FIREBASE_TARGET_APP_ID)" \
		--groups "$(GROUPS)" \
		--release-notes "$$FIREBASE_RELEASE_NOTES" \
		--non-interactive

# ── Staging distribution shortcuts ───────────

.PHONY: firebase-distribute-staging-dev
firebase-distribute-staging-dev: ## [staging] Upload APK to dev-team group
	$(MAKE) firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV)"

.PHONY: firebase-distribute-staging-all
firebase-distribute-staging-all: ## [staging] Upload APK to dev-team + test-team
	$(MAKE) firebase-distribute APP_ENV=staging GROUPS="$(FIREBASE_GROUP_DEV),$(FIREBASE_GROUP_TEST)"

# ── Production distribution shortcuts ────────

.PHONY: firebase-distribute-prod-dev
firebase-distribute-prod-dev: ## [production] Upload APK to dev-team group
	$(MAKE) firebase-distribute APP_ENV=production GROUPS="$(FIREBASE_GROUP_DEV)"
