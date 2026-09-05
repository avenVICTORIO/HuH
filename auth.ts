// Leichte Session-Auth für das Team: PIN-Login am Terminal setzt ein signiertes
// Cookie, das Dashboard liest daraus Rolle und Identität. Bewusst ohne externe
// Abhängigkeiten – für den lokalen Tablet-Betrieb gedacht, nicht fürs offene Netz.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "./db";
import * as dok from "./dokumente";

const COOKIE = "huh_session";
const GUELTIG_MS = 12 * 60 * 60 * 1000; // eine Schicht + Puffer

// Geheimnis pro Datenbank: einmal erzeugt, in der einstellungen-Tabelle abgelegt.
// So überleben Sessions einen Neustart, ohne dass ein Secret im Code liegt.
async function secret(): Promise<string> {
  const zeile = await eins<{ v: string }>(
    "SELECT v FROM einstellungen WHERE k = 'session_secret'",
  );
  if (zeile) return zeile.v;
  const neu = randomUUID() + randomUUID();
  await lauf("INSERT INTO einstellungen (k, v) VALUES ('session_secret', ?)", neu);
  return neu;
}
const SECRET = await secret();

const signiere = (daten: string) =>
  createHmac("sha256", SECRET).update(daten).digest("base64url");

/** Token: mitarbeiterId.ablauf.signatur */
export function tokenFuer(mitarbeiterId: string): string {
  const ablauf = Date.now() + GUELTIG_MS;
  const daten = `${mitarbeiterId}.${ablauf}`;
  return `${daten}.${signiere(daten)}`;
}

function tokenPruefen(token: string): string | null {
  const teile = token.split(".");
  if (teile.length !== 3) return null;
  const [id, ablauf, sig] = teile;
  if (Number(ablauf) < Date.now()) return null;
  const soll = signiere(`${id}.${ablauf}`);
  const a = Buffer.from(sig), b = Buffer.from(soll);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return id;
}

export const sessionCookie = (token: string) =>
  `${COOKIE}=${token}; Path=/; Max-Age=${GUELTIG_MS / 1000}; SameSite=Lax; HttpOnly`;

export const logoutCookie = () => `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`;

/**
 * Fähigkeiten-Katalog: Rollen bündeln diese Capabilities (CSV in rollen.capabilities,
 * '*' = alles). Basis-Funktionen – eigene Zeiten, Meine Schichten, Stempeln,
 * Abläufe erledigen – hat jede angemeldete Person implizit.
 */
export const CAPABILITIES: Record<string, string> = {
  reservierungen: "Reservierungen verwalten",
  "karte.admin": "Website-Karte pflegen",
  schichtplan: "Schichtplan & Vorlage verwalten",
  "zeiten.admin": "Zeiten aller korrigieren",
  auswertung: "Auswertung & Live-Ansicht",
  "ablaeufe.admin": "Abläufe-Katalog pflegen",
  "team.admin": "Team, Rollen & Einladungen verwalten",
  "chat.admin": "Alle Mitarbeiter-Chats lesen & schreiben",
  "daten.admin": "Datenmodell & Rohdaten einsehen und pflegen",
};

export const hatCap = (m: Mitarbeiter | null, cap: string): boolean =>
  !!m?.caps && (m.caps.includes("*") || m.caps.includes(cap));

/** Mitarbeiter inkl. aufgelöster Capabilities seiner Rolle laden. */
export async function mitarbeiterMitCaps(id: string): Promise<Mitarbeiter | null> {
  const m = await eins<Mitarbeiter & { capabilities: string | null }>(
    `SELECT m.id, m.name, m.vorname, m.nachname, m.role, m.admin,
            m.ma_code, m.personalnr, m.soll_std, r.capabilities
       FROM mitarbeiter m LEFT JOIN rollen r ON r.name = m.role
      WHERE m.id = ?`, id,
  );
  if (!m) return null;
  const caps = (m.capabilities ?? "").split(",").map((c) => c.trim()).filter(Boolean);
  // Altbestand: Inhaber-Flag zählt weiter als Vollzugriff.
  if (m.admin && !caps.includes("*")) caps.push("*");
  const { capabilities: _weg, ...rest } = m;
  return { ...rest, caps };
}

/** Wer steckt hinter dieser Anfrage? null = nicht (mehr) angemeldet. */
export async function wer(req: Request): Promise<Mitarbeiter | null> {
  const cookies = req.headers.get("cookie") ?? "";
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const id = tokenPruefen(m[1]);
  if (!id) return null;
  return mitarbeiterMitCaps(id);
}

type Handler = (
  req: Request & { params: Record<string, string> },
  ich: Mitarbeiter,
) => Response | Promise<Response>;

/** Route-Wächter: nur angemeldetes Team. */
export const nurTeam = (h: Handler) => async (req: Request & { params: Record<string, string> }) => {
  const ich = await wer(req);
  if (!ich) return Response.json({ fehler: "Bitte anmelden" }, { status: 401 });
  return h(req, ich);
};

