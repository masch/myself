# Product cards: what one PAP buys, in two selectable layouts

## Objective

Make the gondola card answer the question a user actually asks — **what do I get for 1 PAP?** —
instead of leading with the printed product name, and ship it as **two alternate card layouts the
user switches from the product filters**, because this is a UX validation stage and nobody has
measured yet which hierarchy reads better with real users.

Both layouts render the same facts from the same `ProductPackage & { producer, distanceKm }`: the
difference is hierarchy and grouping, never the numbers.

Design source: `design/product-pap-card/01-equivalencia-heroe.html` and
`02-ficha-especificacion.html` (the two artboards the user picked).

## Specs

- **S1** — The quantity equivalent to 1 PAP must lead the card. The user described the defect,
  verbatim: _"quiero mejorar la visualizacion las cards de los prouctos, hoy en día es consfuso
  cuando es 1 PAP por producto. Esta más grande la descripcion del proucto pero no el proporcional
  de que es 1 PAP."_ So the disclosed quantity carries more typographic weight than the printed
  product name, which becomes identity, not headline.
- **S2** — Two layouts, chosen by the user, verbatim: _"podriamos implementar las dos cards y que le
  usuario decida cual usar en filtrado de procutos? estamos en una etapa de validacion de UX"_. The
  switch lives in the gondola product filters (the surface that already answers "how do I want to
  see the gondola?"), and the choice survives a remount, an app restart and a reload, because a
  validation user must not re-pick the layout on every visit.
- **S3** — The PAP anchor appears once per surface, not once per card. The user, verbatim: _"si el valor de 1 PAP es fijo, porque lo mostramos en cada card?"_ No card renders the ARS value of 1
  PAP. Verified during TASK-4: the anchor **already** renders once, inside the list header
  (`apps/mobile/src/features/barter/components/producer-header-switcher.tsx:307`, as the
  `1 PAP = $<ARS>` badge). So the fix is removing the per-card repetition, never adding a second
  anchor — adding one beside the section header would have recreated the exact defect the user
  reported, one level up.
- **S4** — Local evaluation only. The user, verbatim: _"quiero evaluar opcional local antes de
  subir"_. Work stays on `feat/product-pap-card-variants`: no push, no PR, no release.
- **S5** — Decision (user, from four offered pairs): the two variants are the artboards **01
  `equivalencia-heroe`** (quantity as hero, product as subtitle) and **02 `ficha-especificacion`**
  (label/value spec rows, values right-aligned so cards compare as table rows). The current card
  stays only as the historical baseline in git; it is not offered in the selector.
- **S6** — Decision (from the artboards the user accepted): the rounding difference is stated in
  **ARS pesos, both layouts, always in words** — `Queda $1.741 abajo de 1 PAP`, `Queda $3.421
arriba de 1 PAP`, `Coincide exacto con 1 PAP` — never as a bare `real 0,97 PAP` fraction, and
  never by colour alone.
- **S7** — Decision (architectural, forced by S3): the anchor and every card read the **same**
  `papConfigArs` that derived the packages (`catalogPackages(papConfigArs)`). A hardcoded `$50.000`
  in the header would let the header disagree with the per-card differences.
- **S8** — Both layouts keep the existing barter contract: the secondary action is still
  `Pedir match` (or its existing pending / out-of-stock label and disabled state), the out-of-stock
  and pending states are never hidden by the redesign, and a package without a `catalog` block
  (the four POC packages, any injected state) still renders — it just has no equivalence to state.

## Tasks

- [x] **TASK-1**: One owner for the card's derived strings — quantity wording, packaging wording
      and the ARS difference against 1 PAP — with tests pinning both families, the exact-match case
      and the wording of the three adjustment states (S1, S6).
- [x] **TASK-2**: Layout A, `ProductPackageCardHero`: quantity as hero, product as identity,
      catalog truth in one sentence, adjustment line, consolidated context line, footer with
      quantity handed over plus action (S1, S5, S6, S8).
- [x] **TASK-3**: Layout B, `ProductPackageCardSpec`: label/value spec rows with right-aligned
      values, catalog source block, same footer contract (S1, S5, S6, S8).
- [x] **TASK-4**: Variant selector in the gondola filter bar, the layout travelling in the gondola
      address (no new preference store), and the single `1 PAP = <ARS>` anchor confirmed rather than
      duplicated (S2, S3, S7).
- [x] **TASK-5**: Close: full `make check`, evidence, and the local evaluation note (S4).

## Evidence & Verification

- **TASK-1** — `product-card-copy.ts` + `__tests__/product-card-copy.test.ts` (8 pins). RED first:
  the new pin could not import its module (`724 pass / 1 fail / 1 error`, the error being the
  missing module). GREEN once the module existed. The fixtures are derived through
  `deriveCatalogPackage` instead of hand-written catalog objects, so a fixture cannot drift from
  the arithmetic the card actually reads: #1 aceite → `Queda $1.741 abajo de 1 PAP`
  (9 × $5.362,07 = $48.258,63 against $50.000), the 1-litre row → `$3.421 arriba`, #5 gouda →
`Coincide exacto con 1 PAP`, #890 vermut → `$5.880 arriba`, #1141 horma (one presentation worth
  more than 1 PAP) → `$16.475 arriba`. A closed pin asserts no adjustment string ever contains
