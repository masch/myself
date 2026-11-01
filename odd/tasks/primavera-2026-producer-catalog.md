# Primavera 2026 Producer Catalog (Truqueando)

## Objective

Grow the barter ("truqueando") producer set from the three seeded producers to the full
Primavera 2026 network catalog: the 158 numbered producers printed in
`/var/home/masch/Downloads/Imprimir Primavera 26.pdf`
(sha256 `c225594b8b367938fab2a25d5074651f050e4be58acaca6d6ab3e7f9c5843223`), each one
introduced by a table header of the shape
`# <Número> - <PRODUCTOR> x kilo/unid. Precio final Cant.`

## Specs

- **S1** — The user asked, verbatim: _"Vamos agrandar los productores del truqueando, hoy en
  día existe VERMUT: "sabado", QUESO: "naturaleza-viva", MIEL: "colmenas-del-sol", y quisiera
  agregar todos los prodcutores que existe en este PDF. si te fijas cada productor esta
  marcado en una entrada de la tabla del pf que tiene # Numero - [productor] x kilo/unid
  precio final cant que te muestro en la iamgen. como primer paso podemos aregar todos los
  produtores que existen en el pdf que esta en:
  /var/home/masch/Downloads/Imprimir Primavera 26.pdf"_
- **S2** — Every producer printed in that PDF appears in the app, once each: **158 producers,
  numbers 1…158, no gaps**. Measured from the text layer: every line matching
  `^#\s+<n>\s+-\s+(.*)$` whose tail carries `x kilo/unid.`, de-duplicated by number (the table
  headers repeat when a section continues on the next page). Numbers 1…158 are all present and
  no number carries two different names.
- **S3** — The two producers the app already knows keep their current identity, because
  `PRODUCER_IDS` is a persisted contract (every stored package and match carries the id, and
  it is the `?producerId=` link value): **#102 `SABADO Calamuchita` stays `sabado`** and
  **#1 `NATURALEZA VIVA` stays `naturaleza-viva`**. **No producer outside the printed catalog is
  seeded**: `colmenas-del-sol` (Colmenas del Sol, the third POC seed) and its package
  `pkg-miel-1kg` are removed, so the app shows the 158 producers and 4 packages that exist. The
  `prod-miel` alias survives in `RENAMED_PRODUCER_IDS` and translates to an id this build no
  longer ships, so a stored state or a handed-out link written by an older build still reads
  and then falls back to the default identity instead of dangling.
- **S4** — The PDF carries no coordinates and no contact directory; the only phone printed
  anywhere in it is `351-6480335` on #123. Decisions (user, 2026-10-17, twice): **`latitude`
  and `longitude` stay required and take the centroid of the locality, region or province the
  catalog names**, and **`phone` stays required**: it is what the WhatsApp coordination link
  needs, so every producer that the PDF prints without a number takes one documented default
  number — `POC_DEFAULT_PHONE` in `whatsapp-utils.ts`, next to the link builder that consumes
  it — instead of the catalog carrying 157 invented numbers of its own. A producer with a
  printed number keeps it: #123 keeps `+543516480335`.
- **S5** — Decision (user, 2026-10-17): **the production-type contract grows
  `BIODYNAMIC` and `VEGAN`**, so the catalog does not have to lie about what a producer
  declares. Mapping applied to the printed labels:
  - `Orgánico` → `ORGANIC`; `Orgánico biodinámico` and `Biodinámico` → `BIODYNAMIC`
    (the biodynamic claim is the stricter one and the one the catalog prints).
  - `Agroeco` / `Agroecológico` → `AGROECOLOGICAL`; `Agroeco/Orgánico` → `ORGANIC`
    (the certification is explicit); `Vegano` (with or without `sin gluten`) → `VEGAN`.
  - **No label printed** (103 of the 158) → `AGROECOLOGICAL`. `CONVENTIONAL` is never used:
    the catalog is titled _"¡¡¡Orgánica si o sí!!!"_ and no producer declares conventional.
- **S6** — Decision (user, 2026-10-17): with 158 producers, the horizontal chip row of
  `producer-header-switcher.tsx` (one chip per producer) is unusable, so **the identity
  switcher becomes a searchable selector** in this same change. Choosing an identity, copying
  a simulation link and the `producer-switch-row` test anchor must keep working.
- **S7** — The selector says **who still owes an answer**: a producer whose match is waiting on
  it carries a `N por responder` badge, and a producer with nothing to answer carries none.
  "Owing an answer" is not re-listed here: it is exactly the condition under which
  `getMatchActionAvailability` offers that party an action (target of a `PENDING` proposal,
  requester of a `COUNTER_OFFERED` one), so the list and the inbox buttons cannot disagree.

