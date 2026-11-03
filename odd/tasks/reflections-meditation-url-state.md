# Reflections and Meditation in the Address

## Objective

Extend the address-as-source-of-truth from the gondola to the two screens the user asked for: the reflections section and the program it previews, and the reading a meditation session is showing. Both come through **one** implementation — the gondola's mechanism extracted into a shared hook — so the rule that keeps the sync honest exists once.

## Specs

- **S1** — The user asked, verbatim: _"reflections y las lectures de meditacion"_ — those two screens, not the others the inventory listed.
- **S2** — The user asked how sharing a meditation text concretely works, verbatim: _"pero si quisiera compartir el texto de la meditacion del día X o compartir un texto de meditacion, como funcionaria?"_. The answer is in the data: `Reading` (`packages/shared/src/modules/readings/domain/reading.entity.ts:19-25`) has no day and no order, and nothing maps a day to a reading, so a shared link names a **reading id**, never a day. A `?dia=5` link would resolve against the receiver's own unread-first pool and show a different text.
- **S3** — The user accepted starting after #122 merged, verbatim: _"megeado"_.
- **S4** — One implementation. The gondola keeps its five browser specs and must not need them edited; the refactor is proved by behaviour that does not move.
- **S5** — The reflections address is `?seccion=cohorts&cohorte=<id>`: opening a program is what deserves its own history entry, so back closes the preview and keeps the section. An id the device does not know opens the section with no sheet and no error.
- **S6** — The meditation address is `?lectura=<id>`, the reading's identity, never the offset into the unread-first list.
- **S7** — An address that names something the device has not loaded yet is retried, not dropped, and the write side stays quiet until it resolves: canonicalising the view would remove the very parameter the link is still resolving.

## Tasks

- [x] **TASK-1**: Extract `useUrlViewState` and migrate the gondola to it (S4).
- [x] **TASK-2**: Reflections codec, wiring and pins (S5).
- [x] **TASK-3**: Meditation codec, wiring and pins (S6).
- [x] **TASK-4**: Browser specs for both screens, including the pending-resolution case (S7).
- [x] **TASK-5**: Close: `make check` and the full `make check-e2e-web`.

## Evidence & Verification

- **TASK-1** — `apps/mobile/src/hooks/use-url-view-state.ts` holds what the gondola encoded: the navigation-readiness gate, one entry per thing that starts, `setParams` for adds and updates, `replaceState` for removals, and the two ways a write can bounce back as an apply. The gondola becomes a thin caller with a codec. **Its 11 browser specs pass untouched**, which is the whole argument for the refactor.
- **TASK-2** — `reflections-view-params.ts` with 10 pins and 5 browser specs. Two findings came out of the browser side and both belong to the shared hook, not to the screen: a link can name a program before the device has loaded its database, so `onApply` now answers "not yet" (returning `false`) and the same address is offered again on the next render; and while that resolution is pending the write side must stay quiet — before that, canonicalising the view removed the `cohorte` the link was still resolving, which the **reload** spec caught (`the address reproduces the open program on reload`).
- **TASK-3** — `meditation-view-params.ts` with 9 pins and 3 browser specs. The wiring resolves the id to an index in the unread-first list, which is why the id and not the offset is the shareable identity (S2). The unknown-id spec forced a second hook correction: the "do not echo an applied address back" shortcut was too strong — when the screen **rejects** what the address asked for, the address has to be rewritten, so the shortcut is gone and the write side simply writes what is on screen.
- **TASK-4** — `e2e/reflections-url-state.spec.ts` (5) and `e2e/meditation-url-state.spec.ts` (3), plus the gondola's 5, all green in one run: **13 passed (54s)**.
- **TASK-5** — `make check-tests` (mobile 661 pass), `check-types`, `check-lint`, `check-format` and the full `make check-e2e-web`: see the delivery note. Not covered by any spec, and recorded instead: on the web the storage layer allows **one tab per origin** — a second tab fails with `NoModificationAllowedError: ... createSyncAccessHandle`. That is why "sharing" is proved by a reload rather than by a second tab, and it is filed as its own defect. The programs and readings live in the device's own SQLite database, so a shared link reproduces the view on a device that knows the item and degrades to opening the screen on one that does not.
- **Completion & Delivery**: Complete on branch `feat/reflections-meditation-url-state` as work-unit commits: the extraction with the gondola migrated (and its specs untouched), the reflections unit, the meditation unit, and this document. Out of scope on purpose: the native hardware back button (it needs a `BackHandler`), the other screens the inventory ruled out (`settings`, `barter-inbox`, the meditation timer), and `showAnswered`/`showPaused` in reflections, which are list toggles kept local. Push, PR and merge stay the user's decisions.

## Log

- **L1** — _"reflections y las lectures de meditacion"_ (the two screens this covers).
- **L2** — _"pero si quisiera compartir el texto de la meditacion del día X o compartir un texto de meditacion, como funcionaria?"_ (the question that fixed the identity: no day exists, so the link names the reading).
- **L3** — _"megeado"_ (start after #122).
- **L4** — The second tab crashing with `NoModificationAllowedError` while writing the reload spec; filed separately, not fixed here.
