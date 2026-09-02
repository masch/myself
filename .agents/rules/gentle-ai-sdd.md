<!-- gentle-ai:sdd-workflow -->
# SDD Guardrails

- **Preflight Hard Gate**: Never create/edit files before collecting all 4 inputs:
  1. Mode: `interactive` | `auto`
  2. Store: `openspec` | `engram` | `hybrid`
  3. Delivery: `ask-on-risk` | `auto-chain` | `single-pr`
  4. Budget: `400` | `800` lines
- **Spec Headings**: Strictly `### Requirement: <Name>` or `### REQ-<n>: <Name>` and `#### Scenario: <Name>` (no alphanumeric tags like `REQ-MCP-01`).
- **Verify Report**: First line must open ```yaml with `schema: gentle-ai.verify-result/v1`. Counts must be exact `{completed}/{total}` matching spec totals.
<!-- /gentle-ai:sdd-workflow -->
