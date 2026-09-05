// Datenmodell der Fach-Entitäten als JSON Schema – die einzige Quelle der Wahrheit.
//
// Ablage: Tabelle `schemata` (JSON Schema als JSONB) und `dokumente` (Daten als JSONB,
// Verweis aufs Schema). Feldnamen und Schema-IDs sind Englisch. Für jede Entität gibt es
// eine englische VIEW (z. B. `reservations`) für Lesezugriffe per SQL (Joins, Aggregate);
// Schreibzugriffe laufen über dokumente.ts (validiert, mit Akteur). Die Views schreiben
// zur Sicherheit ebenfalls über INSTEAD-OF-Trigger in `dokumente`.
// Jede Änderung an `schemata`/`dokumente` landet per Trigger in `*_verlauf` (Historie).
// `legacy` an den Spalten sind die alten deutschen Namen – nur noch für die Migrationen.
//
// Konten, Passkeys, Rollen, Einladungen, Sessions, Chat und Skill-Läufe bleiben
// bewusst klassische Tabellen (kein Fachdatenmodell).

export type Spalte = {
  name: string;          // englischer Feldname (JSON-Schlüssel, Spalte der englischen View)
  legacy: string;        // alter deutscher Spaltenname (Kompatibilitäts-View, Migration)
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
  id: string;            // englische Schema-ID (= Name der englischen View)
  legacyId: string;      // alte deutsche Tabellen-/View-Bezeichnung
  name: string;
  beschreibung: string;
  lesen: string | null;
  schreiben: string | null;
  signal: string;
  spalten: Spalte[];
  unique?: string[][];                          // englische Feldnamen
  kaskade?: { entitaet: string; feld: string }[]; // englische Schema-ID + Feld
};

const col = (typ: Spalte["typ"]) => (name: string, legacy: string, o: Partial<Spalte> = {}): Spalte => ({ name, legacy, typ, ...o });
const T = col("text"), I = col("int"), D = col("double");

