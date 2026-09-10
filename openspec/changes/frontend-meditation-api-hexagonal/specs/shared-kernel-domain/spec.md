# Capability: Shared Kernel Domain

## 1. Overview

The Shared Kernel Domain defines the core business entities, invariants, and validation rules in `@myself/shared/src/domain`. These models are pure TypeScript abstractions shared identically by `apps/api` and `apps/mobile`, preventing duplication of business logic.

## 2. Requirements & Scenarios

### REQ-1: Shared Entity Abstractions

- The system SHALL define `Reading`, `Author`, and `User` domain entities inside `@myself/shared/src/domain/entities/`.
- Domain entities SHALL NOT import React, React Native, SQLite, Drizzle, or Hono runtime APIs.
- Domain entities SHALL encapsulate business invariants and expose immutable accessors for domain properties.

#### Scenario: Instantiating Reading entity across platforms

- **Given** a valid payload matching `ReadingProps`
- **When** instantiated in either `apps/api` or `apps/mobile` via `new Reading(props)`
- **Then** the instance SHALL provide identical getters (`id`, `authorId`, `createdAt`, `readDates`, `translations`) across both environments.

### REQ-2: Business Methods & Domain Invariants

- The `Reading` entity SHALL provide domain logic methods (such as checking if a reading was completed today or extracting translations by locale).
- Any invalid domain state SHALL throw typed domain errors defined in `@myself/shared/src/domain/errors/`.

#### Scenario: Formatting translations by requested locale

- **Given** a `Reading` instance with translations for `es` and `en`
- **When** calling `reading.getTranslation("es")`
- **Then** it SHALL return the Spanish translation, falling back to default if not available.
