# Exploration: Verify MCP & Skill Integration Flow

## 1. Context & Architecture

- **Repository**: `myself-monorepo` (Turborepo + Bun 1.3.14).
  - `apps/mobile`: Expo mobile application.
  - `apps/api`: Backend service.
  - `packages/shared`: Shared libraries.
- **MCP Servers Configured**:
  - `codegraph`: Local codebase indexing and semantic symbol graph over `.codegraph/codegraph.db`.
  - `expo`: Official Expo framework documentation and EAS tools (`read_documentation`, `add_library`, etc.).
- **Skills System & Registry**:
  - Registered index at `.atl/skill-registry.md` (51 skills detected across project `.agents/skills`, `~/.agents/skills`, `~/.gemini/skills`, etc.).
  - Skills include Expo mobile domain skills (`expo-router`, `expo-native-ui`, etc.) and process skills (`branch-pr`, `chained-pr`).
- **Persisted Memory**:
  - `engram`: CLI v1.20.0 running with project `myself`.

## 2. Exploration Discoveries

1. **Codegraph Exploration**: Verified that `codegraph:codegraph_explore` queries the local SQLite index and resolves project symbols and calls across the monorepo.
2. **Expo Documentation MCP**: Verified that `expo:read_documentation` fetches up-to-date documentation on demand.
3. **Skill Verification**: Verified that `gentle-ai skill-registry refresh` scans and indexes all available project and user skills into `.atl/skill-registry.md`.
4. **Gentle AI SDD Dispatcher**: `gentle-ai sdd-status` natively tracks OpenSpec state changes under `openspec/changes/`.
