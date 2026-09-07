# Exploration: Enterprise Hexagonal Architecture & Offline-First Strategy for Mobile Front

- **Change**: `frontend-meditation-api-hexagonal`
- **Execution Mode**: `interactive`
- **Artifact Store**: `hybrid` (OpenSpec + Engram)
- **Delivery Strategy**: `single-pr`

---

## 1. Executive Summary & Vision

The goal is to design an industrial-grade, maintainable architecture for `apps/mobile` (Expo React Native) that supports:

1. **Multiple ABMs / Entity Workflows**: Scalable codebase where adding authors, readings, categories, reflections, etc., follows an identical, predictable pattern.
2. **Shared Kernel Domain (`packages/shared/src/domain`)**: Core business entities (`Reading`, `Author`, `User`), invariant validations, and domain types are extracted from `apps/api` into `@myself/shared`. Zero duplication of business logic, validations, or entity definitions across Frontend and Backend.
3. **Remote API as Single Source of Truth (SSOT)**: The Cloudflare Workers backend (`apps/api` via `@myself/shared/client`) is the authoritative source.
4. **Local-First / Offline-First with Bidirectional Sync**: The mobile client must be 100% usable without network connectivity. Local writes occur immediately in local SQLite, with an asynchronous sync engine reconciling changes with the remote API when connectivity is available.
5. **Strict Hexagonal Architecture (Ports & Adapters)**: Absolute separation between UI Views, Application Orchestration (Hooks/Queries), Domain Models/Contracts, and Infrastructure (SQLite, HTTP clients, Device modules).

---

## 2. Shared Kernel: Domain Extraction into `@myself/shared`

Currently, `apps/api/src/domain/models/` contains `author.entity.ts`, `reading.entity.ts`, and `user.entity.ts`. Leaving these inside `apps/api` would force `apps/mobile` to duplicate domain logic or violate boundary isolation.

### Structure of `@myself/shared`:

```
packages/shared/src/
├── domain/                      # Domain Entities & Business Invariants
│   ├── entities/
│   │   ├── author.entity.ts     # Author entity class & AuthorProps
│   │   ├── reading.entity.ts    # Reading entity class & ReadingProps
│   │   └── user.entity.ts       # User entity class & UserProps
│   └── errors/                  # Domain business errors
├── schemas/                     # Zod input/output validation schemas
├── types/                       # Primitive domain types (DateTime, Locales, etc.)
└── client/                      # Typed Hono RPC client (createApiClient)
```

- **Backend Usage**: `DrizzleReadingRepository` maps DB rows to `Reading` from `@myself/shared`.
- **Frontend Usage**: `SqliteReadingRepository` and `HttpReadingApiAdapter` map local rows and HTTP payloads to `Reading` from `@myself/shared`.
- **Business Methods**: Rich entity methods (e.g. `reading.isCompletedToday()`, `reading.getTranslation(locale)`) are defined once in `@myself/shared` and available everywhere.

---

## 3. Market Landscape: Architecture Comparison for Offline-First React Native

