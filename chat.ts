// Team-Chat: ein gemeinsamer Raum „Team“ für alle im Haus plus automatisch ein
// Direkt-Chat je Mitarbeiter mit der Leitung. Räume werden nicht verwaltet –
// sie ergeben sich aus dem Team: Personen mit der Fähigkeit chat.admin sehen
// alle Direkt-Chats, jede andere Person sieht „Team“ und ihren eigenen.
import { randomUUID } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "./db";
import { hatCap } from "./auth";
import * as live from "./live";

export const TEAM_RAUM = "team";
export const dmRaum = (mitarbeiterId: string) => `ma-${mitarbeiterId}`;

/** Wer bekommt Live-Ereignisse eines Raums? Team: alle; Direkt-Chat: die Person + Chat-Admins. */
export const themenFuer = (raum: string) =>
  raum === TEAM_RAUM ? ["alle"] : [`user:${raum.slice(3)}`, "chat.admin"];

// Client meldet über den WebSocket, dass ein Raum gelesen wurde (kein Polling nötig).
live.beiNachricht("chat.gelesen", async (d, ws) => {
  if (typeof d.raum === "string") await alsGelesen(ws.data.id, d.raum, Date.now());
});

export type Raum = {
  id: string;
  titel: string;
  untertitel: string;
  ungelesen: number;
  letzte: { text: string; ts: number; eigene: boolean } | null;
};

export type Nachricht = {
  id: string;
  raum: string;
  von: string | null;
  von_name: string;
  text: string;
  ts: number;
  /** 1 = Antwort der KI-Assistenz (kein Mitarbeiter). */
  ki: number;
  eigene: boolean;
};

/** Anzeigename der KI-Assistenz im Chat. */
export const KI_NAME = "avenVICTORIO";

const VON_NAME_SQL = `CASE WHEN n.ki = 1 THEN '${KI_NAME}'
  ELSE COALESCE(NULLIF(TRIM(CONCAT(m.vorname, ' ', COALESCE(m.nachname, ''))), ''), m.name, 'Ehemalige Person') END AS von_name`;

type Person = { id: string; vorname: string | null; nachname: string | null; name: string; role: string };
const anzeigeName = (m: Pick<Person, "vorname" | "nachname" | "name">) =>
  [m.vorname, m.nachname].filter(Boolean).join(" ") || m.name;

/** Darf diese Person den Raum lesen und schreiben? */
export async function darfRaum(ich: Mitarbeiter, raum: string): Promise<boolean> {
  if (raum === TEAM_RAUM) return true;
  if (!raum.startsWith("ma-")) return false;
  const id = raum.slice(3);
  if (id === ich.id) return true;
  if (!hatCap(ich, "chat.admin")) return false;
  return !!(await eins("SELECT 1 AS x FROM mitarbeiter WHERE id = ?", id));
}

/** Räume aus Sicht dieser Person, mit Ungelesen-Zähler und letzter Nachricht. */
export async function raeumeFuer(ich: Mitarbeiter): Promise<Raum[]> {
  const basis: Pick<Raum, "id" | "titel" | "untertitel">[] = [
    { id: TEAM_RAUM, titel: "Team", untertitel: "Alle im Haus" },
  ];
  if (hatCap(ich, "chat.admin")) {
    const leute = await alle<Person>(
      `SELECT id, vorname, nachname, name, role FROM mitarbeiter
        WHERE id <> ?
        ORDER BY lower(coalesce(vorname, name)), lower(coalesce(nachname, ''))`,
      ich.id,
    );
    for (const m of leute) basis.push({ id: dmRaum(m.id), titel: anzeigeName(m), untertitel: m.role });
  } else {
    basis.push({ id: dmRaum(ich.id), titel: "Leitung", untertitel: "Dein direkter Draht" });
  }

  const gelesen = new Map(
    (await alle<{ raum: string; ts: number }>(
      "SELECT raum, ts FROM chat_gelesen WHERE mitarbeiter_id = ?", ich.id,
    )).map((g) => [g.raum, Number(g.ts)]),
  );

  const raeume: Raum[] = [];
  for (const b of basis) {
    const letzte = await eins<{ text: string; ts: number; von: string | null; ki: number }>(
      "SELECT text, ts, von, ki FROM chat_nachrichten WHERE raum = ? ORDER BY ts DESC LIMIT 1", b.id,
    );
    const u = await eins<{ c: number | string }>(
      "SELECT COUNT(*) AS c FROM chat_nachrichten WHERE raum = ? AND ts > ? AND (von IS NULL OR von <> ?)",
      b.id, gelesen.get(b.id) ?? 0, ich.id,
    );
    raeume.push({
      ...b,
      ungelesen: Number(u?.c ?? 0),
      letzte: letzte ? { text: letzte.text, ts: Number(letzte.ts), eigene: letzte.von === ich.id, ki: Number(letzte.ki) === 1 } : null,
    });
  }
  return raeume;
}

async function alsGelesen(mitarbeiterId: string, raum: string, ts: number) {
  await lauf(
    `INSERT INTO chat_gelesen (mitarbeiter_id, raum, ts) VALUES (?, ?, ?)
     ON CONFLICT (mitarbeiter_id, raum) DO UPDATE SET ts = GREATEST(chat_gelesen.ts, EXCLUDED.ts)`,
    mitarbeiterId, raum, ts,
  );
}

