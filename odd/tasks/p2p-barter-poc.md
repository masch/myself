# P2P Barter POC (Tinder for Direct Producers)

## Objective

Implement a front-end Proof of Concept (POC) for peer-to-peer barter between direct producers using a configurable exchange currency (PAP = 50,000 ARS by default). Supports exact-value trade packages (1 PAP), optimistic matching with cascading stock invalidation, single-round counter-offers, dual-tab real-time testing via `BroadcastChannel`, WhatsApp coordination deep-linking, and mutual delivery confirmation handshake.

## Scope & Constraints

- Monorepo packages: `packages/shared`, `apps/mobile`.
- Domain & Shared Models (`@myself/shared`):
  - `Producer`: `id`, `name`, `productionType` (`ORGANIC` | `AGROECOLOGICAL` | `CONVENTIONAL`), `location` (`address`, `latitude`, `longitude`), `phone`.
  - `ProductPackage`: `id`, `producerId`, `title`, `productionType`, `priceArs`, `papValue` (1 PAP exact), `stockUnits`.
  - `TradeMatch` & FSM: `id`, `requesterId`, `targetProducerId`, `offeredPackageId`, `targetPackageId`, `papSnapshotArs`, `totalPap`, `status` (`PENDING`, `COUNTER_OFFERED`, `ACCEPTED`, `WAITING_DELIVERY`, `COMPLETED`, `REJECTED`, `EXPIRED`, `CANCELLED_INSUFFICIENT_STOCK`, `CANCELLED_BY_PRODUCER`), `deliveryConfirmation` (`confirmedByRequester`, `confirmedByTarget`), `counterOfferHistory` (previous offered package id, timestamp), `expiresAt`, timestamps.
  - Zod schemas and FSM transition validators.

```mermaid
stateDiagram-v2
    [*] --> PENDING: Productor A inicia propuesta

    PENDING --> COUNTER_OFFERED: Productor B contraoferta otro producto (1 PAP)
    PENDING --> ACCEPTED: Productor B acepta (Descuenta stock atómico)
    PENDING --> REJECTED: Productor B rechaza
    PENDING --> EXPIRED: Vence TTL sin respuesta
    PENDING --> CANCELLED_INSUFFICIENT_STOCK: Otro match consumió stock en cascada

    COUNTER_OFFERED --> ACCEPTED: Productor A acepta contraoferta (Descuenta stock)
    COUNTER_OFFERED --> REJECTED: Productor A rechaza contraoferta
    COUNTER_OFFERED --> EXPIRED: Vence TTL de contraoferta
    COUNTER_OFFERED --> CANCELLED_INSUFFICIENT_STOCK: Otro match consumió stock en cascada

    ACCEPTED --> WAITING_DELIVERY: Abre WhatsApp para coordinar logística
    ACCEPTED --> CANCELLED_BY_PRODUCER: Se arrepiente antes de entrega (Rollback stock)

    WAITING_DELIVERY --> COMPLETED: Doble confirmación de recepción (Fin del trueque)
    WAITING_DELIVERY --> CANCELLED_BY_PRODUCER: Cancelación / Conflicto (Rollback stock)

    COMPLETED --> [*]
    REJECTED --> [*]
    EXPIRED --> [*]
    CANCELLED_INSUFFICIENT_STOCK --> [*]
    CANCELLED_BY_PRODUCER --> [*]
```

- Mobile State & Multi-Producer Store (`apps/mobile`):
  - Domain state store managing producers, product packages, active producer profile, and trades.
  - Web multi-producer testing: shared `localStorage` state across browser tabs, producer identity resolved via URL query parameter (`?producerId=<id>`) with fallback to header switcher dropdown.
  - Cross-tab reactive updates using native `BroadcastChannel('p2p-barter-sync')` to reflect match proposals, counter-offers, and stock changes in real-time without a backend.
  - Optimistic acceptance with cascading cancellation of insufficient-stock pending matches.
  - Stock rollback on match cancellation prior to physical completion (`COMPLETED`).
  - TTL expiration and distance filtering (Haversine formula).
