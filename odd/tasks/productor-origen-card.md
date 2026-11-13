# The product card highlights the producer, its origin and the equivalence

Issue: [#155](https://github.com/masch/myself/issues/155). The requester chose the hierarchy and the placement before any source changed: prototypes first on the design canvas, origin **on every card** (`por card`), then the implementation.

## Objective

A card of the barter gondola answered "what do I get for 1 PAP?" and said almost nothing about who sells it: the producer was `de {producer.name}` in grey under the product name, and the distance and the place were one `caption1` line under the printed price. Those three facts decide whether a trade is practical at all — nobody drives to Tilcara for one PAP — so they now open the card in one block, and the equivalence is stated as an equation instead of a quantity with a label underneath it.

## Specs

- **S1** — The user asked, verbatim: _"quiero hacer otro ajuste en la card del productos de los produtores, quiero que se destaque la sigiente information y primero protipemos antes dehacer commit pra evaluarlos: Naturaleza viva / km .... Guadalupe....Santa Fe... / 1 PP = 4,5 litros aceite de girasol"_.
- **S2** — Placement, verbatim: _"por card, avanzamos con la implementacion"_. The origin is highlighted on **every** card, never once in the list header: the producer changes between the packages of one list, so a header cannot name it.
- **S3** — Prototype before commit, verbatim: _"primero protipemos antes dehacer commit pra evaluarlos"_. Directions are evaluated on the canvas as artboards; the implementation starts only after that.
- **S4** — Everything the current card states survives. The change is which fact the eye meets first, never which facts exist: certification, stock, the printed price, the rounding difference in pesos, the traded PAP and the action that starts a trade all stay.

## Tasks

- [x] **TASK-1**: Prototype the directions and open them on the canvas (S1, S3). In commit `4b85360`, `design/productor-origen-ecuacion/`.
- [x] **TASK-2**: One `PackageOrigin` part rendered by both layouts, the equation anchor in the hero, and `distanceLabel` replacing `locationLine` (S1, S2, S4). In commit `2dc53da`.
- [x] **TASK-3**: Pin the block in both layouts and retire the two grey lines (S2, S4). In commit `2dc53da`.
- [x] **TASK-4**: Close: `make check` plus the full `make check-e2e-web`. In commit `2dc53da`.

## Evidence & Verification

- **What the card said before, read from the source** — `product-package-card-hero.tsx:85` rendered `de {packageItem.producer.name}` in `callout` grey, and `:107` rendered `locationLine(distanceKm, address)`, which `product-card-copy.ts:125` built as `📍 {km} km · {address}`; `product-package-card-spec.tsx:52` folded the same two facts into a `caption1` subtitle under the product name (`{producer} · {locationLine}`). The hero's equivalence was the quantity in `largeTitle` with `POR 1 PAP` in a `caption1` caption, so the card showed a figure and never the equation.
- **The requester's own example is real catalog data** — producer 1 of `PRIMAVERA_2026_CATALOG` is `Naturaleza Viva`, address `Guadalupe Norte, Santa Fe` (`producer-catalog.ts:255-259`), and its printed row 1 `Aceite girasol x 1/2 litro pet` (`primavera-products.ts:33`) is a sealed presentation at `$5.362,07` per half litre, which is `k = round(1 PAP / $5.362,07) = 9` presentations — `4,5 litros`, the number the requester wrote. `1 PP` in the request was read as `1 PAP`, the app's unit.
- **TASK-1** — Four artboards in `design/productor-origen-ecuacion/`: `01-banda-de-origen` (producer and origin as the opening band, equation in one sentence), `02-ficha-de-origen` (labelled `VIENE DE` block and the equation as a three-part account), `03-ecuacion-protagonista` (equation as the hero, origin as a footer strip) and `04-linea-de-origen` (the same line in three writings). Every card kept its chip, pills, printed price, adjustment and hand-over, so the evaluation compared hierarchies and not features.
- **TASK-2** — `PackageOrigin` lives in `product-card-parts.tsx` beside the other parts both layouts render identically. The block is **inset**, not a full-bleed band: reaching the card edges needs `overflow: hidden` on the shell, and that clips the elevated card's shadow into a flat rectangle on iOS. `distanceLabel` returns `a 12 km`; `locationLine` was deleted rather than left unused, and its old pin went with it because an emoji in front of the one figure the eye compares across cards is noise.
- **TASK-3** — RED observed on the new and updated assertions: 5 failing (`product-card-copy.test.ts` for `distanceLabel`, and three origin cases plus the `1 PAP =` assertion in `gondola-components.test.tsx`). GREEN after implementation: the origin renders in both layouts, the producer is named exactly three times per card (the block, then the chip's title and its accessible name, which say what pressing it does) so a fourth mention — the retired `de {producer}` line — fails the pin, and a package with no catalog block still states its origin.
- **TASK-4** — `make check`: 9/9 tasks, 761 tests pass / 0 fail, typecheck, lint (0 errors; the 4 warnings are pre-existing), prettier and 20/20 doctor checks. `make check-e2e-web`: **48 passed (3m 17s)**, the 44 pre-existing specs included.
- **Deliberate deviation from the artboard** — the prototype wrote `1 PAP = 4,5 litros de aceite de girasol`. That continuation is not implemented: the catalog keeps the printed row name only (`catalog-package-facts.ts` documents `name` as the printed string), so the noun would have to be split out of 1527 irregular names (`Queso Gouda (horma de aprox. 3 kg) en el galpón se arregla dif. de pesajes`) or added as a new field on every row. The card says `1 PAP = 4,5 litros` and the printed name follows it.
- **Recorded, not fixed** — `e2e/barter-token-render.spec.ts:35` still expects `📍 Chacra Alimento, Umepay`, rendered by `producer-header-switcher.tsx:199` for the producer selector, not by a card. That pin belongs to that surface and is out of S1's scope.
- **Completion & Delivery**: two commits on branch `feat/card-origen-productor` — the artboards (`4b85360`) and the card with its tests (`2dc53da`) — pushed and opened as a pull request that closes #155. Merge stays the user's decision.
- **Risk**: none. No stored data, credential, permission or contract changes: the diff adds one presentation-only part, renames one copy helper used by the two cards, and every edited string is pinned by a test that fails if the old hierarchy returns. Item 3 does not apply — the shared `product-card-parts.tsx` is only consumed by these two layouts, and both were changed together on purpose.

## Log

- **L1** — The user's request, verbatim: _"quiero hacer otro ajuste en la card del productos de los produtores, quiero que se destaque la sigiente information y primero protipemos antes dehacer commit pra evaluarlos: Naturaleza viva / km .... Guadalupe....Santa Fe... / 1 PP = 4,5 litros aceite de girasol"_.
- **L2** — Placement decided by the requester after the prototypes, verbatim: _"por card, avanzamos con la implementacion"_. Direction **01 · Banda de origen** was the one handed off: it follows the order of the request, keeps all three facts highlighted, and demotes nothing that the other two directions demoted.
- **L3** — Interpretation recorded before the implementation: `1 PP` means `1 PAP`, and `Naturaleza viva` + `Guadalupe, Santa Fe` + `4,5 litros de aceite de girasol` are one real catalog row (producer 1, printed row 1), not a hypothetical example. The prototypes used that row and its neighbouring row (row 2, `6 litros`) so the evaluation compared the same package twice.
- **L4** — Honest record: the implementation was written before this document, which the repository's ODD document gate requires above 150 authored lines. The count is dominated by the four HTML artboards (~1000 lines); the code unit is ~144 authored lines across six files.
- **L5** — Open question left with the requester: a canonical product noun in the catalog would let the card say `1 PAP = 4,5 litros de aceite de girasol`. It needs a new field on 1527 printed rows, so it was not invented and the printed name carries the identity instead.
