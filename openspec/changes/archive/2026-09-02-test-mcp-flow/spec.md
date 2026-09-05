# Change Specification: MCP & Skill Integration Flow

## 1. Requirements

### REQ-01: Lazy Tool Resolution

The AI assistant SHALL resolve and invoke lazy-loaded MCP tools via `call_mcp_tool` across registered MCP servers (`codegraph`, `expo`) without manual process intervention.

#### Scenario: Lazy invocation of MCP tools

- GIVEN registered MCP servers in the environment
- WHEN `call_mcp_tool` is invoked for a lazy tool
- THEN the tool executes and returns valid payload

### REQ-02: Codebase Semantic Indexing

The `codegraph:codegraph_explore` tool SHALL execute against `.codegraph/codegraph.db` and return symbol definitions, dependencies, and file relationships.

#### Scenario: Querying codegraph AST

- GIVEN a valid local `.codegraph` index
- WHEN `codegraph:codegraph_explore` is executed
- THEN AST symbol definitions and references are returned

### REQ-03: Documentation Ingestion

The `expo:read_documentation` tool SHALL retrieve live, version-accurate documentation markdown given a valid target URL.

#### Scenario: Fetching live Expo docs

- GIVEN a valid Expo documentation URL
- WHEN `expo:read_documentation` is called
- THEN clean markdown content is returned without truncation

### REQ-04: Skill Registry Discoverability

The system SHALL support generating and refreshing `.atl/skill-registry.md` via `gentle-ai skill-registry refresh`, identifying available project and ecosystem skills.

#### Scenario: Refreshing skill registry

- GIVEN skills installed across configured system paths
- WHEN `gentle-ai skill-registry refresh` is executed
- THEN all skills are indexed in `.atl/skill-registry.md`

### REQ-05: Native SDD State Progression

The `gentle-ai sdd-status` CLI SHALL report consistent transitions across `explore`, `propose`, `spec`, `design`, `tasks`, `apply`, `verify`, and `archive` phases without state corruption.

#### Scenario: Verified status progression

- GIVEN an active OpenSpec change
- WHEN each SDD phase produces canonical artifacts
- THEN `gentle-ai sdd-status` transitions state deterministically
