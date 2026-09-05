// Generischer, schema-validierter Dokumentenspeicher – der eine Ort für Fachdaten-CRUD.
// Schemata liegen in `schemata` (JSON Schema, JSONB), Daten in `dokumente` (JSONB).
// Jede Änderung wird mit Ajv gegen das in der DB gespeicherte Schema geprüft.
// JSONB-Parameter immer als Objekt binden (nicht vorab stringifizieren): Bun.SQL würde einen
// String als JSON-String ablegen, PGlite als Objekt – Objekte behandeln beide gleich.
import Ajv, { type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import { randomUUID } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "./db";
import * as live from "./live";
import { karteInvalidieren } from "./site/karte";
import { ENTITAETEN } from "./datenmodell";

export type SchemaZeile = {
  id: string; name: string; beschreibung: string | null; schema: Record<string, unknown>;
  lesen: string | null; schreiben: string | null; signal: string | null; version: number; system: number;
  erstellt: number; aktualisiert: number;
  /** Feldnamen in Anzeige-Reihenfolge (JSONB verliert die Reihenfolge der properties). */
  felder: string[];
};
/** Ein Dokument: Fachfelder plus Meta `id`, `_erstellt`, `_aktualisiert` (Unterstrich: kein Fachfeld). */
export type Dokument = { id: string; _erstellt: number; _aktualisiert: number } & Record<string, unknown>;
export type Pruefung = { ok: true; data: Record<string, unknown> } | { ok: false; fehler: { pfad: string; meldung: string }[]; konflikt?: boolean };
export type VerlaufZeile = {
  seq: number; dokument_id: string; schema_id: string; aktion: "insert" | "update" | "delete";
  data_alt: Record<string, unknown> | null; data_neu: Record<string, unknown> | null; wer: string | null; ts: number;
};
export type SchemaVerlaufZeile = {
  seq: number; schema_id: string; aktion: "insert" | "update" | "delete";
  alt: Record<string, unknown> | null; neu: Record<string, unknown> | null; wer: string | null; ts: number;
};

/**
 * Akteur fuer die Historie: wird als Session-Variable `huh.user` gesetzt, die Verlaufs-Trigger
 * lesen sie. Vor jedem Schreibzugriff aufrufen (Person-ID, Skill-Name oder "system").
 */
export async function alsWer(wer: string | null | undefined) {
  await lauf("SELECT set_config('huh.user', ?, false)", wer ?? "");
}

/** DB-Fehler (z. B. Unique-Index) in eine lesbare Prüfantwort übersetzen. */
function dbFehler(e: unknown): Pruefung {
  const m = String((e as Error)?.message ?? e);
  const unique = /unique|duplicate key|ux_dok/i.test(m);
  return { ok: false, konflikt: unique, fehler: [{ pfad: "", meldung: unique ? "Verstößt gegen eine Eindeutigkeitsregel (Wert bereits vorhanden)." : `Datenbankfehler: ${m.slice(0, 200)}` }] };
}

const ajv = new Ajv({ allErrors: true, strict: false, useDefaults: true, coerceTypes: false });
addFormats(ajv);
const cache = new Map<string, ValidateFunction>();

const norm = (z: Record<string, unknown>): SchemaZeile => {
  const schema = (typeof z.schema === "string" ? JSON.parse(z.schema as string) : z.schema) as Record<string, unknown>;
  const props = Object.keys((schema.properties as Record<string, unknown>) ?? {});
  // System-Entitäten: Reihenfolge aus dem Datenmodell; sonst optional schema["x-fields"], sonst wie gespeichert.
  const e = ENTITAETEN.find((x) => x.id === z.id);
  const gewuenscht = e ? e.spalten.map((s) => s.name) : Array.isArray(schema["x-fields"]) ? (schema["x-fields"] as string[]) : props;
  const felder = [...gewuenscht.filter((f) => props.includes(f)), ...props.filter((f) => !gewuenscht.includes(f))];
  return {
    ...(z as SchemaZeile), schema, felder,
    version: Number(z.version), system: Number(z.system), erstellt: Number(z.erstellt), aktualisiert: Number(z.aktualisiert),
  };
};

// ------------------------------------------------------------------ Schemata

export async function schemata(): Promise<(SchemaZeile & { anzahl: number })[]> {
  const rows = await alle<Record<string, unknown>>(
    `SELECT s.*, (SELECT COUNT(*) FROM dokumente d WHERE d.schema_id = s.id) AS anzahl FROM schemata s ORDER BY s.system DESC, s.name`);
  return rows.map((r) => ({ ...norm(r), anzahl: Number(r.anzahl) }));
}

const schemaCache = new Map<string, SchemaZeile>();
export async function schema(id: string): Promise<SchemaZeile | null> {
  const c = schemaCache.get(id);
  if (c) return c;
  const r = await eins<Record<string, unknown>>("SELECT * FROM schemata WHERE id = ?", id);
  if (!r) return null;
  const z = norm(r);
  schemaCache.set(id, z);
  return z;
}

/** Ist das ein gültiges JSON Schema? (kompiliert es) – liefert null oder Fehlertext. */
export function schemaPruefen(s: unknown): string | null {
  if (!s || typeof s !== "object" || Array.isArray(s)) return "Schema muss ein Objekt sein.";
  try { ajv.compile(s as Record<string, unknown>); return null; } catch (e) { return String((e as Error).message ?? e); }
}

const ID_RE = /^[a-z][a-z0-9_]{1,40}$/;

export async function schemaAnlegen(
  eingabe: { id: string; name: string; beschreibung?: string | null; schema: Record<string, unknown>; lesen?: string | null; schreiben?: string | null; signal?: string | null },
): Promise<{ ok: true; schema: SchemaZeile } | { ok: false; fehler: string }> {
  if (!ID_RE.test(eingabe.id)) return { ok: false, fehler: "id: nur a-z, 0-9, _ (2–41 Zeichen, mit Buchstabe beginnend)" };
  if (!eingabe.name?.trim()) return { ok: false, fehler: "name fehlt" };
  const err = schemaPruefen(eingabe.schema);
  if (err) return { ok: false, fehler: `Ungültiges JSON Schema: ${err}` };
  if (await schema(eingabe.id)) return { ok: false, fehler: "Es gibt schon ein Schema mit dieser id" };
  const now = Date.now();
  await lauf(
    `INSERT INTO schemata (id, name, beschreibung, schema, lesen, schreiben, signal, version, system, erstellt, aktualisiert)
     VALUES (?, ?, ?, ?::jsonb, ?, ?, ?, 1, 0, ?, ?)`,
    eingabe.id, eingabe.name.trim(), eingabe.beschreibung ?? null, eingabe.schema,
    eingabe.lesen ?? null, eingabe.schreiben ?? null, eingabe.signal ?? null, now, now,
  );
  schemaCache.delete(eingabe.id);
  live.sende("alle", { typ: "daten" });
  return { ok: true, schema: (await schema(eingabe.id))! };
}

export async function schemaAendern(
  id: string, patch: { name?: string; beschreibung?: string | null; schema?: Record<string, unknown>; lesen?: string | null; schreiben?: string | null; signal?: string | null },
): Promise<{ ok: true; schema: SchemaZeile } | { ok: false; fehler: string }> {
  const alt = await schema(id);
  if (!alt) return { ok: false, fehler: "nicht gefunden" };
  if (patch.schema) { const err = schemaPruefen(patch.schema); if (err) return { ok: false, fehler: `Ungültiges JSON Schema: ${err}` }; }
  const neu = {
    name: patch.name?.trim() || alt.name, beschreibung: patch.beschreibung === undefined ? alt.beschreibung : patch.beschreibung,
    schema: patch.schema ?? alt.schema, lesen: patch.lesen === undefined ? alt.lesen : patch.lesen,
    schreiben: patch.schreiben === undefined ? alt.schreiben : patch.schreiben, signal: patch.signal === undefined ? alt.signal : patch.signal,
  };
  await lauf(
    "UPDATE schemata SET name = ?, beschreibung = ?, schema = ?::jsonb, lesen = ?, schreiben = ?, signal = ?, version = version + 1, aktualisiert = ? WHERE id = ?",
    neu.name, neu.beschreibung, neu.schema, neu.lesen, neu.schreiben, neu.signal, Date.now(), id,
  );
  cache.delete(`${id}@${alt.version}`);
  schemaCache.delete(id);
  live.sende("alle", { typ: "daten" });
  return { ok: true, schema: (await schema(id))! };
}

/** Nur selbst angelegte Schemata (system = 0) – löscht auch alle Dokumente dazu. */
export async function schemaLoeschen(id: string): Promise<boolean> {
  const s = await schema(id);
  if (!s || s.system) return false;
  await lauf("DELETE FROM dokumente WHERE schema_id = ?", id);
  await lauf("DELETE FROM schemata WHERE id = ?", id);
  schemaCache.delete(id);
  live.sende("alle", { typ: "daten" });
  return true;
}

// ------------------------------------------------------------------ Historie

const jsonb = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) as Record<string, unknown> | null;