export const ENTITAETEN: Entitaet[] = [
  {
    id: "reservations", legacyId: "reservierungen", name: "Reservierungen", signal: "reservierungen",
    beschreibung: "Tischreservierungen von der Website und aus dem Team-Bereich.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("code", "code", { beschreibung: "Buchungscode für Gäste" }), T("name", "name"), T("email", "email", { format: "email", nullable: true }), T("phone", "telefon", { nullable: true }),
      T("date", "datum", { format: "date" }), T("time", "zeit", { beschreibung: "HH:MM" }), I("guests", "personen", { min: 1, max: 60 }),
      T("occasion", "anlass", { nullable: true }), T("note", "notiz", { nullable: true }),
      T("status", "status", { enum: ["offen", "bestaetigt", "abgesagt", "erledigt"], default: "offen" }),
      D("created_at", "erstellt", { beschreibung: "Unix-Millisekunden" }),
      T("area", "bereich", { enum: ["drinnen", "draussen"], default: "drinnen" }),
    ],
    unique: [["code"]],
  },
  {
    id: "inquiries", legacyId: "anfragen", name: "Anfragen", signal: "reservierungen",
    beschreibung: "Kontakt- und Gruppenanfragen von der Website.",
    lesen: "reservierungen", schreiben: "reservierungen",
    spalten: [
      T("name", "name"), T("email", "email", { format: "email" }), T("phone", "telefon", { nullable: true }), T("occasion", "anlass", { nullable: true }),
      T("date", "datum", { nullable: true }), I("guests", "personen", { nullable: true, min: 1 }), T("note", "notiz", { nullable: true }),
      T("status", "status", { enum: ["neu", "inbearbeitung", "erledigt"], default: "neu" }), D("created_at", "erstellt"),
    ],
  },
  {
    id: "time_events", legacyId: "events", name: "Zeiten (Stempel)", signal: "zeiten",
    beschreibung: "Ein- und Ausstempel-Ereignisse; zwei Ereignisse bilden eine Arbeitssitzung.",
    lesen: "zeiten.admin", schreiben: "zeiten.admin",
    spalten: [T("employee_id", "mitarbeiter_id"), T("type", "type", { enum: ["in", "out"] }), D("ts", "ts", { beschreibung: "Unix-Millisekunden" })],
  },
  {
    id: "shifts", legacyId: "schichten", name: "Schichten", signal: "schichten",
    beschreibung: "Konkrete Schichten im Kalender, aus der Vorlage erzeugt und mit Personen besetzt.",
    lesen: null, schreiben: "schichtplan",
    spalten: [
      T("date", "datum", { format: "date" }), T("role", "rolle"), T("start", "von"), T("end", "bis"),
      T("employee_id", "mitarbeiter_id", { nullable: true }), T("note", "notiz", { nullable: true }), T("rule_id", "regel_id", { nullable: true }),
    ],
  },
  {
    id: "shift_rules", legacyId: "schicht_regeln", name: "Schicht-Vorlage", signal: "schichten",
    beschreibung: "Wiederkehrende Schichten (Rhythmus, Tage, Anzahl) – die einzige Quelle des Schichtplans.",
    lesen: "schichtplan", schreiben: "schichtplan",
    spalten: [
      T("role", "rolle"), T("start", "von"), T("end", "bis"), T("weekdays", "tage", { beschreibung: "Wochentage als CSV, 0 = Sonntag" }),
      I("count", "anzahl", { default: 1, min: 1, max: 10 }),
      T("rhythm", "rhythmus", { enum: ["woechentlich", "zweiwoechentlich"], default: "woechentlich" }),
      T("start_date", "start", { nullable: true }), I("active", "aktiv", { default: 1, min: 0, max: 1 }), I("sort_order", "sortierung", { default: 0 }),
    ],
  },
  {
    id: "menu_groups", legacyId: "karte_gruppen", name: "Karte · Gruppen", signal: "karte",
    beschreibung: "Gruppen der Speise- und Getränkekarte je Kapitel.",
    lesen: null, schreiben: "karte.admin",
    spalten: [T("chapter", "kapitel"), T("title", "titel"), T("columns", "spalten", { nullable: true }), T("footnote", "fussnote", { nullable: true }), I("sort_order", "sortierung", { default: 0 })],
    kaskade: [{ entitaet: "menu_items", feld: "group_id" }],
  },
  {
    id: "menu_items", legacyId: "karte_positionen", name: "Karte · Positionen", signal: "karte",
    beschreibung: "Gerichte und Getränke einer Gruppe mit Preisen und Kennzeichen.",
    lesen: null, schreiben: "karte.admin",
    spalten: [
      T("group_id", "gruppe_id"), T("name", "name"), T("text", "text", { nullable: true }), T("option", "option", { nullable: true }), T("tags", "tags", { nullable: true }),
      I("star", "stern", { default: 0, min: 0, max: 1 }), T("prices", "preise", { nullable: true }), I("sort_order", "sortierung", { default: 0 }), I("active", "aktiv", { default: 1, min: 0, max: 1 }),
    ],
  },
  {
    id: "routine_tasks", legacyId: "ablauf_aufgaben", name: "Abläufe · Aufgaben", signal: "ablauf",
    beschreibung: "Checklisten-Aufgaben für Aufbau, Leerlauf und Abbau.",
    lesen: null, schreiben: "ablaeufe.admin",
    spalten: [
      T("process", "prozess", { enum: ["aufbau", "leerlauf", "abbau"] }), T("group", "gruppe", { nullable: true }), T("title", "titel"), T("info", "info", { nullable: true }),
      I("sort_order", "sortierung", { default: 0 }), I("active", "aktiv", { default: 1, min: 0, max: 1 }),
    ],
    kaskade: [{ entitaet: "routine_done", feld: "task_id" }],
  },
  {
    id: "routine_done", legacyId: "ablauf_erledigt", name: "Abläufe · Erledigt", signal: "ablauf",
    beschreibung: "Tagesfortschritt: welche Aufgabe wann von wem erledigt wurde.",
    lesen: null, schreiben: null,
    spalten: [T("date", "datum", { format: "date" }), T("task_id", "aufgabe_id"), T("employee_id", "von", { nullable: true }), D("done_at", "am")],
    unique: [["date", "task_id"]],
  },
];

