# Gondola: one card per product name

One card per product name per producer; printed sizes leave the card titles and
repeated presentations collapse into the best printed price per measure.

## Specs

- **S1**: Remove the quantity from the product names shown on the gondola — the
  user asked to "borrar en las descripciones la cantidad" because the printed
  quantity next to the "1 PAP" conversion is confusing. The printed size must
  not appear in any card title.
- **S2**: The seed stays the literal transcription of the planilla
  (`primavera-products.ts`); no seed edits, no storage migration — "no importa
  el seed o la migracion, estamos en POC".
- **S3**: Repeated products collapse to one card per name per producer —
  "reducir por nombre de producto dejando uno solo de los que quedarian
  repetidos" — keeping the producer-first gondola intact (all 158 producers
  still present).
- **S4**: The surviving row of a collapsed group is the one with the best
  printed price per measure (user selection: "El de mejor precio por medida
  (formato más grande)"); ties keep the first printed row.
- **S5**: `x N unidades` stays in the name: it is the package count the planilla
  prints, not a size.

## Tasks

- T1 (S1, S2, S5): `stripPrintedSize` + `catalogPackages` title derivation —
  commit 5e942ea.
- T2 (S3, S4): per-producer dedup with best-price-per-measure survivor, printed
  order restored — commit 5e942ea.
- T3 (S1–S5): test suite update — new `catalog-packages-dedup.test.ts`, legacy
  fixtures refreshed (`cat-24`, `cat-2`) — commit 5e942ea.

## Log

- **L1**: «Quisiera modificar las descripcones de los productos de los
  productores que se cargo de la planilla. En la descropcion algunos itenen la
  cantidad del procuto que decia la planilla que al hacer la conversion 1 PAP es
  confuso. Es posible borrar en las descripciones la cantidad ?»
- **L2**: Scope report delivered; user picked "Primero quiero ver el alcance",
  then «no importa el seed o la migracion, estamos en POC. no podriamos reducir
  por nombre de producto dejanod uno solo de los que quedarian repetidos ?»
- **L3**: User selected the survivor rule «El de mejor precio por medida
  (formato más grande)».
- **L4**: Verified: RED→GREEN on the new dedup suite; legacy tests updated;
  `make check` 20/20. Catalog 1527 → 1374 packages; 158 producers intact.
- **L5**: User: "ok, issue y pr" → issue masch/myself#157, branch
  `feat/one-card-per-product-name`.
- **Completion & Delivery**: commit 82875d1 holds T1–T3 and this document;
  `make check` 20/20 (768 mobile tests green, incl. the new dedup suite);
  delivery as PR linking issue #157.
