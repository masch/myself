# A web second tab explains the database lock instead of crashing

Issue: [#125](https://github.com/masch/myself/issues/125). Strategy chosen by the user: the cheap one — detect the access handle failure and answer with a screen plus a retry, not tab coordination and not a new persistence backend.

## Objective

On web, `expo-sqlite` keeps its persisted database in OPFS, whose synchronous access handles are exclusive per file and per origin. The second tab of the same origin therefore cannot open the database, and until now that failure reached the router error boundary: the tab rendered `NoModificationAllowedError: Failed to execute 'createSyncAccessHandle'…` and nothing recovered it. The failure becomes an explanation with a retry, so closing the other tab and pressing retry gives the second tab the app.

## Specs

- **S1** — The user asked, verbatim: _"Quiero atacar #125 (el segundo tab del navegador revienta por OPFS) con la estrategia barata: detectar el fallo del access handle y mostrar "ya está abierta en otra pestaña" con reintento."_
- **S2** — #125 acceptance criteria, verbatim: _"Opening the app in a second tab renders either a clear "already open in another tab" screen with a retry, or a working second tab — never the error boundary."_
- **S3** — #125 acceptance criteria, verbatim: _"Closing the first tab and pressing retry in the second lets it take over."_
- **S4** — #125 acceptance criteria, verbatim: _"An e2e spec opens two pages of one context and asserts the second page shows that screen instead of the error."_
- **S5** — #125 out of scope, verbatim: _"Changing the persistence backend or the local-first architecture."_, _"Native (this is the web OPFS path only)."_, _"The URL state work in #123 and #124, which is what surfaced the defect."_ Every other database open failure keeps reaching the error boundary unchanged.
- **S6** — The retry is a reload of the tab, because a failed open leaves `expo-sqlite`'s web worker without a usable VFS: `maybeInitAsync` in `node_modules/expo-sqlite/web/worker.ts` caches the SQLite module before it creates the access handle pool, so after a failed attempt the same worker can only answer `Invalid VFS state`. The worker is private to the library, so a fresh document is the only way to try again with free handles.

## Tasks

- [x] **TASK-1**: Recognize the conflict from the expo-sqlite web open failure, and leave every other failure alone (S1, S5). In the single work-unit commit of this branch.
- [x] **TASK-2**: Render the in-use screen with a retry instead of the error boundary, and make the retry start a fresh document (S1-S3, S6). In the single work-unit commit of this branch.
- [x] **TASK-3**: Pin both behaviours in a browser spec with two pages of one context (S4). In the single work-unit commit of this branch.
- [x] **TASK-4**: Close: `make check` and the full `make check-e2e-web`. In the single work-unit commit of this branch.

## Evidence & Verification

- **Root cause, read from the library** — `node_modules/expo-sqlite/web/worker.ts:777-802` creates the persisted `AccessHandlePoolVFS` on the first database message and holds it for the worker's life; `web/wa-sqlite/AccessHandlePoolVFS.js:307` is where `createSyncAccessHandle` rejects with `NoModificationAllowedError` when another tab of the origin holds the file. `_sqlite3` is assigned **before** the pool is created, so a failed attempt poisons the worker: the next call skips creation and throws `Invalid VFS state`. `node_modules/expo-sqlite/web/WorkerChannel.ts:65-73` rebuilds the worker's DOMException as a plain `Error` on the main thread, which is why the conflict is recognized by text.
- **TASK-1** — `apps/mobile/src/infrastructure/persistence/database-open-error.ts` owns the pattern list and `isDatabaseInUseError`. RED first: `error: Cannot find module '../database-open-error'`; GREEN after: 4/4 pins in `__tests__/database-open-error.test.ts`, including the negative case (`Error finalizing statement`, `Database not found`) that must keep going to the error boundary.
- **TASK-2** — `apps/mobile/src/app/_layout.tsx` gains `DatabaseGate` and `DatabaseInUseScreen`. `SQLiteProvider` reports an open failure from inside its own render, so the handler defers the state update with `queueMicrotask` and the next render drops the provider; a non-conflict error is rethrown, which is exactly the provider's own default. The screen is an `EmptyState` with `testID="database-in-use-screen"` and a "Reintentar" button that reloads the tab (S6).
- **TASK-3** — `e2e/web-second-tab.spec.ts` opens two pages of one Playwright context (one origin, one OPFS pool). RED observed on the previous code: the second page rendered the error boundary with `Something went wrong` / `NoModificationAllowedError: Failed to execute 'createSyncAccessHandle'…` instead of the screen. GREEN after: both cases pass, and the second one proves the takeover — the first page closes, "Reintentar" reloads the second, and the home screen's `New Task` button appears.
- **TASK-4** — `TURBO_FORCE=true make check`: 9/9 tasks, mobile 665 tests pass / 0 fail, typecheck, lint (1 pre-existing `react-hooks/exhaustive-deps` warning in `use-url-view-state.ts:300`), format and 20/20 doctor checks. `make check-e2e-web`: **44 passed (2.7m)**, the 42 pre-existing specs included.
- **Recorded, not fixed** — A reload of a healthy web tab still logs `Error finalizing statement` from `expo-sqlite` (visible in the suite's browser console). It is a different failure from the access handle conflict, it predates this change, and the predicate deliberately does not swallow it. #125's acceptance criteria do not name it.
- **Completion & Delivery**: one work-unit commit on branch `fix/web-second-tab-database` (5 files, +272/−10; a hash written here would move on every amend of the commit that carries this document), pushed and opened as a pull request that closes #125. Merge stays the user's decision.
- **Risk**: none. No stored data, credential, permission or contract changes: the database is not opened at all in the second tab, and the screen only appears where the app used to crash. Item 6 does not apply — the two-tab browser spec, the predicate pins and the 42 untouched specs all fail if this regresses.

## Log

- **L1** — The user's request, verbatim: _"Quiero atacar #125 (el segundo tab del navegador revienta por OPFS) con la estrategia barata: detectar el fallo del access handle y mostrar "ya está abierta en otra pestaña" con reintento."_
- **L2** — Stated state at the start, verbatim: _"main en 05f7d1c, mergeados #119, #122, #124 y #127."_
- **L3** — Decision from reading the library, not from the issue: the retry reloads the tab, because the worker that failed cannot recover (`Invalid VFS state`). The in-use predicate therefore covers both texts, so a hot reload in the same document still lands on the screen instead of the boundary.
- **L4** — Honest record: the implementation was written before this document, which the ODD document gate requires because the change exceeds 150 authored lines.
