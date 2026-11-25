import type { EntityId } from "../../primitives";
import {
  DEMO_USER_EMAIL,
  DEMO_USER_ID,
  DEMO_USER_NAME,
} from "../auth/demo-user";
import type { SeedUser } from "./contracts";

/**
 * Device-local seed profiles. `MY_SELF` is the shared demo identity (D4): the server
 * seed creates the same id, so no local claim step is needed on first sign-in.
 * The other two profiles keep the existing device profile switcher populated until
 * the session provider replaces it (T6).
 */
export const SEED_USER_IDS: Record<string, EntityId> = {
  MY_SELF: DEMO_USER_ID,
  ELENA_GOMEZ: "e0000000-0000-4000-8000-000000000002" as EntityId,
  LUCAS_ROSSI: "e0000000-0000-4000-8000-000000000003" as EntityId,
};

export const SEED_USERS: SeedUser[] = [
  {
    id: SEED_USER_IDS.MY_SELF,
    name: DEMO_USER_NAME,
    email: DEMO_USER_EMAIL,
    tasks: [
      {
        title: "Setup Expo SDK 57 project",
        category: "Work",
        description: "Configure Expo Router, Native Tabs, and @expo/ui",
        is_done: 1,
      },
      {
        title: "Implement Local-First SQLite storage",
        category: "Work",
        description: "Create schema, domain hooks, and auto-migrations",
        is_done: 1,
      },
      {
        title: "Review PR for Offline Sync",
        category: "Work",
        description: "Evaluate PowerSync vs ElectricSQL architecture",
        is_done: 0,
      },
      {
        title: "Buy specialty coffee beans",
        category: "Shopping",
        description: "Ethiopian Yirgacheffe medium roast",
        is_done: 0,
      },
    ],
  },
  {
    id: SEED_USER_IDS.ELENA_GOMEZ,
    name: "Elena Gómez",
    email: "elena.gomez@example.com",
    tasks: [
      {
        title: "Design UI tokens in Figma",
        category: "Design",
        description: "Apple HIG dynamic colors & Material 3 palette",
        is_done: 1,
      },
      {
        title: "Conduct user testing session",
        category: "Work",
        description: "Interview 5 mobile beta testers on tabs navigation",
        is_done: 0,
      },
    ],
  },
  {
    id: SEED_USER_IDS.LUCAS_ROSSI,
    name: "Lucas Rossi",
    email: "lucas.rossi@example.com",
    tasks: [
      {
        title: "Prepare Sprint Review demo",
        category: "Work",
        description: "Showcase multi-user database switching and SQLite CRUD",
        is_done: 0,
      },
    ],
  },
];
