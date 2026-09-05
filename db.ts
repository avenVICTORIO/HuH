// Datenbank-Adapter: überall Postgres.
//  - Lokal/Entwicklung: PGlite (eingebettetes Postgres, Dateiablage in data/pg)
//  - Produktion: echtes Postgres über DATABASE_URL (Bun.SQL)
// Beide Wege laufen durch dieselben Migrationen – identisches Verhalten, identisches Schema.


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
  // Genau eine Verbindung: die Historie-Trigger lesen den Akteur aus der Session-Variable
  // `huh.user` (set_config) – mit einem Pool könnte der Schreibzugriff auf einer anderen
  // Verbindung landen. Eine Verbindung reicht für den Betrieb eines Lokals locker.
  const sql = new SQL({ url: DATABASE_URL, max: 1 });
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

// --------------------------------------------------------------- Migrationen & Seeds

/**
 * Migrationen (migrationen.ts) laufen einmal, in Reihenfolge, je in einer Transaktion und
 * werden in `migrationen` protokolliert. Danach füllen die Seeds (seeds.ts) eine leere DB.
 */
async function migrieren() {
  await lauf("CREATE TABLE IF NOT EXISTS migrationen (id TEXT PRIMARY KEY, angewendet DOUBLE PRECISION NOT NULL)");
  const fertig = new Set((await alle<{ id: string }>("SELECT id FROM migrationen")).map((m) => m.id));
  const { MIGRATIONEN } = await import("./migrationen");
  for (const m of MIGRATIONEN) {
    if (fertig.has(m.id)) continue;
    await rohExec(`BEGIN;\n${m.sql}\nCOMMIT;`);
    await lauf("INSERT INTO migrationen (id, angewendet) VALUES (?, ?)", m.id, Date.now());
    console.log(`🔧 Migration angewendet: ${m.id}`);
  }
}

// Beim Import initialisieren -> Server und init-db bekommen eine fertige DB.
await migrieren();
await (await import("./seeds")).saeen();
