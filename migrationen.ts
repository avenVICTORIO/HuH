// Datenbank-Schema von Grund auf – drei Kern-Migrationen statt gewachsener Historie.
// Jede läuft einmal (protokolliert in `migrationen`), in einer Transaktion.
// Neue Schemaänderung = neuer Eintrag ans Ende. Fachdaten brauchen keine Migration:
// sie liegen als JSON-Dokumente im Dokumentenspeicher (Schema in der Datenbank).
import { dokumentenspeicherSql } from "./datenmodell";

export const MIGRATIONEN: { id: string; sql: string }[] = [
  {
    // Konten & Rechte: Team, Rollen mit Fähigkeiten (CSV, '*' = alles), Passkeys,
    // Einladungen, Schlüssel-Wert-Einstellungen (Session-Secret, Kapazität, Trigger-Stände).
    id: "001-konten-und-rechte",
    sql: /* sql */ `
      CREATE TABLE rollen (
        name         TEXT PRIMARY KEY,
        capabilities TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE mitarbeiter (
        id         TEXT PRIMARY KEY,
        name       TEXT NOT NULL,
        vorname    TEXT,
        nachname   TEXT,
        role       TEXT NOT NULL,
        admin      INTEGER NOT NULL DEFAULT 0,
        ma_code    TEXT,
        personalnr TEXT,
        soll_std   DOUBLE PRECISION CHECK (soll_std >= 0)
      );
      CREATE UNIQUE INDEX ux_ma_code ON mitarbeiter(ma_code);
      CREATE UNIQUE INDEX ux_personalnr ON mitarbeiter(personalnr);
      CREATE TABLE passkeys (
        id             TEXT PRIMARY KEY,
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        public_key     TEXT NOT NULL,
        counter        DOUBLE PRECISION NOT NULL DEFAULT 0,
        transports     TEXT,
        erstellt       DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_passkeys_ma ON passkeys(mitarbeiter_id);
      CREATE TABLE einladungen (
        code           TEXT PRIMARY KEY,
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        erstellt       DOUBLE PRECISION NOT NULL,
        gueltig_bis    DOUBLE PRECISION NOT NULL,
        benutzt        DOUBLE PRECISION
      );
      CREATE INDEX ix_einladungen_ma ON einladungen(mitarbeiter_id);
      CREATE TABLE einstellungen (
        k TEXT PRIMARY KEY,
        v TEXT NOT NULL
      );
    `,
  },
  {
    // Dokumentenspeicher: `schemata` (JSON Schema) + `dokumente` (JSONB) + Historie beider
    // Tabellen + System-Schemata mit Views. Erzeugt aus datenmodell.ts.
    id: "002-dokumentenspeicher",
    sql: dokumentenspeicherSql(),
  },
  {
    // Team-Chat (Räume sind virtuell: 'team' bzw. 'ma-<id>') und Skill-Läufe (Flows).
    id: "003-chat-und-skills",
    sql: /* sql */ `
      CREATE TABLE chat_nachrichten (
        id   TEXT PRIMARY KEY,
        raum TEXT NOT NULL,
        von  TEXT REFERENCES mitarbeiter(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        ts   DOUBLE PRECISION NOT NULL,
        ki   INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX ix_chat_raum_ts ON chat_nachrichten(raum, ts);
      CREATE TABLE chat_gelesen (
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        raum           TEXT NOT NULL,
        ts             DOUBLE PRECISION NOT NULL,
        PRIMARY KEY (mitarbeiter_id, raum)
      );
      CREATE TABLE skill_laeufe (
        id              TEXT PRIMARY KEY,
        flow            TEXT NOT NULL,
        mitarbeiter_id  TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        raum            TEXT NOT NULL,
        status          TEXT NOT NULL CHECK (status IN ('running','waiting','child','done','cancelled','error')),
        aktueller_actor TEXT,
        zustand         TEXT NOT NULL DEFAULT '{}',
        eltern_id       TEXT REFERENCES skill_laeufe(id) ON DELETE SET NULL,
        rueckkehr_actor TEXT,
        erstellt        DOUBLE PRECISION NOT NULL,
        aktualisiert    DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_skill_laeufe_person ON skill_laeufe(mitarbeiter_id, raum, status);
      CREATE INDEX ix_skill_laeufe_eltern ON skill_laeufe(eltern_id);
      CREATE TABLE skill_schritte (
        id       TEXT PRIMARY KEY,
        lauf_id  TEXT NOT NULL REFERENCES skill_laeufe(id) ON DELETE CASCADE,
        actor    TEXT NOT NULL,
        art      TEXT NOT NULL,
        eingabe  TEXT,
        ausgabe  TEXT,
        dauer_ms DOUBLE PRECISION,
        ts       DOUBLE PRECISION NOT NULL,
        ki       TEXT
      );
      CREATE INDEX ix_skill_schritte_lauf ON skill_schritte(lauf_id, ts);
    `,
  },
];
