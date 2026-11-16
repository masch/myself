# Barter: exact 1-PAP catalog with granel/empaquetado sale forms

Re-price every product package to trade at exactly 1 PAP, remove the
"ajuste" disclosure, add a direct (non-PDF) product entry, dedupe per sale
form, boot the catalog from the seed always, and default the gondola to the
sheet layout.

## Specs

- S1: Every package trades at exactly 1 PAP; no card or modal shows any
  adjustment line ("Queda $X arriba/abajo de 1 PAP", "Coincide exacto",
  "Ajuste a 1 PAP"). `papAdjustment` is deleted outright.
- S2: Changing the PAP value re-derives the seeded catalog against the new
  value (`setPapConfigArs`), so by-measure packages land exactly on 1 PAP at
  any configuration, keeping consumed stock and foreign packages.
- S3: The catalog block is a discriminated union by sale form — the
  producer's decision, never the buyer's:
  - `kind: "granel"`: stores `quantity` (what one PAP buys — the only real
    fact), reference price per measure. No container fiction.
  - `kind: "empaquetado"`: stores `presentationCount`/`presentationSize`;
    the handed quantity is always derived (`count × size`), never stored.
- S4: One sale form = one package. Dedup key is producer + title + kind;
  the same good granel and empaquetado coexist as two cards. Same-form
  duplicates collapse to the best price per measure.
- S5: Direct products (no printed row): `DirectProductInput` union derives
  packages from the producer-declared form; ids prefixed `direct-`. The
  first load ships three Vermut Sábado products (all empaquetado).
- S6: The boot always starts from the seed: storage and peer broadcast
  carry only runtime state (matches). Stored packages, stock and PAP
  config never restore the catalog.
- S7: The gondola opens on the sheet layout: `DEFAULT_CARD_VARIANT` is
  `ficha` and the chip row orders `[ficha, cantidad]`. URL contract keeps
  `?card=cantidad` as the written alternative.
- S8: PDF Primavera prices are a reference/example seed, validated in a
  later stage — not an app contract. Next season producers adjust
  quantities on the platform, not via PDF.

## Tasks

- T1 (S1, S2): re-pricing fix + `papAdjustment` deletion — commit 9cbe659.
- T2 (S3, S4): discriminated catalog schema, derivadores PDF/directo,
  lectores, dedup por forma — commit 9cbe659.
- T3 (S5): `DIRECT_SEED_PRODUCTS` block with the three vermut packages —
  commit 9cbe659.
- T4 (S6): seed-first boot in `createBarterStore` — commit 9cbe659.
- T5 (S7): ficha default + chip order — commit 9cbe659.

## Log

- L1 (user request): "quiero ajustar el precio de todos los productos de
  los productores para que valgan exactamente 1 PAP".
- L2: user picked "Cambiar la regla: precio real = 1 PAP exacto", later
  refined to hide sealed-form adjustments, then to delete `papAdjustment`
  entirely once every mode became exact.
- L3: user asked to load 3 direct Vermut Sábado products without the PDF
  format, declaring quantity per PAP; model C (discriminated union) chosen
  over migration-safe shapes because this is a POC.
- L4: user picked "empaquetado" as the name for the sealed form (rejected
  "sellado", "envase").
- L5: user chose boot mode 2: seed on boot, storage only for runtime state.
- L6: user asked the sheet layout first/default and the ficha chip first.
- L7: POC decision — no migration compatibility for stored states; reset is
  the normal path.

- **Completion & Delivery**: commit `9cbe659` holds T1–T5 and this document
  rides the delivery commit; `make check` green (766 mobile tests, tsc,
  lint, prettier, expo-doctor 20/20); native assess of the slice returned
  risk medium / reviewDue false (under budget), writer self-verification
  stands. Delivery as PR from `feat/auto-refresh-persisted-catalog`.