/** Aenderungshistorie der Dokumente, neueste zuerst; optional auf Schema und/oder Dokument eingegrenzt. */
export async function verlauf(filter: { schema?: string; dokument?: string } = {}, limit = 200, offset = 0): Promise<VerlaufZeile[]> {
  const bed: string[] = ["1=1"], params: unknown[] = [];
  if (filter.schema) { bed.push("schema_id = ?"); params.push(filter.schema); }
  if (filter.dokument) { bed.push("dokument_id = ?"); params.push(filter.dokument); }
  const rows = await alle<VerlaufZeile>(
    `SELECT seq, dokument_id, schema_id, aktion, data_alt, data_neu, wer, ts FROM dokumente_verlauf WHERE ${bed.join(" AND ")} ORDER BY seq DESC LIMIT ? OFFSET ?`,
    ...params, Math.min(Math.max(limit, 1), 1000), Math.max(offset, 0));
  return rows.map((r) => ({ ...r, seq: Number(r.seq), ts: Number(r.ts), data_alt: jsonb(r.data_alt), data_neu: jsonb(r.data_neu) }));
}

/** Aenderungshistorie der Schemata, neueste zuerst. */
export async function schemaVerlauf(schemaId?: string, limit = 200): Promise<SchemaVerlaufZeile[]> {
  const rows = await alle<SchemaVerlaufZeile>(
    `SELECT seq, schema_id, aktion, alt, neu, wer, ts FROM schemata_verlauf ${schemaId ? "WHERE schema_id = ?" : ""} ORDER BY seq DESC LIMIT ?`,
    ...(schemaId ? [schemaId] : []), Math.min(Math.max(limit, 1), 1000));
  return rows.map((r) => ({ ...r, seq: Number(r.seq), ts: Number(r.ts), alt: jsonb(r.alt), neu: jsonb(r.neu) }));
}

