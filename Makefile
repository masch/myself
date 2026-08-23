.PHONY: start start-mcp android ios web lint typecheck

# Start Expo dev server normally
start:
	bunx expo start

# Start Expo dev server with MCP server enabled for agent tools & inspection
start-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start

# Platform shortcuts with MCP enabled
android-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --android

ios-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --ios

web-mcp:
	EXPO_UNSTABLE_MCP_SERVER=1 bunx expo start --web

# Platform shortcuts (normal)
android:
	bunx expo start --android

ios:
	bunx expo start --ios

web:
	bunx expo start --web

# Quality checks
lint:
	bunx expo lint

typecheck:
	bunx tsc --noEmit
