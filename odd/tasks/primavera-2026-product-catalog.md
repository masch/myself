# Primavera 2026 Product Catalog (Truqueando)

## Objective

Seed the 1527 products the Primavera 2026 catalog prints, each one carrying its
printed price (`/var/home/masch/Downloads/Imprimir Primavera 26.pdf`, sha256
`c225594b8b367938fab2a25d5074651f050e4be58acaca6d6ab3e7f9c5843223`, the document
`odd/tasks/primavera-2026-producer-catalog.md` already read the 158 producers from), and give
every product the quantity that is worth exactly **1 PAP**, so the existing 1:1 barter keeps
trading equal value instead of equal packaging.

## Specs

- **S1** — The user asked, verbatim: _"ya que recien agregamos el pdf los productores, ahora
  podemos agregar los productos de cada productor con sus precios y corresponencia al precio de
  1 PAP?"_
- **S2** — The user's rule for the correspondence, verbatim: _"si un producto esta por encima del
  valor del PAP, habria que restarle la cantidad a intercambiar, si nu productor esta por debajo
  habria que sumarle lo correspondiente para llegar a 1 PAP"_. So the **quantity is the
  variable**: a package holds what is worth 1 PAP, not one printed presentation. Every product
  printed with a per-measure price (`x kilo/unid.` plus a `Precio final`) is sold by measure and
  its quantity is `1 PAP / unit price` — `$22.158,20/kg` of Gouda → **2,26 kg**, exactly 1 PAP.
- **S3** — Every other product is a whole presentation (`Precio final` alone, 1341 rows, or a
  per-unit price with no presentation size, 59 rows: plants, seeds), so its quantity must be a
  whole count: `k = round(1 PAP / printed price)`, `k >= 1` (`$7.352,42` tintura → **7 frascos**,
  `$13.970,00` vermut → **4 botellas**). When one single unit is already worth more than 1 PAP
  (`$66.474,60` horma) the package is that one unit and its `papValue` is the nearest whole
  PAP (`1`), never a fraction.
- **S4** — The PDF price is **shown, not replaced** — user, verbatim: _"el valor origeinal del pdf
  se va amostrar en la plataforma? asi el usuario sabe cual es el cargado y cual es su
  correspondiente a 1 pap"_. Every catalog package carries, in `catalog`: the printed price
  (`listPriceArs`) and what it buys (`listPriceBasis` — `por kg`, `por 360 g`, `por unidad`),
  the quantity handed over (`quantity` + `measure`), the presentation count and size
  (`presentationCount` × `presentationSize`), the real ARS value of that quantity
  (`realPriceArs`) and its exact PAP value (`realPapValue`).
- **S5** — The rounding is **disclosed, never hidden**, and the app keeps no ledger for it —
  decision (user, 2026-11-01, from three offered options): _"Mostrar la fracción, acordar
  afuera"_. The card shows `realPapValue` whenever the whole count cannot hit 1 PAP exactly
  (7 frascos = 1,03 PAP), and the difference is settled in the WhatsApp coordination. No saldo,
  no credit, no new persisted state.
- **S6** — `papValue` stays a positive integer and `priceArs` stays `papValue * PAP`, because
  `createTradeProposal` derives `totalPap` through `calculatePapValue(priceArs, papConfig)` and
  that function refuses a non-multiple. The honest ARS value lives in `catalog.realPriceArs`, so
  the existing 1:1 rule, the FSM and the counter-offer candidates keep working untouched.
- **S7** — The PDF prints no stock, so a catalog package takes one documented default
  (`CATALOG_STOCK_UNITS = 1`): one presentation of 1 PAP on offer, the same way the printed
  catalog prints no address and the producers took a documented centroid.
- **S8** — The 4 POC packages (`pkg-vermut-pack4`, `pkg-vermut-miel`, `pkg-queso-gouda`,
  `pkg-queso-provoleta`) stay: they are a persisted contract (stored matches point at their ids)
  and the catalog does not print them as such (it prints `Vermut Rosso x 750 ml`, not the pack of
  four). They are the only packages that are not derived from a printed row.
