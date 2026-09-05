// Reservierungs-Logik: Zeitfenster, Kapazität, Anlegen und Verwalten.
// Bewusst ohne externe Abhängigkeit – SQLite als einzige Quelle der Wahrheit.

import { alle, eins, lauf } from "./db";
import * as dok from "./dokumente";
import { OEFFNUNG, WOCHENTAGE } from "./site/info";

export type Bereich = "drinnen" | "draussen";
export const BEREICHE: Bereich[] = ["drinnen", "draussen"];
export const BEREICH_LABEL: Record<Bereich, string> = { drinnen: "Drinnen", draussen: "Draußen" };

/**
 * Platzkapazität: physische Plätze je Bereich plus Walk-in-Puffer in Prozent.
 * Der Puffer bleibt für spontane Gäste frei und ist online nicht buchbar –
 * das Gesamtmaximum ergibt sich automatisch aus drinnen + draußen.
 */
export type Kapazitaet = { drinnen: number; draussen: number; puffer: number };
const KAP_STANDARD: Kapazitaet = { drinnen: 46, draussen: 20, puffer: 25 };

/** Online buchbare Plätze eines Bereichs (nach Abzug des Walk-in-Puffers). */
export const onlinePlaetze = (k: Kapazitaet, bereich: Bereich) =>
  Math.floor(k[bereich] * (1 - k.puffer / 100));

/** Vom Admin gepflegte Platzkapazität (einstellungen-Tabelle, mit Standardwerten). */
export async function kapazitaet(): Promise<Kapazitaet> {
  const rows = await alle<{ k: string; v: string }>(
    "SELECT k, v FROM einstellungen WHERE k IN ('kap_drinnen','kap_draussen','kap_puffer')",
  );
  const m = Object.fromEntries(rows.map((r) => [r.k, r.v]));
  const zahl = (v: unknown, standard: number, max = Infinity) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? n : standard;
  };
  return {
    drinnen: zahl(m.kap_drinnen, KAP_STANDARD.drinnen),
    draussen: zahl(m.kap_draussen, KAP_STANDARD.draussen),
    puffer: zahl(m.kap_puffer, KAP_STANDARD.puffer, 90),
  };
}

export async function kapazitaetSetzen(k: Kapazitaet): Promise<void> {
  const setze = (key: string, wert: string) =>
    lauf(
      "INSERT INTO einstellungen (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v",
      key, wert,
    );
  await setze("kap_drinnen", String(k.drinnen));
  await setze("kap_draussen", String(k.draussen));
  await setze("kap_puffer", String(k.puffer));
}
/** Wie lange ein Tisch pro Reservierung belegt bleibt. */
export const BELEGUNG_MIN = 120;
/** Raster der buchbaren Zeiten. */
export const TAKT_MIN = 30;
/** Letzte Reservierung so viele Minuten vor Küchenschluss. */
export const LETZTE_VOR_SCHLUSS_MIN = 90;
/** Ab dieser Gruppengröße läuft die Anfrage über das Feiern-Formular. */
export const MAX_PERSONEN_ONLINE = 8;
/** Mindestvorlauf für Buchungen am selben Tag. */
export const VORLAUF_MIN = 60;
/** Wie weit im Voraus gebucht werden kann. */
export const HORIZONT_TAGE = 90;

export type Status = "offen" | "bestaetigt" | "abgesagt" | "erledigt";

export type Reservierung = {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  date: string; // YYYY-MM-DD
  time: string; //  HH:MM
  guests: number;
  area: Bereich;
  occasion: string | null;
  note: string | null;
  status: Status;
  created_at: number;
};

/** SSOT-Zugriff (Schema reservations): Schreiben validiert + Historie. */
const RES = dok.store<Omit<Reservierung, "id">>("reservations");

export type Slot = { time: string; free: number; bookable: boolean };

// ---------------------------------------------------------------- Hilfsmittel

const zwei = (n: number) => String(n).padStart(2, "0");

export const alsDatum = (d: Date) =>
  `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}`;

const minuten = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const alsZeit = (min: number) => `${zwei(Math.floor(min / 60))}:${zwei(min % 60)}`;

/** Lokaler Zeitstempel aus Datum + Uhrzeit (kein UTC-Versatz). */
const stempel = (datum: string, zeit: string) => {
  const [y, m, d] = datum.split("-").map(Number);
  const [hh, mm] = zeit.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
};

export const istDatum = (s: unknown): s is string =>
  typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const wochentag = (datum: string) => {
  const [y, m, d] = datum.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
};

