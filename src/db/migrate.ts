import "dotenv/config";

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const databasePath = process.env.DB_FILE_NAME ?? "data/jobs.db";
mkdirSync(dirname(databasePath), { recursive: true });

const sqlite = new BetterSqlite3(databasePath);
sqlite.pragma("foreign_keys = ON");
migrate(drizzle(sqlite), { migrationsFolder: "drizzle" });
sqlite.close();

console.info(`Base SQLite prête : ${databasePath}`);