/**
 * Stand VOR einem Verlaufseintrag wiederherstellen: nach `delete` wird das Dokument neu angelegt,
 * nach `update` der alte Inhalt zurueckgeschrieben, nach `insert` das Dokument entfernt.
 * Die Wiederherstellung selbst landet wieder in der Historie (Akteur ueber alsWer()).
 */
export async function wiederherstellen(seq: number): Promise<{ ok: true; dokument: Dokument | null } | { ok: false; fehler: string; konflikt?: boolean }> {
  const v = (await alle<VerlaufZeile>("SELECT * FROM dokumente_verlauf WHERE seq = ?", seq))[0];
  if (!v) return { ok: false, fehler: "Verlaufseintrag nicht gefunden" };
  const s = await schema(v.schema_id);
  if (!s) return { ok: false, fehler: "Schema existiert nicht mehr" };
  const alt = jsonb(v.data_alt);
  if (v.aktion === "insert") {
    await loeschen(s, v.dokument_id);
    return { ok: true, dokument: null };
  }
  const p = pruefen(s, alt ?? {});
  if (!p.ok) return { ok: false, fehler: "Alter Stand passt nicht mehr zum aktuellen Schema: " + p.fehler.map((f) => `${f.pfad} ${f.meldung}`).join("; ") };
  const jetzt = await lesen(s, v.dokument_id);
  const r = jetzt ? await ersetzen(s, v.dokument_id, p.data) : await anlegen(s, p.data, v.dokument_id);
  if (!r || !r.ok) return { ok: false, fehler: r ? r.fehler.map((f) => f.meldung).join("; ") : "nicht gefunden", konflikt: r ? r.konflikt : false };
  return { ok: true, dokument: r.dokument };
}