- Mobile UI Flow (`apps/mobile`):
  - Header: Active producer identity indicator and switcher dropdown (Vermut Sabado vs. Naturaleza Viva).
  - Gondola / Discovery Screen: Product cards with swipe or match action, PAP badge, distance calculation, and production type badge.
  - Trade Proposal Modal: Select own package to offer (exact 1 PAP balance), submit match.
  - Counter-Offer Modal (1-round limit): Target selects alternative package from requester catalog; requester can only accept or reject.
  - Inbox / Match Management: List incoming and outgoing matches grouped by state.
  - Active Trade Detail Screen: WhatsApp contact deep link (`wa.me` with prefilled message), dual delivery confirmation buttons, cancel button.
- Quality gates: `make check-tests`, `make check-types`, `make check-lint`, `make check-format`.
- Conventional commits without AI attribution.

## Configuration & Runner

- **TDD Mode**: Enabled (RED -> GREEN -> REFACTOR)
- **Test Runner**: `make check-tests`
- **Delivery Strategy**: `ask-on-risk` (forecast: ~450 lines)

## Tasks

- [x] **TASK-1**: Domain Models & Schemas: Define TypeScript interfaces, Zod schemas, and FSM transition validators for Producer, ProductPackage, and TradeMatch in `@myself/shared`.
- [x] **TASK-2**: Multi-Producer Store & BroadcastChannel Sync: Implement domain store with optimistic acceptance, cascading stock invalidation, stock rollback, TTL checks, distance calculation, URL-based identity, and cross-tab `BroadcastChannel` synchronization.
- [x] **TASK-3**: Discovery & Gondola UI: Build product catalog/gondola screen with active producer header switcher, distance filters, production type chips, and trade proposal initiation modal.
- [x] **TASK-4**: Inbox & Counter-Offer Flow: Build match inbox (received/sent), accept/reject actions, and single-round counter-offer selection.
- [x] **TASK-5**: Delivery Handshake & WhatsApp Deep Link: Implement active trade screen with prefilled WhatsApp action, dual delivery confirmation buttons, and cancellation rollback.
- [x] **TASK-6**: Verification & Quality Gates: Run unit tests for FSM transitions and store mutations, verify lint, types, and formatting via Makefile.

## Evidence & Verification

