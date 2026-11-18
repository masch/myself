# Barter: multi-PAP trades — two-sided carts with exact PAP balance

Issue: [#162](https://github.com/masch/myself/issues/162). Generalizes the
strict `1 package ↔ 1 package` trade to `Σ PAP offered ↔ Σ PAP target` —
two-sided carts — keeping every package priced at exactly 1 PAP, with real
stock, configurable round limit (default 50) and lazy expiry.

## Specs

- S1: "A trade is `{ offeredLines: Line[], targetLines: Line[] }` with `Σ units(offered) === Σ units(target) ≥ 1`." A trade line is `{ packageId, units }`, units ≥ 1 of an exact package. The current 1:1 trade is one line per side with units 1 (regression case).
- S2: "Symmetry is a hard rule: Σ PAP offered must equal Σ PAP target." Unbalanced carts are rejected with the exact message "Los dos lados deben sumar la misma cantidad de PAP".
- S3: "Stock is real (option a)": every package declares `stockUnits`; a cart line's units ≤ that package's available stock; accepting a trade consumes `units` from each line's stock (both sides); rejecting/cancelling/expiring restores it. "No overselling: the sum of open proposals' reservations against a package must not exceed its stock." Over-stock rejection names the available number.
- S4: "Counter-offers replace whole sides": a counter-offer proposes a new cart for one side (or both), each still balancing Σ PAP.
- S5 (amendment rule 7): "Counter-offer Σ is free": a counter-offer may lower or raise the total (2↔2 or 4↔4 against 3↔3), always validating Σ === Σ and available stock. Asymmetric (2↔3) stays rejected with the S2 message.
- S6 (amendment rule 8): "Re-check is mandatory": every counter-offer returns to the other producer; nobody accepts their own proposal; each counter-offer fully replaces the prior state.
- S7 (amendment rule 9): "Round limit is configurable": `MAX_COUNTER_ROUNDS` (default 50), app-level constant. On the final permitted round the receiver may only accept or reject.
- S8 (amendment rule 10): "Expiration is configurable": `PROPOSAL_TTL_MS`; each live proposal stores `expiresAt`; expiry is lazy (checked on read/interact). After expiry the trade must be re-proposed. (TTL already exists: `ttlHours` default 48.)
- S9 (amendment rule 11): "One active reservation per match": each new counter-offer releases the previous round's reservation and reserves only the current one; reservations released on rejection, expiry, or close.
- S10: Stock consumption/restoration becomes per-line. The `papValue === papValue` equality check disappears — the Σ rule subsumes it.
- S11: Cascading cancellation: accepting a trade that depletes a package cancels other open proposals demanding it (existing behavior, now per-line).
- S12: Config lives in one place (`shared/barter` config constants): `MAX_COUNTER_ROUNDS = 50`, `PROPOSAL_TTL_MS`.

## Tasks

- [x] T1 (S12, S1): Shared config constants (`MAX_COUNTER_ROUNDS`, `PROPOSAL_TTL_MS`) and `TradeLine` schema; commit.
- [x] T2 (S1, S2): `tradeMatchSchema` with `offeredLines/targetLines`, derived `totalPap`, `round`; RED tests for Σ===Σ and 1:1 regression; commit.
- [x] T3 (S3, S9, S10): `createTradeProposal` accepting carts: Σ validation, derivability, ownership, stock-minus-open-reservations; commit.
- [x] T4 (S4–S7, S9): `counterOfferTradeMatch` on line lists: free Σ, round limit, one active reservation; commit.
- [x] T5 (S3, S10, S11): accept/confirm/rollback per line with cascading cancellation; commit.
- [x] T6 (S8): lazy expiry per line model (release reservations on sweep); commit.

## Log

- L1: User request (verbatim): "podemos analizar que implica el issue 162?" then negotiation amendments — counter-offer may be 2 PAP with re-check by original offerer; counter-offer may exceed; "podemos poner un limite de 50 rondas configurable y también el tiempo de expieracion"; "ok" to start Step 1 (foundation, no UI).
- L2: Issue #162 updated with Negotiation rules 7–11 (github.com/masch/myself/issues/162).
- L3: Seed ships stock 1 per package, so cart tests raise stock with `updatePackageStock` to build real inventories.
- L4: Accept semantics decided: the physical stock is the truth at accept; open reservations guard proposal-time overselling, and the cascade cancels the live matches a consumption starves (no FCFS-by-creation).
- L5: FSM gained `COUNTER_OFFERED → COUNTER_OFFERED` for the negotiation ping-pong (rule 8).
- L6: Store rejects trade lines whose package is not exactly 1 PAP — Σ units equals Σ PAP only under the 1-PAP catalog premise.

- **Completion & Delivery**: Step 1 (foundation, no UI change) — commits on the
  feature branch carry T1–T6; `make check-types`, `make check-lint` and
  `make check-tests` green (784 mobile tests, 0 fail); the proposal/counter UI
  keeps one package per side through `primaryOfferedPackageId` /
  `primaryTargetPackageId` adapters (Step 2 replaces them with cart rendering).
  Slice: 5 commits (`ffa1ea3`..`cbac2d2`, 1376 authored lines) on
  `feat/multi-pap-trades-2`; E2E web 48/48 after migrating the two trade
  fixtures to line lists.
