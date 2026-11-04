# Gondola Search: Native Keyboard and Pinned Bar

The gondola search was fixed for the browser only. On an Android phone running the native build the
keyboard still covers the search field, because the list container assumed an Android behaviour that
Expo no longer has. The field moves out of the scrolling header into a pinned band, the list learns
the native keyboard inset, and the filters stop hiding options.

## Specs

- **S1** — The user reported, verbatim: _"si bien en la anterior cambio se soluciono las pantallas y
  teclado en android web, no funciona en android nativo en la busqueda de procutos. Te comparto las
  pantallas, que se podria mejorar?"_ — with two screenshots of the Android native build: with the
  keyboard open the list sits at scroll offset `0` with the search field below the keyboard.

  Note: _"la anterior cambio"_ is `odd/tasks/gondola-keyboard-docking.md`, whose **S6** said
  "Native keeps its current behavior … Android's `adjustResize` keeps driving the screen as before".
  That premise is the defect: Expo Android builds are edge-to-edge, so the window does not resize
  for the keyboard. S6 is superseded by S2 and S3 here.

- **S2** — The user's decision for the fix, verbatim: _"que seria lo mejor para la experiencia de
  usuario? aunque sea mucho cambio"_. The search field is therefore pinned above the list: it is on
  screen whenever the keyboard opens, whatever the list is showing, and the operator's identity
  stays visible next to it.

- **S3** — Scrolling the results must not dismiss the keyboard (the user selected it as an extra:
  _"Que scrollear resultados no cierre el teclado"_).

- **S4** — Every option of the distance filter is fully visible at phone width; no chip is cut off
  (the user selected it as an extra: _"Arreglar los chips de distancia cortados"_).

- **S5** — The browser promises of the previous change stay true: with the keyboard open the list
  reserves the space it covers, and a scroll of the list does not take the caret out of the field.

- **S6** — The operator still sees who they operate as and can switch producer from the gondola; the
  identity block shrinks, it does not disappear.

## Tasks

- [x] **TASK-1**: Give the list the native software-keyboard inset, with its rules as pure functions
      (S1).
- [x] **TASK-2**: Pin the field above the list through a `fixedHeader` slot that owns the top safe
      area once, and stop dismissing the keyboard on drag (S2, S3).
- [x] **TASK-3**: Compact the producer identity block and pin it under the field (S2, S6).
- [x] **TASK-4**: Wrap the filter chips so every distance and certification is reachable (S4).
- [x] **TASK-5**: Rewrite the browser spec around the new promises (S2, S3, S5) and pin the chip
      visibility (S4).
- [x] **TASK-6**: Close with `make check` and the full browser E2E suite.

## Log

- **L1** — The user's original request, verbatim: _"si bien en la anterior cambio se soluciono las
  pantallas y teclado en android web, no funciona en android nativo en la busqueda de procutos. Te
  comparto las pantallas, que se podria mejorar?"_
- **L2** — Asked which scope to fix, the user answered, verbatim: _"que seria lo mejor para la
  experiencia de usuario? aunque sea mucho cambio"_.
- **L3** — Asked which extras to include, the user answered, verbatim: _"lo que veas a mejorar"_,
  selecting _"Que scrollear resultados no cierre el teclado"_ and _"Arreglar los chips de distancia
  cortados"_.
- **L4** — Diagnosis: `useKeyboardInset` returns `0` outside the web, so `ScreenContainer.List`
  reserved nothing and `useKeyboardDocking` returned before measuring (`if (inset <= 0) return`).
  The Expo keyboard-handling guide states it: _"On Android, Expo apps are edge-to-edge, so the window
  no longer resizes for the keyboard. A view without a `behavior` stays under the keyboard."_

## Evidence & Verification

- **Diagnosis (S1, L4)** — `useKeyboardInset` returns `0` outside the web
  (`apps/mobile/src/hooks/use-keyboard-inset.ts`), so `ScreenContainer.List` reserved
  `paddingBottom: 0` and `useKeyboardDocking` returned before measuring anything
  (`use-keyboard-docking.ts`, `if (inset <= 0) return`). The comment that justified it — "Android
  resizes the window with the keyboard and the list already shrinks with it" — describes
  `adjustResize`, which an edge-to-edge Expo Android app no longer has. The current Expo keyboard
  guide states the opposite, verbatim: _"On Android, Expo apps are edge-to-edge, so the window no
  longer resizes for the keyboard. A view without a `behavior` stays under the keyboard."_ The two
  screenshots agree: with the keyboard open the list is at scroll offset `0` and lays out exactly as
  it does with the keyboard closed, so the field sits under it.
- **Why the sibling container already worked (S1)** — `ScrollScreenContainer` listens to
  `Keyboard.addListener("keyboardDidShow")` and adds the bottom inset on Android, which is why the
  rest of the screens behaved on the native build. `ScreenContainer.List` was the only keyboard
  consumer without that source.