export const tagName = (datum: string) => WOCHENTAGE[wochentag(datum)];

export const datumLang = (datum: string) => {
  const [y, m, d] = datum.split("-").map(Number);
  return `${tagName(datum)}, ${d}. ${
    ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"][m - 1]
  } ${y}`;
};

/** Verwechslungsfreier Buchungscode (ohne 0/O, 1/I). */
const codeErzeugen = () => {
  const zeichen = "ACDEFGHJKLMNPQRTUVWXYZ2346789";
  let code = "";
  for (let i = 0; i < 6; i++) code += zeichen[Math.floor(Math.random() * zeichen.length)];
  return code;
};

// ------------------------------------------------------------ Verfügbarkeit

/** Alle Zeiten, zu denen an diesem Tag grundsätzlich reserviert werden kann. */
export function rasterFuer(datum: string): string[] {
  const zeit = OEFFNUNG[wochentag(datum)];
  if (!zeit) return [];
  const start = minuten(zeit.von);
  const ende = minuten(zeit.bis) - LETZTE_VOR_SCHLUSS_MIN;
  const slots: string[] = [];
  for (let m = start; m <= ende; m += TAKT_MIN) slots.push(alsZeit(m));
  return slots;
}

/** Belegte Plätze je Rasterzeit und Bereich – Überschneidung bei < 120 min Abstand. */
async function belegung(datum: string): Promise<Map<string, { drinnen: number; draussen: number }>> {
  const aktiv = await alle<{ time: string; guests: number; area: Bereich }>(
    "SELECT time, guests, area FROM reservations WHERE date = ? AND status IN ('offen','bestaetigt')",
    datum,
  );

  const karte = new Map<string, { drinnen: number; draussen: number }>();
  for (const slot of rasterFuer(datum)) {
    const s = minuten(slot);
    const summe = { drinnen: 0, draussen: 0 };
    for (const r of aktiv) {
      const a = minuten(r.time);
      if (Math.abs(a - s) < BELEGUNG_MIN) summe[r.area] += r.guests;
    }
    karte.set(slot, summe);
  }
  return karte;
}

/**
 * Online freie Plätze je Zeitfenster für einen Bereich – inklusive Vorlauf- und
 * Ruhetagsregeln. Der Walk-in-Puffer ist bereits abgezogen.
 */
export async function slotsFuer(
  datum: string,
  personen: number,
  bereich: Bereich = "drinnen",
  jetzt = Date.now(),
): Promise<Slot[]> {
  const [belegt, kap] = await Promise.all([belegung(datum), kapazitaet()]);
  const online = onlinePlaetze(kap, bereich);
  return rasterFuer(datum).map((time) => {
    const b = belegt.get(time) ?? { drinnen: 0, draussen: 0 };
    const free = Math.max(0, online - b[bereich]);
    const rechtzeitig = stempel(datum, time) - jetzt >= VORLAUF_MIN * 60_000;
    return { time, free, bookable: rechtzeitig && free >= personen };
  });
}

export type Pruefung = { ok: true } | { ok: false; fehler: string };

/** Fachliche Prüfung einer Buchungsanfrage – gleiche Regeln für Web und Team. */
export async function pruefe(
  datum: string,
  zeit: string,
  personen: number,
  bereich: Bereich = "drinnen",
  jetzt = Date.now(),
): Promise<Pruefung> {
  if (!istDatum(datum)) return { ok: false, fehler: "Bitte ein gültiges Datum wählen." };
  if (!/^\d{2}:\d{2}$/.test(zeit)) return { ok: false, fehler: "Bitte eine Uhrzeit wählen." };
  if (!Number.isInteger(personen) || personen < 1) {
    return { ok: false, fehler: "Bitte die Personenzahl angeben." };
  }
  if (personen > MAX_PERSONEN_ONLINE) {
    return {
      ok: false,
      fehler: `Ab ${MAX_PERSONEN_ONLINE + 1} Personen planen wir gemeinsam – schreibt uns über „Feiern“.`,
    };
  }

  const grenze = new Date();
  grenze.setDate(grenze.getDate() + HORIZONT_TAGE);
  if (datum > alsDatum(grenze)) {
    return { ok: false, fehler: `Online buchen wir bis ${HORIZONT_TAGE} Tage im Voraus.` };
  }
  if (!OEFFNUNG[wochentag(datum)]) {
    return { ok: false, fehler: `${tagName(datum)} ist unser Ruhetag – wir freuen uns an jedem anderen Tag.` };
  }

  const slot = (await slotsFuer(datum, personen, bereich, jetzt)).find((s) => s.time === zeit);
  if (!slot) return { ok: false, fehler: "Diese Uhrzeit können wir nicht anbieten." };
  if (stempel(datum, zeit) - jetzt < VORLAUF_MIN * 60_000) {
    return { ok: false, fehler: "Für kurzfristige Tische ruft uns bitte kurz an." };
  }
  if (slot.free < personen) {
    return {
      ok: false,
      fehler: `${BEREICH_LABEL[bereich]} sind wir zu dieser Zeit leider voll – probiert eine andere Uhrzeit oder den anderen Bereich.`,
    };
  }
  return { ok: true };
}

