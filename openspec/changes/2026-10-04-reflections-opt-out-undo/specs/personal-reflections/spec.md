# Personal Reflections Specification Extension

## Purpose

Extends personal reflections management to support immediate undo when opting out of daily routine prompts, as well as browsing and reactivating paused routine questions from the Daily Queue screen.

## Requirements

### Requirement: Routine Opt-Out Immediate Undo

The system MUST provide an immediate undo opportunity via a Toast notification when a user chooses to opt out of a daily routine question.

#### Scenario: Undo opt-out from toast

- GIVEN an active daily routine question in the Daily Queue (`Cola Diaria`)
- WHEN the user taps "Bajar" to opt out
- THEN the system MUST set `is_enabled = false` for the question preference
- AND the system MUST display a Toast with message `"Pregunta dada de baja de tu rutina"` and action `"Deshacer"`
- AND WHEN the user taps `"Deshacer"` within the toast duration
- THEN the system MUST restore `is_enabled = true` and return the question to the active daily queue

### Requirement: Paused Routine Questions Recovery

The system MUST allow users to view, manage, and reactivate previously opted-out routine questions in the Daily Queue screen.

#### Scenario: Display paused routine questions in collapsible section

- GIVEN one or more daily routine questions with `is_enabled = false`
- WHEN the user views the `Cola Diaria` tab
- THEN the system MUST render a collapsible section titled `"Preguntas pausadas"` indicating the count of paused questions
- AND WHEN the section is expanded
- THEN the system MUST render each paused question in a `PromptCard` showing a `"Reactivar"` action

#### Scenario: Reactivate a paused routine question

- GIVEN an expanded `"Preguntas pausadas"` section with an opted-out question
- WHEN the user taps `"Reactivar"`
- THEN the system MUST update `user_question_preferences` setting `is_enabled = true`
- AND the system MUST reschedule any preferred time local notification
- AND the system MUST move the question back to the active routine queue
- AND the system MUST show a confirmation Toast indicating `"Pregunta reactivada en tu rutina"`
