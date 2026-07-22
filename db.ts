import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DATA_DIR = "data";
const DB_PATH = `${DATA_DIR}/app.db`;

// data/ ist gitignored -> nach frischem Clone nicht vorhanden.
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.run("PRAGMA journal_mode = WAL");

export function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS mitarbeiter (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )
  `);

  const { c } = db
    .query("SELECT COUNT(*) AS c FROM mitarbeiter")
    .get() as { c: number };

  if (c === 0) {
    const insert = db.prepare(
      "INSERT INTO mitarbeiter (id, name, role) VALUES (?, ?, ?)",
    );
    insert.run(randomUUID(), "Victorio", "Inhaber");
    insert.run(randomUUID(), "Alice", "Service");
    console.log("🌱 Datenbank mit 2 Mitarbeitern befüllt (Victorio, Alice)");
  }
}

// Beim Import initialisieren -> Server und postinstall bekommen eine fertige DB.
initDb();