## Tasks

- [x] **TASK-1**: Extend the shared barter contract — `PRODUCTION_TYPES` gains `BIODYNAMIC`
      and `VEGAN`, `producerSchema.phone` stays required — plus the filter labels the mobile UI
      derives from that vocabulary (S5, S4).
- [x] **TASK-2**: Give the WhatsApp coordination link one documented default number for
      producers the catalog prints without one, and keep the trade screen's link on it (S4).
- [x] **TASK-3**: Add the Primavera 2026 catalog module (158 entries, unique ids, centroids
      per place, `sabado` and `naturaleza-viva` preserved) and seed the store from it (S2, S3, S4).
- [x] **TASK-4**: Replace the identity chip row with a searchable selector (S6).
- [x] **TASK-5**: Pin the catalog invariants with tests: 158 entries numbered 1…158, unique
      ids and names, coordinates inside Argentina, every place key resolvable, `sabado` and
      `naturaleza-viva` resolving to #102 and #1, and the legacy links still resolving (S2–S5).
- [x] **TASK-6**: Close: full `make check`, `make check-e2e-web`, evidence and delivery notes.

## Evidence & Verification

- **TASK-1** — `packages/shared/src/modules/barter/schemas.ts`: `PRODUCTION_TYPES` gains
  `BIODYNAMIC` and `VEGAN`. RED observed first: `accepts the biodynamic and vegan production
types` failed with the enum narrowed (shared 13 pass / 2 fail); GREEN after the change
  (shared 91 pass / 0 fail). The gondola filter gained one labelled option per type, pinned by
  `offers a gondola filter option for every production type`, which walks `PRODUCTION_TYPES` —
  RED was a `SyntaxError: Export named 'TYPE_OPTIONS' not found`, because the rule did not exist.
- **TASK-2** — `POC_DEFAULT_PHONE` in `whatsapp-utils.ts`, next to the only consumer of a
  number. RED: `SyntaxError: Export named 'POC_DEFAULT_PHONE' not found` plus the schema test
  that now requires `phone`. GREEN: `exposes a default number the POC can fall back to` asserts
  the constant produces a `wa.me/<10-15 digits>` URL, so a placeholder without a country code
  cannot ship.
- **TASK-3** — `producer-catalog.ts`: 158 entries, 43 places. Cross-checked against the
  extracted text: every number 1…158 exists in the PDF, 5 name differences (all cosmetic or the
  deliberate `Vermut Sabado`), and 157 of 158 place assignments are justified by the printed
  header itself. After L10 the seeding pin reads the other way around: `SEED_PRODUCERS` is
  exactly the catalog (158, no `colmenas-del-sol`) and `SEED_PACKAGES` is 4.
- **TASK-4** — `producer-header-switcher.tsx`: trigger + sheet + `FlatList` + `filterProducers`.
  RED: `SyntaxError: Export named 'filterProducers' not found`. GREEN: 5 cases, including the
  accent fold I added after review (`dona mecha` → `Doña Mecha`), which was RED before
  `foldForSearch` existed (`Expected 1, Received 0`).
- **TASK-5** — `producer-catalog.test.ts`, 10 pins. Proven to bite: renumbering #158 to 159 and
  flipping #146 from `VEGAN` to `AGROECOLOGICAL` failed exactly the numbering pin and the claim
  count pin; the file was restored byte-identical.
- **Closed with**: `TURBO_FORCE=true make check` EXIT=0 (mobile **520** pass / 0 fail across 62
  files, shared **91** pass / 0 fail, api 106 pass / 0 fail) and `make check-e2e-web` EXIT=0
  with **19 passed** — the barter specs among them, including the two that now open the selector
  and the re-anchored token assertions.

- **Completion & Delivery**: Feature complete on branch `feat/primavera-2026-producer-catalog` as
  eleven work-unit commits — `15ad3ed` (contract: biodynamic and vegan types), `fe3fde5`
  (`POC_DEFAULT_PHONE`), `c7be4eb` (the 158-producer catalog and its pins), `6a67bc2` (the
  searchable identity selector plus the three E2E specs it invalidated), `edb0950` (this
  document's evidence and closure), `1b31b7d` (finding R3-001 of lineage
  `review-b9f535d161a01304`: the catalog is merged into any persisted producer list) and
  `be9797a` (the switcher reads as an action). Final evidence: `TURBO_FORCE=true make check`
  EXIT=0 (mobile **524** pass / 0 fail, shared 91 / 0, api 106 / 0; expo-doctor 20/20) and
  `make check-e2e-web` EXIT=0 with **19 passed**. The vendor PDF is not in the repository; the
  catalog module records its sha256. Native review of this candidate (lineage
  `review-df9b3ba69360fd95`, lenses risk/readability/reliability) is **approved** and its
  authority burned by the exact acknowledgement; its four findings are advisory and none opened
  a correction: R1-001 (risk, suggestion) and R1-002 (risk, suggestion), R2-001 (readability,
  warning) and R2-002 (readability, warning). An earlier lineage (`review-b9f535d161a01304`)
  was left in `correction_required` because its correction-plan binding still named the
  pre-correction target after `1b31b7d` advanced the candidate; that finding (R3-001) was fixed
  and shipped anyway. Push and pull request remain the user's decision.

