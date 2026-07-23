// Datenbank-Adapter: überall Postgres.
//  - Lokal/Entwicklung: PGlite (eingebettetes Postgres, Dateiablage in data/pg)
//  - Produktion: echtes Postgres über DATABASE_URL (Bun.SQL)
// Beide Wege laufen durch dieselben Migrationen – identisches Verhalten, identisches Schema.

import { randomUUID } from "node:crypto";

export type Mitarbeiter = {
  id: string;
  name: string;
  role: string;
  pin: string;
  /** 1 = Admin (sieht Team, alle Zeiten); 0 = Mitarbeiter (nur eigene Zeiten + Reservierungen). */
  admin: number;
};

type Zeile = Record<string, unknown>;

// ---------------------------------------------------------------- Verbindung

const DATABASE_URL = process.env.DATABASE_URL;

/** `?`-Platzhalter in `$1..$n` übersetzen – so bleiben die Aufrufer lesbar. */
const nummeriert = (sql: string) => {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
};

let roh: (sql: string, params: unknown[]) => Promise<{ rows: Zeile[]; changes: number }>;
/** Mehrere Statements am Stück (Migrationen) – ohne Prepared-Statement-Protokoll. */
let rohExec: (sql: string) => Promise<void>;

if (DATABASE_URL) {
  // Produktion: echtes Postgres über Buns eingebauten Client.
  const { SQL } = await import("bun");
  const sql = new SQL(DATABASE_URL);
  roh = async (text, params) => {
    const res = (await sql.unsafe(nummeriert(text), params as never[])) as Zeile[] & {
      count?: number;
    };
    return { rows: [...res], changes: res.count ?? res.length };
  };
  rohExec = async (text) => {
    await sql.unsafe(text).simple();
  };
  console.log("🐘 Postgres verbunden (DATABASE_URL)");
} else {
  // Entwicklung: eingebettetes Postgres, persistiert unter data/pg.
  // Wichtig bei `bun --hot`: die Instanz überlebt Reloads in globalThis,
  // sonst öffnet der neu geladene Code eine zweite Instanz auf dem gesperrten Datadir.
  const { PGlite } = await import("@electric-sql/pglite");
  const g = globalThis as { __huh_pg?: InstanceType<typeof PGlite> };
  const pg = (g.__huh_pg ??= new PGlite("data/pg"));
  roh = async (text, params) => {
    const res = await pg.query<Zeile>(nummeriert(text), params as never[]);
    return { rows: res.rows, changes: res.affectedRows ?? res.rows.length };
  };
  rohExec = async (text) => {
    await pg.exec(text);
  };
}

/** Alle Zeilen. */
export const alle = async <T = Zeile>(sql: string, ...params: unknown[]): Promise<T[]> =>
  (await roh(sql, params)).rows as T[];

/** Erste Zeile oder null. */
export const eins = async <T = Zeile>(sql: string, ...params: unknown[]): Promise<T | null> =>
  ((await roh(sql, params)).rows[0] as T | undefined) ?? null;

/** Schreiben; liefert die Zahl betroffener Zeilen. */
export const lauf = async (sql: string, ...params: unknown[]): Promise<{ changes: number }> => ({
  changes: (await roh(sql, params)).changes,
});

// --------------------------------------------------------------- Migrationen

/**
 * Nummerierte, einmalige Migrationen – laufen in Reihenfolge und werden in
 * `migrationen` protokolliert. Neue Schemaänderung = neuer Eintrag ans Ende.
 */