- `make check-tests`: 551 pass, 0 fail across the monorepo (shared 79, api 106, mobile 366), measured with `TZ=UTC` — the timezone CI uses — after the enrollment-fixture fix (PR #81). The barter feature contributes 42 tests across 5 files: 11 domain/FSM tests in `packages/shared/src/modules/barter/__tests__/barter.test.ts`, 8 store tests covering optimistic concurrency, cascading stock cancellation, single-round counter-offers, dual delivery handshakes, and cancellation rollback, 5 gondola component tests, 13 inbox/counter-offer tests, and 5 WhatsApp deep-link tests.
- `make check-types`: **Corregido en L4** — al re-verificar, este gate estaba ROJO (12 errores TS en `apps/mobile`). La afirmación original de typecheck limpio no reproducía sobre los bytes actuales. Tras las correcciones de L4: limpio en los 3 paquetes (`@myself/api`, `@myself/mobile`, `@myself/shared`).
- `make check-lint`: ESLint passed with 0 errors across all packages (3 `@typescript-eslint/array-type` warnings introduced by the barter feature were fixed in the `style(barter)` commit).
- `make check-format`: Prettier code style verified clean.
- `make check-doctor`: **RED, independent of this feature.** It fails both locally and in CI with `ios.icon - cannot access file at './assets/expo.icon'`, a field and directory this branch never touches. Bisect on the tool: `expo-doctor@1.20.2` reports 20 checks passed while `1.21.3` and `1.21.4` report the failure. `expo-doctor` is not a dependency — the Makefile calls `bunx expo-doctor`, so every CI run resolves the newest release; `main`'s last green run was 2026-10-13 with an older resolution. The repository config is the modern SDK 57 `.icon` bundle format, so the tool regressed, not the config. Fixed by pinning the tool — `EXPO_DOCTOR := bunx expo-doctor@1.20.2` in the `Makefile`, shared by both doctor targets, with the regression documented in place (commit `3b5ca93` on PR #81).
- **Completion & Delivery**: Feature complete on branch `feat/p2p-barter-poc` as seven work-unit commits (domain, store, gondola components, inbox/counter-offer, screens and wiring, lint style, docs). Issue: [#79](https://github.com/masch/myself/issues/79). The branch is stacked on `fix/reflections-enrollment-fixture-tz` (PR [#81](https://github.com/masch/myself/pull/81)) because the repository pre-commit hook runs the full affected test suite and `main` is red until that fix lands; it will be rebased onto `main` before the feature PR opens, so the feature diff carries no unrelated file.
- **Risk**: none — items 1-6 checked. No migration and no change to existing stored data (the barter state writes new browser `localStorage` keys only); no auth, permission, credential, or guard touched; no contract others consume changed shape, since the shared barrel, the stack layout, and the home screen only gain additive entries and no existing export, route, or option was modified; the cross-tab `BroadcastChannel` sync is new isolated code rather than a shared lock, queue, or ordering change; no installer, CI, or dependency change; and each behavioral rule (optimistic acceptance, cascading invalidation, single-round counter-offer, stock rollback, delivery handshake, TTL, distance filter) has a unit test that would catch its regression.

## Log

- L1: Sesión 2026-10-14/15 — TASK-1 y TASK-2 completados (dominio + store). TASK-3 quedó implementado (barter.tsx + 4 componentes + tests) pero sin marcar en este documento.
- L2: Sesión 2026-10-15 (retomada) — TASK-3 verificado y marcado. TASK-4 implementado con TDD: RED confirmado (módulo inexistente), GREEN 13/13 en `components/__tests__/inbox-components.test.tsx`. Artefactos: `inbox-utils.ts` (helpers puros: `getTradeRole`, `getMatchActionAvailability`, `getCounterOfferCandidates`), `components/trade-match-card.tsx`, `components/counter-offer-modal.tsx`, ruta `app/barter-inbox.tsx`, botón con contador accionable en `barter.tsx`, `Stack.Screen` registrado en `_layout.tsx`, `checkExpiredMatches` expuesto en `use-barter.ts`. Regla single-round: COUNTER_OFFERED solo permite accept/reject al requester (FSM lo garantiza, la UI lo refleja). Trabajo sigue staged sobre `main` sin commitear por decisión del usuario.
- L3: Sesión 2026-10-15 (continuación) — `make check` completo reveló `check-odd` rojo: el documento exige cierre total (sin tareas pendientes + sección Completion & Delivery). En lugar de maquillar el doc se completó el alcance restante. TASK-5 con TDD: RED confirmado, GREEN 5/5 en `components/__tests__/whatsapp-utils.test.tsx`. Artefactos: `whatsapp-utils.ts` (`buildWhatsAppTradeUrl` sanitiza teléfono a dígitos y encodea mensaje; `buildTradeCoordinationMessage` mensaje pre-armado en español), ruta dinámica `app/barter-trade/[id].tsx` (resumen del intercambio, botón Abrir WhatsApp vía `Linking.openURL`, doble confirmación de recepción con `confirmDelivery`, cancelación con rollback de stock vía `cancelTradeMatch`), botón "Coordinar entrega" en `TradeMatchCard` para matches `WAITING_DELIVERY`, `Stack.Screen` `barter-trade/[id]` en `_layout.tsx`. TASK-6: 31/31 tests barter, `make check` completo en verde.
- L4: Sesión 2026-10-15 (bugfix) — Usuario reporta crash en runtime: `ReferenceError: incomingMatches is not defined` en `<BarterScreen>`. Reproducción: `make check-types` → `src/app/barter.tsx(44,5): error TS2304: Cannot find name 'incomingMatches'`. Causa raíz: `incomingMatches` se usaba en el cálculo de `actionableCount` (línea 44) pero nunca se desestructuraba de `useBarter()`, que sí lo retorna (`use-barter.ts:104`). Fix: agregado a la desestructuración en `barter.tsx`.
  Verificación de gates reveló que la evidencia de L3 no reproducía: `make check-types` estaba rojo con 12 errores (no limpio). Corregidos en el mismo pase, todos en artefactos de TASK-4/5:
  (a) 7× `Card variant="filled"` → `variant="subdued"`: `SurfaceVariant` solo admite `elevated | outlined | subdued` (`src/components/surface.tsx:11`). Cosmético: los 7 usos ya pisan `backgroundColor` con su propio `style`.
  (b) 3× `ThemedText variant="title3"` → `variant="title2"`: la escala tipográfica no tiene `title3`. Los 3 usos son títulos de tarjeta y el glifo `⇄`; el tamaño sí lo controlaba el variant.
  (c) 2 errores de lint (`react/no-unescaped-entities`) en `trade-match-card.tsx` por comillas `"` literales en JSX → `&quot;`.
  Post-fix: `make check-types` limpio (3/3), `make check-lint` limpio (3/3), `make check-format` limpio, 32/32 tests de barter y app en verde.
  Hallazgo no relacionado (fuera del alcance de esta feature): la suite completa da 364/366 — fallan `E2E Vertical Integration > registers every single one of the 14 loaded reflections` y `rejects saving cohort reflection when step is locked ahead of cohort schedule`, ambos por "Enrollment for cohort is closed". Causa raíz demostrada: el fixture de `e2e-reflection-flow.test.ts` fija `program_start_date='2026-09-15'` + `enrollment_grace_days=30` → deadline 2026-10-15, y `bun test` resuelve `DateTime.today()` con offset 0 (UTC), que ya es 2026-10-16. Con `TZ=America/Argentina/Buenos_Aires` esos 2 pasan, pero fallan otros 2 del mismo dominio (`handles midnight crossing correctly`, `never locks a missed reflection from a past date within grace window`). Es fragilidad de fecha/timezone preexistente en la feature de reflections: expiró al cruzar la medianoche UTC. Trabajo sigue staged sobre `main` sin commitear.
- L5: Sesión 2026-10-15/16 (entrega) — Autorización explícita del usuario para crear issue y PR. Verificado antes de escribir: el repo **no tiene Issue Forms ni PR template** (404 en remoto), ni labels `status:approved`/`type:*`, ni workflow que valide referencias a issues — la convención real es título conventional + body markdown, y el gate efectivo es un comentario humano con 🥦 (`broccoli-approval.yml`). Issue #79 creado para la feature (sin duplicados: búsqueda sobre barter/trueque/PAP/góndola/producer). PRs mergeados recientes miden 1.190–4.557 líneas, así que un PR único entra en la práctica del repo; el usuario eligió "fix de TZ + un PR de feature".
  Hallazgo 1: `main` está ROJO desde UTC 2026-10-16 por el fixture de fecha (L4) → issue #80 + PR #81 (2 archivos, `enrollment_grace_days` 30 → 36500 como centinela de 100 años, con comentario explicando por qué no bajarlo). Verificado en CI: los unit tests pasan.
  Hallazgo 2 (nuevo, independiente): `check-doctor` falla local **y en CI** con `ios.icon - cannot access file at './assets/expo.icon'`, campo y directorio que esta rama no toca. Bisect: `expo-doctor@1.20.2` → 20 checks passed; `1.21.3`/`1.21.4` → falla. `expo-doctor` no es dependencia, la Makefile usa `bunx expo-doctor` → CI resuelve la última release en cada corrida; el último verde de `main` (2026-10-13) usó una resolución anterior. El config del repo es el bundle `.icon` de SDK 57 (formato correcto), o sea que regresionó la herramienta. Decisión del usuario: pinnearla en el mismo PR #81 (commit `3b5ca93`): `EXPO_DOCTOR := bunx expo-doctor@1.20.2` en la Makefile, compartido por ambos targets de doctor, con comentario explicando la regresión para que nadie lo suba a ciegas. Verificado: `make check-doctor` → 20/20 checks passed.
  Entrega: rama `feat/p2p-barter-poc` apilada sobre `fix/reflections-enrollment-fixture-tz` — no por capricho: el hook `pre-commit` corre `check-affected` (suite completa) y `main` rojo lo bloquea (el primer intento de commit falló ahí y no creó commit). 7 commits work-unit: dominio (355), store+geo+hook (928), componentes góndola (746), inbox+WhatsApp (870), pantallas+rutas+home (716), style lint (6), doc. Se rebasea sobre `main` cuando #81 mergee para que el diff de la feature no arrastre archivos ajenos.
  Lint: 3 warnings `@typescript-eslint/array-type` (`Array<T>` → `T[]`) en `gondola-filter-bar.tsx` (2) y `use-barter.ts` (1), introducidos por la feature → corregidos.
  Seeds ajenos parkeados: `packages/shared/src/modules/reflections/seed.ts` (+35 líneas: 1 pregunta estoica + 1 program step content) queda **sin commitear** y fuera de todo PR. Verificado que son inertes para los tests: 551/551 en verde sin ellos. El usuario decide su destino.
  Nota de proceso: el hook valida el **worktree**, no el árbol del commit, así que un barrel parcial (para que cada commit compile aislado) rompe el typecheck actual — se descartó esa estrategia y se verifica la punta, que es lo que mira CI.