| Pattern / Tech                                                                     | Description                                                                                                                               | Pros                                                                                                                                                                                                                                       | Cons                                                                                                                                                        | Verdict for our System                                  |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **A. Naive React Query + Cache Persistor** (`@tanstack/query-persist-client-core`) | Serializes HTTP responses (JSON blob) into local storage (AsyncStorage/SQLite key-value).                                                 | Simple to configure; familiar API.                                                                                                                                                                                                         | **Fails for multi-ABM offline writes**: No relational queries, no SQL joins, cannot perform local indexing or complex relational mutations offline.         | ❌ **Rejected** (Does not scale for true ABMs offline). |
| **B. Proprietary Cloud Sync Engine** (e.g. WatermelonDB, PowerSync, ElectricSQL)   | Embedded sync engines with custom sync protocols and backends.                                                                            | Powerful automated syncing protocols.                                                                                                                                                                                                      | Heavy vendor/engine lock-in; requires dedicated sync server or Postgres logical replication, breaking our lightweight Hono/Cloudflare + Turso architecture. | ❌ **Rejected** (Excessive infrastructure overhead).    |
| **C. Hexagonal Local-First with Outbox Pattern + TanStack Query**                  | **Domain Ports** + **Local SQLite as Read/Write Cache** + **Transactional Outbox Table** + **TanStack Query as Application Coordinator**. | - Zero UI lag (instant local reads & writes).<br>- Pure standard SQLite (`expo-sqlite`).<br>- Cloudflare/Hono remains simple REST/RPC without proprietary sync servers.<br>- Complete decoupling: UI never knows about network or storage. | Requires disciplined layering and clear sync state management (`synced`, `pending_insert`, `pending_update`, `pending_delete`).                             | 🏆 **RECOMMENDED (Industry Standard)**                  |

---

