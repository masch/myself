# Program Preview Before Enrollment

Let a user browse the steps of an open thematic cohort before joining it, so they know what kind of content they are signing up to reflect on, without answering anything.

## Specs

- **S1** — Before enrolling, the open-cohort card offers a read-only preview of the program ("Ver qué vas a reflexionar") that never answers, skips, enrolls or creates progress.
- **S2** — The preview lists every step as `Paso N` with the question text and its response type label: `Texto libre`, `Escala 1-10`, `Lista de momentos`.
- **S3** — Each step carries a collapsed `Ver el detalle del paso` that reveals the lesson video, the full preparatory text (consigna) and the step's resources.
- **S4** — The preview works for a user who is not enrolled: it reads questions, step contents and resources by theme in bulk queries, with no per-question round trip and without touching `user_theme_progress`.
- **S5** — A step that is still locked shows its unlock date as information, never as something answerable.
- **S6** — Enrollment is unaffected: the preview is read-only and its data load cannot fail the reflections screen.
- **S7** — Coverage: a component test (step list, type labels, collapsed detail, no answer action), a repository test for the bulk per-theme reads (ordered), and a browser e2e that opens the preview from the cohort card while not enrolled.

## Tasks

- [x] **T1** (S4, S7) Repository bulk reads by theme: `getProgramStepContentsForTheme` and `getStepResourcesForTheme` in the reflection port and the SQLite repository, ordered, with tests.
- [x] **T2** (S4, S6) Preview loading hook that fetches a theme's steps, contents and resources once, degrades to empty on failure, and never rejects.
- [x] **T3** (S2, S3, S5, S7) `ProgramPreviewSheet` component: step list with type labels, collapsed detail with video, consigna and resources, locked-step date, and no answer affordance.
- [x] **T4** (S1, S7) Wire the preview into the open-cohort card and the reflections screen, plus the browser e2e.
- [x] **T5** Quality gates and evidence — see below, including the scroll defect this feature's first e2e run missed and the user found on device.

## Log

- **L1** — User request, verbatim: "se podria hacer que antes de sumarse al programa uno pueda navegar entre las preguntas sin responder? así el usuarios sabe a que tipo de contenido se va a sumar a para reflexionar"
- **L2** — Product decision, user selected: how much the preview reveals — "Todo, con detalle colapsado": question and type always visible, video, consigna and resources behind "Ver el detalle del paso".
- **L3** — Branch `feat/program-preview-before-enrollment`, stacked on the closed `feat/reflection-program-reader` branch so this feature stays its own reviewable slice.
- **L4** — User report with a phone screenshot: the preview sheet shows the steps but the questions cannot be scrolled, so the expanded detail is clipped. Confirmed as a real defect: with `scrollable={false}` the shared sheet puts its children in a view with no bounded height (`maxHeight: 90%` plus `overflow: hidden` on the sheet), and a web flex child never shrinks below its content height without an explicit `minHeight: 0`, so the body was clipped instead of scrolling. The first e2e run passed only because it asserted content presence, never scrollability.
- **L5** — Work unit: `cb40df8` holds T1-T4 and the scroll fix, plus the e2e that pins it.
- **L6** — The native review of this candidate (lineage `review-450241bb4a4b982c`) closed approved with ten advisory findings. Their texts were consumed by the acknowledgement and no longer exist, so each location was read and judged on the code itself rather than on the reviewers' wording: seven were real and are fixed (per-read degrade, a degraded preview no longer cached, one bulk read per theme instead of one per question, a failed external open now tells the user, one shared response-type label helper, a single `*`/`_`/`~` inside a bare URL stays literal), and three were reported as intentional with the input tried (the link segment walk, the link-span formatting spread, the sheet's `minHeight: 0`). Removing the per-question resource read also removed a now-dead loader and its test. Still open by design: CommonMark whitespace-flanking rules are not implemented (`2 * 3 * 4` still italicizes), which is pre-existing.

## Evidence & Verification

- T1-T4 were delegated to `gentle-ai-worker` with observed red/green per task (missing repository methods, missing hook module, missing component, missing card prop), then verified by the parent.
- `@myself/shared` 88 pass / 0 fail, `@myself/api` 106 pass / 0 fail, `@myself/mobile` 457 pass / 0 fail (baseline before this feature: 444); after the advisory-finding work unit: 88 / 106 / 469, 0 fail, and the browser suite stays at 19 passed. `make check-format`, `make check-lint` and `make check-types` clean (3/3 packages).
- `make check-e2e-web`: 19 passed (1.7m), including both preview tests.
- Scroll defect: reproduced first as a failing e2e at a 390x844 viewport (`scrollHeight > clientHeight` was false on the preview body), then fixed by letting a capped sheet's content shrink (`flexShrink: 1` plus `minHeight: 0` on the shared non-scrollable sheet content and on the preview's own column and scroll view), with the same e2e now asserting the body really scrolls and the last step becomes reachable. Regression risk of touching the shared sheet was checked with the full browser suite (19/19), which drives the reflection modal and the other sheets at the default viewport.
- Read-only guarantee (S6) is pinned by a repository test asserting that reading a theme the user is not enrolled in creates no `user_theme_progress` row.
- Not covered: the repo has no React hook renderer, so the preview hook's `useEffect`/state wiring is only typechecked and linted; the tested path is the loader, its per-theme cache and its degrade-to-empty behavior. There is no dedicated phone-viewport test for the reflection modal, although the shared sheet change affects it.
- **Completion & Delivery**: all five tasks implemented and verified on branch `feat/program-preview-before-enrollment`. Push, pull request and merge remain the user's decision.
