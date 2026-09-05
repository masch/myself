# Change Proposal: Verify MCP & Skill Integration Flow

## 1. Problem Statement

Autonomous agents require reliable context providers and procedural playbooks to execute tasks with high accuracy and zero hallucination. In this repository, context is provided through:

1. **Model Context Protocol (MCP)**: Local codebase semantic indexing (`codegraph`) and live framework documentation (`expo`).
2. **Skill Registry**: Project and ecosystem procedural playbooks located across `.agents/skills` and managed via `gentle-ai skill-registry`.

We need an auditable verification change to ensure that:

- MCP tools can be invoked lazily without initialization latency or payload truncation.
- The Skill Registry detects, refreshes, and exposes available skills (51 verified) to orchestrators and subagents.
- The entire workflow adheres to Gentle AI's native Spec-Driven Development (SDD) lifecycle constraints.

## 2. Proposed Solution

1. **Model Context Protocol Verification**:
   - Query `codegraph:codegraph_explore` to confirm deep symbol graph navigation and call resolution against `.codegraph/codegraph.db`.
   - Query `expo:read_documentation` to confirm live retrieval of versioned documentation.
2. **Skill Registry Verification**:
   - Verify registry generation and synchronization via `gentle-ai skill-registry refresh`.
   - Validate skill path resolution and discoverability in `.atl/skill-registry.md`.
3. **OpenSpec SDD Lifecycle Verification**:
   - Progress through the canonical SDD phases (`explore` -> `propose` -> `spec`/`design` -> `tasks` -> `apply` -> `verify` -> `archive`).
   - Sync intermediate states with both local file artifacts (`openspec/changes/test-mcp-flow/`) and Engram persistent memory (`sdd/test-mcp-flow/*`).