## Log

- L1 (2026-10-17) — Request, verbatim: _"Vamos agrandar los productores del truqueando, hoy en
  día existe VERMUT: "sabado", QUESO: "naturaleza-viva", MIEL: "colmenas-del-sol", y quisiera
  agregar todos los prodcutores que existe en este PDF. si te fijas cada productor esta marcado
  en una entrada de la tabla del pf que tiene # Numero - [productor] x kilo/unid precio final
  cant que te muestro en la iamgen. como primer paso podemos aregar todos los produtores que
  existen en el pdf que esta en:
  /var/home/masch/Downloads/Imprimir Primavera 26.pdf"_
- L2 (2026-10-17) — Three product decisions answered by the user before any code was written.
  (a) Location/contact: _"Coords por localidad; teléfono opcional"_ — approximate coordinates
  from the locality, `phone` optional in the shared schema, no invented numbers. (b) Types:
  _"Ampliar enum: BIODYNAMIC y VEGAN"_ — the contract grows both types and the gondola filter
  gains both options. (c) Identity UI: _"Incluir selector con buscador"_ — the chip row is
  replaced by a searchable picker in this same change. The 103 unlabeled producers were not
  covered by any option and are mapped to `AGROECOLOGICAL` per S5: the catalog is an
  organic-only network and `CONVENTIONAL` would be inventing a claim nobody printed.
- L3 (2026-10-17) — Extraction and blast-radius measurement before writing. `pdftotext -layout`
  gives 180 header matches and 158 unique numbers (the headers repeat on page breaks; the
  later duplicates were confirmed byte-identical per number, so there is no conflicting name);
  numbers 1…158 are all present. The PDF's last pages (34–35) carry fair dates and the venue
  (`Club Villa Gran Parque`, Pozancini 8051) but **no contact directory**, so only #123 has a
  phone. Contract consumers found: `producer.phone` is read in exactly one place
  (`app/barter-trade/[id].tsx`, the `wa.me` deep link), and `PRODUCTION_TYPES` is consumed by
  `gondola-filter-bar.tsx`'s hardcoded `TYPE_OPTIONS` plus the shared schema tests. Decision
  recorded while curating: #123's printed number is a Córdoba landline (`351-6480335`), so it
  is stored as `+543516480335` and the doc keeps saying the deep link needs the `9` mobile
  prefix to actually resolve on WhatsApp — the catalog prints what the fair prints.
- L4 (2026-10-17) — Requirement change, verbatim: _"si el productor no tiene teleohono para
  el whstas, le podemos agregar uno por defecto? estamos en POC"_ and then _"es requerido si
  el productor no tiene telefono para el whatsapp, le podemos agregar uno por defecto? estamos
  en POC"_. Reading: the phone is required **because** WhatsApp coordination needs it, so the
  contract does not relax — `producerSchema.phone` goes back to required and the POC fills the
  gap with one default number. That reverses the part of L2(a) that made the field optional and
  the TASK-2 behaviour committed in `15ad3ed` (the screen hid the affordance and said the
  coordination happened outside the app); S4 and both tasks are rewritten above, nothing else
  moves. `DEFAULT_POC_PHONE` lives in `whatsapp-utils.ts` rather than in the catalog so a single
  documented constant is the only place the placeholder exists — the alternative, 157 invented
  numbers inside the catalog data, is the one shape that would survive unnoticed once real
  numbers arrive.
