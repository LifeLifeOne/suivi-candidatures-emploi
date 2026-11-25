import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

const databasePath = process.env.DB_FILE_NAME ?? "data/jobs.db";

if (databasePath !== ":memory:") {
  mkdirSync(dirname(databasePath), { recursive: true });
}

const globalDatabase = globalThis as typeof globalThis & {
  sqlite?: BetterSqlite3.Database;
};

const sqlite = globalDatabase.sqlite ?? new BetterSqlite3(databasePath);
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("journal_mode = WAL");

if (process.env.NODE_ENV !== "production") {
  globalDatabase.sqlite = sqlite;
}

export const db = drizzle(sqlite);
export type AppDatabase = typeof db;
