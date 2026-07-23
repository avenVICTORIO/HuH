// Leichte Session-Auth für das Team: PIN-Login am Terminal setzt ein signiertes
// Cookie, das Dashboard liest daraus Rolle und Identität. Bewusst ohne externe
// Abhängigkeiten – für den lokalen Tablet-Betrieb gedacht, nicht fürs offene Netz.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "./db";

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

/** Wer steckt hinter dieser Anfrage? null = nicht (mehr) angemeldet. */
export async function wer(req: Request): Promise<Mitarbeiter | null> {
  const cookies = req.headers.get("cookie") ?? "";
  const m = cookies.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const id = tokenPruefen(m[1]);
  if (!id) return null;
  return eins<Mitarbeiter>(
    "SELECT id, name, role, pin, admin FROM mitarbeiter WHERE id = ?", id,
  );
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

/** Route-Wächter: nur Admin (Inhaber). */
export const nurAdmin = (h: Handler) => async (req: Request & { params: Record<string, string> }) => {
  const ich = await wer(req);
  if (!ich) return Response.json({ fehler: "Bitte anmelden" }, { status: 401 });
  if (!ich.admin) return Response.json({ fehler: "Nur für Admins" }, { status: 403 });
  return h(req, ich);
};

// ------------------------------------------------------ Zeiten-Sitzungen (CRUD)

export type Sitzung = {
  inId: string;
  outId: string | null;
  start: number;
  end: number | null;
};

/** Stempel-Paare eines Mitarbeiters als bearbeitbare Sitzungen. */
export async function sitzungenFuer(
  mitarbeiterId: string,
  from = 0,
  to = Infinity,
): Promise<Sitzung[]> {
  const evs = await alle<{ id: string; type: "in" | "out"; ts: number }>(
    "SELECT id, type, ts FROM events WHERE mitarbeiter_id = ? ORDER BY ts ASC", mitarbeiterId,
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
  !!(await eins("SELECT 1 AS x FROM events WHERE id = ? AND mitarbeiter_id = ?", eventId, mitarbeiterId));

/** Sitzung nachtragen (z. B. Stempeln vergessen). */
export async function sitzungAnlegen(mitarbeiterId: string, start: number, end: number) {
  const inId = randomUUID(), outId = randomUUID();
  await lauf(
    "INSERT INTO events (id, mitarbeiter_id, type, ts) VALUES (?, ?, 'in', ?), (?, ?, 'out', ?)",
    inId, mitarbeiterId, start, outId, mitarbeiterId, end,
  );
  return { inId, outId, start, end };
}

/** Start/Ende einer Sitzung korrigieren. */
export async function sitzungAendern(
  mitarbeiterId: string,
  s: { inId: string; outId: string | null; start: number; end: number | null },
): Promise<boolean> {
  if (!(await eventGehoertZu(s.inId, mitarbeiterId))) return false;
  if (s.outId && !(await eventGehoertZu(s.outId, mitarbeiterId))) return false;
  await lauf("UPDATE events SET ts = ? WHERE id = ?", s.start, s.inId);
  if (s.outId && s.end != null) {
    await lauf("UPDATE events SET ts = ? WHERE id = ?", s.end, s.outId);
  } else if (!s.outId && s.end != null) {
    // Offene Sitzung bekommt nachträglich ein Ende.
    await lauf(
      "INSERT INTO events (id, mitarbeiter_id, type, ts) VALUES (?, ?, 'out', ?)",
      randomUUID(), mitarbeiterId, s.end,
    );
  }
  return true;
}

/** Sitzung löschen (beide Stempel). */
export async function sitzungLoeschen(
  mitarbeiterId: string,
  inId: string,
  outId: string | null,
): Promise<boolean> {
  if (!(await eventGehoertZu(inId, mitarbeiterId))) return false;
  if (outId && !(await eventGehoertZu(outId, mitarbeiterId))) return false;
  await lauf("DELETE FROM events WHERE id = ?", inId);
  if (outId) await lauf("DELETE FROM events WHERE id = ?", outId);
  return true;
}
