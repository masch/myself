# Design: MCP & Skill Integration Architecture

## 1. System Topology

The integration connects agent runtime capabilities to external and local knowledge sources:

```
┌─────────────────────────────────────────────────────────────┐
│                      Gentle AI Agent                        │
└───────┬──────────────────────┬──────────────────────┬───────┘
        │                      │                      │
        │ call_mcp_tool        │ gentle-ai CLI        │ FS / Memory
        ▼                      ▼                      ▼
┌──────────────────┐   ┌──────────────────┐   ┌───────────────┐
│   MCP Servers    │   │  Skill Registry  │   │ SDD Artifacts │
├──────────────────┤   ├──────────────────┤   ├───────────────┤
│ codegraph (db)   │   │ .atl/            │   │ openspec/     │
│ expo (docs API)  │   │  skill-registry  │   │ Engram (#id)  │
└──────────────────┘   └──────────────────┘   └───────────────┘
```

## 2. Component Design

### 2.1 MCP Servers Layer

- **`codegraph`**:
  - Transport: stdio MCP interface.
  - Data source: local SQLite `.codegraph/codegraph.db`.
  - Operations: AST symbol resolution, dependency call graphs, blast radius calculation.
- **`expo`**:
  - Transport: stdio MCP interface.
  - Operations: Dynamic documentation page scraping, framework reference retrieval.

### 2.2 Skill Registry Layer

- Source locator: scans `.agents/skills`, `~/.agents/skills`, `~/.config/opencode/skills`, and `~/.gemini/skills`.
- Canonical output: `.atl/skill-registry.md` mapping skill names to their full markdown specifications.
- Consumption: Orchestrator reads the registry and forwards relevant skill paths to subagents.

### 2.3 SDD Verification Pipeline

- State machine enforced by `gentle-ai sdd-status`.
- Progress checkpoints stored as local Markdown and persisted to Engram topics.
- Attempt accounting governed by `gentle-ai sdd-attempt acquire` and `settle`.