// ------------------------------------------------------------------ Schreiben

export type NeueReservierung = {
  name: string;
  email: string | null;
  phone: string | null;
  date: string;
  time: string;
  guests: number;
  area: Bereich;
  occasion?: string | null;
  note?: string | null;
  status?: Status;
};

/** Nur die Fachfelder (ohne Store-Meta) – so gehen Reservierungen nach draussen. */
const fach = (d: Record<string, unknown>): Reservierung => {
  const { _erstellt: _e, _aktualisiert: _a, ...rest } = d;
  return rest as Reservierung;
};

export async function anlegen(r: NeueReservierung, wer: string | null = "guest"): Promise<Reservierung> {
  const d = await RES.create({
    code: codeErzeugen(),
    name: r.name.trim(),
    email: r.email?.trim() || null,
    phone: r.phone?.trim() || null,
    date: r.date,
    time: r.time,
    guests: r.guests,
    area: r.area,
    occasion: r.occasion?.trim() || null,
    note: r.note?.trim() || null,
    status: r.status ?? "offen",
    created_at: Date.now(),
  }, wer);
  return fach(d);
}

export const nachCode = (code: string) =>
  eins<Reservierung>("SELECT * FROM reservations WHERE code = ?", code.trim().toUpperCase());

export const fuerTag = (datum: string) =>
  alle<Reservierung>("SELECT * FROM reservations WHERE date = ? ORDER BY time, name", datum);

/** Kommende Reservierungen ab heute – Grundlage der Team-Übersicht. */
export const abHeute = (limit = 200) =>
  alle<Reservierung>(
    `SELECT * FROM reservations
      WHERE date >= ? AND status IN ('offen','bestaetigt')
      ORDER BY date, time LIMIT ?`,
    alsDatum(new Date()), limit,
  );

export async function statusSetzen(id: string, status: Status, wer: string | null): Promise<boolean> {
  return !!(await RES.patch(id, { status }, wer));
}

/** Team-Bearbeitung: Stammdaten einer Reservierung ändern (Format-, keine Kapazitätsprüfung). */
export async function aktualisieren(
  id: string,
  f: Pick<Reservierung, "name" | "email" | "phone" | "date" | "time" | "guests" | "area" | "occasion" | "note">,
  wer: string | null,
): Promise<Reservierung | null> {
  const d = await RES.patch(id, f, wer);
  return d ? fach(d) : null;
}

/** Team-Löschung: Reservierung endgültig entfernen (z. B. Testeinträge, Dubletten). */
export async function loeschen(id: string, wer: string | null): Promise<boolean> {
  return RES.remove(id, wer);
}

/** Gast storniert selbst über seinen Code. */
export async function stornieren(code: string): Promise<Reservierung | null> {
  const r = await nachCode(code);
  if (!r || r.status === "abgesagt") return r;
  await RES.patch(r.id, { status: "abgesagt" }, "guest");
  return { ...r, status: "abgesagt" };
}

/** Kennzahlen für das Team-Dashboard. */
export async function tagesUebersicht(datum: string) {
  const [liste, kap] = await Promise.all([fuerTag(datum), kapazitaet()]);
  const aktiv = liste.filter((r) => r.status === "offen" || r.status === "bestaetigt");
  const guests = aktiv.reduce((s, r) => s + r.guests, 0);
  // Auslastung gegen die physischen Plätze – der Puffer betrifft nur die Online-Buchung.
  const gesamtKap = kap.drinnen + kap.draussen;
  return {
    date: datum,
    reservations: liste.length,
    guests,
    drinnen: aktiv.filter((r) => r.area === "drinnen").reduce((s, r) => s + r.guests, 0),
    draussen: aktiv.filter((r) => r.area === "draussen").reduce((s, r) => s + r.guests, 0),
    open: liste.filter((r) => r.status === "offen").length,
    occupancy: gesamtKap > 0 ? Math.round((guests / gesamtKap) * 100) : 0,
  };
}
