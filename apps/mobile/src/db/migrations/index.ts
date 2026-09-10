/// <reference path="../../types/sql.d.ts" />
import journal from "./meta/_journal.json";
import m0000 from "./0000_sharp_jetstream.sql";

export const MOBILE_MIGRATIONS = {
  journal,
  migrations: {
    m0000,
  },
};