`real `, which is the defect this task removes.
- **TASK-2 / TASK-3** — `product-card-parts.tsx` (the facts both layouts share: state pills, the
  `ENTREGÁS N PAP` footer and the action), `product-package-card-hero.tsx`,
  `product-package-card-spec.tsx` and the dispatcher in `product-package-card.tsx`. The three
  pre-existing card pins asserted the retired copy (`Precio de lista: …`, `1 PAP ≈ … · real …
PAP`, `Valor: $50.000 ARS`); they moved to five cases covering both layouts, the weighed family
  (no `envases de`), the absence of `50.000` in either layout, and a package with no `catalog`
  block in both. Verified green in `gondola-components.test.tsx`.
- **TASK-4** — `card-variant.ts`, `gondola-params.ts`, `use-gondola-params.ts`,
  `gondola-filter-bar.tsx`, `app/barter.tsx` and their tests. RED observed before implementing:
  the codec suite went to `8 fail / 1 error` (`Expected: "cantidad" / Received: undefined`) and the
  filter-bar assertions could not even load (`SyntaxError: Export named 'CARD_VARIANT_OPTIONS' not
found`). GREEN at `740 pass`, and the three assertions left failing were the parent's retired
  card copy, not this task. Every existing `q`/`tipo`/`km` case survived, and `gondolaViewKey` still
  yields the exact `km=250&producerId=sabado&q=queso&tipo=ORGANIC`. S3 needed no code: the anchor
  already rendered once in `producer-header-switcher.tsx:307`, so the task verified its absence from
  the cards instead of adding a second one. S7 holds by construction: the cards never read
  `papConfigArs`, they compare `catalog.realPriceArs` with the package's own `priceArs`.
- **TASK-5** — `make check-format` clean; `TURBO_FORCE=true make check-tests check-types check-lint`:
  mobile **745 pass / 0 fail**, typecheck 3/3 workspaces, lint **0 errors** (4 warnings, all
  pre-existing: `use-url-view-state.ts:300`, `producer-header-switcher.tsx:16`,
  `catalog-seed.test.ts:6,7`). Three lint errors and three type errors from the first `make check`
  were mine and are fixed: the adjustment colour map now holds the theme's
  `ColorValue` instead of `string`, and the three hardcoded `letterSpacing: 0.5` use
  `letterSpacings.caption`. The full `make check` also runs `check-odd`, `check-odd-doc`,
  `check-expo-upgrade` and `expo-doctor`, which is why the ODD gate is reported separately below.
- **E2E — unverified, zero test runs.** `make check-e2e-web` was attempted once and never reached a
  spec: the Playwright web server (the Bun `--hot` dev server) aborted at startup with
  `panic(main thread): Failed to enable File Watcher: ProcessFdQuotaExceeded`, then
  `Process from config.webServer exited early`. The cause is environmental, not this diff: the box
  runs `fs.inotify.max_user_instances = 128` with **157** instances already held by unrelated
  processes (`agy` at 7-8 each). File descriptors are not the limit (`ulimit -n` 524288). No E2E
  assertion was updated or run, so the web suite stays unverified for this change; it is preserved
  as a failed preparation attempt, not retried, and re-running it needs a freed inotify budget (or a
  raised `fs.inotify.max_user_instances`) as an explicit new attempt.
