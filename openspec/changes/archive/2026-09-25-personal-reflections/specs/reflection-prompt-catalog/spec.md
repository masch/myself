# Reflection Prompt Catalog Specification

## Purpose

Defines the structure, categorization, periodicity rules, response types, seed system parameters, notification scheduling, and thematic cohort convocatorias for pre-configured reflection questions and programs.

## Requirements

### Requirement: Categorized Prompts

The system MUST associate each reflection question with a primary category for taxonomy and filtering.

#### Scenario: Group prompts by category

- GIVEN pre-configured questions belonging to categories "Stoicism" and "Gratitude"
- WHEN a user views the prompt catalog filtered by "Stoicism"
- THEN the system MUST return only questions mapped to "Stoicism"

### Requirement: Response Formats (Text vs Scale 1-10)

The system MUST define a `response_type` for each question: either open reflection text (`text`) or a numeric score scale from 1 to 10 (`scale_1_10`).

#### Scenario: Numeric scale question configuration

- GIVEN a question "On a scale of 1 to 10, how aligned were your actions with your values today?"
- WHEN the question metadata is inspected
- THEN the system MUST define `response_type = 'scale_1_10'`

### Requirement: Periodicity and Scheduling Rules

The system MUST support question periodicities: `daily`, `weekly`, `monthly`, and `ad_hoc` ("actual"), and associate a preferred time of day for routine surfacing.

#### Scenario: Filter questions for unified daily queue

- GIVEN a catalog with daily, weekly, and ad-hoc questions
- WHEN the system populates the daily reflection queue
- THEN the system MUST include all daily questions and active program steps scheduled for the current date

### Requirement: Thematic Question Programs & Cycle Definition

The system MUST allow bundling a designated set of questions under a Theme, defining a target count of $X$ questions needed to complete the thematic cycle, along with system-level parameters for grace windows.

#### Scenario: Retrieve theme cycle definition

- GIVEN a theme titled "7 Days of Stoic Resilience" containing 7 questions with a 2-day catch-up window
- WHEN the theme details are retrieved
- THEN the system MUST return the theme with target question count of 7, its ordered questions, and the defined system constraints

### Requirement: Thematic Cohorts

The system MUST support creating multiple distinct Cohorts (`THEME_COHORTS`) for any given theme, defining enrollment windows and program start dates.

#### Scenario: List active cohorts

- GIVEN a theme with past cohorts and one active cohort open for enrollment starting on a target date
- WHEN the user views the theme details
- THEN the system MUST display the open cohort with its enrollment period and start date, allowing the user to join

### Requirement: Local Notification Scheduling

The system MUST support scheduling local push notifications at the question's configured preferred time of day when OS permissions are granted.

#### Scenario: Schedule notification for morning reflection

- GIVEN a daily reflection question configured for 08:00
- WHEN the user enables reflection reminders
- THEN the system MUST schedule a recurring local notification for 08:00 with the prompt preview