- L5 (2026-10-17) — TASK-3, the catalog. Shapes decided while transcribing:
  `apps/mobile/src/features/barter/producer-catalog.ts` holds `PRIMAVERA_2026_CATALOG` (one
  line per printed row: number, id, name, place, claim) plus a `PLACES` table of 43 locality,
  region and province centroids; a producer points at a place instead of repeating numbers, so
  a wrong centroid is corrected once. Four curation rulings, all leafed through against the
  printed page: (a) **#1 `naturaleza-viva` and #102 `sabado` keep the address, coordinates and
  phone they already carried** (Guadalupe Norte and Umepay, both genuinely in Santa Fe and
  Calamuchita) instead of being degraded to a centroid, and #1 keeps `ORGANIC` even though its
  header prints "Agroeco", because stored packages are typed `ORGANIC` against it; (b) producers
  whose header names no recognizable place (`JACTANCIA`, `SACHA PASTAS`, `PRIMITIVA`, …) get the
  documented `sin-localidad` placeholder and an address that says so, rather than a guessed
  province; (c) the printed `351-6480335` is stored as `+543516480335` and #123 is the only entry
  with a real number — its Córdoba place is the single location this catalog infers rather
  than reads, and it comes from that printed area code; (d) ids are the ASCII slug of the name (`quillen`, `dona-mecha`,
  `reciclando-utopias`) while display names keep the accents the catalog prints (`Quillén`,
  `Doña Mecha`, `Mamá Baker`), because the id is the persisted value and the name is what the
  producer reads on screen. `SEED_PRODUCERS` becomes the catalog plus `COLMENAS_DEL_SOL`
  (159 entries) and **the default identity is pinned to `PRODUCER_IDS.VERMUT` instead of
  `SEED_PRODUCERS[0]`**, which is the unrequested behaviour change a reordered seed list would
  otherwise have slipped in — the screen still opens as Vermut Sabado.
