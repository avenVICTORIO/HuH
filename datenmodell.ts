// Datenmodell der Fach-Entitäten als JSON Schema – die einzige Quelle der Wahrheit.
//
// Ablage: Tabelle `schemata` (JSON Schema als JSONB) und `dokumente` (Daten als JSONB,
// Verweis aufs Schema). Für jede Entität gibt es eine gleichnamige VIEW (z. B. `reservations`)
// für Lesezugriffe per SQL (Joins, Aggregate); Schreibzugriffe laufen über dokumente.ts
// (validiert, mit Akteur). Die Views schreiben zur Sicherheit ebenfalls über
// INSTEAD-OF-Trigger in `dokumente`. Jede Änderung an `schemata`/`dokumente` landet per
// Trigger in `dokumente_verlauf` bzw. `schemata_verlauf` (vollständige Historie).
//
// Konten, Passkeys, Rollen, Einladungen, Einstellungen, Chat und Skill-Läufe bleiben
// bewusst klassische Tabellen (siehe migrationen.ts).

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
  id: string;            // Schema-ID = Name der View
  name: string;
  beschreibung: string;
  lesen: string | null;  // Fähigkeit zum Lesen (null = ganzes Team)
  schreiben: string | null;
  signal: string;        // Live-Signal nach Änderungen
  spalten: Spalte[];
  unique?: string[][];
  kaskade?: { entitaet: string; feld: string }[]; // beim Löschen mitlöschen
};

const col = (typ: Spalte["typ"]) => (name: string, o: Partial<Spalte> = {}): Spalte => ({ name, typ, ...o });
const T = col("text"), I = col("int"), D = col("double");

export const ENTITAETEN: Entitaet[] = [
  {
    id: "reservations", name: "Reservierungen", signal: "reservierungen",
    beschreibung: "Tischreservierungen von der Website und aus dem Team-Bereich.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("code", { beschreibung: "Buchungscode für Gäste" }), T("name"), T("email", { format: "email", nullable: true }), T("phone", { nullable: true }),
      T("date", { format: "date" }), T("time", { beschreibung: "HH:MM" }), I("guests", { min: 1, max: 60 }),
      T("occasion", { nullable: true }), T("note", { nullable: true }),
      T("status", { enum: ["offen", "bestaetigt", "abgesagt", "erledigt"], default: "offen" }),
      D("created_at", { beschreibung: "Unix-Millisekunden" }),
      T("area", { enum: ["drinnen", "draussen"], default: "drinnen" }),
    ],
    unique: [["code"]],
  },
  {
    id: "inquiries", name: "Anfragen", signal: "reservierungen",
    beschreibung: "Kontakt- und Gruppenanfragen von der Website.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("name"), T("email", { format: "email" }), T("phone", { nullable: true }), T("occasion", { nullable: true }),
      T("date", { nullable: true }), I("guests", { nullable: true, min: 1 }), T("note", { nullable: true }),
      T("status", { enum: ["neu", "inbearbeitung", "erledigt"], default: "neu" }), D("created_at"),
    ],
  },
  {
    id: "time_events", name: "Zeiten (Stempel)", signal: "zeiten",
    beschreibung: "Ein- und Ausstempel-Ereignisse; zwei Ereignisse bilden eine Arbeitssitzung.",
    lesen: "zeiten.admin", schreiben: "zeiten.admin",
    spalten: [T("employee_id"), T("type", { enum: ["in", "out"] }), D("ts", { beschreibung: "Unix-Millisekunden" })],
  },
  {
    id: "shifts", name: "Schichten", signal: "schichten",
    beschreibung: "Konkrete Schichten im Kalender, aus der Vorlage erzeugt und mit Personen besetzt.",
    lesen: null, schreiben: "schichtplan",
    spalten: [
      T("date", { format: "date" }), T("role"), T("start"), T("end"),
      T("employee_id", { nullable: true }), T("note", { nullable: true }), T("rule_id", { nullable: true }),
    ],
  },
  {
    id: "shift_rules", name: "Schicht-Vorlage", signal: "schichten",
    beschreibung: "Wiederkehrende Schichten (Rhythmus, Tage, Anzahl) – die einzige Quelle des Schichtplans.",
    lesen: "schichtplan", schreiben: "schichtplan",
    spalten: [
      T("role"), T("start"), T("end"), T("weekdays", { beschreibung: "Wochentage als CSV, 0 = Sonntag" }),
      I("count", { default: 1, min: 1, max: 10 }),
      T("rhythm", { enum: ["woechentlich", "zweiwoechentlich"], default: "woechentlich" }),
      T("start_date", { nullable: true }), I("active", { default: 1, min: 0, max: 1 }), I("sort_order", { default: 0 }),
    ],
  },
  {
    id: "menu_groups", name: "Karte · Gruppen", signal: "karte",
    beschreibung: "Gruppen der Speise- und Getränkekarte je Kapitel.",
    lesen: null, schreiben: "karte.admin",
    spalten: [T("chapter"), T("title"), T("columns", { nullable: true }), T("footnote", { nullable: true }), I("sort_order", { default: 0 })],
    kaskade: [{ entitaet: "menu_items", feld: "group_id" }],
  },
  {
    id: "menu_items", name: "Karte · Positionen", signal: "karte",
    beschreibung: "Gerichte und Getränke einer Gruppe mit Preisen und Kennzeichen.",
    lesen: null, schreiben: "karte.admin",
    spalten: [
      T("group_id"), T("name"), T("text", { nullable: true }), T("option", { nullable: true }), T("tags", { nullable: true }),
      I("star", { default: 0, min: 0, max: 1 }), T("prices", { nullable: true }), I("sort_order", { default: 0 }), I("active", { default: 1, min: 0, max: 1 }),
    ],
  },
  {
    id: "routine_tasks", name: "Abläufe · Aufgaben", signal: "ablauf",
    beschreibung: "Checklisten-Aufgaben für Aufbau, Leerlauf und Abbau.",
    lesen: null, schreiben: "ablaeufe.admin",
    spalten: [
      T("process", { enum: ["aufbau", "leerlauf", "abbau"] }), T("group", { nullable: true }), T("title"), T("info", { nullable: true }),
      I("sort_order", { default: 0 }), I("active", { default: 1, min: 0, max: 1 }),
    ],
    kaskade: [{ entitaet: "routine_done", feld: "task_id" }],
  },
  {
    id: "routine_done", name: "Abläufe · Erledigt", signal: "ablauf",
    beschreibung: "Tagesfortschritt: welche Aufgabe wann von wem erledigt wurde.",
    lesen: null, schreiben: null,
    spalten: [T("date", { format: "date" }), T("task_id"), T("employee_id", { nullable: true }), D("done_at")],
    unique: [["date", "task_id"]],
  },
];

