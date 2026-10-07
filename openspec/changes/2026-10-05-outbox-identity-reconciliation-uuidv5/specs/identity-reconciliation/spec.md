# Spec: Identity Reconciliation with Deterministic UUID v5

## Capability: `identity-reconciliation`

### Requirement: Deterministic Author ID Derivation

The system MUST generate identical, valid RFC4122 UUID v5 identifiers for any author entity given the same normalized name, regardless of where or when the generation occurs (client or server).

#### Scenario: Author name normalization and idempotency

- **Given** two inputs `"Marcus Aurelius"` and `"   marcus   aurelius   "`
- **When** generating the author ID using `generateAuthorId`
- **Then** both inputs yield the exact same UUID v5 string
- **And** the generated ID conforms to the `entityIdSchema` format.

#### Scenario: Cross-platform identity agreement

- **Given** an author created offline on Mobile with name `"Epictetus"`
- **When** the author is created or matched on Backend API with name `"Epictetus"`
- **Then** the Backend generates or confirms the exact same identifier as the Mobile client.
