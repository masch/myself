/// <reference path="../primitives/sql.d.ts" />
import journal from "./meta/_journal.json";
import m0000 from "./0000_hard_jigsaw.sql";

export interface MigrationJournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

export interface MigrationJournal {
  version: string;
  dialect: string;
  entries: MigrationJournalEntry[];
}

export interface SharedMigrationsBundle {
  journal: MigrationJournal;
  migrations: Record<string, string>;
}

export const SHARED_MIGRATIONS: SharedMigrationsBundle = {
  journal: journal as MigrationJournal,
  migrations: {
    m0000,
  },
};
