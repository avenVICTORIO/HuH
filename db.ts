import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

const DATA_DIR = "data";
const DB_PATH = `${DATA_DIR}/app.db`;

// data/ ist gitignored -> nach frischem Clone nicht vorhanden.
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

export const db = new Database(DB_PATH, { create: true });
db.run("PRAGMA journal_mode = WAL");
db.run("PRAGMA foreign_keys = ON");

export type Mitarbeiter = { id: string; name: string; role: string; pin: string };

function hasColumn(table: string, col: string): boolean {
  const cols = db.query(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return cols.some((c) => c.name === col);
}

/** Erste freie 4-stellige PIN ab 1001 (0009 ist für den Chef-/Admin-Zugang reserviert). */
export function allocatePin(): string {
  const taken = new Set(
    (db.query("SELECT pin FROM mitarbeiter WHERE pin IS NOT NULL").all() as { pin: string }[])
      .map((r) => r.pin),
  );
  for (let n = 1001; n <= 9998; n++) {
    const p = String(n).padStart(4, "0");
    if (p !== "0009" && !taken.has(p)) return p;
  }
  throw new Error("keine freie PIN mehr");
}

export function initDb() {
  db.run(`
    CREATE TABLE IF NOT EXISTS mitarbeiter (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin  TEXT
    )
  `);

  // Migration: bestehende DB ohne pin-Spalte nachrüsten.
  if (!hasColumn("mitarbeiter", "pin")) {
    db.run("ALTER TABLE mitarbeiter ADD COLUMN pin TEXT");
  }

  db.run("CREATE UNIQUE INDEX IF NOT EXISTS ux_mitarbeiter_pin ON mitarbeiter(pin)");

  // Stempel-Ereignisse: 'in' = einstempeln, 'out' = ausstempeln, ts = Epoch-Millis.
  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id             TEXT PRIMARY KEY,
      mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
      type           TEXT NOT NULL CHECK (type IN ('in','out')),
      ts             INTEGER NOT NULL
    )
  `);
  db.run("CREATE INDEX IF NOT EXISTS ix_events_ma_ts ON events(mitarbeiter_id, ts)");

  // Seed nur bei komplett leerer Tabelle.
  const { c } = db.query("SELECT COUNT(*) AS c FROM mitarbeiter").get() as { c: number };
  if (c === 0) {
    const insert = db.prepare(
      "INSERT INTO mitarbeiter (id, name, role, pin) VALUES (?, ?, ?, ?)",
    );
    insert.run(randomUUID(), "Victorio", "Inhaber", "1001");
    insert.run(randomUUID(), "Alice", "Service", "1002");
    console.log("🌱 Datenbank befüllt: Victorio (PIN 1001), Alice (PIN 1002)");
  }

  // Backfill: Altbestand ohne PIN bekommt automatisch eine.
  const missing = db
    .query("SELECT id FROM mitarbeiter WHERE pin IS NULL OR pin = ''")
    .all() as { id: string }[];
  for (const row of missing) {
    db.prepare("UPDATE mitarbeiter SET pin = ? WHERE id = ?").run(allocatePin(), row.id);
  }
}

// Beim Import initialisieren -> Server und postinstall bekommen eine fertige DB.
initDb();