/** Schema-Stand VOR einem Verlaufseintrag wiederherstellen (nur selbst angelegte Schemata werden neu angelegt/geloescht; System-Schemata nur inhaltlich). */
export async function schemaWiederherstellen(seq: number): Promise<{ ok: true; schema: SchemaZeile | null } | { ok: false; fehler: string }> {
  const v = (await alle<SchemaVerlaufZeile>("SELECT * FROM schemata_verlauf WHERE seq = ?", seq))[0];
  if (!v) return { ok: false, fehler: "Verlaufseintrag nicht gefunden" };
  const alt = jsonb(v.alt);
  if (v.aktion === "insert") {
    const ok = await schemaLoeschen(v.schema_id);
    return ok ? { ok: true, schema: null } : { ok: false, fehler: "System-Schema kann nicht entfernt werden" };
  }
  if (!alt) return { ok: false, fehler: "Kein alter Stand vorhanden" };
  const felder = { name: String(alt.name), beschreibung: (alt.beschreibung as string | null) ?? null, schema: jsonb(alt.schema) ?? {}, lesen: (alt.lesen as string | null) ?? null, schreiben: (alt.schreiben as string | null) ?? null, signal: (alt.signal as string | null) ?? null };
  const r = (await schema(v.schema_id)) ? await schemaAendern(v.schema_id, felder) : await schemaAnlegen({ id: v.schema_id, ...felder });
  return r.ok ? { ok: true, schema: r.schema } : { ok: false, fehler: r.fehler };
}

// ------------------------------------------------------------------ Rechte

export const darf = (person: Mitarbeiter, s: SchemaZeile, was: "lesen" | "schreiben") => {
  const cap = s[was];
  return !cap || !!person.caps?.includes("*") || !!person.caps?.includes(cap);
};

// ------------------------------------------------------------------ Validierung

function validator(s: SchemaZeile): ValidateFunction {
  const key = `${s.id}@${s.version}`;
  let v = cache.get(key);
  if (!v) { v = ajv.compile(s.schema); cache.set(key, v); }
  return v;
}

/** Prüft Daten gegen das gespeicherte Schema (füllt Defaults). Meta (`id`, `_erstellt`, `_aktualisiert`) gehört nicht zu den Daten. */
export function pruefen(s: SchemaZeile, roh: unknown): Pruefung {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return { ok: false, fehler: [{ pfad: "", meldung: "Dokument muss ein Objekt sein" }] };
  const { id: _i, _erstellt: _e, _aktualisiert: _a, ...data } = roh as Record<string, unknown>;
  const v = validator(s);
  if (v(data)) return { ok: true, data };
  return { ok: false, fehler: (v.errors ?? []).map((e) => ({ pfad: e.instancePath || (e.params as { missingProperty?: string })?.missingProperty ? `/${(e.params as { missingProperty?: string }).missingProperty ?? ""}`.replace(/\/$/, "") : "", meldung: e.message ?? "ungültig" })) };
}

// ------------------------------------------------------------------ Dokumente

const zeile = (r: { id: string; data: unknown; erstellt: number; aktualisiert: number }): Dokument => ({
  ...(typeof r.data === "string" ? JSON.parse(r.data) : (r.data as Record<string, unknown>)),
  id: r.id, _erstellt: Number(r.erstellt), _aktualisiert: Number(r.aktualisiert),
});

/** Liste mit einfachen Gleichheitsfiltern auf Feldern (`?f.datum=2026-09-05`). */
export async function liste(s: SchemaZeile, filter: Record<string, string> = {}, limit = 200, offset = 0): Promise<Dokument[]> {
  const props = (s.schema.properties ?? {}) as Record<string, unknown>;
  const bed: string[] = ["schema_id = ?"], params: unknown[] = [s.id];
  for (const [k, v] of Object.entries(filter)) {
    if (!(k in props)) continue; // unbekannte Felder ignorieren
    bed.push("data->>? = ?"); params.push(k, v);
  }
  const rows = await alle<{ id: string; data: unknown; erstellt: number; aktualisiert: number }>(
    `SELECT id, data, erstellt, aktualisiert FROM dokumente WHERE ${bed.join(" AND ")} ORDER BY erstellt DESC LIMIT ? OFFSET ?`,
    ...params, Math.min(Math.max(limit, 1), 1000), Math.max(offset, 0),
  );
  return rows.map(zeile);
}

export async function lesen(s: SchemaZeile, id: string): Promise<Dokument | null> {
  const r = await eins<{ id: string; data: unknown; erstellt: number; aktualisiert: number }>(
    "SELECT id, data, erstellt, aktualisiert FROM dokumente WHERE schema_id = ? AND id = ?", s.id, id);
  return r ? zeile(r) : null;
}

function signal(s: SchemaZeile) {
  if (s.signal) live.sende("alle", { typ: s.signal });
  if (s.signal === "karte") karteInvalidieren();
  live.sende("alle", { typ: "daten" });
}