const MIGRATIONEN: { id: string; sql: string }[] = [
  {
    id: "001-grundschema",
    sql: /* sql */ `
      CREATE TABLE mitarbeiter (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL,
        role  TEXT NOT NULL,
        pin   TEXT NOT NULL UNIQUE CHECK (pin ~ '^[0-9]{4}$'),
        admin INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE events (
        id             TEXT PRIMARY KEY,
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        type           TEXT NOT NULL CHECK (type IN ('in','out')),
        ts             DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_events_ma_ts ON events(mitarbeiter_id, ts);

      CREATE TABLE reservierungen (
        id       TEXT PRIMARY KEY,
        code     TEXT NOT NULL UNIQUE,
        name     TEXT NOT NULL,
        email    TEXT NOT NULL,
        telefon  TEXT NOT NULL,
        datum    TEXT NOT NULL,
        zeit     TEXT NOT NULL,
        personen INTEGER NOT NULL CHECK (personen > 0),
        anlass   TEXT,
        notiz    TEXT,
        status   TEXT NOT NULL DEFAULT 'offen'
                 CHECK (status IN ('offen','bestaetigt','abgesagt','erledigt')),
        erstellt DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_res_datum ON reservierungen(datum, zeit);

      CREATE TABLE anfragen (
        id       TEXT PRIMARY KEY,
        name     TEXT NOT NULL,
        email    TEXT NOT NULL,
        telefon  TEXT,
        anlass   TEXT,
        datum    TEXT,
        personen INTEGER,
        notiz    TEXT,
        status   TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu','inbearbeitung','erledigt')),
        erstellt DOUBLE PRECISION NOT NULL
      );

      CREATE TABLE inventar (
        id           TEXT PRIMARY KEY,
        bereich      TEXT NOT NULL CHECK (bereich IN ('kueche','bar','keller')),
        name         TEXT NOT NULL,
        menge        DOUBLE PRECISION NOT NULL DEFAULT 0,
        einheit      TEXT NOT NULL,
        soll         DOUBLE PRECISION,
        notiz        TEXT,
        aktualisiert DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_inventar_bereich ON inventar(bereich, name);

      CREATE TABLE einstellungen (
        k TEXT PRIMARY KEY,
        v TEXT NOT NULL
      );
    `,
  },
  {
    id: "002-schichtplan",
    sql: /* sql */ `
      CREATE TABLE schichten (
        id             TEXT PRIMARY KEY,
        datum          TEXT NOT NULL,
        rolle          TEXT NOT NULL,
        von            TEXT NOT NULL,
        bis            TEXT NOT NULL,
        mitarbeiter_id TEXT REFERENCES mitarbeiter(id) ON DELETE SET NULL,
        notiz          TEXT
      );
      CREATE INDEX ix_schichten_datum ON schichten(datum, von);
    `,
  },
  {
    id: "003-reservierung-bereiche",
    sql: /* sql */ `
      ALTER TABLE reservierungen ADD COLUMN bereich TEXT NOT NULL DEFAULT 'drinnen';
      ALTER TABLE reservierungen ADD CONSTRAINT ck_res_bereich CHECK (bereich IN ('drinnen','draussen'));
    `,
  },
  {
    id: "004-rollen-katalog",
    sql: /* sql */ `
      CREATE TABLE rollen (name TEXT PRIMARY KEY);
      INSERT INTO rollen (name) VALUES ('Inhaber'), ('Koch'), ('Kochhilfe'), ('Service');
      -- Bestehende, abweichende Freitext-Rollen mitnehmen, damit kein Mitarbeiter verwaist.
      INSERT INTO rollen (name) SELECT DISTINCT role FROM mitarbeiter ON CONFLICT (name) DO NOTHING;
    `,
  },
  {
    id: "005-schicht-regeln",
    sql: /* sql */ `
      CREATE TABLE schicht_regeln (
        id       TEXT PRIMARY KEY,
        rolle    TEXT NOT NULL,
        von      TEXT NOT NULL,
        bis      TEXT NOT NULL,
        -- Wochentage als CSV, 0 = Sonntag … 6 = Samstag
        tage     TEXT NOT NULL,
        anzahl   INTEGER NOT NULL DEFAULT 1 CHECK (anzahl BETWEEN 1 AND 10),
        rhythmus TEXT NOT NULL DEFAULT 'woechentlich'
                 CHECK (rhythmus IN ('woechentlich','zweiwoechentlich')),
        start    TEXT,
        aktiv    INTEGER NOT NULL DEFAULT 1
      );
      ALTER TABLE schichten ADD COLUMN regel_id TEXT;
    `,
  },
  {
    id: "006-rezepte-gerichte",
    sql: /* sql */ `
      -- Rezept = eine Komponente (Knödel, Soße, Salat …); ein Ansatz ergibt N Portionen.
      CREATE TABLE rezepte (
        id     TEXT PRIMARY KEY,
        name   TEXT NOT NULL UNIQUE,
        ergibt INTEGER NOT NULL DEFAULT 4 CHECK (ergibt > 0),
        notiz  TEXT
      );

      -- Zutaten eines Rezepts: Menge pro Ansatz, in der Einheit des Inventar-Artikels.
      CREATE TABLE rezept_zutaten (
        id          TEXT PRIMARY KEY,
        rezept_id   TEXT NOT NULL REFERENCES rezepte(id) ON DELETE CASCADE,
        inventar_id TEXT NOT NULL REFERENCES inventar(id) ON DELETE CASCADE,
        menge       DOUBLE PRECISION NOT NULL CHECK (menge > 0)
      );
      CREATE INDEX ix_rz_rezept ON rezept_zutaten(rezept_id);

      -- Gericht = Position auf der Karte, zusammengesetzt aus Rezept-Portionen.
      CREATE TABLE gerichte (
        id    TEXT PRIMARY KEY,
        name  TEXT NOT NULL UNIQUE,
        preis TEXT,
        aktiv INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE gericht_rezepte (
        id         TEXT PRIMARY KEY,
        gericht_id TEXT NOT NULL REFERENCES gerichte(id) ON DELETE CASCADE,
        rezept_id  TEXT NOT NULL REFERENCES rezepte(id) ON DELETE CASCADE,
        portionen  DOUBLE PRECISION NOT NULL DEFAULT 1 CHECK (portionen > 0)
      );
      CREATE INDEX ix_gr_gericht ON gericht_rezepte(gericht_id);
    `,
  },
  {
    id: "007-regel-sortierung",
    sql: /* sql */ `
      ALTER TABLE schicht_regeln ADD COLUMN sortierung INTEGER NOT NULL DEFAULT 0;
      WITH nummeriert AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY von, rolle) AS rn FROM schicht_regeln
      )
      UPDATE schicht_regeln SET sortierung = n.rn FROM nummeriert n WHERE schicht_regeln.id = n.id;
    `,
  },
  {
    id: "008-rolle-cleaning",
    sql: /* sql */ `
      INSERT INTO rollen (name) VALUES ('Cleaning') ON CONFLICT (name) DO NOTHING;
    `,
  },
];

