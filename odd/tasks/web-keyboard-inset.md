# Web Software Keyboard Inset

## Objective

Make every text input in the web build survivable when the software keyboard opens. On Android
Chrome the browser shrank only the _visual_ viewport, so the app kept a full-screen layout
viewport: the focused field and every result under it were painted behind the keyboard. The fix
reserves the visual-viewport difference inside the components that scroll, so no screen and no
input needs its own keyboard math.

## Specs

- **S1** — The user reported, verbatim: _"hay un problema en web android que cuando intengo
  ingresar en los input de los search de prductos cuando apreto para buscar y se levanta el
  teclado no se llega a ver lo que escribo en el input y tampoco ver el rsultado de la busqueda
  inline, como lo podemos arreglar?"_
- **S2** — The user chose the scope, verbatim: _"me gusta 2 y 3, pero 1 que sentido tiene hacerlo
  en el html si se compila con expo?"_ — that is: the visual-viewport hook (layer 2), the compact
  search layout (layer 3), and a justification for the document-head viewport hint (layer 1).
- **S3** — The user asked the coverage question, verbatim: _"estos arreglas aplica a todos los
  inputs de la app? a todos los componentes?"_ — so the fix belongs to the scrolling primitives
  (`ScrollScreenContainer`, `BottomSheetModal`, and the gondola's own virtualised list), never to
  an individual screen or input.
- **S4** — The user's rule, verbatim: _"la 1 va en su propio commit, validada con `make
check-e2e-web`"_, accepted as: the document-head change must be revertible on its own if it
  breaks the web drawer. It turned out to be inert (see **Evidence**), so it was reverted instead.
- **S5** — While the search field owns the keyboard, the gondola shows the field, the filters and
  the results: the producer card, the inbox entry point and the section subtitle step aside and
  come back on blur.
- **S6** — Native is untouched. `useKeyboardInset` returns `0` outside the web, and the existing
  Android listener keeps driving `scrollInputIntoView` exactly as before.

## Tasks

- [x] **TASK-1**: Pin the inset math and the viewport subscription with tests (S1, S6).
- [x] **TASK-2**: Implement `useKeyboardInset` as a no-op outside the web (S6).
- [x] **TASK-3**: Reserve the inset in `ScrollScreenContainer` and reuse the existing
      scroll-into-view path on the web (S1, S3).
- [x] **TASK-4**: Reserve the inset in `BottomSheetModalContent`, where
      `KeyboardAvoidingView` does nothing on the web (S1, S3).
- [x] **TASK-5**: Reserve the inset in the gondola list and collapse its header while the field is
      focused, with `onFocus`/`onBlur` on `GondolaSearch` (S5).
- [x] **TASK-6**: Evaluate the document-head viewport hint on its own and revert it if it is inert
      (S2, S4).
- [x] **TASK-7**: Close with `make check-tests`, `check-types`, `check-lint`, `check-format` and
      the full `check-e2e-web` (S1).

## Evidence & Verification

- **TASK-1** — `src/hooks/__tests__/use-keyboard-inset.test.ts`, 6 pins. RED observed first:
  `Cannot find module '../use-keyboard-inset'`. GREEN after the module existed. The pins cover the
  three rules that can silently break the fix: the difference itself (800 − 460 = 340), the zero
  case when the layout viewport already shrank (`interactive-widget=resizes-content`, where
  reserving again would double the padding), and the clamp when the visual viewport is taller
  (rotation race). The subscription is driven by an injected fake window, so no DOM is needed:
  current value before any event, an emission per `resize`, and no emission after unsubscribe.
- **TASK-2** — `src/hooks/use-keyboard-inset.ts`. `Platform.OS !== "web"` returns no value, so the
  native path is byte-identical to before (`Risk: none`, and the Android suite is unchanged).
- **TASK-3** — `screen-container.tsx`: `androidKeyboardHeight` was the only keyboard state and the
  listener guarding it is `Platform.OS !== "android"`, so the web had no handling at all. The
  inset now feeds the same `scrollInputIntoView(input, keyboardInset)` the Android listener calls,
  and the content `paddingBottom` uses the unified value. Padding alone is not enough on the web:
  the scroll port keeps full height, so the browser's own scroll-into-view never fires — the
  second effect is what actually moves the field.
- **TASK-4** — `bottom-sheet-modal.tsx`. `react-native-web`'s `KeyboardAvoidingView` renders a
  plain `View` and its `onKeyboardChange` is empty, and `react-native-web`'s `Keyboard` is a no-op
  (`isVisible()` always `false`, `addListener` returns an empty subscription). Bottom sheets
  therefore had no keyboard behavior whatsoever on the web; the backdrop is bottom-aligned, so the
  inset lifts the sheet.
- **TASK-5** — `barter.tsx` + `gondola-search.tsx`. `e2e/barter-gondola-mobile-keyboard.spec.ts`
  stubs `window.visualViewport` from `addInitScript` because Playwright cannot raise an OS
  keyboard: `height` is what the browser reports while the keyboard is open. Four specs, all
  green: the list reserves `280px` with the keyboard open, reserves `0px` without it, focusing the
  field removes the producer card and the inbox entry while the field and the filter row stay
  visible, and typing rewrites the inline count.
- **TASK-6** — Reverted. `+html.tsx` never reaches the browser in this repository: `app.json` sets
  `web.output: "single"`, and `@expo/cli` only defers to static rendering for `static` or `server`
  (`node_modules/@expo/cli/build/src/start/server/middleware/ManifestMiddleware.js:286-291`, "Skip
  the spa-styled index.html when static generation is enabled"). Verified both ways: the dev
  server's HTML and a fresh `bun run export-web` `dist/index.html` carry Expo's default
  `<title>myself</title>`, the default viewport meta and none of `+html.tsx`'s
  `--system-background` CSS variables. The same inertness means the dark/light no-flash CSS in
  that file has never shipped; that is a separate, pre-existing defect and out of scope here.
- **TASK-7** — `make check-tests`, `make check-types`, `make check-lint` and `make check-format`
  all exit `0`. `make check-e2e-web`: **25 passed (1.9m)**, which includes the 4 new specs and the
  existing barter modal specs — the specs that would catch a tap lost to the header collapsing on
  blur while the user reaches for a card. Still unverified by any automated check: the real IME.
  Only an Android Chrome device against the staging build can prove the keyboard behavior.
- **Completion & Delivery**: Complete on branch `fix/web-keyboard-inset` as two work-unit commits:
  the fix with its unit and browser tests, and this document. The touched surface is 8 files (~490
  authored lines, of which ~300 are tests and fixtures). That single slice is above the ~400-line
  review budget on purpose: it is one behavior — reserve the keyboard inset — with its RED/GREEN
  pins, and splitting it would ship a hook nobody calls. Nothing else is in the diff: `+html.tsx`
  was edited, proven inert and reverted, so the final change contains no document-head
  modification. Merge, and the record of the merged squash and the closed issue, stay the delivery
  decisions of a later document.

## Log

- **L1** — _"hay un problema en web android que cuando intengo ingresar en los input de los
  search de prductos cuando apreto para buscar y se levanta el teclado no se llega a ver lo que
  escribo en el input y tampoco ver el rsultado de la busqueda inline, como lo podemos arreglar?"_
  (the report, with two screenshots of the gondola with the keyboard covering the search field).
- **L2** — _"me gusta 2 y 3, pero 1 que sentido tiene hacerlo en el html si se compila con expo?"_
  (scope decision and the question that led to TASK-6).
- **L3** — _"pero si hacemos 2 y 3, podrque es neceario el 1 también?"_ (the coverage argument:
  other web screens with inputs had no keyboard handling either).
- **L4** — _"estos arreglas aplica a todos los inputs de la app? a todos los componentes?"_ (the
  fix moved from the gondola screen into the scrolling primitives because of this question).
- **L5** — _"subimos los cambios? issue y pr?"_ (delivery: branch, issue and pull request).