- **S9** — A stored install receives the catalog: `mergeCatalogPackages` adds every catalog
  package the stored state does not carry and keeps the stored one when it does, so a package
  whose stock was consumed by a real trade is never resurrected with seed stock.
- **S10** — The gondola must stay usable at 1531 packages: the list is virtualised (`FlatList`,
  not a `map` inside a `ScrollView`) and can be narrowed by a search field over product and
  producer name, which composes with the existing production-type and distance filters. The
  producer's own package list in the proposal modal is searchable for the same reason (up to 75
  own products).

## Tasks

- [x] **TASK-1**: Transcribe the printed product table (`primavera-products.ts`, 1527 rows in
      cents, with the presentation size the PDF's own arithmetic gives) and pin its invariants
      (S1).
- [x] **TASK-2**: Derive the 1-PAP package from one printed row in a single owner
      (`catalog-packages.ts`) and pin both families, the rounding and the disclosure (S2–S6).
- [x] **TASK-3**: Extend the shared package contract with the optional `catalog` block, seed the
      store with the catalog packages and merge them into a persisted state (S4, S7, S8, S9).
- [x] **TASK-4**: Make the gondola navigable at 1531 packages: virtualised list, search field,
      card and modal copy carrying the printed price and the PAP fraction (S4, S5, S10).
- [x] **TASK-5**: Close: full `make check`, `make check-e2e-web`, evidence and delivery notes.

## Evidence & Verification

- **TASK-1** — `primavera-products.ts` + `catalog-package-facts.ts`. RED observed first: the pin
  file failed on `Cannot find module '../catalog-package-facts'`; GREEN after the fact tuple
  existed, 9 pins, 11083 assertions. The pins earned their keep twice during the task: they
  caught `\bk\b` not matching the printed `x 5k` (the `k` has no word boundary in front of it,
  so `describe` read six kilos as six units), and the presentation-ratio pin caught the
  `50/70 grs` range being read as a fraction (`84c03fb`).
- **TASK-2** — `catalog-packages.ts`, the single owner of the price→PAP math. RED with stubs:
  `deriveCatalogPackage not implemented (5, undefined)`, `catalogPackages not implemented
(undefined)`; GREEN 26 pins. Observed values that the spec predicted: #5 Gouda → 2,2565 kg /
  1,00 PAP; #55 pisingallo → 13,9353 kg; #890 vermut → 4 botellas, $55.880, 1,12 PAP; #1 aceite →
  9 medios litros, 4,5 litros, 0,97 PAP. Whole table: every `papValue` a positive integer, every
  `priceArs === papValue × 50.000`, worst disclosed drift 0,329 (#1432), the largest package 10
  PAP (#1141: the $499.500 dry toilet). The sub-gram pin (#953, 3 g tea bags) forced the quantity
  to keep four decimals instead of two, which had rounded it to zero and failed the contract.
- **TASK-3** — shared `catalog` block + `SEED_PACKAGES` (1531) + `mergeCatalogPackages`. RED:
  `The seeded packages carry no cat-5` and `expect(SEED_PACKAGES).toHaveLength(1531)` receiving
  4; GREEN 157 pass for `src/features/barter`, shared 91. Three pre-existing assertions encoded
  the replace-the-seeds behavior this spec removes (a stored 1-package state now loads as the
  catalog plus that one, and a printed producer no longer ships zero packages); they moved to the
  merged baseline (`9383867`). The end-to-end pin proposes a `cat-*` package against another and
  asserts `totalPap === 1`.
- **TASK-4** — `barter.tsx` (FlatList, header composition, memoized pending-id set),
  `gondola-search.tsx`, `filterGondolaPackages` (accent fold, product **and** producer name),
  the card and the modal showing `Precio de lista` + `1 PAP ≈ … · real … PAP`. RED was
  module-level (`Export named 'filterGondolaPackages' not found`), one assertion-level RED was
  the fixture's own fault and was fixed rather than the code. GREEN 174 pass. `formatCatalogSize`
  earned a second consumer, so the basis reads `por 750 ml` and `por 3 g` instead of
  `por 0.75 litro`.
- **TASK-5** — `make check-e2e-web`: 21 passed (2.0m). It took three runs, and the first two
  failed for the reason the change exists: three specs asserted "the modal lists **two**
  packages", which stopped being true the moment a printed producer owned its catalog. The
  first run (18 passed / 3 failed) also exposed that the modal had no search, which S10 asked
  for and TASK-4 had missed; `83b6c46` added it. The second run (20 passed / 1 failed) failed on
  my own new assertion, not on the app: I searched `horma 2kg gouda` against a title that reads
  "Horma 2kg **Queso** Gouda", so the filter found nothing. The specs now assert the intent —
  one checked radio, the offers belonging to the active producer, the previous producer's pack
  gone after the switch — instead of a package count that grew 38×.
- **Transcript idempotence** — the table is generated from the PDF text layer, but the generator
  is a throwaway script (it needs `pdftotext` and a PDF that does not live in the repo), so the
  committed artefact is the transcription itself plus the invariants that pin it: 1527 numbered
  rows, producer coverage across all 158, the two price columns split 127/59/1341, and the
  presentation size equal to `final / unit` wherever both prices print.

- **Closed with**: `TURBO_FORCE=true make check` EXIT=0 — format, the ODD gate (this document
  closes), `check-odd-doc`, turbo `lint typecheck test` (mobile **596** pass / 0 fail, shared
  **91** / 0, api **106** / 0) and `expo-doctor` 20/20; `make check-e2e-web` EXIT=0 with **21
  passed**. The only findings the suite raised were mine and are fixed: prettier reformatted this
  document, and the transcription's first line still imported a type the regenerated file no
  longer uses.
- **Completion & Delivery**: Feature complete on branch `feat/primavera-2026-product-catalog` as
  seven work-unit commits — `c2e4228` (the 1527-row transcription and its pins), `84c03fb`
  (the presentation-size fix the pins caught), `a1587cb` (the 1-PAP derivation and the shared
  `catalog` block), `9383867` (the seed and the merged persisted state), `31a7bd6` (the
  virtualised, searchable gondola and the card/modal disclosure), `83b6c46` (the modal inventory
  search and the three specs it made honest), and this document. The transcription dominates the
  diff (1858 of 3621 authored lines are the printed table itself, one product per line), which is
  why the slice boundary is worth recording: everything after `c2e4228` is ~1700 lines of
  derivation, contract, seed, UI and tests. Not committed anywhere: nothing is pushed and no PR
  is open — push, PR and merge stay the user's decisions.

## Log

- **L1** — User, verbatim: _"ya que recien agregamos el pdf los productores, ahora podemos
  agregar los productos de cada productor con sus precios y corresponencia al precio de 1 PAP?"_
- **L2** — User, verbatim, correcting the first proposal (decimal PAP): _"teniendo el valor por
  unidad de cada proucto en el pdf y el valor del cada papa, no se puede hacer el equivalente de
  producto a 1 PAP?"_
- **L3** — User, verbatim, defining the rule: _"no entiendo cual de las opciones seria esta: si un
  producto esta por encima del valor del PAP, habria que restarle la cantidad a intercambiar, si
  nu productor esta por debajo habria que sumarle lo correspondiente para llegar a 1 PAP"_
- **L4** — Decision (user, 2026-11-01), asked what the app does when a sealed unit cannot hit 1
  PAP: _"Mostrar la fracción, acordar afuera"_.
- **L5** — User, verbatim: _"el valor origeinal del pdf se va amostrar en la plataforma? asi el
  usuario sabe cual es el cargado y cual es su correspondiente a 1 papa"_
- **L6** — Measured from the text layer, before writing code: 1527 numbered rows print a price
  (numbers 1…1527, no gaps, no repeats), distributed over all 158 producers (1 to 75 each); 186
  rows print a per-measure price (`x kilo/unid.`), 127 of them also print a `Precio final` whose
  ratio to the unit price is exactly the printed presentation size; the 6 rows with an empty
  price cell are page notes and footnotes, not products.
