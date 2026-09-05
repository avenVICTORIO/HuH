// Datenbank-Adapter: überall Postgres.
//  - Lokal/Entwicklung: PGlite (eingebettetes Postgres, Dateiablage in data/pg)
//  - Produktion: echtes Postgres über DATABASE_URL (Bun.SQL)
// Beide Wege laufen durch dieselben Migrationen – identisches Verhalten, identisches Schema.

import { randomUUID } from "node:crypto";

export type Mitarbeiter = {
  id: string;
  name: string;
  vorname: string;
  nachname: string | null;
  role: string;
  /** Altlast (wird von den Capabilities abgelöst); 1 = Inhaber-Konto. */
  admin: number;
  /** Fähigkeiten aus der Rolle (CSV aufgelöst); '*' = alles. Wird von wer()/Login befüllt. */
  caps?: string[];
  /** Personalstammblatt: MA-Code (z. B. "MA022"); null = kein Lohn/nicht gelistet. */
  ma_code: string | null;
  /** Gastromatic-Mitarbeiter-Nr. (z. B. "250022"); null = nicht vergeben. */
  personalnr: string | null;
  /** Soll-Wochenstunden; null = Abruf (keine feste Wochenstunden). */
  soll_std: number | null;
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
  if (!g.__huh_pg) {
    // Schutz: Zwei Prozesse auf demselben PGlite-Verzeichnis zerstören das WAL. Eine eigene
    // Sperrdatei mit der echten Prozess-ID verhindert das (PGlite selbst prüft das nicht).
    const { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } = await import("node:fs");
    mkdirSync("data", { recursive: true });
    const lock = "data/pg.lock";
    if (existsSync(lock)) {
      const pid = Number(readFileSync(lock, "utf8").trim());
      let lebt = false;
      if (pid && pid !== process.pid) { try { process.kill(pid, 0); lebt = true; } catch {} }
      if (lebt) {
        throw new Error(`data/pg wird bereits von Prozess ${pid} benutzt – zweite Instanz verweigert (sonst Datenverlust). Dev-Server stoppen oder dessen API nutzen.`);
      }
    }
    writeFileSync(lock, String(process.pid));
    process.on("exit", () => { try { if (readFileSync(lock, "utf8").trim() === String(process.pid)) unlinkSync(lock); } catch {} });
  }
  const pg = (g.__huh_pg ??= new PGlite("data/pg"));
  // Sauber schließen, wenn der Prozess beendet wird (SIGTERM/SIGINT): ohne close()
  // bleibt das WAL in einem Zustand, den PGlite beim nächsten Start nicht mehr
  // wiederherstellen kann („could not locate a valid checkpoint record“).
  const gh = globalThis as { __huh_pg_shutdown?: boolean };
  if (!gh.__huh_pg_shutdown) {
    gh.__huh_pg_shutdown = true;
    for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
      process.on(sig, async () => {
        try { await pg.close(); } catch {}
        process.exit(0);
      });
    }
  }
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
  {
    id: "009-karte",
    sql: /* sql */ `
      -- Die Speise- und Getränkekarte der Website, vom Admin pflegbar.
      -- Gruppen hängen an festen Kapiteln (vorspeisen, bier, wein …, siehe KAPITEL_META).
      CREATE TABLE karte_gruppen (
        id         TEXT PRIMARY KEY,
        kapitel    TEXT NOT NULL,
        titel      TEXT NOT NULL,
        -- Preisspalten für Getränke, mit | getrennt (z. B. '0,3 l|0,5 l'); leer = eine Preisspalte
        spalten    TEXT,
        fussnote   TEXT,
        sortierung INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX ix_kg_kapitel ON karte_gruppen(kapitel, sortierung);

      CREATE TABLE karte_positionen (
        id         TEXT PRIMARY KEY,
        gruppe_id  TEXT NOT NULL REFERENCES karte_gruppen(id) ON DELETE CASCADE,
        name       TEXT NOT NULL,
        text       TEXT,
        option     TEXT,
        -- Kennzeichen als CSV: v, vg, gf
        tags       TEXT,
        stern      INTEGER NOT NULL DEFAULT 0,
        -- Preise mit | getrennt, passend zu den Spalten der Gruppe (leere Zellen erlaubt)
        preise     TEXT,
        sortierung INTEGER NOT NULL DEFAULT 0,
        aktiv      INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX ix_kp_gruppe ON karte_positionen(gruppe_id, sortierung);
    `,
  },
  {
    id: "010-karte-gericht-link",
    sql: /* sql */ `
      -- Verknüpfung Website-Karte <-> Küchen-Gericht (Rezepte/Verfügbarkeit).
      ALTER TABLE karte_positionen ADD COLUMN gericht_id TEXT REFERENCES gerichte(id) ON DELETE SET NULL;
      -- Bestehende Einträge automatisch über den Namen verheiraten.
      UPDATE karte_positionen kp SET gericht_id = g.id
        FROM gerichte g WHERE lower(g.name) = lower(kp.name);
    `,
  },
  {
    id: "011-rezept-zubereitung",
    sql: /* sql */ `
      ALTER TABLE rezepte ADD COLUMN zubereitung TEXT;
    `,
  },
  {
    // Personalstammblatt-Felder. Alle nullable: Inhaber ohne Lohn (kein MA-Code),
    // Aushilfe-Slots ohne Gastromatic-Nr., soll_std NULL = Abruf.
    id: "012-stammblatt-felder",
    sql: /* sql */ `
      ALTER TABLE mitarbeiter ADD COLUMN ma_code    TEXT;
      ALTER TABLE mitarbeiter ADD COLUMN personalnr TEXT;
      ALTER TABLE mitarbeiter ADD COLUMN soll_std   DOUBLE PRECISION CHECK (soll_std >= 0);
      CREATE UNIQUE INDEX ux_ma_code    ON mitarbeiter(ma_code);
      CREATE UNIQUE INDEX ux_personalnr ON mitarbeiter(personalnr);
    `,
  },
  {
    // Abendführung: Aufgaben-Katalog (Aufbau/Leerlauf/Abbau) + geteilter Tages-Fortschritt.
    id: "013-ablaeufe",
    sql: /* sql */ `
      CREATE TABLE ablauf_aufgaben (
        id         TEXT PRIMARY KEY,
        prozess    TEXT NOT NULL CHECK (prozess IN ('aufbau','leerlauf','abbau')),
        gruppe     TEXT,
        titel      TEXT NOT NULL,
        info       TEXT,
        sortierung INTEGER NOT NULL DEFAULT 0,
        aktiv      INTEGER NOT NULL DEFAULT 1
      );
      CREATE INDEX ix_ablauf_prozess ON ablauf_aufgaben(prozess, sortierung);

      CREATE TABLE ablauf_erledigt (
        id         TEXT PRIMARY KEY,
        datum      TEXT NOT NULL,
        aufgabe_id TEXT NOT NULL REFERENCES ablauf_aufgaben(id) ON DELETE CASCADE,
        von        TEXT REFERENCES mitarbeiter(id) ON DELETE SET NULL,
        am         DOUBLE PRECISION NOT NULL,
        UNIQUE (datum, aufgabe_id)
      );
    `,
  },
  {
    // Account-Reset: PIN-Logik komplett raus, Login läuft über Passkeys (WebAuthn).
    // Mitarbeiter bekommen Vor- und Nachname; bestehende Namen werden gesplittet.
    id: "014-passkeys",
    sql: /* sql */ `
      ALTER TABLE mitarbeiter ADD COLUMN vorname  TEXT;
      ALTER TABLE mitarbeiter ADD COLUMN nachname TEXT;
      UPDATE mitarbeiter SET
        vorname  = COALESCE(NULLIF(split_part(name, ' ', 1), ''), name),
        nachname = NULLIF(btrim(substr(name, length(split_part(name, ' ', 1)) + 2)), '');
      ALTER TABLE mitarbeiter DROP COLUMN pin;

      CREATE TABLE passkeys (
        id             TEXT PRIMARY KEY,  -- Credential-ID (base64url)
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        public_key     TEXT NOT NULL,     -- COSE-Public-Key, base64url
        counter        DOUBLE PRECISION NOT NULL DEFAULT 0,
        transports     TEXT,
        erstellt       DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_passkeys_ma ON passkeys(mitarbeiter_id);
    `,
  },
  {
    // Registrierung ist invite-only: Der allererste Passkey im Haus wird Admin,
    // alle weiteren Konten entstehen über einen vom Admin erstellten Einladungslink.
    id: "015-einladungen",
    sql: /* sql */ `
      CREATE TABLE einladungen (
        code           TEXT PRIMARY KEY,
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        erstellt       DOUBLE PRECISION NOT NULL,
        gueltig_bis    DOUBLE PRECISION NOT NULL,
        benutzt        DOUBLE PRECISION
      );
      CREATE INDEX ix_einladungen_ma ON einladungen(mitarbeiter_id);
    `,
  },
  {
    // Zugriff wird capabilities-basiert: Rollen sind Bündel von Fähigkeiten
    // (CSV; '*' = alles). Der Katalog der Fähigkeiten lebt in auth.ts.
    id: "016-capabilities",
    sql: /* sql */ `
      ALTER TABLE rollen ADD COLUMN capabilities TEXT NOT NULL DEFAULT '';
      UPDATE rollen SET capabilities = '*' WHERE name = 'Inhaber';
      UPDATE rollen SET capabilities = 'reservierungen,inventur,rezepte'
        WHERE name <> 'Inhaber' AND capabilities = '';
    `,
  },
  {
    // Inventur und Rezepte/Gerichte sind aus der App entfernt: Tabellen weg,
    // Karte verliert die Küchen-Verknüpfung, Rollen verlieren die Fähigkeiten.
    id: "017-inventur-rezepte-entfernt",
    sql: /* sql */ `
      ALTER TABLE karte_positionen DROP COLUMN IF EXISTS gericht_id;
      DROP TABLE IF EXISTS gericht_rezepte;
      DROP TABLE IF EXISTS rezept_zutaten;
      DROP TABLE IF EXISTS gerichte;
      DROP TABLE IF EXISTS rezepte;
      DROP TABLE IF EXISTS inventar;
      UPDATE rollen SET capabilities = array_to_string(
        array_remove(array_remove(array_remove(array_remove(
          string_to_array(capabilities, ','), 'inventur'), 'inventur.admin'), 'rezepte'), 'rezepte.admin'),
        ',');
      DELETE FROM einstellungen WHERE k IN ('karte_gerichte_backfill', 'karte_kueche_seed', 'rezepte_details');
    `,
  },
  {
    // Team-Chat. Räume sind virtuell ('team' bzw. 'ma-<mitarbeiter_id>'), es gibt
    // keine Raumtabelle – jeder Mitarbeiter hat automatisch seinen Direkt-Chat.
    id: "018-chat",
    sql: /* sql */ `
      CREATE TABLE chat_nachrichten (
        id   TEXT PRIMARY KEY,
        raum TEXT NOT NULL,
        von  TEXT REFERENCES mitarbeiter(id) ON DELETE SET NULL,
        text TEXT NOT NULL,
        ts   DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_chat_raum_ts ON chat_nachrichten(raum, ts);

      -- Lesestand je Person und Raum (für Ungelesen-Zähler).
      CREATE TABLE chat_gelesen (
        mitarbeiter_id TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        raum           TEXT NOT NULL,
        ts             DOUBLE PRECISION NOT NULL,
        PRIMARY KEY (mitarbeiter_id, raum)
      );
    `,
  },
  {
    // KI im Chat: Nachrichten der Assistenz haben keinen Mitarbeiter (von NULL) und ki = 1.
    id: "019-chat-ki",
    sql: /* sql */ `
      ALTER TABLE chat_nachrichten ADD COLUMN ki INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    // Skill-Flows: Läufe (ein Lauf = ein gestarteter Flow einer Person in einem Chat-Raum)
    // und ihre Schritte (jede Actor-Verarbeitung mit Ein-/Ausgabe).
    id: "020-skills",
    sql: /* sql */ `
      CREATE TABLE skill_laeufe (
        id              TEXT PRIMARY KEY,
        flow            TEXT NOT NULL,
        mitarbeiter_id  TEXT NOT NULL REFERENCES mitarbeiter(id) ON DELETE CASCADE,
        raum            TEXT NOT NULL,
        status          TEXT NOT NULL CHECK (status IN ('laeuft','wartet','fertig','abgebrochen','fehler')),
        aktueller_actor TEXT,
        zustand         TEXT NOT NULL DEFAULT '{}',
        erstellt        DOUBLE PRECISION NOT NULL,
        aktualisiert    DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_skill_laeufe_person ON skill_laeufe(mitarbeiter_id, raum, status);

      CREATE TABLE skill_schritte (
        id       TEXT PRIMARY KEY,
        lauf_id  TEXT NOT NULL REFERENCES skill_laeufe(id) ON DELETE CASCADE,
        actor    TEXT NOT NULL,
        art      TEXT NOT NULL,
        eingabe  TEXT,
        ausgabe  TEXT,
        dauer_ms DOUBLE PRECISION,
        ts       DOUBLE PRECISION NOT NULL
      );
      CREATE INDEX ix_skill_schritte_lauf ON skill_schritte(lauf_id, ts);
    `,
  },
  {
    // Komposition: ein Lauf kann einen Sub-Flow rufen (Eltern-Lauf wartet mit Status 'kind',
    // das Kind kennt Eltern-Lauf und Rückkehr-Actor).
    id: "021-skills-komposition",
    sql: /* sql */ `
      ALTER TABLE skill_laeufe DROP CONSTRAINT skill_laeufe_status_check;
      ALTER TABLE skill_laeufe ADD CONSTRAINT skill_laeufe_status_check
        CHECK (status IN ('laeuft','wartet','kind','fertig','abgebrochen','fehler'));
      ALTER TABLE skill_laeufe ADD COLUMN eltern_id TEXT REFERENCES skill_laeufe(id) ON DELETE SET NULL;
      ALTER TABLE skill_laeufe ADD COLUMN rueckkehr_actor TEXT;
      CREATE INDEX ix_skill_laeufe_eltern ON skill_laeufe(eltern_id);
    `,
  },
  {
    // Actor-Schnittstelle auf Englisch: Status, Schritt-Arten, Flow- und Actor-IDs.
    id: "022-skills-english",
    sql: /* sql */ `
      ALTER TABLE skill_laeufe DROP CONSTRAINT skill_laeufe_status_check;
      UPDATE skill_laeufe SET status = CASE status
        WHEN 'laeuft' THEN 'running' WHEN 'wartet' THEN 'waiting' WHEN 'kind' THEN 'child'
        WHEN 'fertig' THEN 'done' WHEN 'abgebrochen' THEN 'cancelled' WHEN 'fehler' THEN 'error' ELSE status END;
      ALTER TABLE skill_laeufe ADD CONSTRAINT skill_laeufe_status_check
        CHECK (status IN ('running','waiting','child','done','cancelled','error'));
      UPDATE skill_laeufe SET flow = CASE flow WHEN 'zeiten-eintragen' THEN 'log-time' WHEN 'bestaetigung' THEN 'confirm' ELSE flow END;
      UPDATE skill_laeufe SET
        aktueller_actor = CASE aktueller_actor WHEN 'verstehen' THEN 'understand' WHEN 'pruefen' THEN 'validate'
          WHEN 'bestaetigen' THEN 'decide' WHEN 'entscheiden' THEN 'decide' WHEN 'eintragen' THEN 'record'
          WHEN 'fragen' THEN 'ask' WHEN 'erkennen' THEN 'detect' ELSE aktueller_actor END,
        rueckkehr_actor = CASE rueckkehr_actor WHEN 'entscheiden' THEN 'decide' ELSE rueckkehr_actor END;
      UPDATE skill_schritte SET
        art = CASE art WHEN 'weiter' THEN 'tell' WHEN 'frage' THEN 'ask' WHEN 'starte' THEN 'handoff' WHEN 'rufe' THEN 'call'
          WHEN 'fertig' THEN 'done' WHEN 'abbruch' THEN 'cancel' WHEN 'fehler' THEN 'error' ELSE art END,
        actor = CASE actor WHEN 'verstehen' THEN 'understand' WHEN 'pruefen' THEN 'validate'
          WHEN 'bestaetigen' THEN 'decide' WHEN 'entscheiden' THEN 'decide' WHEN 'eintragen' THEN 'record'
          WHEN 'fragen' THEN 'ask' WHEN 'erkennen' THEN 'detect' ELSE actor END;
    `,
  },
  {
    id: "023-intent-router",
    sql: /* sql */ `UPDATE skill_laeufe SET flow = 'intent-router' WHERE flow = 'router';`,
  },
  {
    id: "024-hitl",
    sql: /* sql */ `UPDATE skill_laeufe SET flow = 'hitl' WHERE flow = 'confirm';`,
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

async function saeen() {
  const m = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM mitarbeiter");
  if (Number(m?.c ?? 0) === 0) {
    await lauf(
      "INSERT INTO mitarbeiter (id, name, vorname, nachname, role, admin) VALUES (?, ?, ?, ?, ?, ?)",
      randomUUID(), "Victorio", "Victorio", null, "Inhaber", 1,
    );
    console.log("🌱 Team befüllt: Victorio (Inhaber/Admin) – Passkey beim ersten Login anlegen");
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

async function karteSaeen() {
  const k = await eins<{ c: number | string }>("SELECT COUNT(*) AS c FROM karte_gruppen");
  if (Number(k?.c ?? 0) > 0) return;
  // Einmaliger Import der bisherigen statischen Karte (Stand Juli 2026).
  const { SPEISEN, GETRAENKE } = await import("./site/karte-daten");
  let gSort = 0;
  for (const kapitel of [...SPEISEN, ...GETRAENKE]) {
    for (const gruppe of kapitel.gruppen) {
      const gid = randomUUID();
      await lauf(
        "INSERT INTO karte_gruppen (id, kapitel, titel, spalten, fussnote, sortierung) VALUES (?, ?, ?, ?, ?, ?)",
        gid, kapitel.id, gruppe.titel, gruppe.spalten?.join("|") ?? null, gruppe.fussnote ?? null, ++gSort,
      );
      let pSort = 0;
      for (const g of gruppe.gerichte) {
        await lauf(
          "INSERT INTO karte_positionen (id, gruppe_id, name, text, option, tags, stern, preise, sortierung, aktiv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
          randomUUID(), gid, g.name, g.text ?? null, g.option ?? null,
          g.tags?.join(",") ?? null, g.stern ? 1 : 0, g.preis ?? null, ++pSort,
        );
      }
      for (const z of gruppe.zeilen ?? []) {
        await lauf(
          "INSERT INTO karte_positionen (id, gruppe_id, name, text, option, tags, stern, preise, sortierung, aktiv) VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?, 1)",
          randomUUID(), gid, z.name, z.text ?? null,
          z.preise.map((p) => p ?? "").join("|"), ++pSort,
        );
      }
    }
  }
  console.log("🌱 Speisekarte in die Datenbank importiert");
}

/** Ablauf-Checklisten (Aufbau/Leerlauf/Abbau) aus dem Qualitätsmanagement-Dokument. */
async function ablaeufeSaeen() {
  if (await eins("SELECT 1 AS x FROM einstellungen WHERE k = 'ablaeufe_seed'")) return;
  const { ABLAEUFE_SEED } = await import("./ablaeufe-daten");
  const sort: Record<string, number> = { aufbau: 0, leerlauf: 0, abbau: 0 };
  for (const a of ABLAEUFE_SEED) {
    await lauf(
      "INSERT INTO ablauf_aufgaben (id, prozess, gruppe, titel, info, sortierung, aktiv) VALUES (?, ?, ?, ?, ?, ?, 1)",
      randomUUID(), a.prozess, a.gruppe, a.titel, a.info, sort[a.prozess]++,
    );
  }
  await lauf("INSERT INTO einstellungen (k, v) VALUES ('ablaeufe_seed', '1') ON CONFLICT (k) DO NOTHING");
  console.log(`🌱 Abläufe befüllt: ${ABLAEUFE_SEED.length} Aufgaben (Aufbau/Leerlauf/Abbau)`);
}

// Beim Import initialisieren -> Server und postinstall bekommen eine fertige DB.
await migrieren();
await saeen();
await schichtRegelnSaeen();
await karteSaeen();
await ablaeufeSaeen();
