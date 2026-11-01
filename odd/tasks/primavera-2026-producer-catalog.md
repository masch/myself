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
  **#1 `NATURALEZA VIVA` stays `naturaleza-viva`**. `colmenas-del-sol` is not in the PDF and
  is kept as it is, so its seeded package is not orphaned.
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

## Tasks

- [ ] **TASK-1**: Extend the shared barter contract — `PRODUCTION_TYPES` gains `BIODYNAMIC`
      and `VEGAN`, `producerSchema.phone` stays required — plus the filter labels the mobile UI
      derives from that vocabulary (S5, S4).
- [ ] **TASK-2**: Give the WhatsApp coordination link one documented default number for
      producers the catalog prints without one, and keep the trade screen's link on it (S4).
- [ ] **TASK-3**: Add the Primavera 2026 catalog module (158 entries, unique ids, centroids
      per place, `sabado` and `naturaleza-viva` preserved) and seed the store from it (S2, S3, S4).
- [ ] **TASK-4**: Replace the identity chip row with a searchable selector (S6).
- [ ] **TASK-5**: Pin the catalog invariants with tests: 158 entries numbered 1…158, unique
      ids and names, coordinates inside Argentina, every place key resolvable, `sabado` and
      `naturaleza-viva` resolving to #102 and #1, and the legacy links still resolving (S2–S5).
- [ ] **TASK-6**: Close: full `make check`, `make check-e2e-web`, evidence and delivery notes.

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