export const entitaet = (id: string) => ENTITAETEN.find((e) => e.id === id || e.legacyId === id);

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

// ------------------------------------------------------------------ SQL-Bausteine

const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
const NOW = "(EXTRACT(EPOCH FROM now()) * 1000)";
const castOf = (s: Spalte, key: string) =>
  s.typ === "text" ? `data->>'${key}'` : s.typ === "int" ? `(data->>'${key}')::integer` : `(data->>'${key}')::double precision`;
const sqlDefault = (s: Spalte) => (typeof s.default === "number" ? String(s.default) : q(String(s.default)));

/**
 * View + Trigger für eine Entität in einem „Dialekt“: english (Spalten = Feldnamen) oder
 * legacy (Spalten = alte deutsche Namen). Physisch immer englische JSON-Schlüssel.
 */
function viewSql(e: Entitaet, dialekt: "english" | "legacy"): string[] {
  const view = dialekt === "english" ? e.id : e.legacyId;
  const colName = (s: Spalte) => (dialekt === "english" ? s.name : s.legacy);
  const json = `jsonb_build_object(${e.spalten.map((s) => `'${s.name}', NEW."${colName(s)}"`).join(", ")})`;
  const fn = `${dialekt === "english" ? "en" : "de"}_${e.id}`;
  return [
    `CREATE VIEW ${view} AS SELECT id, ${e.spalten.map((s) => `${castOf(s, s.name)} AS "${colName(s)}"`).join(", ")} FROM dokumente WHERE schema_id = ${q(e.id)};`,
    `CREATE OR REPLACE FUNCTION ins_${fn}() RETURNS trigger AS $$
     BEGIN
       ${e.spalten.filter((s) => s.default != null).map((s) => `NEW."${colName(s)}" := COALESCE(NEW."${colName(s)}", ${sqlDefault(s)});`).join("\n       ")}
       NEW.id := COALESCE(NEW.id, gen_random_uuid()::text);
       INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert) VALUES (NEW.id, ${q(e.id)}, ${json}, ${NOW}, ${NOW});
       RETURN NEW;
     END $$ LANGUAGE plpgsql;`,
    `CREATE OR REPLACE FUNCTION upd_${fn}() RETURNS trigger AS $$
     BEGIN
       UPDATE dokumente SET data = ${json}, aktualisiert = ${NOW} WHERE id = OLD.id AND schema_id = ${q(e.id)};
       RETURN NEW;
     END $$ LANGUAGE plpgsql;`,
    `CREATE OR REPLACE FUNCTION del_${fn}() RETURNS trigger AS $$
     BEGIN
       ${(e.kaskade ?? []).map((k) => `DELETE FROM dokumente WHERE schema_id = ${q(k.entitaet)} AND data->>'${k.feld}' = OLD.id;`).join("\n       ")}
       DELETE FROM dokumente WHERE id = OLD.id AND schema_id = ${q(e.id)};
       RETURN OLD;
     END $$ LANGUAGE plpgsql;`,
    `CREATE TRIGGER t_ins_${view} INSTEAD OF INSERT ON ${view} FOR EACH ROW EXECUTE FUNCTION ins_${fn}();`,
    `CREATE TRIGGER t_upd_${view} INSTEAD OF UPDATE ON ${view} FOR EACH ROW EXECUTE FUNCTION upd_${fn}();`,
    `CREATE TRIGGER t_del_${view} INSTEAD OF DELETE ON ${view} FOR EACH ROW EXECUTE FUNCTION del_${fn}();`,
  ];
}