/** Route-Wächter: nur mit dieser Fähigkeit (Rollen-Bundle). */
export const mitCap = (cap: keyof typeof CAPABILITIES) => (h: Handler) =>
  async (req: Request & { params: Record<string, string> }) => {
    const ich = await wer(req);
    if (!ich) return Response.json({ fehler: "Bitte anmelden" }, { status: 401 });
    if (!hatCap(ich, cap)) {
      return Response.json({ fehler: `Dafür fehlt dir die Berechtigung „${CAPABILITIES[cap]}“.` }, { status: 403 });
    }
    return h(req, ich);
  };

// ------------------------------------------------------ Zeiten-Sitzungen (CRUD)

export type Sitzung = {
  inId: string;
  outId: string | null;
  start: number;
  end: number | null;
};

/** Stempel-Ereignisse (SSOT: Dokumentenspeicher, Schema time_events). */
type TimeEvent = { employee_id: string; type: "in" | "out"; ts: number };
const EVENTS = dok.store<TimeEvent>("time_events");

/** Letztes Stempel-Ereignis einer Person. */
export const letztesEvent = (employeeId: string) =>
  eins<{ type: "in" | "out"; ts: number }>(
    "SELECT type, ts FROM time_events WHERE employee_id = ? ORDER BY ts DESC LIMIT 1", employeeId,
  );

/** Ein Stempel-Ereignis anlegen (validiert + Historie). */
export const eventAnlegen = (employeeId: string, type: "in" | "out", ts: number, wer: string | null = employeeId) =>
  EVENTS.create({ employee_id: employeeId, type, ts }, wer);

/** Stempel-Paare eines Mitarbeiters als bearbeitbare Sitzungen. */
export async function sitzungenFuer(
  mitarbeiterId: string,
  from = 0,
  to = Infinity,
): Promise<Sitzung[]> {
  const evs = await alle<{ id: string; type: "in" | "out"; ts: number }>(
    "SELECT id, type, ts FROM time_events WHERE employee_id = ? ORDER BY ts ASC", mitarbeiterId,
  );
  const gesamt: Sitzung[] = [];
  let offen: Sitzung | null = null;
  for (const ev of evs) {
    if (ev.type === "in") {
      if (offen) gesamt.push(offen); // verwaistes 'in' ohne 'out'
      offen = { inId: ev.id, outId: null, start: ev.ts, end: null };
    } else if (offen) {
      offen.outId = ev.id;
      offen.end = ev.ts;
      gesamt.push(offen);
      offen = null;
    }
  }
  if (offen) gesamt.push(offen);
  return gesamt.filter((s) => (s.end ?? Date.now()) > from && s.start < to);
}

const eventGehoertZu = async (eventId: string, mitarbeiterId: string) =>
  !!(await eins("SELECT 1 AS x FROM time_events WHERE id = ? AND employee_id = ?", eventId, mitarbeiterId));

/** Sitzung nachtragen (z. B. Stempeln vergessen). */
export async function sitzungAnlegen(mitarbeiterId: string, start: number, end: number, wer: string | null = mitarbeiterId) {
  const a = await EVENTS.create({ employee_id: mitarbeiterId, type: "in", ts: start }, wer);
  const b = await EVENTS.create({ employee_id: mitarbeiterId, type: "out", ts: end }, wer);
  return { inId: a.id, outId: b.id, start, end };
}

/** Start/Ende einer Sitzung korrigieren. */
export async function sitzungAendern(
  mitarbeiterId: string,
  s: { inId: string; outId: string | null; start: number; end: number | null },
  wer: string | null = mitarbeiterId,
): Promise<boolean> {
  if (!(await eventGehoertZu(s.inId, mitarbeiterId))) return false;
  if (s.outId && !(await eventGehoertZu(s.outId, mitarbeiterId))) return false;
  await EVENTS.patch(s.inId, { ts: s.start }, wer);
  if (s.outId && s.end != null) {
    await EVENTS.patch(s.outId, { ts: s.end }, wer);
  } else if (!s.outId && s.end != null) {
    // Offene Sitzung bekommt nachträglich ein Ende.
    await EVENTS.create({ employee_id: mitarbeiterId, type: "out", ts: s.end }, wer);
  }
  return true;
}

/** Sitzung löschen (beide Stempel). */
export async function sitzungLoeschen(
  mitarbeiterId: string,
  inId: string,
  outId: string | null,
  wer: string | null = mitarbeiterId,
): Promise<boolean> {
  if (!(await eventGehoertZu(inId, mitarbeiterId))) return false;
  if (outId && !(await eventGehoertZu(outId, mitarbeiterId))) return false;
  await EVENTS.remove(inId, wer);
  if (outId) await EVENTS.remove(outId, wer);
  return true;
}
