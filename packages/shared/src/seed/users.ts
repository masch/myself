import type { EntityId } from "../schemas";
import type { SeedUser } from "../types/user";

export const SEED_USER_IDS: Record<string, EntityId> = {
  MY_SELF: "e0000000-0000-4000-8000-000000000001" as EntityId,
  ELENA_GOMEZ: "e0000000-0000-4000-8000-000000000002" as EntityId,
  LUCAS_ROSSI: "e0000000-0000-4000-8000-000000000003" as EntityId,
};

export const SEED_USERS: SeedUser[] = [
  {
    id: SEED_USER_IDS.MY_SELF,
    name: "My self",
    email: "myself@example.com",
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
