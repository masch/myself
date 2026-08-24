EAS_CLI_VERSION ?= 20.1.0

# Dependencies
.PHONY: install
install:
	bun install --frozen-lockfile

# Start Expo dev server normally
.PHONY: start
start:
	bunx expo start

# Start Expo dev server with MCP server enabled for agent tools & inspection
.PHONY: start-mcp
start-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start

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

.PHONY: check
check: lint typecheck

# Build & Export
.PHONY: export-web
export-web:
	bunx expo export --platform web

# Complete CI validation pipeline
.PHONY: ci
ci: install check export-web

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

# ── Android & Firebase Distribution ─────────

.PHONY: eas-build-android-preview
eas-build-android-preview: eas-whoami ## Build APK via EAS Cloud
	bunx eas-cli@$(EAS_CLI_VERSION) build -p android --profile preview --wait

.PHONY: eas-build-android-preview-local
eas-build-android-preview-local: eas-whoami ## Build APK locally inside runner/machine
	bunx eas-cli@$(EAS_CLI_VERSION) build -p android --profile preview --local $(if $(OUTPUT_APK),--output="$(OUTPUT_APK)")

.PHONY: firebase-distribute
firebase-distribute: ## Upload APK to Firebase App Distribution (Requires: GROUPS, FIREBASE_APP_ID, APK_PATH)
	@if [ -z "$(GROUPS)" ]; then echo "Error: GROUPS parameter is required (e.g. GROUPS=dev-team)"; exit 1; fi
	@if [ -z "$(FIREBASE_APP_ID)" ]; then echo "Error: FIREBASE_APP_ID is required"; exit 1; fi
	@if [ -z "$(APK_PATH)" ]; then echo "Error: APK_PATH is required (e.g. APK_PATH=myself.apk)"; exit 1; fi
	bunx firebase-tools appdistribution:distribute "$(APK_PATH)" \
		--app "$(FIREBASE_APP_ID)" \
		--groups "$(GROUPS)" \
		$(if $(RELEASE_NOTES),--release-notes "$(RELEASE_NOTES)") \
		--non-interactive
