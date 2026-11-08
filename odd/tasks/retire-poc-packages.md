# Retire the four POC packages

Feature: the gondola carries only packages derived from the printed Primavera 2026 catalog. The four handwritten POC packages (`pkg-vermut-pack4`, `pkg-vermut-miel`, `pkg-queso-gouda`, `pkg-queso-provoleta`) are retired, and a persisted install purges them on load instead of carrying them forever.
Touched: `apps/mobile/src/features/barter/barter-store.ts`, its comments in `components/product-package-card.tsx`, and `apps/mobile/src/features/barter/__tests__/**`.

## Specs

S1. `quisiera sacar los 4 POC` — `SEED_PACKAGES` seeds only `catalogPackages()`: no seeded id starts with `pkg-`, and the seed count goes from 1531 to 1527.

S2. A persisted state that names a package this build does not derive from the catalog shows none of them after a reload: the stored package is dropped, the drop is written back so the next load does not have to repeat it, and a peer tab running an older bundle cannot resurrect one either.

S3. `Que desaparezca` (the "Pack 6 Provoletas Estacionadas") — no catalog row is invented, and `primavera-products.ts` / `producer-catalog.ts` stay byte-identical. A product the PDF does not print leaves the gondola.

S4. `Remapearlos al equivalente` — a stored `TradeMatch` naming a dropped package is rewritten to its catalog equivalent when the catalog carries the same product: `pkg-vermut-pack4` → `cat-890` (Vermut Rosso x 750 ml, producer 102 → 4 botellas = 1 PAP) and `pkg-queso-gouda` → `cat-5` (Queso Gouda horma de aprox. 3 kg, producer 1 → 2,26 kg = 1 PAP). A match that names a dropped id with no known equivalent (`pkg-vermut-miel`, `pkg-queso-provoleta`) is dropped, because crediting another producer's product would record a trade that never happened.

S5. `solo deben quedar los delcataglo con los precios y formato del catalogo` — every card in the gondola renders the printed list price and the `1 PAP ≈ …` line, because every package carries the catalog block. No card falls back to the bare `Valor: $50.000 ARS` copy for seeded or loaded data.

## Tasks

- [x] T1 — S1 — `SEED_PACKAGES` carries only the catalog; the "four POC packages stay" doc block and the "four POC packs" card comment retired. Route: inline. Commit: feature branch.
- [x] T2 — S4, S5 — `keepOnlyCatalogPackages` drops every package this build does not derive, remaps the two matches the catalog carries and drops the rest. Test-first in `catalog-seed.test.ts`. Route: inline. Commit: feature branch.
- [x] T3 — S2 — the purge runs on the `localStorage` load path **and** on the peer sync, with `barter-catalog-only-migration.test.ts` pinning both. Route: inline. Commit: feature branch.
- [x] T4 — S1-S4 — the barter suite moved off the POC ids: `__tests__/fixture-packages.ts` holds the four shapes as `pkg-fixture-*`, the guard tests inject them, and the payload, seed and component tests use catalog ids. Route: inline. Commit: feature branch.
- [x] T5 — S1-S5 — `make check` green: 723 mobile tests across 77 files, plus types, lint and format. Route: inline. Commit: feature branch.
- [x] T6 — record this document and its Engram mirror. Route: inline. Commit: feature branch.

## Verification Evidence

- `make check-tests`: `@myself/shared` 91 pass, `@myself/api` 106 pass, `@myself/mobile` 723 pass / 0 fail across 77 files.
- `make check`: tests, types, lint, format and `check-odd` all green.
- RED before GREEN: with the POC entries removed from the seed and nothing else changed, the suite reported 38 failures across the barter store, the payload tests and the two card tests; the fixture migration and the rewritten seed pins brought it to 0.
- Self-verification found a real hole after the first commit: the peer sync filtered the broadcast **packages** through `mergePeerPackages` but applied the broadcast **matches** verbatim, so a tab on the old bundle could still hand over a trade naming `pkg-vermut-pack4`. Pinned RED (`never lets a peer trade arrive naming a package this build cannot derive`, 1 failure), then fixed by running `keepOnlyCatalogPackages` on the peer payload before validation, then green.
- The independent verifier the ASSESS plan requires could not run: `gentle-ai-verify` failed with a provider quota error, as did `gentle-ai-explore` and `gentle-ai-worker` earlier in the session. Nothing was retried, per the unavailable-verifier rule; the six invariants were checked inline instead (peer packages, peer matches, match package-id fields, unsilent data loss, untrusted bytes, per-spec pins).

## Completion & Delivery

- **Completion & Delivery**: Implemented on branch `feat/catalog-only-packages` (branched from `fix/gondola-search-native-keyboard` so the two concerns never share history) as three work-unit commits: `a186a85` carries the behavior with its pins, a second carries this document, and a third closes the peer-sync hole self-verification found. The touched surface is 12 modified files plus 3 new ones, ~715 authored lines, of which the overwhelming majority is the test migration the removal forced — that is the review cost of a seed that other suites used as their fixture, and it is why the slice is above the ~400-line budget. Nothing outside `apps/mobile/src/features/barter/` is touched: the catalog transcription, the producers and the shared schemas are byte-identical. The branch also carries the 7 commits it was cut from (`fix/gondola-search-native-keyboard`), which are not part of this feature. Merge, push and any store release stay the user's decision.

## Log

L1 (user, verbatim): `que tenriamos que hacer para que todos los productos sean de cataloogo? quisiera sacar los 4 POC`

L2 (user decision, verbatim): "El \"Pack 6 Provoletas Estacionadas\" no tiene fila en el PDF Primavera 2026. ¿Qué hacemos?" → `Que desaparezca`. "Los matches guardados apuntan a los ids de los 4 POC. ¿Qué hacemos con ellos al purgar?" → `Remapearlos al equivalente`.

L3 (evidence, inline): `producer-catalog.ts:975` — `sabado` is printed producer **102**, and `primavera-products.ts:922` shows its only row is `[890, 102, "Vermut Rosso x 750 ml (muy bueno)"]`. The 1 kg honey rows belong to other producers (`[537, 54]`, `[702, 75]`, `[787, 86]`, `[788, 87]`, `[1160, 127]`), so `pkg-vermut-miel` has no same-producer equivalent and is dropped. `naturaleza-viva` is printed producer **1**, whose row `[5, 1, "Queso Gouda (horma de aprox. 3 kg)"]` replaces `pkg-queso-gouda` with a better package. A case-insensitive `provoleta` search finds the string only in `barter-store.ts` and its tests: no catalog row exists.

L4 (routing): `gentle-ai-explore` was launched for the POC → catalog mapping and failed with a quota error, so discovery ran inline under a bounded budget instead.

L5 (design): the purge reads the catalog id set, so anything that is not a shipped catalog package is dropped; the explicit `RETIRED_PACKAGE_REMAP` only preserves the two matches whose product the catalog really carries.

L6 (user, verbatim): `si, solo deben quedar los delcataglo con los precios y formato del catalogo y cualquier otro debe ser borrado`

L6a: this widens L5 — the rule is no longer the four known ids but "only catalog packages survive", applied to the stored state and to a peer sync. Rewritten: S2, S5. Reopened: T2, T3.

L7 (defect found in self-verification): the broadcast path applied peer **matches** unfiltered, so an old tab could still inject a trade on a retired package. Fixed with `keepOnlyCatalogPackages` on the peer payload and pinned by a RED test.