- L6 (2026-10-17) — TASK-5 pins, and two existing tests re-pointed at intent. The Haversine test
  in `barter-store.test.ts` read `SEED_PRODUCERS[0]` and `[1]` with the comment "Mendoza (Vermut)
  to Santa Fe"; the seed list is now the printed catalog, so `[0]`/`[1]` are #1 and #2 (two Santa
  Fe producers, ~300 km apart). It now selects both producers **by id** and keeps its 600–1000 km
  band, which still holds because those two kept their coordinates — the test stopped depending on
  seed order, and no expected distance was relaxed. `producer-catalog.test.ts` pins the
  transcription: 158 rows numbered 1…158, unique ids and names, `sabado`↔#102 and
  `naturaleza-viva`↔#1, every row validating against `producerSchema`, every coordinate inside
  Argentina, the default-phone fallback plus #123's printed number, the claim counts
  (4 VEGAN, 4 BIODYNAMIC, 10 ORGANIC, 140 AGROECOLOGICAL, 0 CONVENTIONAL), and the seed set
  (catalog + `colmenas-del-sol`, legacy links still resolving). The pins bite: renumbering #158 to
  159 and flipping #146 from VEGAN to AGROECOLOGICAL failed exactly the numbering pin and the claim
  count pin, and both files were restored byte-identical. A second, scripted pass cross-checked
  the 158 names against the extracted headers (only 5 differ, all cosmetic or the deliberate
  `Vermut Sabado`) and every place against the header's own place tokens: **157 of 158 places are
  justified by the printed line**, and the one that is not (#123) is inferred from its printed
  area code, per L5(c).
- L7 (2026-10-17) — Delivery strategy, recorded because the change crosses the 400-line review
  slice (the catalog alone is ~800 authored lines). It ships as **three green work-unit commits
  on `feat/primavera-2026-producer-catalog`, meant to be reviewed commit by commit** rather than
  as one diff: (1) `feat(barter): accept biodynamic and vegan producers without a phone` —
  contract plus the phone decision; (2) `feat(barter): fall back to one documented default phone
for WhatsApp`; (3) `feat(barter): seed the full Primavera 2026 producer catalog` — the data
  table and its transcription pins; (4) the selector. The catalog commit is deliberately the
  big one: it is one row per printed producer, so its review load is a spot check plus the
  scripted cross-check reported in L6, not 800 lines of logic — and splitting a data table
  mid-catalog would make it harder to review, not easier. The two E2E specs that clicked the
  chip row (`barter-copy-link.spec.ts`, `barter-modal-reset.spec.ts`) and the token anchor
  (`barter-token-render.spec.ts`) travel with the selector commit, because the selector is what
  invalidated them. If a pull request is opened, the recommendation is stacked review in that
  order; push and PR stay a human decision.
- L8 (2026-10-17) — Requirement change, verbatim: _"podemos mejorar la UI/UX para que el
  usuario sepa mejor que puede cambiar de productor?"_ (with two captures of the header). Reading:
  S6 built the mechanism but not the affordance — the trigger repeated the active producer's name
  inside a green chip, so it read as a status badge, and the label above it said "Cambiar identidad
  (simular contraparte en otra pestaña o aquí)", which is the POC's implementation detail rather
  than an instruction. S6 is refined, not replaced: the switcher is still one searchable selector.
  What changed in `producer-header-switcher.tsx`: the label is now the instruction `CAMBIAR DE
PRODUCTOR`, a second line states the size of the catalog ("Buscá por nombre o localidad entre
  los N productores de la red"), and the trigger carries a search glyph so the chip reads as an
  action instead of a badge. The two-tab simulation sentence moved into the selector sheet, under
  the count and only on web, which is the only place it is true.
  Two things this exposed, both fixed: the decorative glyph landed in the button's accessible name
  as an empty node (the E2E anchor saw `" Vermut Sabado"`, and `barter-token-render.spec.ts` timed
  out for two minutes waiting for `"Vermut Sabado"` with `exact: true`), so the trigger states its
  `accessibilityLabel` explicitly instead of letting a decorative icon shape it; and the accessible
  name is again exactly the producer name. Verified by re-running that spec alone (2.9s, green) and
  then the whole `make check-e2e-web` suite.
- L9 (2026-10-17) — Native review of the final candidate. Lineage `review-df9b3ba69360fd95`
  (risk, readability, reliability), target `sha256:618976f4…`, 17 files / 2.456 lines, tier
  `medium`, consent resolved by the host. The three-lens group capture failed once at the host
  relay (`review-risk`, `pi-failed`, terminated after 10s), so the slots were run one at a time
  from fresh STATUS, exactly as the provider instructed instead of replaying the group:
  **approved**, authority burned by the exact `acknowledge-approved`. Its four findings are
  advisory and none opened a correction — R1-001 (risk, suggestion, this document line 7: it
  points at an absolute `/var/home/masch/...` path, so the provenance is not portable),
  R1-002 (risk, suggestion, `whatsapp-utils.ts:16`: a real-looking placeholder number is
  committed), R2-001 (readability, warning, `producer-catalog.ts:20-24`: the module header
  restates what the places table and `POC_DEFAULT_PHONE` already say) and R2-002 (readability,
  warning, `producer-header-switcher.tsx:124-137`: the row's `accessibilityLabel` concatenates
  three fields into one string). They are recorded as later work, never as a reason to re-run the
  review on this candidate.
- L10 (2026-10-17) — Requirement change, verbatim: _"borramos el productor extra y sus
  productos?"_, confirmed with _"Sí, borralo con su paquete"_. S3 is rewritten above: the
  catalog-only seed wins over keeping `colmenas-del-sol` for its package. What went with it:
  `PRODUCER_IDS.MIEL`, `COLMENAS_DEL_SOL`, `pkg-miel-1kg` (5 → 4 seeded packages), and the six
  pins that used them as a convenient third producer. Each was re-pointed at a real producer
  instead of being deleted, so the rules they pin still have a subject: the cascading-cancel test
  now has its second competing proposal come from `sabado`, the "target package belongs to
  another producer" cases target `pkg-vermut-miel`, the party-guard "outsider" is
  `granja-nova` (a printed producer that is nobody's party), the inbox "no alternative
  packages" case uses a producer that ships none, and the E2E modal-reset spec clicks
  `Pack 4 Botellas Vermut Rosso 750ml` for its second open. The `prod-miel` alias stays mapped to
  `colmenas-del-sol` on purpose — it is the id older builds wrote — and a new pin asserts that
  both the id and the display name now resolve to nothing.
- L11 (2026-10-17) — Requirement change, verbatim: _"se puede hacer que la pantalla de selector
  de productor indique quien tiene match por responder?"_ (with a capture of the selector). S7 is
  added above. The rule already existed in one place — `getMatchActionAvailability` decides whose
  turn it is, and the header's `actionableCount` restates it with its own status list — so the new
  `isAwaitingReply` / `countMatchesAwaitingReply` in `inbox-utils.ts` derive from that owner
  instead of adding a third copy of the status table: a party owes an answer exactly when the FSM
  offers it an action. The switcher gains an optional `matches` prop (all matches, not only the
  active producer's, because the question is about the others) and both screens pass it; a row
  with a count renders a `warning` badge and says the count in its `accessibilityLabel`. RED
  first: the five new cases failed with `SyntaxError: Export named 'countMatchesAwaitingReply' not
found`. The observable proof is a new E2E (`barter-selector-awaiting-reply.spec.ts`) that
  proposes a trade as `sabado`, opens the selector and asserts the target carries
  `1 por responder` while the requester and an uninvolved producer carry none — and it bites:
  neutering the badge condition makes it fail with `Expected: "1 por responder"`.