const schemaInsertSql = (e: Entitaet) =>
  `INSERT INTO schemata (id, name, beschreibung, schema, lesen, schreiben, signal, version, system, erstellt, aktualisiert)
   VALUES (${q(e.id)}, ${q(e.name)}, ${q(e.beschreibung)}, ${q(JSON.stringify(jsonSchema(e)))}::jsonb, ${e.lesen ? q(e.lesen) : "NULL"}, ${e.schreiben ? q(e.schreiben) : "NULL"}, ${q(e.signal)}, 1, 1, ${NOW}, ${NOW});`;

// ------------------------------------------------------------------ Migration 026 (eingefroren: deutsches Modell)

/** Eingefrorener Stand der Migration 026 (deutsche IDs/Felder) – bleibt für frische Datenbanken reproduzierbar. */
export function migrationSql(): string {
  const teile: string[] = [
    "BEGIN;",
    `CREATE TABLE schemata (id TEXT PRIMARY KEY, name TEXT NOT NULL, beschreibung TEXT, schema JSONB NOT NULL, lesen TEXT, schreiben TEXT, signal TEXT,
      version INTEGER NOT NULL DEFAULT 1, system INTEGER NOT NULL DEFAULT 0, erstellt DOUBLE PRECISION NOT NULL, aktualisiert DOUBLE PRECISION NOT NULL);`,
    `CREATE TABLE dokumente (id TEXT PRIMARY KEY, schema_id TEXT NOT NULL REFERENCES schemata(id), data JSONB NOT NULL,
      erstellt DOUBLE PRECISION NOT NULL, aktualisiert DOUBLE PRECISION NOT NULL);`,
    "CREATE INDEX ix_dok_schema ON dokumente(schema_id, erstellt);",
    "CREATE INDEX ix_dok_data ON dokumente USING GIN (data jsonb_path_ops);",
    "CREATE INDEX ix_dok_datum ON dokumente(schema_id, (data->>'datum'));",
    "CREATE INDEX ix_dok_ma ON dokumente(schema_id, (data->>'mitarbeiter_id'));",
    `CREATE OR REPLACE FUNCTION dok_view_upd() RETURNS trigger AS $$
     BEGIN UPDATE dokumente SET data = to_jsonb(NEW) - 'id', aktualisiert = ${NOW} WHERE id = OLD.id AND schema_id = TG_ARGV[0]; RETURN NEW; END $$ LANGUAGE plpgsql;`,
  ];
  for (const e of ENTITAETEN) {
    // Deutsches Schema (Felder = legacy-Namen), Daten 1:1 aus der alten Tabelle.
    const legacyEnt: Entitaet = { ...e, id: e.legacyId, spalten: e.spalten.map((s) => ({ ...s, name: s.legacy })), unique: e.unique?.map((u) => u.map((f) => e.spalten.find((s) => s.name === f)!.legacy)), kaskade: e.kaskade?.map((k) => ({ entitaet: entitaet(k.entitaet)!.legacyId, feld: entitaet(k.entitaet)!.spalten.find((s) => s.name === k.feld)!.legacy })) };
    const schema = JSON.stringify({ ...jsonSchema(legacyEnt), "x-fields": undefined });
    teile.push(
      `INSERT INTO schemata (id, name, beschreibung, schema, lesen, schreiben, signal, version, system, erstellt, aktualisiert)
       VALUES (${q(legacyEnt.id)}, ${q(e.name)}, ${q(e.beschreibung)}, ${q(schema)}::jsonb, ${e.lesen ? q(e.lesen) : "NULL"}, ${e.schreiben ? q(e.schreiben) : "NULL"}, ${q(e.signal)}, 1, 1, ${NOW}, ${NOW});`,
      `INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert) SELECT t.id, ${q(legacyEnt.id)}, to_jsonb(t) - 'id', ${NOW}, ${NOW} FROM ${legacyEnt.id} t;`,
      `ALTER TABLE ${legacyEnt.id} RENAME TO _alt_${legacyEnt.id};`,
      `CREATE VIEW ${legacyEnt.id} AS SELECT id, ${legacyEnt.spalten.map((s) => `${castOf(s, s.name)} AS "${s.name}"`).join(", ")} FROM dokumente WHERE schema_id = ${q(legacyEnt.id)};`,
      `CREATE OR REPLACE FUNCTION dok_ins_${legacyEnt.id}() RETURNS trigger AS $$
       BEGIN
         ${legacyEnt.spalten.filter((s) => s.default != null).map((s) => `NEW."${s.name}" := COALESCE(NEW."${s.name}", ${sqlDefault(s)});`).join("\n         ")}
         NEW.id := COALESCE(NEW.id, gen_random_uuid()::text);
         INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert) VALUES (NEW.id, ${q(legacyEnt.id)}, to_jsonb(NEW) - 'id', ${NOW}, ${NOW});
         RETURN NEW;
       END $$ LANGUAGE plpgsql;`,
      `CREATE OR REPLACE FUNCTION dok_del_${legacyEnt.id}() RETURNS trigger AS $$
       BEGIN
         ${(legacyEnt.kaskade ?? []).map((k) => `DELETE FROM dokumente WHERE schema_id = ${q(k.entitaet)} AND data->>'${k.feld}' = OLD.id;`).join("\n         ")}
         DELETE FROM dokumente WHERE id = OLD.id AND schema_id = ${q(legacyEnt.id)};
         RETURN OLD;
       END $$ LANGUAGE plpgsql;`,
      `CREATE TRIGGER t_ins_${legacyEnt.id} INSTEAD OF INSERT ON ${legacyEnt.id} FOR EACH ROW EXECUTE FUNCTION dok_ins_${legacyEnt.id}();`,
      `CREATE TRIGGER t_upd_${legacyEnt.id} INSTEAD OF UPDATE ON ${legacyEnt.id} FOR EACH ROW EXECUTE FUNCTION dok_view_upd(${q(legacyEnt.id)});`,
      `CREATE TRIGGER t_del_${legacyEnt.id} INSTEAD OF DELETE ON ${legacyEnt.id} FOR EACH ROW EXECUTE FUNCTION dok_del_${legacyEnt.id}();`,
    );
    for (const u of legacyEnt.unique ?? []) {
      teile.push(`CREATE UNIQUE INDEX ux_dok_${legacyEnt.id}_${u.join("_")} ON dokumente (${u.map((f) => `(data->>'${f}')`).join(", ")}) WHERE schema_id = ${q(legacyEnt.id)};`);
    }
  }
  teile.push("COMMIT;");
  return teile.join("\n");
}

