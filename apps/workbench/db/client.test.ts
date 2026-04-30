import { describe, expect, it, afterEach } from "vitest";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import Database from "better-sqlite3";
import { openDb } from "./client.js";
import { schemaVersion } from "./schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "migrations");

function applyMigrations(url: string) {
  const sqlite = new Database(url);
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  sqlite.close();
}

const tempDirs: string[] = [];

afterEach(() => {
  while (tempDirs.length) {
    const d = tempDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("workbench db", () => {
  it("applies migrations and round-trips a schema_version row through Drizzle", () => {
    const dir = mkdtempSync(join(tmpdir(), "workbench-db-"));
    tempDirs.push(dir);
    const url = join(dir, "test.sqlite");

    applyMigrations(url);

    const db = openDb(url);
    db.insert(schemaVersion).values({ version: 1, note: "phase-a skeleton" }).run();
    const rows = db.select().from(schemaVersion).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.version).toBe(1);
  });
});
