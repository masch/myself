# Personal Reflections Specification

## Purpose

Defines user reflection journaling, personal response persistence (text and scale 1-10), skip rationale tracking, edit/catch-up window enforcement, cohort enrollment, routine question opt-out, ad-hoc pinning, and thematic cycle progression.

## Requirements

### Requirement: Personal Reflection Submission (Text vs Scale 1-10)

The system MUST capture and persist a user's personal response to an identified reflection question according to its configured `response_type`. For `text`, it captures written text; for `scale_1_10`, it captures strictly an integer between 1 and 10 without text.

#### Scenario: Submit a written text reflection

- GIVEN an active reflection question with `response_type = 'text'`
- WHEN the user submits reflection text
- THEN the system MUST save the reflection with `status = 'answered'`, populating `content` and leaving `numeric_value` null

#### Scenario: Submit a numeric scale reflection

- GIVEN an active reflection question with `response_type = 'scale_1_10'`
- WHEN the user selects score 8 and submits
- THEN the system MUST save the reflection with `status = 'answered'`, populating `numeric_value = 8` and leaving `content` null

#### Scenario: Reject blank text submission

- GIVEN an active question with `response_type = 'text'`
- WHEN the user attempts to submit empty or whitespace-only text
- THEN the system MUST reject the submission and display a validation error

### Requirement: Routine Opt-Out and Ad-hoc Shortcuts

The system MUST allow users to unsubscribe/deactivate any pre-suggested daily routine question, and pin on-demand (ad-hoc) questions as quick shortcuts in their daily view.

#### Scenario: Opt out of a suggested daily reflection

- GIVEN a daily question suggested by default
- WHEN the user chooses to unsubscribe/deactivate the routine
- THEN the system MUST persist the preference, remove the question from future daily queues, and cancel any associated notification

#### Scenario: Pin ad-hoc question as shortcut

- GIVEN an on-demand question in the library
- WHEN the user pins the question as a shortcut
- THEN the system MUST display the question in the "En este momento" quick-access bar in their daily view

### Requirement: Skip with Mandatory Reason

The system MUST allow users to skip an active question only upon providing a mandatory textual reason, recording the item as `skipped` without completing it.

#### Scenario: Skip a prompt with reason

- GIVEN an active question in a thematic program
- WHEN the user enters reason "Not applicable to my situation today" and confirms skip
- THEN the system MUST record the entry with `status = 'skipped'` and the provided `skip_reason`, advancing to the next step

#### Scenario: Re-attempt previously skipped prompt

- GIVEN a program with a previously skipped question while the cycle is still active
- WHEN the user navigates back to the skipped question and submits a valid response
- THEN the system MUST update the entry to `status = 'answered'`, clear the skip reason, and increment the answered count

### Requirement: Configurable Grace, FIFO Backlog, and Relative Deadline Labels

The system MUST enforce system-configured window constraints for catching up on missed daily questions and editing past reflections. Missed questions within the grace window MUST be ordered chronologically (FIFO: oldest date first, Earliest Deadline First) and presented using dynamic, human-friendly relative labels indicating impending expiration (e.g., "Ayer", "Anteayer · Vence hoy", "Hace N días · Vence hoy") instead of leaking raw database ISO dates.

#### Scenario: Catch up on a missed daily question within grace window

- GIVEN daily questions missed 2 days ago and 1 day ago, with a system catch-up window of 2 days
- WHEN the user views the catch-up queue
- THEN the system MUST display the oldest question first with label "Anteayer · Vence hoy", followed by "Ayer"
- AND questions older than 2 days MUST expire and disappear from the queue

#### Scenario: Edit reflection within allowed window

- GIVEN a reflection submitted 1 day ago and a system edit window of 3 days
- WHEN the user updates their reflection
- THEN the system MUST persist the updated reflection content or score

### Requirement: Macro-Block Queue Organization and Answered Archive

The system MUST segregate the daily reflection view into distinct macro-blocks: "Por Responder" for pending/missed questions and "Respondidas Hoy" for reflections completed today.

#### Scenario: Hide completed cards behind archive toggle

- GIVEN an answered reflection rendered in "Respondidas Hoy"
- WHEN the user toggles off "Mostrar respondidas"
- THEN the completed cards MUST be collapsed/hidden from the queue
- AND when toggled back on, completed cards MUST reappear displaying their submitted answers without redundant check badges

### Requirement: Cohort Enrollment, Start Date Guard, and Cycle Progression

The system MUST track a user's enrollment into a specific Theme Cohort (`THEME_COHORTS`), guard premature submissions before `programStartDate`, advance progress through the question set, mark cycles as completed upon finishing all steps, and preserve completed cohorts in active program views.

#### Scenario: Guard cohort prompt before program start date

- GIVEN a user enrolled in a cohort starting on 2026-09-15, and the current date is 2026-09-13
- WHEN the user views active programs
- THEN the system MUST display "El programa comienza el 15/09" and lock the prompt from submission until the start date is reached

#### Scenario: Complete thematic cycle and retain in active programs

- GIVEN a 7-day program where all 7 steps are answered
- WHEN the final step is submitted
- THEN the system MUST mark the cycle run as `status = 'completed'` (100% progress)
- AND retain the cohort in the active view displaying "¡Ciclo Completado!" and the archive of all 7 completed step cards

#### Scenario: Re-run a program across different cohorts

- GIVEN a user who previously completed cohort #1 of "Stoic Resilience"
- WHEN the user joins a newly opened cohort #2
- THEN the system MUST create a new progress record linked to cohort #2, preserving the completed cohort #1 record in historical archives

### Requirement: Functional Input Validation and Reload Persistence

The system MUST functionally enforce input constraints across all entry points, rejecting invalid submissions, and ensuring all data persists across full application reloads.

#### Scenario: Reject empty or whitespace-only reflection text

- GIVEN a text reflection modal
- WHEN the user leaves the input blank or fills only whitespace (" ")
- THEN the "Guardar" action MUST remain disabled and prevent submission

#### Scenario: Require numeric selection for scale questions

- GIVEN a scale 1-10 reflection modal
- WHEN no numeric score is selected
- THEN the "Guardar" action MUST remain disabled and prevent submission

#### Scenario: Require reason before skipping

- GIVEN a skip reason sheet
- WHEN no preset chip is selected and no reason text is entered
- THEN the "Saltear" action MUST remain disabled and prevent confirmation

#### Scenario: Survive hard page reload from local SQLite storage

- GIVEN a user who answered or skipped a daily or cohort reflection
- WHEN the application performs a complete page reload (`page.reload()`) destroying in-memory React state
- THEN the system MUST reload data from SQLite and render the exact submitted answers and progress in the UI
