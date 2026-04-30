import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type WorkbenchDb = ReturnType<typeof openDb>;

export function openDb(url: string = process.env.WORKBENCH_DB_URL ?? "./workbench.sqlite") {
  const sqlite = new Database(url);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}
