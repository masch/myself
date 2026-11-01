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

- [ ] **TASK-1**: Transcribe the printed product table (`primavera-products.ts`, 1527 rows in
      cents, with the presentation size the PDF's own arithmetic gives) and pin its invariants
      (S1).
- [ ] **TASK-2**: Derive the 1-PAP package from one printed row in a single owner
      (`catalog-packages.ts`) and pin both families, the rounding and the disclosure (S2–S6).
- [ ] **TASK-3**: Extend the shared package contract with the optional `catalog` block, seed the
      store with the catalog packages and merge them into a persisted state (S4, S7, S8, S9).
- [ ] **TASK-4**: Make the gondola navigable at 1531 packages: virtualised list, search field,
      card and modal copy carrying the printed price and the PAP fraction (S4, S5, S10).
- [ ] **TASK-5**: Close: full `make check`, `make check-e2e-web`, evidence and delivery notes.

## Evidence & Verification

- Pending.

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
