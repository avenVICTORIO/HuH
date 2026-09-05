// Datenmodell der Fach-Entitäten als JSON Schema – die einzige Quelle der Wahrheit.
//
// Ablage: Tabelle `schemata` (JSON Schema als JSONB) und `dokumente` (Daten als JSONB,
// Verweis aufs Schema). Für das bestehende SQL im Code gibt es je Entität eine VIEW mit
// dem alten Tabellennamen und INSTEAD-OF-Triggern: Lesen und Schreiben funktionieren
// unverändert, physisch liegt alles in `dokumente`. Neue Schemata (auch von der KI per
// Tool-Call) brauchen keine Migration – sie sind nur eine Zeile in `schemata`.
//
// Konten, Passkeys, Rollen, Einladungen, Sessions, Chat und Skill-Läufe bleiben
// bewusst klassische Tabellen (kein Fachdatenmodell).

export type Spalte = {
  name: string;
  typ: "text" | "int" | "double";
  nullable?: boolean;
  default?: string | number;
  enum?: string[];
  min?: number;
  max?: number;
  format?: string;
  beschreibung?: string;
};

export type Entitaet = {
  id: string;
  name: string;
  beschreibung: string;
  /** Fähigkeit zum Lesen/Schreiben über die generische API; null = jede angemeldete Person. */
  lesen: string | null;
  schreiben: string | null;
  /** Live-Signal nach Änderungen (reservierungen, zeiten, schichten, ablauf, karte). */
  signal: string;
  spalten: Spalte[];
  /** Eindeutigkeiten (Spaltenkombinationen). */
  unique?: string[][];
  /** Beim Löschen mitlöschen: Dokumente dieser Entität, deren Feld auf die gelöschte id zeigt. */
  kaskade?: { entitaet: string; feld: string }[];
};

const T = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, typ: "text", ...o });
const I = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, typ: "int", ...o });
const D = (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, typ: "double", ...o });

export const ENTITAETEN: Entitaet[] = [
  {
    id: "reservierungen", name: "Reservierungen", signal: "reservierungen",
    beschreibung: "Tischreservierungen von der Website und aus dem Team-Bereich.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("code", { beschreibung: "Buchungscode für Gäste" }), T("name"), T("email", { format: "email" }), T("telefon"),
      T("datum", { format: "date" }), T("zeit", { beschreibung: "HH:MM" }), I("personen", { min: 1, max: 60 }),
      T("anlass", { nullable: true }), T("notiz", { nullable: true }),
      T("status", { enum: ["offen", "bestaetigt", "abgesagt", "erledigt"], default: "offen" }),
      D("erstellt", { beschreibung: "Unix-Millisekunden" }),
      T("bereich", { enum: ["drinnen", "draussen"], default: "drinnen" }),
    ],
    unique: [["code"]],
  },
  {
    id: "anfragen", name: "Anfragen", signal: "reservierungen",
    beschreibung: "Kontakt- und Gruppenanfragen von der Website.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("name"), T("email", { format: "email" }), T("telefon", { nullable: true }), T("anlass", { nullable: true }),
      T("datum", { nullable: true }), I("personen", { nullable: true, min: 1 }), T("notiz", { nullable: true }),
      T("status", { enum: ["neu", "inbearbeitung", "erledigt"], default: "neu" }), D("erstellt"),
    ],
  },
  {
    id: "events", name: "Zeiten (Stempel)", signal: "zeiten",
    beschreibung: "Ein- und Ausstempel-Ereignisse; zwei Ereignisse bilden eine Arbeitssitzung.",
    lesen: "zeiten.admin", schreiben: "zeiten.admin",
    spalten: [T("mitarbeiter_id"), T("type", { enum: ["in", "out"] }), D("ts", { beschreibung: "Unix-Millisekunden" })],
  },
  {
    id: "schichten", name: "Schichten", signal: "schichten",
    beschreibung: "Konkrete Schichten im Kalender, aus der Vorlage erzeugt und mit Personen besetzt.",
    lesen: null, schreiben: "schichtplan",
    spalten: [
      T("datum", { format: "date" }), T("rolle"), T("von"), T("bis"),
      T("mitarbeiter_id", { nullable: true }), T("notiz", { nullable: true }), T("regel_id", { nullable: true }),
    ],
  },
  {
    id: "schicht_regeln", name: "Schicht-Vorlage", signal: "schichten",
    beschreibung: "Wiederkehrende Schichten (Rhythmus, Tage, Anzahl) – die einzige Quelle des Schichtplans.",
    lesen: "schichtplan", schreiben: "schichtplan",
    spalten: [
      T("rolle"), T("von"), T("bis"), T("tage", { beschreibung: "Wochentage als CSV, 0 = Sonntag" }),
      I("anzahl", { default: 1, min: 1, max: 10 }),
      T("rhythmus", { enum: ["woechentlich", "zweiwoechentlich"], default: "woechentlich" }),
      T("start", { nullable: true }), I("aktiv", { default: 1, min: 0, max: 1 }), I("sortierung", { default: 0 }),
    ],
  },
  {
    id: "karte_gruppen", name: "Karte · Gruppen", signal: "karte",
    beschreibung: "Gruppen der Speise- und Getränkekarte je Kapitel.",
    lesen: null, schreiben: "karte.admin",
    spalten: [T("kapitel"), T("titel"), T("spalten", { nullable: true }), T("fussnote", { nullable: true }), I("sortierung", { default: 0 })],
    kaskade: [{ entitaet: "karte_positionen", feld: "gruppe_id" }],
  },
  {
    id: "karte_positionen", name: "Karte · Positionen", signal: "karte",
    beschreibung: "Gerichte und Getränke einer Gruppe mit Preisen und Kennzeichen.",
    lesen: null, schreiben: "karte.admin",
    spalten: [
      T("gruppe_id"), T("name"), T("text", { nullable: true }), T("option", { nullable: true }), T("tags", { nullable: true }),
      I("stern", { default: 0, min: 0, max: 1 }), T("preise", { nullable: true }), I("sortierung", { default: 0 }), I("aktiv", { default: 1, min: 0, max: 1 }),
    ],
  },
  {
    id: "ablauf_aufgaben", name: "Abläufe · Aufgaben", signal: "ablauf",
    beschreibung: "Checklisten-Aufgaben für Aufbau, Leerlauf und Abbau.",
    lesen: null, schreiben: "ablaeufe.admin",
    spalten: [
      T("prozess", { enum: ["aufbau", "leerlauf", "abbau"] }), T("gruppe", { nullable: true }), T("titel"), T("info", { nullable: true }),
      I("sortierung", { default: 0 }), I("aktiv", { default: 1, min: 0, max: 1 }),
    ],
    kaskade: [{ entitaet: "ablauf_erledigt", feld: "aufgabe_id" }],
  },
  {
    id: "ablauf_erledigt", name: "Abläufe · Erledigt", signal: "ablauf",
    beschreibung: "Tagesfortschritt: welche Aufgabe wann von wem erledigt wurde.",
    lesen: null, schreiben: null,
    spalten: [T("datum", { format: "date" }), T("aufgabe_id"), T("von", { nullable: true }), D("am")],
    unique: [["datum", "aufgabe_id"]],
  },
];

