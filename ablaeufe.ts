// Ablauf-Checklisten: Aufgaben je Prozess + geteilter Tages-Fortschritt.
import { randomUUID } from "node:crypto";
import { alle, eins, lauf } from "./db";

export type Prozess = "aufbau" | "leerlauf" | "abbau";
export const PROZESSE: Prozess[] = ["aufbau", "leerlauf", "abbau"];
export const istProzess = (p: unknown): p is Prozess =>
  typeof p === "string" && (PROZESSE as string[]).includes(p);

export type Aufgabe = {
  id: string;
  prozess: Prozess;
  gruppe: string | null;
  titel: string;
  info: string | null;
  sortierung: number;
};

export type TagAufgabe = Aufgabe & {
  erledigt: boolean;
  erledigt_von: string | null;
  erledigt_am: number | null;
};

/** Aktive Aufgaben eines Prozesses in chronologischer Reihenfolge. */
export const aufgaben = (prozess: Prozess) =>
  alle<Aufgabe>(
    "SELECT id, prozess, gruppe, titel, info, sortierung FROM ablauf_aufgaben WHERE prozess = ? AND aktiv = 1 ORDER BY sortierung, titel",
    prozess,
  );

/** Aufgaben eines Prozesses inkl. Erledigt-Status für einen bestimmten Tag. */
export async function tag(prozess: Prozess, datum: string) {
  const aufg = (await alle<TagAufgabe>(
    `SELECT a.id, a.prozess, a.gruppe, a.titel, a.info, a.sortierung,
            (e.aufgabe_id IS NOT NULL) AS erledigt, e.von AS erledigt_von, e.am AS erledigt_am
       FROM ablauf_aufgaben a
       LEFT JOIN ablauf_erledigt e ON e.aufgabe_id = a.id AND e.datum = ?
      WHERE a.prozess = ? AND a.aktiv = 1
      ORDER BY a.sortierung, a.titel`,
    datum,
    prozess,
  )).map((a) => ({ ...a, erledigt: !!a.erledigt }));
  const done = aufg.filter((a) => a.erledigt).length;
  return { prozess, aufgaben: aufg, done, total: aufg.length };
}

/** Kompakter Fortschritt je Prozess für einen Tag (für Vorschlag & Banner). */
export async function status(datum: string) {
  const rows = await alle<{ prozess: Prozess; total: number | string; done: number | string }>(
    `SELECT a.prozess, COUNT(*) AS total, COUNT(e.aufgabe_id) AS done
       FROM ablauf_aufgaben a
       LEFT JOIN ablauf_erledigt e ON e.aufgabe_id = a.id AND e.datum = ?
      WHERE a.aktiv = 1
      GROUP BY a.prozess`,
    datum,
  );
  const out: Record<Prozess, { done: number; total: number; fertig: boolean }> = {
    aufbau: { done: 0, total: 0, fertig: false },
    leerlauf: { done: 0, total: 0, fertig: false },
    abbau: { done: 0, total: 0, fertig: false },
  };
  for (const r of rows) {
    const total = Number(r.total), done = Number(r.done);
    out[r.prozess] = { done, total, fertig: total > 0 && done >= total };
  }
  return out;
}

/** Aufgabe für einen Tag als erledigt markieren (idempotent, hält fest wer/wann). */
export async function erledigtSetzen(aufgabeId: string, datum: string, von: string | null) {
  // ablauf_erledigt ist eine View auf den Dokumentenspeicher – dort gibt es kein ON CONFLICT.
  if (await eins("SELECT 1 AS x FROM ablauf_erledigt WHERE datum = ? AND aufgabe_id = ?", datum, aufgabeId)) return { changes: 0 };
  return lauf(
    "INSERT INTO ablauf_erledigt (id, datum, aufgabe_id, von, am) VALUES (?, ?, ?, ?, ?)",
    randomUUID(), datum, aufgabeId, von, Date.now(),
  );
}

/** Erledigt-Haken wieder entfernen. */
export const erledigtLoeschen = (aufgabeId: string, datum: string) =>
  lauf("DELETE FROM ablauf_erledigt WHERE datum = ? AND aufgabe_id = ?", datum, aufgabeId);

/** Nächste Sortiernummer am Ende eines Prozesses. */
export async function naechsteSortierung(prozess: Prozess): Promise<number> {
  const r = await eins<{ m: number | null }>(
    "SELECT MAX(sortierung) AS m FROM ablauf_aufgaben WHERE prozess = ?",
    prozess,
  );
  return (r?.m ?? -1) + 1;
}
