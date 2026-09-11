# Delta for meditation-session

## MODIFIED Requirements

### REQ-1: Domain Contract Decoupling

- The presentation layer (`src/app/(tabs)/meditation.tsx`) and the custom hook (`src/hooks/use-meditation.ts`) SHALL interact exclusively with `IMeditationSessionService` for session timing, audio, and foreground services.
- The retrieval of meditation readings and logs in `src/app/(tabs)/meditation.tsx` SHALL interact exclusively with the new `useReadings` hook backed by `IReadingRepository` port, without direct access to `useSQLiteContext` or `src/db/database.ts`.
- (Previously: Hook and screen interacted with legacy direct database helper functions in database.ts).

#### Scenario: Meditation screen reading catalog consumption

- **Given** `MeditationScreen` renders the reading catalog
- **When** displaying the list of readings or logging a completion
- **Then** all data interactions SHALL execute through `useReadings`, completely decoupled from raw database calls.