## 4. Hexagonal Architecture Topology for `apps/mobile`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER (UI)                               │
│  apps/mobile/src/app/(tabs)/*, src/components/*                             │
│  - Pure presentational components & screens.                                │
│  - ONLY consumes custom hooks from the Application layer.                   │
│  - Zero knowledge of SQLite, HTTP, Fetch, or Hono.                          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ consumes
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    APPLICATION LAYER (Use Cases & Hooks)                    │
│  apps/mobile/src/features/{entity}/hooks/* (e.g. useReadings, useAuthors)   │
│  - Coordinated via TanStack Query (useQuery, useMutation).                  │
│  - Manages reactive UI state, background invalidation, and UI loading/error.│
│  - Orchestrates domain ports (`IReadingRepository`, `ISyncEngine`).          │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ depends on
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                      DOMAIN LAYER (Shared Kernel & Ports)                   │
│  @myself/shared/domain/* (Entities: Reading, Author, User)                  │
│  apps/mobile/src/features/{entity}/domain/* (Ports: IReadingRepository)     │
│  - Core interfaces: `IReadingRepository`, `ISyncQueueRepository`.           │
│  - Entity models & business validation rules (Zod).                         │
│  - Pure TypeScript: no React, no React Native, no database imports.         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ implemented by
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER (Adapters)                          │
│                                                                             │
│  ┌─────────────────────────────────┐   ┌─────────────────────────────────┐  │
│  │   Primary / Local Storage       │   │    Remote HTTP Client           │  │
│  │   (expo-sqlite)                 │   │    (@myself/shared/client)      │  │
│  │   - Local relational DB         │   │    - Typed Hono RPC client      │  │
│  │   - Outbox sync queue table     │   │    - Network status listener    │  │
│  └────────────────┬────────────────┘   └────────────────┬────────────────┘  │
│                   │                                     │                   │
│                   └──────────────────┬──────────────────┘                   │
│                                      │                                      │
│                      ┌───────────────▼───────────────┐                      │
│                      │         Sync Engine           │                      │
│                      │  Reconciles Outbox <-> API    │                      │
│                      │  Background sync on reconnect │                      │
│                      └───────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. How the Flow Works in Practice (The Outbox Pattern & Event-Driven Sync)

### 1. Lectura (Query Flow)

1. Screen mounts -> calls `useReadings()`.
2. `useReadings()` invokes `useQuery({ queryKey: ['readings'], queryFn: () => readingRepo.getAll() })`.
3. `readingRepo.getAll()` reads **directamente de SQLite local**, devolviendo instancias de `Reading` de `@myself/shared`. La respuesta es instantánea (< 5ms).
4. En segundo plano (o al montar si hay red), el Sync Engine consulta la API remota (`GET /v1/readings?since=timestamp`). Si hay novedades, actualiza SQLite e invalida el query de TanStack para refrescar la UI.

### 2. Escritura / Mutación (Command Flow - Offline-First)

1. Usuario crea o edita un registro en la UI -> llama a `createReading(data)`.
2. El hook invoca `useMutation({ mutationFn: (data) => readingRepo.save(data) })`.
3. El adaptador de SQLite ejecuta una transacción atómica:
   - Inserta la lectura en SQLite con `sync_status = 'pending'`.
   - Inserta un evento en la tabla `sync_outbox` (`entity: 'reading'`, `action: 'CREATE'`, `payload: {...}`, `created_at`).
4. La UI se actualiza de inmediato (optimistic / instant local state).
5. Si hay red, el Sync Engine toma el registro del outbox, lo envía a `POST /v1/readings`. Al recibir HTTP 200, marca `sync_status = 'synced'` y purga el outbox. Si falla o no hay conexión, queda encolado para reintentar automáticamente al recuperar conectividad.

### 3. Frecuencia y Disparadores de Sincronización (Push & Pull Lifecycle)

| Evento                               | Push (Subir mutaciones locales)      | Pull (Bajar novedades remotas)                |
| ------------------------------------ | ------------------------------------ | --------------------------------------------- |
| **Al crear/editar en UI**            | Inmediato en background (si hay red) | —                                             |
| **Al abrir la app (Mount)**          | Vacía cola pendiente en outbox       | Descarga novedades (`since={last_synced_at}`) |
| **Al volver a primer plano (Focus)** | Si hay pendientes                    | Si pasaron > 5–10 min desde el último pull    |
| **Al reconectar señal de red**       | Inmediato                            | Inmediato (post-push)                         |
| **Pull-to-refresh en UI**            | —                                    | Inmediato bajo demanda                        |

---

## 6. El Rol de TanStack Query en Esta Arquitectura

- **Estandarización de ABMs**: Todos los hooks (`useReadings`, `useAuthors`, `useCategories`) tienen la misma forma mental: `{ data, isLoading, isError, mutate }`.
- **Invalidación Reactiva**: Cuando el Sync Engine termina de bajar cambios remotos o procesar el outbox, ejecuta `queryClient.invalidateQueries(['readings'])` y toda la UI se refresca.
- **Conexión Inteligente**: Integrado con `@react-native-community/netinfo` vía `onlineManager.setEventListener`.
- **Límite Claro**: TanStack Query solo gestiona la reactividad y el estado en memoria; la persistencia offline es 100% de SQLite.

---

## 7. Estructura de Carpetas Propuesta

```
packages/shared/src/
├── domain/entities/                    # Reading, Author, User entities (Shared Kernel)
├── schemas/                            # Zod schemas
└── client/                             # Hono RPC client

apps/mobile/src/
├── core/                               # Infraestructura transversal
│   ├── api/                            # Cliente API configurado
│   ├── db/                             # expo-sqlite init, migraciones y sync_outbox
│   ├── query/                          # QueryClient provider y setup
│   └── sync/                           # Sync Engine (Outbox processor & reconciler)
│
├── features/                           # Módulos de dominio / ABMs
│   ├── readings/                       # Feature de Lecturas de Meditación
│   │   ├── domain/                     # Puertos (IReadingRepository)
│   │   ├── infrastructure/             # SqliteReadingRepository (con Outbox) y HttpReadingApiAdapter
│   │   ├── hooks/                      # useReadings, useCreateReading (TanStack Query)
│   │   └── components/                 # Componentes visuales
│   └── meditation-session/             # Orquestación de la sesión (temporizadores, audio, DND)
│
└── app/                                # Expo Router (rutas y pantallas limpias)
    ├── (tabs)/
    │   ├── meditation.tsx              # Consume useReadings() y useMeditationSession()
    │   └── ...
    └── _layout.tsx                     # Inyecta QueryClientProvider y SQLiteProvider
```

---

## 8. Ready for Proposal

Sí. La extracción del Shared Kernel a `@myself/shared` completa el diseño, garantizando cero duplicación de entidades y validaciones entre front y back.
