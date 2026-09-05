<!-- gentle-ai:sdd-workflow -->

# SDD Guardrails & Workflow

- **Trigger `/sdd-new <change>`**:
  1. Enforce Preflight Hard Gate immediately.
  2. Run exploration (`explore.md` / engram) and present summary to user.
  3. Generate proposal (`proposal.md` / engram), present summary, and pause for user approval before moving to specs/design.
- **Preflight Hard Gate**: Never create/edit files before collecting all 4 inputs:
  1. Mode: `interactive` | `auto`
  2. Store: `openspec` | `engram` | `hybrid`
  3. Delivery: `ask-on-risk` | `auto-chain` | `single-pr`
  4. Budget: `400` | `800` lines
- **Spec Headings**: Strictly `### Requirement: <Name>` or `### REQ-<n>: <Name>` and `#### Scenario: <Name>` (no alphanumeric tags like `REQ-MCP-01`).
- **Verify Report**: First line must open ```yaml with `schema: gentle-ai.verify-result/v1`. Counts must be exact `{completed}/{total}` matching spec totals.

<!-- /gentle-ai:sdd-workflow -->
