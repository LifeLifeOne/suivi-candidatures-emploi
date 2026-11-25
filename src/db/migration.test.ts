import { readFileSync } from "node:fs";
import BetterSqlite3 from "better-sqlite3";
import { describe, expect, it } from "vitest";

function applyMigration(database: BetterSqlite3.Database, filename: string) {
  database.exec(readFileSync(filename, "utf8").replaceAll("--> statement-breakpoint", ""));
}

describe("migration tags et géolocalisation", () => {
  it("ajoute les relances à une base existante sans modifier les candidatures", () => {
    const database = new BetterSqlite3(":memory:");
    database.pragma("foreign_keys = ON");
    try {
      for (const filename of ["0000_acoustic_mockingbird", "0001_ordinary_jimmy_woo", "0002_tough_stick"]) applyMigration(database, `drizzle/${filename}.sql`);
      database.exec("INSERT INTO applications (company,title,application_date,status,created_at,updated_at) VALUES ('Acme','Développeur','2026-09-01','applied',1,1)");
      const before = database.prepare("SELECT * FROM applications").all();
      applyMigration(database, "drizzle/0003_fixed_pandemic.sql");
      expect(database.prepare("SELECT * FROM applications").all()).toEqual(before);
      database.exec("INSERT INTO application_follow_ups (application_id,date,created_at,updated_at) VALUES (1,'2026-09-28',2,2)");
      expect(database.prepare("SELECT note FROM application_follow_ups").get()).toEqual({ note: "" });
      database.exec("DELETE FROM applications WHERE id=1");
      expect(database.prepare("SELECT COUNT(*) count FROM application_follow_ups").get()).toEqual({ count: 0 });
    } finally { database.close(); }
  });
  it("attribue un tag par défaut aux candidatures existantes", () => {
    const database = new BetterSqlite3(":memory:");
    database.pragma("foreign_keys = ON");
    try {
      applyMigration(database, "drizzle/0000_acoustic_mockingbird.sql");
      applyMigration(database, "drizzle/0001_ordinary_jimmy_woo.sql");
      const insert = database.prepare(`
        INSERT INTO applications
          (company, title, location, application_date, status, created_at, updated_at)
        VALUES (?, 'Développeur', 'Paris', '2026-09-01', 'applied', 1, 1)
      `);
      insert.run("Acme");
      insert.run("Cloud");

      applyMigration(database, "drizzle/0002_tough_stick.sql");

      expect(database.prepare("SELECT COUNT(*) count FROM application_tags").get()).toEqual({ count: 2 });
      expect(database.prepare("SELECT name FROM tags").all()).toEqual([{ name: "À classer" }]);
      expect(database.prepare("SELECT location, work_mode FROM applications WHERE company = 'Acme'").get())
        .toEqual({ location: "Paris", work_mode: "unspecified" });
    } finally {
      database.close();
    }
  });
  it("ne crée aucun tag sur une base vide", () => {
    const database = new BetterSqlite3(":memory:");
    database.pragma("foreign_keys = ON");
    try {
      for (const filename of ["0000_acoustic_mockingbird", "0001_ordinary_jimmy_woo", "0002_tough_stick"]) applyMigration(database, `drizzle/${filename}.sql`);
      expect(database.prepare("SELECT COUNT(*) count FROM tags").get()).toEqual({ count: 0 });
    } finally {
      database.close();
    }
  });
});
