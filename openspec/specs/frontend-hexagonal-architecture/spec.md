# Capability: Frontend Hexagonal Architecture

## 1. Overview

The Frontend Hexagonal Architecture establishes strict layering inside `apps/mobile`: Presentation (Screens), Application (Custom Hooks & TanStack Query), Domain (Ports), and Infrastructure (Adapters). Screens and UI components are decoupled from persistence and networking.

## 2. Requirements & Scenarios

### REQ-1: Domain Port Contracts

- The reading feature SHALL define domain repository ports (`IReadingRepository`) inside `src/features/readings/domain/`.
- The port contract SHALL define operations: `getAll(locale: string): Promise<Reading[]>`, `getById(id: string): Promise<Reading | null>`, `save(reading: Reading): Promise<void>`, `recordLog(readingId: string): Promise<string>`.
- Port interfaces SHALL NOT import React hooks, component types, or network libraries.

#### Scenario: Mock repository for unit tests

- **Given** an automated test suite for mobile
- **When** initializing `useReadings` with an in-memory `MockReadingRepository`
- **Then** the test SHALL execute hermetically without requiring SQLite or network requests.

### REQ-2: Application Layer TanStack Query Integration

- `apps/mobile` SHALL configure a global `QueryClientProvider` in `src/app/_layout.tsx`.
- Feature hooks (such as `useReadings`) SHALL wrap domain port operations using `useQuery` and `useMutation`.
- UI screens in `src/app/` SHALL consume ONLY the feature hooks, never importing `IReadingRepository` adapters, SQLite, or Hono client directly.

#### Scenario: UI rendering via useReadings hook

- **Given** `MeditationScreen` mounted
- **When** `useReadings` executes `useQuery`
- **Then** the screen receives `{ readings, isLoading, isError, refreshReadings }` without knowledge of data origin.
