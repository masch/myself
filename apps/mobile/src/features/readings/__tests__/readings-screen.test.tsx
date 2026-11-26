import { beforeEach, describe, expect, it, mock } from "bun:test";
import React from "react";
import { SEED_AUTHORS, SEED_READINGS } from "@myself/shared";
import { createHookHarness } from "@/context/__tests__/hook-harness";
import type {
  SessionService,
  SessionUser,
} from "@/infrastructure/auth/session-service";
import type { MeditationReadingWithAuthor } from "@/infrastructure/persistence/database";

/**
 * The readings screen's creation entry points (S6, S20).
 *
 * The header action was already gated on `canCurate`, but the "Add New Reading" button and
 * the empty catalog's "Create First Reading" button still opened the creation modal for
 * every session, so a non-admin landed in a form whose `POST /v1/readings` the API answers
 * with 403. These tests drive the real screen through the hook harness: a non-admin session
 * must not render either control and no control it does render may reach `/reading-modal`,
 * an admin session keeps both, and the read-log actions stay available to everybody.
 *
 * Two seams, both one level below the screen. The session comes from the real
 * `SessionProvider` (mocking `@/context/session-context` would leak into the provider
 * tests for the whole run), and the catalog from `@/hooks/use-readings`, which no other
 * test file imports. `Stack`, `router` and `useFocusEffect` are replaced through
 * `@/features/readings/readings-navigation`, the module the screen takes them from,
 * because the preload's `expo-router` mock is fixed for the whole run.
 */

const pushToRoute = mock((_href: unknown) => {});
const recordRead = mock((_id: string) => {});

function StackScreen() {
  return null;
}

mock.module("@/features/readings/readings-navigation", () => ({
  Stack: { Screen: StackScreen },
  router: { push: pushToRoute, back: () => {}, replace: () => {} },
  // expo-router runs the callback as an effect keyed on its identity.
  useFocusEffect: (effect: () => void | (() => void)) => {
    React.useEffect(effect, [effect]);
  },
}));

/** The catalog the screen reads; each test sets it before rendering. */
const catalog: {
  readings: MeditationReadingWithAuthor[];
  isLoading: boolean;
} = { readings: [], isLoading: false };

mock.module("@/hooks/use-readings", () => ({
  useReadings: () => ({
    readings: catalog.readings,
    isLoading: catalog.isLoading,
    refreshReadings: async () => {},
    recordRead,
    removeLastRead: () => {},
    deleteReading: async () => {},
  }),
}));

const USER: SessionUser = {
  id: "e0000000-0000-4000-8000-000000000001",
  name: "My self",
  email: "myself@example.com",
  role: "user",
};

// The provider reads the platform binding at import time; only that binding is replaced.
mock.module("@/infrastructure/auth/session-service-instance", () => ({
  sessionService: {
    async signIn() {
      return USER;
    },
    async signUp() {
      return USER;
    },
    async signOut() {},
    async restore() {
      return { status: "unauthenticated" as const };
    },
  },
}));

const { AppButton, ChipButton } = await import("@/components");
const { SessionProvider } = await import("@/context/session-context");
const { default: ReadingsScreen } =
  await import("../../../app/(tabs)/readings");

const SEEDED_READING = SEED_READINGS[0];
const SEEDED_AUTHOR = SEED_AUTHORS.find(
  (author) => author.id === SEEDED_READING.author_id,
)!;

const READING: MeditationReadingWithAuthor = {
  id: SEEDED_READING.id,
  author_id: SEEDED_READING.author_id,
  created_at: SEEDED_READING.createdAt,
  locale: "es",
  title: SEEDED_READING.translations.es.title,
  content: SEEDED_READING.translations.es.content,
  author_name: SEEDED_AUTHOR.name,
  author_bio: SEEDED_AUTHOR.bio,
  times_read: 0,
  last_read_at: null,
};

function serviceFor(role: string): SessionService {
  return {
    async signIn() {
      return USER;
    },
    async signUp() {
      return USER;
    },
    async signOut() {},
    async restore() {
      return {
        status: "authenticated",
        user: { ...USER, role },
      };
    },
  };
}

type Harness = ReturnType<typeof createHookHarness>;

/** Renders the real screen under a real provider holding the given session. */
async function renderScreen(role: string) {
  const harness = createHookHarness();
  harness.render(
    <SessionProvider service={serviceFor(role)}>
      <ReadingsScreen />
    </SessionProvider>,
  );
  await harness.flush();
  return harness;
}

function button(harness: Harness, title: string) {
  return harness
    .components()
    .find(
      (component) =>
        component.type === AppButton && component.props.title === title,
    );
}

function chip(harness: Harness, title: string) {
  return harness
    .components()
    .find(
      (component) =>
        component.type === ChipButton && component.props.title === title,
    );
}

/** The screen's header options, i.e. what the tab navigator would render. */
function headerOptions(harness: Harness): Record<string, unknown> {
  const screen = harness
    .components()
    .find((component) => component.type === StackScreen);
  expect(screen).toBeDefined();
  return screen!.props.options as Record<string, unknown>;
}

/** Presses every control the rendered tree offers, as a person could. */
function pressEverything(harness: Harness): void {
  for (const component of harness.components()) {
    const onPress = component.props.onPress;
    if (typeof onPress === "function") (onPress as () => void)();
  }
}

function pushedRoutes(): unknown[] {
  return pushToRoute.mock.calls.map(([href]) => href);
}

beforeEach(() => {
  pushToRoute.mockClear();
  recordRead.mockClear();
  catalog.readings = [];
  catalog.isLoading = false;
});

describe("readings screen creation entry points", () => {
  it("offers no creation control to a non-admin session, and none of its controls opens the creation modal", async () => {
    catalog.readings = [READING];

    const harness = await renderScreen("user");

    expect(button(harness, "Add New Reading")).toBeUndefined();
    expect(button(harness, "Create First Reading")).toBeUndefined();
    expect(headerOptions(harness).headerRight).toBeUndefined();

    pressEverything(harness);

    expect(pushedRoutes()).not.toContain("/reading-modal");
  });

  it("offers no empty-catalog creation control to a non-admin session", async () => {
    const harness = await renderScreen("user");

    // The empty catalog still tells a non-admin there is nothing to read...
    expect(
      harness
        .components()
        .some(
          (component) =>
            typeof component.props.description === "string" &&
            component.props.description.includes("Add inspiring passages"),
        ),
    ).toBe(true);

    // ...but offers no way to create the first reading.
    expect(button(harness, "Add New Reading")).toBeUndefined();
    expect(button(harness, "Create First Reading")).toBeUndefined();

    pressEverything(harness);

    expect(pushedRoutes()).not.toContain("/reading-modal");
  });

  it("keeps both creation controls for an admin session, and both open the creation modal", async () => {
    const harness = await renderScreen("admin");

    const add = button(harness, "Add New Reading");
    const create = button(harness, "Create First Reading");
    expect(add).toBeDefined();
    expect(create).toBeDefined();
    expect(headerOptions(harness).headerRight).toBeInstanceOf(Function);

    (add!.props.onPress as () => void)();
    (create!.props.onPress as () => void)();

    expect(pushedRoutes()).toEqual(["/reading-modal", "/reading-modal"]);
  });

  it("keeps the read-log actions available to a non-admin session", async () => {
    catalog.readings = [READING];

    const harness = await renderScreen("user");

    const readNow = chip(harness, "Read Now (+1)");
    expect(readNow).toBeDefined();

    (readNow!.props.onPress as () => void)();

    expect(recordRead.mock.calls.map(([id]) => id)).toEqual([READING.id]);
  });
});