export const entitaet = (id: string) => ENTITAETEN.find((e) => e.id === id);

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
    "x-fields": e.spalten.map((s) => s.name),
  };
}

// ------------------------------------------------------------------ SQL (Migration 002)

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const NOW = "(EXTRACT(EPOCH FROM now()) * 1000)";
const castOf = (s: Spalte) =>
  s.typ === "text" ? `data->>'${s.name}'` : s.typ === "int" ? `(data->>'${s.name}')::integer` : `(data->>'${s.name}')::double precision`;
const sqlDefault = (s: Spalte) => (typeof s.default === "number" ? String(s.default) : q(String(s.default)));

/** View + INSTEAD-OF-Trigger einer Entität (Spalten = Feldnamen, physisch JSONB in `dokumente`). */
function viewSql(e: Entitaet): string[] {
  const json = `jsonb_build_object(${e.spalten.map((s) => `'${s.name}', NEW."${s.name}"`).join(", ")})`;
  return [
    `CREATE VIEW ${e.id} AS SELECT id, ${e.spalten.map((s) => `${castOf(s)} AS "${s.name}"`).join(", ")} FROM dokumente WHERE schema_id = ${q(e.id)};`,
    `CREATE FUNCTION ins_${e.id}() RETURNS trigger AS $$
     BEGIN
       ${e.spalten.filter((s) => s.default != null).map((s) => `NEW."${s.name}" := COALESCE(NEW."${s.name}", ${sqlDefault(s)});`).join("\n       ")}
       NEW.id := COALESCE(NEW.id, gen_random_uuid()::text);
       INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert) VALUES (NEW.id, ${q(e.id)}, ${json}, ${NOW}, ${NOW});
       RETURN NEW;
     END $$ LANGUAGE plpgsql;`,
    `CREATE FUNCTION upd_${e.id}() RETURNS trigger AS $$
     BEGIN
       UPDATE dokumente SET data = ${json}, aktualisiert = ${NOW} WHERE id = OLD.id AND schema_id = ${q(e.id)};
       RETURN NEW;
     END $$ LANGUAGE plpgsql;`,
    `CREATE FUNCTION del_${e.id}() RETURNS trigger AS $$
     BEGIN
       ${(e.kaskade ?? []).map((k) => `DELETE FROM dokumente WHERE schema_id = ${q(k.entitaet)} AND data->>'${k.feld}' = OLD.id;`).join("\n       ")}
       DELETE FROM dokumente WHERE id = OLD.id AND schema_id = ${q(e.id)};
       RETURN OLD;
     END $$ LANGUAGE plpgsql;`,
    `CREATE TRIGGER t_ins_${e.id} INSTEAD OF INSERT ON ${e.id} FOR EACH ROW EXECUTE FUNCTION ins_${e.id}();`,
    `CREATE TRIGGER t_upd_${e.id} INSTEAD OF UPDATE ON ${e.id} FOR EACH ROW EXECUTE FUNCTION upd_${e.id}();`,
    `CREATE TRIGGER t_del_${e.id} INSTEAD OF DELETE ON ${e.id} FOR EACH ROW EXECUTE FUNCTION del_${e.id}();`,
  ];
}

/**
 * Komplettes SQL des Dokumentenspeichers: Tabellen `schemata` + `dokumente`, die
 * Historie (`*_verlauf` mit Triggern, Akteur aus der Session-Variable `huh.user`),
 * die System-Schemata aus ENTITAETEN sowie Views, Trigger und Unique-Indizes.
 */
