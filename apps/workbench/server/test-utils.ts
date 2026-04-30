import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { openDb } from "../db/client.js";
import { createConnectionStore } from "./services/connection-store.js";
import { createApp } from "./app.js";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

export function makeTestApp(options: { fetchFn?: typeof fetch } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "workbench-server-"));
  const url = join(dir, "test.sqlite");

  const sqlite = new Database(url);
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(join(migrationsDir, file), "utf8"));
  }
  sqlite.close();

  const db = openDb(url);

  let counter = 0;
  const connections = createConnectionStore(db, {
    generateId: () => `conn_${String(++counter).padStart(4, "0")}`,
    now: () => "2026-04-30T00:00:00.000Z",
    fetchFn: options.fetchFn,
  });
  const app = createApp({ connections });

  return {
    app,
    connections,
    cleanup() {
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

export function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/fhir+json" },
    ...init,
  });
}