export async function anlegen(s: SchemaZeile, roh: unknown, id?: string): Promise<Pruefung | { ok: true; dokument: Dokument }> {
  const p = pruefen(s, roh);
  if (!p.ok) return p;
  const neuId = id && /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : randomUUID();
  const now = Date.now();
  try {
    await lauf("INSERT INTO dokumente (id, schema_id, data, erstellt, aktualisiert) VALUES (?, ?, ?::jsonb, ?, ?)",
      neuId, s.id, p.data, now, now);
  } catch (e) { return dbFehler(e); }
  signal(s);
  return { ok: true, dokument: (await lesen(s, neuId))! };
}

export async function ersetzen(s: SchemaZeile, id: string, roh: unknown): Promise<Pruefung | { ok: true; dokument: Dokument } | null> {
  if (!(await lesen(s, id))) return null;
  const p = pruefen(s, roh);
  if (!p.ok) return p;
  try {
    await lauf("UPDATE dokumente SET data = ?::jsonb, aktualisiert = ? WHERE schema_id = ? AND id = ?", p.data, Date.now(), s.id, id);
  } catch (e) { return dbFehler(e); }
  signal(s);
  return { ok: true, dokument: (await lesen(s, id))! };
}

export async function aendern(s: SchemaZeile, id: string, patch: unknown): Promise<Pruefung | { ok: true; dokument: Dokument } | null> {
  const alt = await lesen(s, id);
  if (!alt) return null;
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return { ok: false, fehler: [{ pfad: "", meldung: "Patch muss ein Objekt sein" }] };
  const { id: _i, _erstellt: _e, _aktualisiert: _a, ...basis } = alt;
  return ersetzen(s, id, { ...basis, ...(patch as Record<string, unknown>) });
}

export async function loeschen(s: SchemaZeile, id: string): Promise<boolean> {
  // Kaskaden der System-Entitäten nachziehen (bei Views erledigen das die Trigger).
  const e = ENTITAETEN.find((x) => x.id === s.id);
  for (const k of e?.kaskade ?? []) await lauf("DELETE FROM dokumente WHERE schema_id = ? AND data->>? = ?", k.entitaet, k.feld, id);
  const r = await lauf("DELETE FROM dokumente WHERE schema_id = ? AND id = ?", s.id, id);
  if (r.changes) signal(s);
  return r.changes > 0;
}

// ------------------------------------------------------------------ Server-Zugriff (SSOT fuer Fachdaten-Schreibzugriffe)

export class DatenFehler extends Error {
  status: number;
  constructor(p: Extract<Pruefung, { ok: false }>) {
    super(p.fehler.map((f) => (f.pfad ? `${f.pfad}: ` : "") + f.meldung).join("; "));
    this.status = p.konflikt ? 409 : 400;
  }
}

/**
 * Typisierter Zugriff auf eine Entitaet fuer Server-Module: jeder Schreibzugriff laeuft durch
 * Schema-Validierung, Historie (Akteur) und Live-Signal. Komplexe Lesezugriffe (Joins,
 * Aggregationen) gehen weiter per SQL auf die englischen Views – dieselben Daten.
 */
export function store<T extends Record<string, unknown>>(schemaId: string) {
  const s = async () => {
    const z = await schema(schemaId);
    if (!z) throw new Error(`Schema ${schemaId} fehlt`);
    return z;
  };
  type Doc = T & Dokument;
  return {
    id: schemaId,
    list: async (filter: Record<string, string> = {}, limit = 1000) => (await liste(await s(), filter, limit)) as Doc[],
    get: async (id: string) => (await lesen(await s(), id)) as Doc | null,
    /** Anlegen; wirft DatenFehler bei Schema-/Eindeutigkeitsverstoss. */
    create: async (data: Partial<T>, wer?: string | null, id?: string) => {
      await alsWer(wer);
      const r = await anlegen(await s(), data, id);
      if (!r.ok) throw new DatenFehler(r);
      return r.dokument as Doc;
    },
    /** Felder aendern; null wenn es das Dokument nicht gibt. */
    patch: async (id: string, patch: Partial<T>, wer?: string | null) => {
      await alsWer(wer);
      const r = await aendern(await s(), id, patch);
      if (r === null) return null;
      if (!r.ok) throw new DatenFehler(r);
      return r.dokument as Doc;
    },
    remove: async (id: string, wer?: string | null) => {
      await alsWer(wer);
      return loeschen(await s(), id);
    },
  };
}