export function dokumentenspeicherSql(): string {
  const teile: string[] = [
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
    "CREATE INDEX ix_dok_date ON dokumente(schema_id, (data->>'date'));",
    "CREATE INDEX ix_dok_employee ON dokumente(schema_id, (data->>'employee_id'));",
    // Historie
    `CREATE TABLE dokumente_verlauf (
      seq         BIGSERIAL PRIMARY KEY,
      dokument_id TEXT NOT NULL,
      schema_id   TEXT NOT NULL,
      aktion      TEXT NOT NULL CHECK (aktion IN ('insert','update','delete')),
      data_alt    JSONB,
      data_neu    JSONB,
      wer         TEXT,
      ts          DOUBLE PRECISION NOT NULL
    );`,
    "CREATE INDEX ix_dv_dok ON dokumente_verlauf(dokument_id, seq);",
    "CREATE INDEX ix_dv_schema ON dokumente_verlauf(schema_id, seq);",
    `CREATE TABLE schemata_verlauf (
      seq       BIGSERIAL PRIMARY KEY,
      schema_id TEXT NOT NULL,
      aktion    TEXT NOT NULL CHECK (aktion IN ('insert','update','delete')),
      alt       JSONB,
      neu       JSONB,
      wer       TEXT,
      ts        DOUBLE PRECISION NOT NULL
    );`,
    `CREATE FUNCTION verlauf_dokumente() RETURNS trigger AS $$
     BEGIN
       IF TG_OP = 'INSERT' THEN
         INSERT INTO dokumente_verlauf (dokument_id, schema_id, aktion, data_alt, data_neu, wer, ts) VALUES (NEW.id, NEW.schema_id, 'insert', NULL, NEW.data, current_setting('huh.user', true), ${NOW});
         RETURN NEW;
       ELSIF TG_OP = 'UPDATE' THEN
         IF NEW.data IS DISTINCT FROM OLD.data OR NEW.schema_id IS DISTINCT FROM OLD.schema_id THEN
           INSERT INTO dokumente_verlauf (dokument_id, schema_id, aktion, data_alt, data_neu, wer, ts) VALUES (NEW.id, NEW.schema_id, 'update', OLD.data, NEW.data, current_setting('huh.user', true), ${NOW});
         END IF;
         RETURN NEW;
       ELSE
         INSERT INTO dokumente_verlauf (dokument_id, schema_id, aktion, data_alt, data_neu, wer, ts) VALUES (OLD.id, OLD.schema_id, 'delete', OLD.data, NULL, current_setting('huh.user', true), ${NOW});
         RETURN OLD;
       END IF;
     END $$ LANGUAGE plpgsql;`,
    "CREATE TRIGGER t_verlauf_dokumente AFTER INSERT OR UPDATE OR DELETE ON dokumente FOR EACH ROW EXECUTE FUNCTION verlauf_dokumente();",
    `CREATE FUNCTION verlauf_schemata() RETURNS trigger AS $$
     BEGIN
       IF TG_OP = 'INSERT' THEN
         INSERT INTO schemata_verlauf (schema_id, aktion, alt, neu, wer, ts) VALUES (NEW.id, 'insert', NULL, to_jsonb(NEW), current_setting('huh.user', true), ${NOW}); RETURN NEW;
       ELSIF TG_OP = 'UPDATE' THEN
         INSERT INTO schemata_verlauf (schema_id, aktion, alt, neu, wer, ts) VALUES (NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), current_setting('huh.user', true), ${NOW}); RETURN NEW;
       ELSE
         INSERT INTO schemata_verlauf (schema_id, aktion, alt, neu, wer, ts) VALUES (OLD.id, 'delete', to_jsonb(OLD), NULL, current_setting('huh.user', true), ${NOW}); RETURN OLD;
       END IF;
     END $$ LANGUAGE plpgsql;`,
    "CREATE TRIGGER t_verlauf_schemata AFTER INSERT OR UPDATE OR DELETE ON schemata FOR EACH ROW EXECUTE FUNCTION verlauf_schemata();",
    "SELECT set_config('huh.user', 'migration', true);",
  ];
  for (const e of ENTITAETEN) {
    teile.push(
      `INSERT INTO schemata (id, name, beschreibung, schema, lesen, schreiben, signal, version, system, erstellt, aktualisiert)
       VALUES (${q(e.id)}, ${q(e.name)}, ${q(e.beschreibung)}, ${q(JSON.stringify(jsonSchema(e)))}::jsonb, ${e.lesen ? q(e.lesen) : "NULL"}, ${e.schreiben ? q(e.schreiben) : "NULL"}, ${q(e.signal)}, 1, 1, ${NOW}, ${NOW});`,
      ...viewSql(e),
    );
    for (const u of e.unique ?? []) {
      teile.push(`CREATE UNIQUE INDEX ux_dok_${e.id}_${u.join("_")} ON dokumente (${u.map((f) => `(data->>'${f}')`).join(", ")}) WHERE schema_id = ${q(e.id)};`);
    }
  }
  return teile.join("\n");
}
