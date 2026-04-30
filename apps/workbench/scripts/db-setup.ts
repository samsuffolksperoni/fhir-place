import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "db", "migrations");

function run() {
  const url = process.env.WORKBENCH_DB_URL ?? "./workbench.sqlite";
  const db = new Database(url);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec(sql);
    console.log(`applied ${file}`);
  }

  db.close();
  console.log(`workbench db ready at ${url}`);
}

run();
