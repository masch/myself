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