async function migrieren() {
  await lauf(
    "CREATE TABLE IF NOT EXISTS migrationen (id TEXT PRIMARY KEY, angewendet DOUBLE PRECISION NOT NULL)",
  );
  const fertig = new Set(
    (await alle<{ id: string }>("SELECT id FROM migrationen")).map((m) => m.id),
  );
  for (const m of MIGRATIONEN) {
    if (fertig.has(m.id)) continue;
    await rohExec(m.sql);
    await lauf("INSERT INTO migrationen (id, angewendet) VALUES (?, ?)", m.id, Date.now());
    console.log(`🔧 Migration angewendet: ${m.id}`);
  }
}

// --------------------------------------------------------------------- Seeds

/** Erste freie 4-stellige PIN ab 1001 (0009 ist für Sonderzwecke reserviert). */
export async function allocatePin(): Promise<string> {
  const vergeben = new Set(
    (await alle<{ pin: string }>("SELECT pin FROM mitarbeiter")).map((r) => r.pin),
  );
  for (let n = 1001; n <= 9998; n++) {
    const p = String(n).padStart(4, "0");
    if (p !== "0009" && !vergeben.has(p)) return p;
  }
  throw new Error("keine freie PIN mehr");
}

async function saeen() {
  const m = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM mitarbeiter");
  if (Number(m?.c ?? 0) === 0) {
    await lauf(
      "INSERT INTO mitarbeiter (id, name, role, pin, admin) VALUES (?, ?, ?, ?, ?), (?, ?, ?, ?, ?)",
      randomUUID(), "Victorio", "Inhaber", "1001", 1,
      randomUUID(), "Alice", "Service", "1002", 0,
    );
    console.log("🌱 Team befüllt: Victorio (PIN 1001, Admin), Alice (PIN 1002)");
  }

  // Inventur-Beispieldaten: bei (fast) leerer Tabelle einmalig auffüllen.
  const INVENTAR_SEED: [string, string, number, string, number | null, string | null][] = [
    // Küche
    ["kueche", "Kartoffeln", 25, "kg", 20, null],
    ["kueche", "Breznknödel (TK)", 18, "Stück", 30, "Nachschub Montag"],
    ["kueche", "Zwiebeln", 12, "kg", 10, null],
    ["kueche", "Bergkäse-Mischung", 6.5, "kg", 8, "Naturkäserei Tegernseer Land"],
    ["kueche", "Spätzle-Mehl", 15, "kg", 12, null],
    ["kueche", "Butter", 9, "kg", 10, null],
    ["kueche", "Sahne", 14, "l", 12, null],
    ["kueche", "Eier", 90, "Stück", 120, "Früchte Feldbrach"],
    ["kueche", "Rotkohl", 8, "kg", 6, null],
    ["kueche", "Knollensellerie", 11, "Stück", 8, null],
    ["kueche", "Braune Pilze", 4, "kg", 5, null],
    ["kueche", "Wurzelbrot", 7, "Laibe", 10, "täglich frisch"],
    ["kueche", "Hirschkalbskeule (TK)", 12, "kg", 10, "eigene Jagd"],
    ["kueche", "Kürbiskernöl", 3, "Flaschen", 4, null],
    // Bar
    ["bar", "Hacker-Pschorr Hell 0,5 l", 4, "Kisten", 6, null],
    ["bar", "Paulaner Spezi 0,33 l", 5, "Kisten", 4, null],
    ["bar", "Aperol", 6, "Flaschen", 4, null],
    ["bar", "Soligo Prosecco", 10, "Flaschen", 12, null],
    ["bar", "Aqua Monaco Tonic", 3, "Kisten", 4, null],
    ["bar", "Espresso-Bohnen", 7, "kg", 5, null],
    ["bar", "Zitronen & Limetten", 5, "kg", 6, null],
    ["bar", "Hausgemachter Erdbeerlimes", 4, "Flaschen", 3, null],
    // Keller
    ["keller", "Grüner Veltliner (Stadler)", 14, "Flaschen", 12, null],
    ["keller", "Riesling »Drei Steine« (Schmitt)", 9, "Flaschen", 6, null],
    ["keller", "Lugana »I Frati«", 7, "Flaschen", 6, null],
    ["keller", "Helles 30-l-Fass", 5, "Fässer", 4, null],
    ["keller", "CO₂-Flaschen", 2, "Stück", 3, "rechtzeitig tauschen"],
  ];
  const i = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM inventar");
  if (Number(i?.c ?? 0) <= 4) {
    const jetzt = Date.now();
    const vorhandene = new Set(
      (await alle<{ name: string }>("SELECT name FROM inventar")).map((r) => r.name),
    );
    for (const [bereich, name, menge, einheit, soll, notiz] of INVENTAR_SEED) {
      if (vorhandene.has(name)) continue;
      await lauf(
        "INSERT INTO inventar (id, bereich, name, menge, einheit, soll, notiz, aktualisiert) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        randomUUID(), bereich, name, menge, einheit, soll, notiz, jetzt,
      );
    }
    console.log("🌱 Inventur mit Beispielartikeln befüllt");
  }
}