- **TASK-1** — `src/hooks/use-software-keyboard-inset.ts`: `resolveNativeKeyboardInset`,
  `subscribeToNativeKeyboardHeight` and `resolveSoftwareKeyboardInset` are plain functions; the hooks
  are adapters. 8 pins in `src/hooks/__tests__/use-software-keyboard-inset.test.ts`. RED observed
  first: `Cannot find module '../use-software-keyboard-inset'`. The pins cover the two platform rules
  the bug turned on — the Android navigation bar an edge-to-edge window draws under the keyboard is
  added, iOS reports the keyboard alone, a closed keyboard and a negative height reserve nothing, the
  height comes from the event instead of a constant, unsubscribe removes both listeners, and one
  inset per platform is used so a stale web value cannot leak into native.
- **TASK-2** — `resolveListGeometry` in `src/components/screen-container.tsx`, 5 pins in
  `src/components/__tests__/list-geometry.test.ts`. RED observed first:
  `SyntaxError: Export named 'resolveListGeometry' not found`. The pins are the ways the two bands
  silently break: the top safe area stays in the content when nothing is pinned, moves to the pinned
  band instead of doubling when something is, the gutter reaches the band so a pinned field lines up
  with the rows, and the bottom always reserves safe area + keyboard + gap so the last row can scroll
  clear of the keyboard. `keyboardDismissMode` now defaults to `"none"` for lists on both platforms
  (`on-drag` hid exactly the rows a finger was scrolling towards, and react-native-web implements it
  as a blur on every scroll event); a caller has to ask for anything else.
- **TASK-3** — `app/barter.tsx` renders the field through `fixedHeader` and drops `edges` to
  `["bottom"]`: the stack header above the screen already owns the status bar, and insetting for it
  again spent ~56dp of a phone screen on nothing. The producer card lost its `CAMBIAR DE PRODUCTOR`
  label and its catalogue sentence (the chip now says `Cambiar` and the a11y hint carries the count)
  and its reset chip became an icon button with the accessible name `Reiniciar datos`. The pinned band
  renders outside `ScrollContainerContext`, so the field is never docked against a list it is not
  inside.
- **TASK-4** — `GondolaFilterBar` renders two wrapping rows instead of two horizontal scroll views,
  with the same `spacing.xs` gap and `spacing.xxs` padding. The token spec that pinned those values on
  the scroll content container now reads both rows themselves: the row owns the style now, and its
  intent (the shared chip row carries the 4px/2px pair) is unchanged.
- **TASK-5** — `e2e/barter-gondola-pinned-search.spec.ts` replaces
  `e2e/barter-gondola-mobile-keyboard.spec.ts`, whose promises were about docking a field that is no
  longer inside the list. RED observed first against the pre-change app, by stashing the source
  changes and running the new spec: **4 failed, 4 passed (1.2m)** — the field was not above the list,
  a scroll of the results moved it, the count assertion ran against a field that had scrolled away,
  and `gondola-distance-row` did not exist. GREEN after the change: **8 passed (1.3m)**. The four pins
  that passed before pin promises the previous change already kept (the list reserves the keyboard
  inset, the identity block exists, pinch zoom reserves nothing, the focus ring follows focus) and stay
  as regression guards.
- **TASK-5 (neighbouring specs)** — the barter suites that touch the same markup were run together and
  pass: `barter-token-render`, `barter-gondola-token-render`, `barter-gondola-shareable-search`,
  `barter-selector-awaiting-reply`, `barter-selector-trade-chips`, `barter-copy-link`,
  `barter-modal-reset` — **11 passed (2.5m)**. One pin changed on purpose: the success-variant chip is
  found by its accessible name `Cambiar de productor` instead of the producer name, because the chip no
  longer repeats the name shown above it.
- **Not verified here (S1)** — the real Android IME on a native build. Every automated check this
  repository owns is a browser check or a unit pin; the native inset is pinned as a rule
  (`resolveNativeKeyboardInset`), not as a device behavior. The device pass on the staging build is
  the remaining check, and it is the one the user can do that this environment cannot.

- **Completion & Delivery**: Complete on branch `fix/gondola-search-native-keyboard` in work-unit
  commits, the boundaries recorded at delivery: **slice 1** adds the native inset and the list
  geometry with their unit pins, **slice 2** makes the gondola consume it (pinned field, compact
  identity block), **slice 3** wraps the filter chips and updates the token pin, **slice 4** rewrites
  the browser spec, **slice 5** is this document. Not delivered here, deliberately: push, pull request
  and merge remain the user's decisions, and the native Android keyboard is still only verified as a
  rule plus the user's device pass.