// ------------------------------------------------------------------ Migration 028: Schema-Feinschliff

/** Reservierungen: E-Mail/Telefon optional (Team legt Telefon-/Walk-in-Gäste ohne E-Mail an); alte Platzhalter "-" werden null. */
export function migration028Sql(): string {
  const e = entitaet("reservations")!;
  return [
    "BEGIN;",
    `UPDATE schemata SET schema = ${q(JSON.stringify(jsonSchema(e)))}::jsonb, version = version + 1, aktualisiert = ${NOW} WHERE id = 'reservations';`,
    `UPDATE dokumente SET data = data || '{"email": null}'::jsonb WHERE schema_id = 'reservations' AND data->>'email' = '-';`,
    `UPDATE dokumente SET data = data || '{"phone": null}'::jsonb WHERE schema_id = 'reservations' AND data->>'phone' = '-';`,
    "COMMIT;",
  ].join("\n");
}

// ------------------------------------------------------------------ Migration 029: deutsche Brücken-Views weg

/** Alle Zugriffe laufen über die englischen Views bzw. den Store – die deutschen Kompatibilitäts-Views sind Altlast. */
export function migration029Sql(): string {
  const teile = ["BEGIN;"];
  for (const e of ENTITAETEN) {
    teile.push(`DROP VIEW IF EXISTS ${e.legacyId};`, `DROP FUNCTION IF EXISTS ins_de_${e.id}();`, `DROP FUNCTION IF EXISTS upd_de_${e.id}();`, `DROP FUNCTION IF EXISTS del_de_${e.id}();`);
  }
  teile.push("COMMIT;");
  return teile.join("\n");
}

