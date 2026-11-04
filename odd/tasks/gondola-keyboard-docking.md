# Gondola Keyboard Docking

## Objective

On the web build the gondola's search field stayed behind the software keyboard, and the keyboard
closed itself on the first typed character. The field now docks at the top of the space the
keyboard leaves, the results fill the rest of it, and nothing steals the focus while somebody
types.

## Specs

- **S1** — The user reported, verbatim: _"en web android sigue el error que cuando apreto en el
  input de prcutos el teclado tapa la pantalla y el usuario no puede ver que ingresa"_ (with a
  screenshot of the staging build: keyboard open, search field not on screen).

  _"sigue"_ matters: the previous delivery (`odd/tasks/web-keyboard-inset.md`) reserved the
  keyboard inset in the list but never moved it, and its own record already said the real IME was
  unverified.

- **S2** — The user added, verbatim: _"por otro lado tambien, cuando ingresas la primera letra en
  el teclado, se cierra solo el teclado"_.

- **S3** — The user's decision for the layout, verbatim (option label): _"Campo arriba y que el
  resto scrollee"_ — with the field docked, the producer card and the inbox stop hiding on the
  first typed character; they stay above and come back by scrolling.

- **S4** — While the keyboard is open the field is on screen: the text being typed and the results
  under it are both visible (S1).

- **S5** — The focus survives typing: no layout change, no scroll and no re-render may take the
  caret out of the field while the user is typing (S2).

- **S6** — Native keeps its current behavior. `useKeyboardInset` reports `0` outside the web, so
  the docking never runs there and Android's `adjustResize` keeps driving the screen as before.

## Tasks

- [x] **TASK-1**: Pin the docking geometry as a pure function with unit tests (S4).
- [x] **TASK-2**: Pin the two browser promises: the field docks above the keyboard, and a scroll of
      the list does not take the focus out of it (S4, S5).
- [x] **TASK-3**: Implement the docking for a virtualised list and wire it into the gondola screen
      (S4, S6).
- [x] **TASK-4**: Stop `keyboardDismissMode="on-drag"` from blurring the field on the web, where
      react-native-web turns it into "dismiss on any scroll" (S5).
- [x] **TASK-5**: Drop the query-keyed compact header, and rewrite its browser spec into the
      docking promise (S3).
- [x] **TASK-7**: Answer the CodeRabbit round: make the docking rules testable without a React
      renderer and cover them with unit pins (S5).
- [x] **TASK-6**: Close with `make check` and the full web E2E suite (S1).

## Evidence & Verification

- **Diagnosis (S1)** — Measured in Chromium against the dev server with `window.visualViewport`
  stubbed at the height a phone reports while its keyboard is open (740 → 460): the search field
  sat at `528..572` while the visible band ended at `460`, and `gondola-list.scrollTop` was `0`.
  The list reserved `paddingBottom: 280` and nothing ever scrolled it, so the reservation only made
  the field reachable, never visible. `ScrollScreenContainer` is the only component that ran the
  scroll-into-view path; the gondola's `FlatList` never provided that context.
- **Diagnosis (S2)** — `keyboardDismissMode="on-drag"` is implemented by react-native-web as
  `dismissKeyboard()` on **every** `scroll` event
  (`node_modules/react-native-web/dist/exports/ScrollView/index.js:244-246`), not only on a finger
  drag. Measured: with the field focused, setting `gondola-list.scrollTop = 120` moved
  `document.activeElement` from the input to `BODY`. On a phone the browser scrolls the list by
  itself while the caret is being edited (and the previous compact header moved the content under
  the field), so the first typed character dismissed the input and the OS hid the keyboard.

- **TASK-1** — `resolveDockedInputScroll` in `src/components/focus-scroll.ts`, 6 pins in
  `src/components/__tests__/focus-scroll.test.ts`. RED observed first:
  `SyntaxError: Export named 'resolveDockedInputScroll' not found`. The pins cover the ways this math
  silently breaks: the web case where the field sits 528px down a 740px phone (docks to 512, not to
  the bottom edge of the band), the web case after the user already scrolled (40 visible + 512
  scrolled docks to 536 instead of jumping backwards), a field already on the line (`null`), a field
  the user scrolled past (`null`, never pulled back down under the finger), native content
  coordinates (528 with 100 of scroll docks to 512, not 412 — the first implementation subtracted
  `scrollY` and the pin caught it), and a native field above the line (`null`).
- **TASK-2** — `e2e/barter-gondola-mobile-keyboard.spec.ts`. RED observed first against the unfixed
  app: with the keyboard open the field stayed at `528..572` while the visible band ended at `460`,
  and `gondola-list.scrollTop` was `0`; with the field focused, `list.scrollBy({top: 120})` moved
  `document.activeElement` from the input to `BODY`, so the letter typed afterwards never landed.
  GREEN: `7 passed (33.2s)`.