- **Completion & Delivery**: Two work-unit commits on `feat/product-pap-card-variants`, plus this
  document and the design source. `255a146` = the card's copy owner (310 authored lines).
  `9e117a6` = both layouts, the shared parts, the dispatcher and the switch (1075 lines). The second
  slice is deliberately over the ~400-line target and the boundary is worth recording: no narrower
  cut compiles, because the dispatcher makes `variant` a required prop of the list the same commit
  that renders the second layout, and the one component test file carries both the card assertions
  and the filter-bar assertions. Splitting it by test file would have produced an intermediate
  commit with a red suite, which is worse for review than one large green unit.
  Delivery followed `main`'s own policy: issue `masch/myself#144` carries the `enhancement` label
  (this repository has no `status:approved` or `type:*` labels, and its real merge gate is
  `.github/workflows/broccoli-approval.yml` — a human-authored broccoli comment after the head SHA).
  The user selected `chain_strategy=feature-branch-chain` plus a closing issue reference, so the
  shape is a draft/no-merge tracker PR from `feat/product-pap-card-variants` to `main` plus three
  child PRs — `-01-copy` (`255a146`), `-02-layouts` (`9e117a6`) and `-03-design` (this document and
  the design source) — each targeting the previous branch and carrying the Chain Context section.
  The tracker carries `Closes #144`; the children only `Refs #144`, so the issue closes on
  integration. The web E2E suite remains unverified for this change (see above).

## Decisions

- **The layout preference travels in the gondola address, not in a new preference store.** This app
  has no generic UI-preference store: filters live in memory and only the route-param codec
  persists anything (`gondola-params.ts` + `use-gondola-params.ts`). Reusing that codec gives the
  switch one implementation that works on web and native, keeps the default URL clean, and turns the
  validation into a shareable link (`?card=ficha`) a tester can be handed. A new storage layer
  would have been invented machinery for a switch that may not survive the validation.

- Card-wide chrome: distance and address collapse into one context line (`📍 985 km · Guadalupe
Norte, Santa Fe`) plus the two states that change a decision (certification, stock). No badge
  soup.
- The `1 PAP` corner badge is gone from both layouts; the traded `papValue` is stated in the footer
  as `Entregás 1 PAP` (it varies per package — up to 10 PAP — so it is not an invariant).
- The printed product name stays **verbatim** from `facts[PRODUCT_NAME]` (`Aceite girasol x 1/2
litro pet`). Splitting the presentation suffix out of the printed name would be a new data rule;
  the packaging line (`9 botellas de 500 ml`) already resolves the ambiguity without inventing one.

## Log

- **L1** — User: _"quiero mejorar la visualizacion las cards de los prouctos, hoy en día es
  consfuso cuando es 1 PAP por producto. Esta más grande la descripcion del proucto pero no el
  proporcional de que es 1 PAP. como podriamos majorar la card paa que el usuario entienda mejor
  cuando equicale el propporcional de 1 PAP? quiero evaluar opcional local antes de subir"_ (+ two
  card screenshots).
- **L2** — Delivery decision from L1: three design directions written to `design/product-pap-card/`
  and opened on the local canvas for local evaluation, no source touched yet.
- **L3** — User, correcting the repeated anchor: _"si el valor de 1 PAP es fijo, porque lo
  mostramos en cada card?"_ Applied to all three artboards: the anchor moved to the list header
  once and the per-card ARS value of 1 PAP was removed.
- **L4** — User, authorizing implementation: _"podriamos implementar las dos cards y que le usuario
  decida cual usar en filtrado de procutos? estamos en una etapa de validacion de UX"_, then
  picking `01 + 02` from four offered pairs.
- **L5** — Implementation finding (2026-11-08): the `1 PAP = $<ARS>` anchor already rendered once,
  in `producer-header-switcher.tsx:307`, so no anchor code was written; the change is the removal of
  its per-card repetition.
- **L6** — Delivery decisions (2026-11-08): the user asked for the issue and the PR, then chose
  **`chain_strategy=feature-branch-chain`** from the three-option oversized menu and **`Closes
#144`** for the issue reference.