// ------------------------------------------------------------------ Migration 027: Englisch, Historie, Aufräumen

export function migration027Sql(): string {
  const teile: string[] = ["BEGIN;"];
  // 1) Alte (deutsche) Views und Trigger-Funktionen weg, Altlasten-Tabellen weg.
  for (const e of ENTITAETEN) {
    teile.push(`DROP VIEW IF EXISTS ${e.legacyId};`, `DROP FUNCTION IF EXISTS dok_ins_${e.legacyId}();`, `DROP FUNCTION IF EXISTS dok_del_${e.legacyId}();`);
    for (const u of e.unique ?? []) teile.push(`DROP INDEX IF EXISTS ux_dok_${e.legacyId}_${u.map((f) => e.spalten.find((s) => s.name === f)!.legacy).join("_")};`);
  }
  teile.push("DROP FUNCTION IF EXISTS dok_view_upd();", "DROP INDEX IF EXISTS ix_dok_datum;", "DROP INDEX IF EXISTS ix_dok_ma;");
  for (const e of ENTITAETEN) teile.push(`DROP TABLE IF EXISTS _alt_${e.legacyId} CASCADE;`);
  // 2) Englische Schemata anlegen, Daten umschreiben (Schlüssel + schema_id), deutsche Schemata löschen.
  for (const e of ENTITAETEN) {
    teile.push(
      schemaInsertSql(e),
      `UPDATE dokumente SET schema_id = ${q(e.id)}, data = jsonb_build_object(${e.spalten.map((s) => `'${s.name}', data->'${s.legacy}'`).join(", ")}) WHERE schema_id = ${q(e.legacyId)};`,
      `DELETE FROM schemata WHERE id = ${q(e.legacyId)};`,
    );
  }
  teile.push(
    "CREATE INDEX ix_dok_date ON dokumente(schema_id, (data->>'date'));",
    "CREATE INDEX ix_dok_employee ON dokumente(schema_id, (data->>'employee_id'));",
  );
  // 3) Englische Views (neuer Code) und deutsche Kompatibilitäts-Views (Übergang).
  for (const e of ENTITAETEN) teile.push(...viewSql(e, "english"), ...viewSql(e, "legacy"));
  for (const e of ENTITAETEN) for (const u of e.unique ?? []) {
    teile.push(`CREATE UNIQUE INDEX ux_dok_${e.id}_${u.join("_")} ON dokumente (${u.map((f) => `(data->>'${f}')`).join(", ")}) WHERE schema_id = ${q(e.id)};`);
  }
  // 4) Historie: jede Änderung an dokumente und schemata (auch über Views und spätere KI-Tool-Calls).
  teile.push(
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
    `CREATE OR REPLACE FUNCTION verlauf_dokumente() RETURNS trigger AS $$
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
    `CREATE OR REPLACE FUNCTION verlauf_schemata() RETURNS trigger AS $$
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
    // Startpunkt der Historie: aktueller Stand aller Dokumente und Schemata als „insert“.
    `INSERT INTO dokumente_verlauf (dokument_id, schema_id, aktion, data_alt, data_neu, wer, ts) SELECT id, schema_id, 'insert', NULL, data, 'migration', ${NOW} FROM dokumente;`,
    `INSERT INTO schemata_verlauf (schema_id, aktion, alt, neu, wer, ts) SELECT id, 'insert', NULL, to_jsonb(s), 'migration', ${NOW} FROM schemata s;`,
    // Aufräumen: Marker früherer Seeds, die es nicht mehr gibt.
    "DELETE FROM einstellungen WHERE k IN ('karte_gerichte_backfill', 'karte_kueche_seed', 'rezepte_details');",
    "COMMIT;",
  );
  return teile.join("\n");
}