- **TASK-3** — the fix is a primitive, not a screen: `ListScreenContainer` in
  `src/components/screen-container.tsx`, exposed as `ScreenContainer.List` beside `ScreenContainer`,
  `.Scroll` and `.Tab`, and backed by `src/hooks/use-keyboard-docking.ts`. The primitive owns the
  safe-area geometry (`useScreenPadding`), the standard gutter, the reserved keyboard inset and the
  docking, and it provides `ScrollContainerContext` so **any** input inside the list — not only the
  gondola's — reports its focus through the seam `ThemedTextInput` and `FormRow.Input` already use.
  `barter.tsx` became a consumer: it no longer imports `useKeyboardInset`, no longer computes
  padding, and keeps only its screen-specific props. Two component pins in
  `src/components/__tests__/screen-container.test.tsx` keep the primitive honest: the list container
  provides `scrollToFocusedInput` to a `ListHeaderComponent` consumer, and `ScreenContainer.List` is
  the same function as the named export. The dock's top spacing is `spacing.md`, so the dock line is
  a token rather than a literal. `ScrollScreenContainer` is byte-identical to the base commit.
- **TASK-4** — the `keyboardDismissMode` rule lives in the primitive: `"none"` on the web always,
  `"on-drag"` by default on native (the value the gondola used before). The regression pin is
  behavioral, not a prop assertion: focus the field, scroll the list, type a letter and expect the
  letter to land.
- **TASK-5** — `isCompactSearch` and its three conditionals are gone. The producer card, the inbox
  entry point and the section subtitle stay mounted while the user types; because the field is
  docked, they are simply above it and scrolling back reaches them. Its browser spec became the
  docking promise: after typing, the field is still on the dock line, the count is in the viewport,
  the producer card still exists and is **not** in the viewport (scrolled away, not unmounted), and
  the ✕ clears the query without moving the field.

- **TASK-6** — `make check-tests` (mobile 674 pass, shared 91, api 106), `make check-types`,
  `make check-lint` and `make check-e2e-web` **45 passed (3.9m)**. `make check-format` caught one
  unformatted new file (`use-keyboard-docking.ts`); it was formatted and the whole tree now passes
  `prettier --check`. `make check` (which adds `check-odd`, `check-odd-doc` and `check-doctor`) is
  green.
- **Completion & Delivery**: Complete on branch `fix/gondola-keyboard-docking` in four work-unit
  commits, with the slice boundaries recorded here because the first one is over the ~400-line
  review budget: **slice 1** `8d9873d` adds the primitive and its unit pins (430 authored lines —
  the geometry, the hook and the container, none of which changes an existing screen on its own);
  **slice 2** `f362253` makes the gondola the first consumer and rewrites its browser specs (309
  lines); **slice 3** is this document; **slice 4** `784091a` answers the CodeRabbit round — the
  docking rules become a framework-free controller with 19 unit pins, and the adapter stays proven by
  the browser specs. The change is a
  component-level fix, not a gondola patch: `ScreenContainer.List` is the list counterpart of
  `ScreenContainer.Scroll`, and it is the only place that reserves the keyboard inset, docks the
  focused input and neutralizes `keyboardDismissMode` on the web. The gondola is its first consumer;
  every future virtualised screen inherits it by using the compound component. Not delivered here,
  deliberately: push, pull request and merge remain the user's decisions, and the real Android IME
  is still only verified by behavior that a browser can reproduce (the focus is proven to survive a
  scroll, which was the mechanical cause), so a device pass on staging is the remaining check.

- **TASK-7** — CodeRabbit raised exactly one actionable finding on #130: the new hook had no adjacent
  unit suite. It was right — the geometry was pinned, the rules were not, and this repository has no
  React renderer (no `react-test-renderer`, no testing-library), so a hook cannot be rendered here.
  The rules moved out of `useKeyboardDocking` into an exported, framework-free
  `createKeyboardDockingController` and the hook became an adapter that forwards the inset, the focus
  reports and the scroll offset; `DOCK_DELAY_MS` is reached through an injectable `schedule` seam.
  RED observed first: `SyntaxError: Export named 'createKeyboardDockingController' not found`.
  GREEN: `19 pass, 0 fail` in `src/hooks/__tests__/use-keyboard-docking.test.ts`, asserting only
  observable effects — the `scrollToOffset` argument and the schedule/cancel counts. The five cases the
  review named are pinned: no dock at `inset <= 0`, none without `measureLayout`/list/scroll node, one
  debounced dock per inset with cancel on the next inset and on `dispose`, fallback to the reported input
  when `TextInput.State` is empty (and preference for the live one), and the scroll offset as the base of
  the dock. The adapter itself stays proven only by the browser specs, which is stated rather than hidden:
  `make check` green and `e2e/barter-gondola-mobile-keyboard.spec.ts` **7 passed (22.7s)** after the
  refactor.

## Log

- **L1** — _"en web android sigue el error que cuando apreto en el input de prcutos el teclado tapa
  la pantalla y el usuario no puede ver que ingresa"_ (the report and its screenshot).
- **L2** — _"por otro lado tambien, cuando ingresas la primera letra en el teclado, se cierra solo
  el teclado"_ (the second symptom, reported in the same message).
- **L3** — _"Campo arriba y que el resto scrollee"_ (the layout decision, chosen over keeping the
  compact header and compensating the scroll).