// ------------------------------------------------------------------ JSON Schema

export function jsonSchema(e: Entitaet): Record<string, unknown> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const s of e.spalten) {
    const basis = s.typ === "text" ? "string" : s.typ === "int" ? "integer" : "number";
    const p: Record<string, unknown> = { type: s.nullable ? [basis, "null"] : basis };
    if (s.enum) p.enum = s.nullable ? [...s.enum, null] : s.enum;
    if (s.min != null) p.minimum = s.min;
    if (s.max != null) p.maximum = s.max;
    if (s.format) p.format = s.format;
    if (s.default != null) p.default = s.default;
    if (s.beschreibung) p.description = s.beschreibung;
    properties[s.name] = p;
    if (!s.nullable && s.default == null) required.push(s.name);
  }
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: e.name,
    description: e.beschreibung,
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

// ------------------------------------------------------------------ Migration (SQL erzeugen)

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const cast = (s: Spalte) =>
  s.typ === "text" ? `data->>'${s.name}'` : s.typ === "int" ? `(data->>'${s.name}')::integer` : `(data->>'${s.name}')::double precision`;
const sqlDefault = (s: Spalte) => (typeof s.default === "number" ? String(s.default) : q(String(s.default)));

/** Migration: schemata/dokumente anlegen, Daten kopieren, Tabellen zu Views mit Triggern machen. */
export function migrationSql(): string {
  const now = "(EXTRACT(EPOCH FROM now()) * 1000)";
  const teile: string[] = [
    "BEGIN;",
    `CREATE TABLE schemata (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      beschreibung TEXT,
      schema       JSONB NOT NULL,
      lesen        TEXT,
      schreiben    TEXT,
      signal       TEXT,
      version      INTEGER NOT NULL DEFAULT 1,
      system       INTEGER NOT NULL DEFAULT 0,
      erstellt     DOUBLE PRECISION NOT NULL,
      aktualisiert DOUBLE PRECISION NOT NULL
    );`,
    `CREATE TABLE dokumente (
      id           TEXT PRIMARY KEY,
      schema_id    TEXT NOT NULL REFERENCES schemata(id),
      data         JSONB NOT NULL,
      erstellt     DOUBLE PRECISION NOT NULL,
      aktualisiert DOUBLE PRECISION NOT NULL
    );`,
    "CREATE INDEX ix_dok_schema ON dokumente(schema_id, erstellt);",
    "CREATE INDEX ix_dok_data ON dokumente USING GIN (data jsonb_path_ops);",
    "CREATE INDEX ix_dok_datum ON dokumente(schema_id, (data->>'datum'));",
    "CREATE INDEX ix_dok_ma ON dokumente(schema_id, (data->>'mitarbeiter_id'));",
    // Generische Trigger-Funktionen für Update/Delete (Entität kommt als Trigger-Argument).
    `CREATE OR REPLACE FUNCTION dok_view_upd() RETURNS trigger AS $$
     BEGIN
       UPDATE dokumente SET data = to_jsonb(NEW) - 'id', aktualisiert = ${now}
        WHERE id = OLD.id AND schema_id = TG_ARGV[0];
       RETURN NEW;
     END $$ LANGUAGE plpgsql;`,
  ];
  for (const e of ENTITAETEN) {
    const schema = JSON.stringify(jsonSchema(e));
    teile.push(
      `INSERT INTO schemata (id, name, beschreibung, schema, lesen, schreiben, signal, version, system, erstellt, aktualisiert)
       VALUES (${q(e.id)}, ${q(e.name)}, ${q(e.beschreibung)}, ${q(schema)}::jsonb, ${e.lesen ? q(e.lesen) : "NULL"}, ${e.schreiben ? q(e.schreiben) : "NULL"}, ${q(e.signal)}, 1, 1, ${now}, ${now});`,
      // Daten kopieren (Spalten als JSON, id separat).
      `INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert)
       SELECT t.id, ${q(e.id)}, to_jsonb(t) - 'id', ${now}, ${now} FROM ${e.id} t;`,
      `ALTER TABLE ${e.id} RENAME TO _alt_${e.id};`,
      `CREATE VIEW ${e.id} AS SELECT id, ${e.spalten.map((s) => `${cast(s)} AS "${s.name}"`).join(", ")} FROM dokumente WHERE schema_id = ${q(e.id)};`,
      // Insert-Trigger je Entität (Defaults wie früher bei der Tabelle).
      `CREATE OR REPLACE FUNCTION dok_ins_${e.id}() RETURNS trigger AS $$
       BEGIN
         ${e.spalten.filter((s) => s.default != null).map((s) => `NEW."${s.name}" := COALESCE(NEW."${s.name}", ${sqlDefault(s)});`).join("\n         ")}
         NEW.id := COALESCE(NEW.id, gen_random_uuid()::text);
         INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert)
         VALUES (NEW.id, ${q(e.id)}, to_jsonb(NEW) - 'id', ${now}, ${now});
         RETURN NEW;
       END $$ LANGUAGE plpgsql;`,
      // Delete-Trigger je Entität (mit Kaskaden).
      `CREATE OR REPLACE FUNCTION dok_del_${e.id}() RETURNS trigger AS $$
       BEGIN
         ${(e.kaskade ?? []).map((k) => `DELETE FROM dokumente WHERE schema_id = ${q(k.entitaet)} AND data->>'${k.feld}' = OLD.id;`).join("\n         ")}
         DELETE FROM dokumente WHERE id = OLD.id AND schema_id = ${q(e.id)};
         RETURN OLD;
       END $$ LANGUAGE plpgsql;`,
      `CREATE TRIGGER t_ins_${e.id} INSTEAD OF INSERT ON ${e.id} FOR EACH ROW EXECUTE FUNCTION dok_ins_${e.id}();`,
      `CREATE TRIGGER t_upd_${e.id} INSTEAD OF UPDATE ON ${e.id} FOR EACH ROW EXECUTE FUNCTION dok_view_upd(${q(e.id)});`,
      `CREATE TRIGGER t_del_${e.id} INSTEAD OF DELETE ON ${e.id} FOR EACH ROW EXECUTE FUNCTION dok_del_${e.id}();`,
    );
    for (const u of e.unique ?? []) {
      teile.push(`CREATE UNIQUE INDEX ux_dok_${e.id}_${u.join("_")} ON dokumente (${u.map((f) => `(data->>'${f}')`).join(", ")}) WHERE schema_id = ${q(e.id)};`);
    }
  }
  teile.push("COMMIT;");
  return teile.join("\n");
}
