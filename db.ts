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

// 4-stellige PIN ist Pflicht und muss aus genau 4 Ziffern bestehen (DB-seitig erzwungen).
const PIN_CHECK = "pin GLOB '[0-9][0-9][0-9][0-9]'";

function pinIsRequired(): boolean {
  const cols = db.query("PRAGMA table_info(mitarbeiter)").all() as { name: string; notnull: number }[];
  const pin = cols.find((c) => c.name === "pin");
  return !!pin && pin.notnull === 1;
}

export function initDb() {
  // Frisches Schema: PIN als 4-stelliges Pflichtfeld, eindeutig, DB-Constraint.
  db.run(`
    CREATE TABLE IF NOT EXISTS mitarbeiter (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      pin  TEXT NOT NULL UNIQUE CHECK (${PIN_CHECK})
    )
  `);

  // Migration: bestehende DB ohne pin-Spalte nachrüsten (zunächst nullable).
  if (!hasColumn("mitarbeiter", "pin")) {
    db.run("ALTER TABLE mitarbeiter ADD COLUMN pin TEXT");
  }

  // Vor dem Erzwingen: fehlende/ungültige PINs auffüllen.
  const invalid = db
    .query(`SELECT id FROM mitarbeiter WHERE pin IS NULL OR NOT (${PIN_CHECK})`)
    .all() as { id: string }[];
  for (const row of invalid) {
    db.prepare("UPDATE mitarbeiter SET pin = ? WHERE id = ?").run(allocatePin(), row.id);
  }

  // Migration: Alt-Tabelle (pin nullable) auf NOT NULL + CHECK umbauen (Tabellen-Rebuild).
  if (!pinIsRequired()) {
    db.run("PRAGMA foreign_keys = OFF");
    db.run("BEGIN");
    try {
      db.run(`
        CREATE TABLE mitarbeiter_new (
          id   TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          pin  TEXT NOT NULL UNIQUE CHECK (${PIN_CHECK})
        )
      `);
      db.run("INSERT INTO mitarbeiter_new (id, name, role, pin) SELECT id, name, role, pin FROM mitarbeiter");
      db.run("DROP TABLE mitarbeiter");
      db.run("ALTER TABLE mitarbeiter_new RENAME TO mitarbeiter");
      db.run("COMMIT");
    } catch (e) {
      db.run("ROLLBACK");
      throw e;
    }
    db.run("PRAGMA foreign_keys = ON");
    console.log("🔧 Migration: PIN ist jetzt Pflichtfeld (4 Ziffern) in der DB");
  }

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
}

// Beim Import initialisieren -> Server und postinstall bekommen eine fertige DB.
initDb();