/** Nachrichten eines Raums (ohne `seit`: die letzten 200; mit `seit`: nur neuere). Markiert als gelesen. */
export async function nachrichten(ich: Mitarbeiter, raum: string, seit = 0): Promise<Nachricht[]> {
  const sql = `
    SELECT n.id, n.raum, n.von, n.text, n.ts, n.ki, ${VON_NAME_SQL}
      FROM chat_nachrichten n LEFT JOIN mitarbeiter m ON m.id = n.von
     WHERE n.raum = ? ${seit > 0 ? "AND n.ts > ?" : ""}
     ORDER BY n.ts ${seit > 0 ? "ASC LIMIT 500" : "DESC LIMIT 200"}`;
  const rows = await alle<Omit<Nachricht, "eigene">>(sql, ...(seit > 0 ? [raum, seit] : [raum]));
  if (seit <= 0) rows.reverse();
  const liste = rows.map((r) => ({ ...r, ts: Number(r.ts), ki: Number(r.ki), eigene: r.von === ich.id }));
  if (liste.length) await alsGelesen(ich.id, raum, liste[liste.length - 1].ts);
  return liste;
}

/** Die letzten n Nachrichten eines Raums als Kontext für die KI (älteste zuerst). */
export async function verlaufFuerKi(raum: string, n: number): Promise<Pick<Nachricht, "von_name" | "text" | "ki" | "ts">[]> {
  const rows = await alle<{ von_name: string; text: string; ki: number; ts: number }>(
    `SELECT n.text, n.ts, n.ki, ${VON_NAME_SQL}
       FROM chat_nachrichten n LEFT JOIN mitarbeiter m ON m.id = n.von
      WHERE n.raum = ? ORDER BY n.ts DESC LIMIT ?`, raum, n,
  );
  return rows.reverse().map((r) => ({ ...r, ki: Number(r.ki), ts: Number(r.ts) }));
}

/** Nachrichten eines Raums in einem Zeitfenster (für Lauf-Exporte der Skills). */
export async function nachrichtenZwischen(raum: string, von: number, bis: number) {
  const rows = await alle<{ id: string; text: string; ts: number; ki: number; von_name: string }>(
    `SELECT n.id, n.text, n.ts, n.ki, ${VON_NAME_SQL}
       FROM chat_nachrichten n LEFT JOIN mitarbeiter m ON m.id = n.von
      WHERE n.raum = ? AND n.ts BETWEEN ? AND ? ORDER BY n.ts ASC LIMIT 300`, raum, von, bis,
  );
  return rows.map((r) => ({ ...r, ts: Number(r.ts), ki: Number(r.ki) }));
}

/** Fertige KI-Antwort speichern und wie jede Nachricht verteilen (mit `job`, damit die Tipp-Blase ersetzt wird). */
export async function kiNachricht(raum: string, text: string, job: string): Promise<Nachricht> {
  const n = { id: randomUUID(), raum, von: null, text, ts: Date.now(), ki: 1 };
  await lauf(
    "INSERT INTO chat_nachrichten (id, raum, von, text, ts, ki) VALUES (?, ?, NULL, ?, ?, 1)",
    n.id, n.raum, n.text, n.ts,
  );
  const fertig = { ...n, von_name: KI_NAME };
  for (const t of themenFuer(raum)) live.sende(t, { typ: "chat.nachricht", raum, job, nachricht: fertig });
  return { ...fertig, eigene: false };
}

/** Nachricht senden; gibt sie so zurück, wie der Client sie anzeigt. */
export async function senden(ich: Mitarbeiter, raum: string, text: string): Promise<Nachricht> {
  const n = { id: randomUUID(), raum, von: ich.id, text, ts: Date.now(), ki: 0 };
  await lauf(
    "INSERT INTO chat_nachrichten (id, raum, von, text, ts, ki) VALUES (?, ?, ?, ?, ?, 0)",
    n.id, n.raum, n.von, n.text, n.ts,
  );
  await alsGelesen(ich.id, raum, n.ts);
  const fertig = { ...n, von_name: anzeigeName(ich) };
  // Live an alle Beteiligten; „eigene“ bestimmt jeder Client selbst über `von`.
  for (const t of themenFuer(raum)) live.sende(t, { typ: "chat.nachricht", raum, nachricht: fertig });
  return { ...fertig, eigene: true };
}

/** Eigene Nachrichten darf jede Person löschen, chat.admin alle. */
export async function loeschen(ich: Mitarbeiter, id: string): Promise<boolean> {
  const n = await eins<{ von: string | null; raum: string }>("SELECT von, raum FROM chat_nachrichten WHERE id = ?", id);
  if (!n) return false;
  if (n.von !== ich.id && !hatCap(ich, "chat.admin")) return false;
  await lauf("DELETE FROM chat_nachrichten WHERE id = ?", id);
  for (const t of themenFuer(n.raum)) live.sende(t, { typ: "chat.geloescht", raum: n.raum, id });
  return true;
}

/** Summe ungelesener Nachrichten (fürs Terminal-Badge). */
export async function ungelesenGesamt(ich: Mitarbeiter): Promise<number> {
  return (await raeumeFuer(ich)).reduce((s, r) => s + r.ungelesen, 0);
}