async function schichtRegelnSaeen() {
  const r = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM schicht_regeln");
  if (Number(r?.c ?? 0) > 0) return;
  // Standard-Tag: 1 Koch, 1 Kochhilfe, 2 Service, 1 Cleaning – täglich außer Dienstag (Ruhetag).
  const OHNE_DI = "0,1,3,4,5,6";
  const REGELN: [string, string, string, number][] = [
    ["Koch", "14:00", "22:30", 1],
    ["Kochhilfe", "15:00", "23:00", 1],
    ["Service", "16:30", "22:30", 2],
    ["Cleaning", "12:00", "15:00", 1],
  ];
  for (let i = 0; i < REGELN.length; i++) {
    const [rolle, von, bis, anzahl] = REGELN[i];
    await lauf(
      "INSERT INTO schicht_regeln (id, rolle, von, bis, tage, anzahl, rhythmus, start, aktiv, sortierung) VALUES (?, ?, ?, ?, ?, ?, 'woechentlich', NULL, 1, ?)",
      randomUUID(), rolle, von, bis, OHNE_DI, anzahl, i + 1,
    );
  }
  console.log("🌱 Schicht-Regeln angelegt (1 Koch, 1 Kochhilfe, 2 Service, 1 Cleaning)");
}

async function rezepteSaeen() {
  const r = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM rezepte");
  if (Number(r?.c ?? 0) > 0) return;

  const invId = async (name: string) =>
    (await eins<{ id: string }>("SELECT id FROM inventar WHERE name = ?", name))?.id ?? null;

  /** Rezept mit Zutaten anlegen; unbekannte Zutaten werden still übersprungen. */
  const rezept = async (name: string, ergibt: number, zutaten: [string, number][], notiz: string | null = null) => {
    const id = randomUUID();
    await lauf("INSERT INTO rezepte (id, name, ergibt, notiz) VALUES (?, ?, ?, ?)", id, name, ergibt, notiz);
    for (const [artikel, menge] of zutaten) {
      const iid = await invId(artikel);
      if (!iid) continue;
      await lauf(
        "INSERT INTO rezept_zutaten (id, rezept_id, inventar_id, menge) VALUES (?, ?, ?, ?)",
        randomUUID(), id, iid, menge,
      );
    }
    return id;
  };

  const gericht = async (name: string, preis: string, komponenten: [string, number][]) => {
    const id = randomUUID();
    await lauf("INSERT INTO gerichte (id, name, preis, aktiv) VALUES (?, ?, ?, 1)", id, name, preis);
    for (const [rname, portionen] of komponenten) {
      const rid = (await eins<{ id: string }>("SELECT id FROM rezepte WHERE name = ?", rname))?.id;
      if (!rid) continue;
      await lauf(
        "INSERT INTO gericht_rezepte (id, gericht_id, rezept_id, portionen) VALUES (?, ?, ?, ?)",
        randomUUID(), id, rid, portionen,
      );
    }
  };

  // Komponenten (Ansatz ergibt 4 Portionen)
  await rezept("Kässpätzle-Basis", 4, [
    ["Spätzle-Mehl", 1], ["Eier", 8], ["Bergkäse-Mischung", 0.6], ["Butter", 0.15],
  ], "Spätzle frisch schaben, Käse in Schichten");
  await rezept("Schmelzzwiebeln", 4, [["Zwiebeln", 0.5], ["Butter", 0.1]]);
  await rezept("Breznknödel-Basis", 4, [
    ["Breznknödel (TK)", 8], ["Eier", 2], ["Butter", 0.1],
  ]);
  await rezept("Pilz-Rahmsoße", 4, [
    ["Braune Pilze", 0.5], ["Sahne", 0.8], ["Zwiebeln", 0.2], ["Butter", 0.05],
  ]);
  await rezept("Beilagensalat", 4, [["Kürbiskernöl", 0.1]], "Saisonale Salatvariation vom Markt");

  // Gerichte von der Karte
  await gericht("Kässpätzle", "16,5", [["Kässpätzle-Basis", 1], ["Schmelzzwiebeln", 1]]);
  await gericht("Breznknödel", "17,0", [["Breznknödel-Basis", 1], ["Pilz-Rahmsoße", 1]]);
  console.log("🌱 Rezepte & Gerichte befüllt (Kässpätzle, Breznknödel)");
}

// Beim Import initialisieren -> Server und postinstall bekommen eine fertige DB.
await migrieren();
await saeen();
await schichtRegelnSaeen();
await rezepteSaeen();
