import { randomUUID } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "./db";
import * as passkey from "./passkey";
import { sessionsFor, durationMs, clip, type Ev } from "./time";
import { terminalPage } from "./terminal";
import { dashboardPage } from "./dashboard";
import { homePage } from "./site/home";
import { karteSeite } from "./site/karte";
import { KAPITEL_META } from "./site/karte-daten";
import { reservierungPage } from "./site/reservierung";
import {
  datenschutzPage,
  feiernPage,
  impressumPage,
  kontaktPage,
  ueberUnsPage,
} from "./site/seiten";
import { nichtGefundenPage } from "./site/fehler";
import * as res from "./reservierungen";
import * as ablauf from "./ablaeufe";
import * as chat from "./chat";
import * as live from "./live";
import * as ki from "./ki";
import * as skills from "./skills";
import * as dok from "./dokumente";
import { OEFFNUNG } from "./site/info";
import {
  CAPABILITIES,
  hatCap,
  logoutCookie,
  mitarbeiterMitCaps,
  mitCap,
  nurTeam,
  sessionCookie,
  sitzungAendern,
  sitzungAnlegen,
  sitzungLoeschen,
  sitzungenFuer,
  letztesEvent,
  eventAnlegen,
  tokenFuer,
  wer,
} from "./auth";

// SSOT-Zugriffe (Dokumentenspeicher): Schreiben validiert, mit Historie und Live-Signal.
type Shift = { date: string; role: string; start: string; end: string; employee_id: string | null; note: string | null; rule_id: string | null };
type ShiftRule = { role: string; start: string; end: string; weekdays: string; count: number; rhythm: string; start_date: string | null; active: number; sort_order: number };
type MenuGroup = { chapter: string; title: string; columns: string | null; footnote: string | null; sort_order: number };
type MenuItem = { group_id: string; name: string; text: string | null; option: string | null; tags: string | null; star: number; prices: string | null; sort_order: number; active: number };
type Inquiry = { name: string; email: string; phone: string | null; occasion: string | null; date: string | null; guests: number | null; note: string | null; status: string; created_at: number };
const SHIFTS = dok.store<Shift>("shifts");
const RULES = dok.store<ShiftRule>("shift_rules");
const GROUPS = dok.store<MenuGroup>("menu_groups");
const ITEMS = dok.store<MenuItem>("menu_items");
const INQUIRIES = dok.store<Inquiry>("inquiries");

/** Store-Fehler (Schema-/Eindeutigkeitsverstoss) als HTTP-Antwort. */
const datenFehler = (e: unknown) =>
  e instanceof dok.DatenFehler ? Response.json({ fehler: e.message }, { status: e.status }) : null;

const html = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

/** Capability-Liste aus einem Request-Body: nur bekannte Schlüssel (oder '*'). */
const capsAusBody = (v: unknown): string[] =>
  Array.isArray(v)
    ? [...new Set(v.map(String).filter((c) => c === "*" || c in CAPABILITIES))]
    : [];

// Capability-Wächter: Rollen bündeln Fähigkeiten (siehe CAPABILITIES in auth.ts).
const nurReserv = mitCap("reservierungen");
const nurKarteAdmin = mitCap("karte.admin");
const nurSchicht = mitCap("schichtplan");
const nurZeitenAdmin = mitCap("zeiten.admin");
const nurAuswertung = mitCap("auswertung");
const nurAblaeufe = mitCap("ablaeufe.admin");
const nurTeamAdmin = mitCap("team.admin");
const nurDatenAdmin = mitCap("daten.admin");

/** Bereiche des Team-Bereichs – jeder unter /app/<bereich> erreichbar (Tabs in dashboard.ts). */
const APP_BEREICHE = new Set([
  "heute", "reservierungen", "meine-schichten", "meine-zeiten", "karte",
  "schichtplan", "auswertung", "ablaeufe", "team", "rollen", "skills", "daten",
]);

/** Dauerhafte Umleitung – hält die Links der alten Website am Leben. */
const um = (ziel: string) => () => Response.redirect(ziel, 301);

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

/** Passt eine Person auf eine Schicht-Rolle? Wer den Schichtplan verwaltet, darf überall einspringen. */
const rollePasst = (m: Mitarbeiter, schichtRolle: string) =>
  hatCap(m, "schichtplan") || m.role.trim().toLowerCase() === schichtRolle.trim().toLowerCase();

/** Feldprüfung einer Karten-Gruppe. */
function karteGruppeFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const chapter = text(b.chapter, 30);
  const title = text(b.title, 120);
  if (!KAPITEL_META.some((k) => k.id === chapter)) return { fehler: "Unbekanntes Kapitel." };
  if (!title) return { fehler: "Bitte einen Gruppentitel angeben." };
  return {
    chapter,
    title,
    columns: text(b.columns, 60) || null,
    footnote: text(b.footnote, 300) || null,
  };
}

/** Feldprüfung einer Karten-Position. */
async function kartePositionFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" } as const;
  const group_id = text(b.group_id, 64);
  const name = text(b.name, 160);
  if (!name) return { fehler: "Bitte einen Namen angeben." } as const;
  if (!(await GROUPS.get(group_id))) {
    return { fehler: "Gruppe nicht gefunden." } as const;
  }
  const tags = text(b.tags, 20)
    .split(",").map((t) => t.trim()).filter((t) => ["v", "vg", "gf"].includes(t)).join(",");
  return {
    group_id,
    name,
    text: text(b.text, 500) || null,
    option: text(b.option, 200) || null,
    tags: tags || null,
    star: b.star ? 1 : 0,
    prices: text(b.prices, 60) || null,
    active: b.active === 0 || b.active === false ? 0 : 1,
  };
}

/** Feldprüfung einer wiederkehrenden Schicht-Regel. */
function regelFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const role = text(b.role, 40);
  const start = text(b.start, 5), end = text(b.end, 5);
  const count = Number(b.count ?? 1);
  const rhythm = text(b.rhythm, 20) || "woechentlich";
  const weekdays = Array.isArray(b.weekdays) ? b.weekdays.map(Number).filter((t) => t >= 0 && t <= 6) : [];
  if (!role) return { fehler: "Bitte eine Rolle wählen." };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return { fehler: "Bitte Zeiten als HH:MM angeben." };
  }
  if (!weekdays.length) return { fehler: "Bitte mindestens einen Wochentag wählen." };
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return { fehler: "Anzahl muss zwischen 1 und 10 liegen." };
  }
  if (!["woechentlich", "zweiwoechentlich"].includes(rhythm)) {
    return { fehler: "Unbekannter Rhythmus." };
  }
  const start_date = res.istDatum(b.start_date) ? (b.start_date as string) : null;
  if (rhythm === "zweiwoechentlich" && !start_date) {
    return { fehler: "Zweiwöchentliche Regeln brauchen ein Startdatum." };
  }
  return { role, start, end, weekdays: [...new Set(weekdays)].sort().join(","), count, rhythm, start_date };
}

/** Kalenderwochen-Index eines Datums (Referenz: ein fester Montag) – für den 2-Wochen-Rhythmus. */
function wochenIndex(datum: string): number {
  const [y, m, d] = datum.split("-").map(Number);
  const ts = new Date(y, m - 1, d).getTime();
  const referenzMontag = new Date(2024, 0, 1).getTime(); // Mo, 1. Jan 2024
  return Math.floor((ts - referenzMontag) / (7 * 86400000));
}

/**
 * Schichten eines Zeitraums mit den Regeln abgleichen – die Regeln sind die
 * Single Source of Truth: Fehlendes wird angelegt, überzählige oder nicht mehr
 * zur Regel passende Slots werden entfernt, solange niemand zugewiesen ist.
 * Besetzte Schichten bleiben immer stehen.
 */
async function schichtenGenerieren(von: string, bis: string): Promise<{ angelegt: number; entfernt: number }> {
  const regeln = await alle<ShiftRule & { id: string }>("SELECT * FROM shift_rules");
  const regelnAktiv = regeln.filter((r) => r.active);
  let angelegt = 0, entfernt = 0;

  const [y, m, d] = von.split("-").map(Number);
  const lauf_ = new Date(y, m - 1, d);
  const isoVon = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

  const giltAm = (r: (typeof regeln)[number], datum: string, wt: number) => {
    if (!r.active || !r.weekdays.split(",").map(Number).includes(wt)) return false;
    if (r.rhythm === "zweiwoechentlich" && r.start_date) {
      if ((((wochenIndex(datum) - wochenIndex(r.start_date)) % 2) + 2) % 2 !== 0) return false;
    }
    return true;
  };

  while (isoVon(lauf_) <= bis) {
    const datum = isoVon(lauf_);
    const wt = lauf_.getDay();

    // 0) Datenhygiene: Zuweisungen lösen, deren Rolle nicht (mehr) zur Schicht passt
    //    (z. B. Service-Kraft auf Koch-Slot aus Altbeständen). Admins dürfen überall.
    const besetzte = await alle<{ id: string; shift_role: string; role: string; capabilities: string | null }>(
      `SELECT s.id, s.role AS shift_role, m.role, r.capabilities
         FROM shifts s
         JOIN mitarbeiter m ON m.id = s.employee_id
         LEFT JOIN rollen r ON r.name = m.role
        WHERE s.date = ?`, datum,
    );
    for (const s of besetzte) {
      const caps = (s.capabilities ?? "").split(",").map((c) => c.trim()).filter(Boolean);
      if (!rollePasst({ role: s.role, caps } as Mitarbeiter, s.shift_role)) {
        await SHIFTS.patch(s.id, { employee_id: null }, "system");
      }
    }

    // 1) Verwaiste Slots entfernen – ohne Regel, mit gelöschter/inaktiver Regel oder
    //    an einem Tag, den die Regel nicht mehr abdeckt. Immer nur unbesetzte.
    const vorhandene = await alle<{ id: string; rule_id: string | null; employee_id: string | null }>(
      "SELECT id, rule_id, employee_id FROM shifts WHERE date = ?", datum,
    );
    for (const s of vorhandene) {
      if (s.employee_id) continue;
      const r = s.rule_id ? regeln.find((x) => x.id === s.rule_id) : undefined;
      if (!r || !giltAm(r, datum, wt)) {
        await SHIFTS.remove(s.id, "system");
        entfernt++;
      }
    }

    // 2) Je Regel auf Soll-Anzahl bringen: auffüllen oder unbesetzte Überzählige abbauen.
    for (const r of regelnAktiv) {
      if (!giltAm(r, datum, wt)) continue;
      const slots = await alle<{ id: string; employee_id: string | null }>(
        "SELECT id, employee_id FROM shifts WHERE date = ? AND rule_id = ?", datum, r.id,
      );
      for (let i = slots.length; i < r.count; i++) {
        await SHIFTS.create({ date: datum, role: r.role, start: r.start, end: r.end, employee_id: null, note: null, rule_id: r.id }, "system");
        angelegt++;
      }
      const frei = slots.filter((s) => !s.employee_id);
      for (let i = slots.length; i > r.count && frei.length; i--) {
        const opfer = frei.pop()!;
        await SHIFTS.remove(opfer.id, "system");
        entfernt++;
      }
    }
    lauf_.setDate(lauf_.getDate() + 1);
  }
  return { angelegt, entfernt };
}

/** Feldprüfung eines Schicht-Slots. */
function schichtFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const date = text(b.date, 10);
  const role = text(b.role, 40);
  const start = text(b.start, 5);
  const end = text(b.end, 5);
  if (!res.istDatum(date)) return { fehler: "Bitte ein gültiges Datum wählen." };
  if (!role) return { fehler: "Bitte eine Rolle angeben (z. B. Koch, Service)." };
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) {
    return { fehler: "Bitte Zeiten als HH:MM angeben." };
  }
  return { date, role, start, end, note: text(b.note, 300) || null };
}

/**
 * Gemeinsame Feldprüfung der Team-Endpunkte: nur Format, keine Kapazität –
 * das Team entscheidet selbst, was ins Haus passt.
 */
function teamFelder(b: Record<string, unknown>) {
  const name = text(b.name, 120);
  const date = text(b.date, 10);
  const time = text(b.time, 5);
  const guests = Number(b.guests);
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (!res.istDatum(date)) return { fehler: "Bitte ein gültiges Datum wählen." };
  if (!/^\d{2}:\d{2}$/.test(time)) return { fehler: "Bitte eine Uhrzeit (HH:MM) angeben." };
  if (!Number.isInteger(guests) || guests < 1) {
    return { fehler: "Bitte die Personenzahl angeben." };
  }
  const area = (text(b.area, 10) || "drinnen") as res.Bereich;
  if (!res.BEREICHE.includes(area)) return { fehler: "Unbekannter Bereich" };
  return {
    name,
    email: text(b.email, 160) || null,
    phone: text(b.phone, 40) || null,
    date,
    time,
    guests,
    area,
    occasion: text(b.occasion, 80) || null,
    note: text(b.note, 600) || null,
  };
}

/** Spalten des Mitarbeiter-Datensatzes – an einer Stelle, damit alle Queries synchron bleiben. */
const MA_COLS = "id, name, vorname, nachname, role, admin, ma_code, personalnr, soll_std";

const listAll = () =>
  alle<Mitarbeiter>(`SELECT ${MA_COLS} FROM mitarbeiter ORDER BY name`);

const byMaCode = (code: string) =>
  eins<Mitarbeiter>(`SELECT ${MA_COLS} FROM mitarbeiter WHERE ma_code = ?`, code);

const byPersonalnr = (nr: string) =>
  eins<Mitarbeiter>(`SELECT ${MA_COLS} FROM mitarbeiter WHERE personalnr = ?`, nr);

const lastEvent = letztesEvent;

/**
 * Login-Antwort fürs Terminal: Identität + Schichtstatus + offene Klärung.
 * Wird nach erfolgreichem Passkey-Login und beim Session-Check gebaut.
 */
async function loginPayload(emp: Mitarbeiter) {
  const last = await lastEvent(emp.id);
  const clockedIn = last?.type === "in";
  return {
    id: emp.id, name: emp.name, vorname: emp.vorname, nachname: emp.nachname,
    role: emp.role, caps: emp.caps ?? [], admin: hatCap(emp, "team.admin"),
    clockedIn, since: clockedIn ? last!.ts : null,
    klaerung: await klaerungFuer(emp.id, last),
  };
}

/** Leere Eingabe -> null; sonst getrimmter String. */
const leerZuNull = (v: unknown): string | null => {
  const s = (v ?? "").toString().trim();
  return s === "" ? null : s;
};

/** Soll-Wochenstunden: leer -> null (Abruf); sonst Zahl >= 0. `false` = ungültig. */
const parseSoll = (v: unknown): number | null | false => {
  const s = (v ?? "").toString().trim().replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : false;
};

/** Stempeln ist nur ±2 h um die geplante Schicht erlaubt. */
const STEMPEL_PUFFER_MS = 2 * 60 * 60 * 1000;

/** Lokaler Zeitstempel aus YYYY-MM-DD + HH:MM. */
function lokalTs(datum: string, zeit: string): number {
  const [y, m, d] = datum.split("-").map(Number);
  const [hh, mm] = zeit.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}

/** Geplantes Schichtfenster (min Beginn, max Ende) eines Mitarbeiters an einem Tag. */
async function schichtFenster(mitarbeiterId: string, datum: string) {
  const schichten = await alle<{ start: string; end: string }>(
    'SELECT start, "end" FROM shifts WHERE employee_id = ? AND date = ?', mitarbeiterId, datum,
  );
  if (!schichten.length) return null;
  let start = Infinity, ende = -Infinity;
  for (const s of schichten) {
    start = Math.min(start, lokalTs(datum, s.start));
    let bis = lokalTs(datum, s.end);
    if (bis <= start) bis += 86400000; // Schicht über Mitternacht
    ende = Math.max(ende, bis);
  }
  return { start, ende };
}

const uhrzeit = (ts: number) => {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

/**
 * Offene, überfällige Sitzung? Dann muss der Mitarbeiter beim nächsten Login
 * zuerst klären, wann Feierabend war – bevor es weitergeht.
 */
async function klaerungFuer(mitarbeiterId: string, last: { type: string; ts: number } | null) {
  if (last?.type !== "in") return null;
  const seitTag = res.alsDatum(new Date(last.ts));
  const heute = res.alsDatum(new Date());
  const fenster = await schichtFenster(mitarbeiterId, seitTag);
  const ueberfaellig =
    seitTag !== heute || (fenster != null && Date.now() > fenster.ende + STEMPEL_PUFFER_MS);
  if (!ueberfaellig) return null;
  return {
    seit: last.ts,
    seitTag,
    // Vorschlag: geplantes Schichtende, sonst die Einstempelzeit
    vorschlag: uhrzeit(fenster?.ende ?? last.ts),
  };
}

/** Rollen sind ein fester Katalog (rollen-Tabelle), kein Freitext. */
const rolleImKatalog = async (name: string) =>
  !!(await eins("SELECT 1 AS x FROM rollen WHERE name = ?", name));

// Alle Routen; schreibende API-Handler werden unten in live.mitSignalen() so
// umwickelt, dass sie nach Erfolg ein Live-Signal an die offenen Browser senden.
const routen = {
    // ---------------- Gästeseite ----------------
    "/": () => html(homePage),
    "/speisekarte": async () => html(await karteSeite()),
    "/reservierung": () => html(reservierungPage),
    "/ueber-uns": () => html(ueberUnsPage),
    "/feiern": () => html(feiernPage),
    "/kontakt": () => html(kontaktPage),
    "/impressum": () => html(impressumPage),
    "/datenschutz": () => html(datenschutzPage),

    // Alte Wix-Pfade weiterleiten, damit bestehende Links und Suchtreffer greifen.
    "/reservations": um("/reservierung"),
    "/essen-trinken": um("/speisekarte"),
    "/about-1": um("/ueber-uns"),
    "/contact-3": um("/kontakt"),
    "/kopie-von-impressum": um("/datenschutz"),
    "/about-4": um("/kontakt"),
    "/offene-stellen": um("/kontakt"),

    // ---------------- Intern: /app ----------------
    // /app = Terminal (Login, Stempeln, Home) · /app/<bereich> = Team-Bereich mit eigener Adresse je Tab.
    "/app": () => html(terminalPage),
    "/app/": um("/app"),
    "/app/:bereich": (req) =>
      APP_BEREICHE.has(req.params.bereich) ? html(dashboardPage) : html(nichtGefundenPage, 404),
    // Alte Adressen weiterleiten (Einladungslinks behalten ihre Query).
    "/terminal": (req) => Response.redirect("/app" + new URL(req.url).search, 301),
    "/team": um("/app/heute"),
    "/dashboard": um("/app/heute"),
    "/logo.png": () => new Response(Bun.file("public/logo.png")),

    // ---- Favicons, App-Icons & Manifest (erzeugt via `bun run icons`) ----
    "/favicon.ico": () =>
      new Response(Bun.file("public/favicon.ico"), {
        headers: { "Content-Type": "image/x-icon", "Cache-Control": "public, max-age=86400" },
      }),
    "/site.webmanifest": () =>
      new Response(Bun.file("public/site.webmanifest"), {
        headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=86400" },
      }),
    "/icons/:datei": (req) => {
      const datei = req.params.datei;
      if (!/^[a-z0-9-]+\.png$/.test(datei)) return new Response("Not Found", { status: 404 });
      return new Response(Bun.file(`public/icons/${datei}`), {
        headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
      });
    },

    // ---- Reservierung: freie Zeiten eines Tages ----
    "/api/verfuegbarkeit": async (req) => {
      const q = new URL(req.url).searchParams;
      const date = q.get("date") ?? "";
      const guests = Math.max(1, Number(q.get("guests") ?? 2) || 2);
      if (!res.istDatum(date)) {
        return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      }
      const [y, m, d] = date.split("-").map(Number);
      if (!OEFFNUNG[new Date(y, m - 1, d).getDay()]) {
        return Response.json({
          date,
          closed: true,
          slots: [],
          hinweis: `${res.tagName(date)} ist unser Ruhetag – wir freuen uns an jedem anderen Tag auf euch.`,
        });
      }
      const area = (q.get("area") ?? "drinnen") as res.Bereich;
      if (!res.BEREICHE.includes(area)) {
        return Response.json({ fehler: "Unbekannter Bereich" }, { status: 400 });
      }
      return Response.json({
        date,
        closed: false,
        guests,
        area,
        slots: await res.slotsFuer(date, guests, area),
      });
    },

    // ---- Reservierung anlegen (Gast) / Tagesliste (Team) ----
    "/api/reservierungen": {
      GET: nurReserv(async (req) => {
        const date = new URL(req.url).searchParams.get("date");
        if (date && !res.istDatum(date)) {
          return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
        }
        return Response.json(date ? await res.fuerTag(date) : await res.abHeute());
      }),
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });

        const name = text(b.name, 120);
        const email = text(b.email, 160);
        const phone = text(b.phone, 40);
        const guests = Number(b.guests);
        if (!name || !email || !phone) {
          return Response.json({ fehler: "Bitte Name, E-Mail und Telefon angeben." }, { status: 400 });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ fehler: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
        }

        const area = (text(b.area, 10) || "drinnen") as res.Bereich;
        if (!res.BEREICHE.includes(area)) {
          return Response.json({ fehler: "Unbekannter Bereich" }, { status: 400 });
        }
        const pruefung = await res.pruefe(text(b.date, 10), text(b.time, 5), guests, area);
        if (!pruefung.ok) return Response.json({ fehler: pruefung.fehler }, { status: 409 });

        try {
          const zeile = await res.anlegen({
            name, email, phone,
            date: b.date, time: b.time, guests, area,
            occasion: text(b.occasion, 80) || null,
            note: text(b.note, 600) || null,
          });
          return Response.json(zeile, { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      },
    },

    // ---- Reservierung per Buchungscode ansehen (Gast) ----
    "/api/reservierungen/:code": async (req) => {
      const r = await res.nachCode(req.params.code);
      if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
      return Response.json(r);
    },

    // ---- Selbst-Storno per Buchungscode ----
    "/api/reservierungen/:code/storno": {
      POST: async (req) => {
        const r = await res.stornieren(req.params.code);
        if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json(r);
      },
    },

    // ---- Team: Reservierung anlegen (Telefon/Walk-in – nur Formatprüfung) ----
    "/api/team/reservierungen": {
      POST: nurReserv(async (req, ich) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const daten = teamFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        try {
          const zeile = await res.anlegen({ ...daten, status: "bestaetigt" }, ich.id);
          return Response.json(zeile, { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },

    // ---- Team: Status setzen, bearbeiten, löschen ----
    "/api/team/reservierungen/:id": {
      PATCH: nurReserv(async (req, ich) => {
        const { status } = (await req.json().catch(() => ({}))) as { status?: string };
        const erlaubt = ["offen", "bestaetigt", "abgesagt", "erledigt"] as const;
        if (!erlaubt.includes(status as never)) {
          return Response.json({ fehler: "Unbekannter Status" }, { status: 400 });
        }
        if (!(await res.statusSetzen(req.params.id, status as res.Status, ich.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return Response.json({ id: req.params.id, status });
      }),
      PUT: nurReserv(async (req, ich) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const daten = teamFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const zeile = await res.aktualisieren(req.params.id, daten, ich.id);
        if (!zeile) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json(zeile);
      }),
      DELETE: nurReserv(async (req, ich) => {
        if (!(await res.loeschen(req.params.id, ich.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Meine Schichten: kommende eigene Einsätze (nur lesend) ----
    "/api/meine-schichten": nurTeam(async (req, ich) =>
      Response.json(
        await alle(
          "SELECT * FROM shifts WHERE employee_id = ? AND date >= ? ORDER BY date, start",
          ich.id, res.alsDatum(new Date()),
        ),
      ),
    ),

    // ---- Kapazität (Plätze drinnen/draußen, optionales Gesamt-Limit) ----
    "/api/kapazitaet": {
      GET: nurReserv(async () => Response.json(await res.kapazitaet())),
      PUT: nurReserv(async (req) => {
        const b = await req.json().catch(() => null);
        const drinnen = Number(b?.drinnen), draussen = Number(b?.draussen);
        const puffer = Number(b?.puffer);
        if (!Number.isFinite(drinnen) || drinnen < 0 || !Number.isFinite(draussen) || draussen < 0) {
          return Response.json({ fehler: "Bitte gültige Platzzahlen angeben." }, { status: 400 });
        }
        if (!Number.isFinite(puffer) || puffer < 0 || puffer > 90) {
          return Response.json({ fehler: "Der Walk-in-Puffer muss zwischen 0 und 90 % liegen." }, { status: 400 });
        }
        await res.kapazitaetSetzen({ drinnen, draussen, puffer });
        return Response.json(await res.kapazitaet());
      }),
    },

    // ---- Team: Kennzahlen eines Tages ----
    "/api/reservierungen-uebersicht": nurReserv(async (req) => {
      const date = new URL(req.url).searchParams.get("date") ?? res.alsDatum(new Date());
      if (!res.istDatum(date)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      return Response.json(await res.tagesUebersicht(date));
    }),

    // ---- Schichtplanung (Admin, v1): Vorlage einfügen, Slots pflegen, Team zuweisen ----
    "/api/schichten": {
      // ?von=&bis= liefert eine ganze Woche, ?datum= einen einzelnen Tag.
      GET: nurSchicht(async (req) => {
        const q = new URL(req.url).searchParams;
        const from = q.get("from"), to = q.get("to");
        // Anzeige-Reihenfolge folgt der Vorlage (Regel-Sortierung); Rest hinten an.
        const sql = `SELECT s.*, m.name AS employee_name
                       FROM shifts s
                       LEFT JOIN mitarbeiter m ON m.id = s.employee_id
                       LEFT JOIN shift_rules r ON r.id = s.rule_id`;
        const reihung = "COALESCE(r.sort_order, 9999), s.start, s.role";
        if (from && to) {
          if (!res.istDatum(from) || !res.istDatum(to)) {
            return Response.json({ fehler: "Ungültiger Zeitraum" }, { status: 400 });
          }
          // Die Vorlage ist SSOT: jede angezeigte Woche wird automatisch abgeglichen –
          // Regel-Änderungen wirken so ohne manuellen Knopf.
          await schichtenGenerieren(from, to);
          return Response.json(
            await alle(`${sql} WHERE s.date >= ? AND s.date <= ? ORDER BY s.date, ${reihung}`, from, to),
          );
        }
        const date = q.get("date") ?? res.alsDatum(new Date());
        if (!res.istDatum(date)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
        return Response.json(
          await alle(`${sql} WHERE s.date = ? ORDER BY ${reihung}`, date),
        );
      }),
      POST: nurSchicht(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = schichtFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.role))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        try {
          return Response.json(await SHIFTS.create({ ...daten, employee_id: null, rule_id: null }, ich.id), { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },

    // Fehlende Schichten aus den wiederkehrenden Regeln erzeugen (Tag oder Zeitraum).
    "/api/schichten/generieren": {
      POST: nurSchicht(async (req) => {
        const b = await req.json().catch(() => null);
        const from = text(b?.from, 10), to = text(b?.to, 10) || from;
        if (!res.istDatum(from) || !res.istDatum(to) || to < from) {
          return Response.json({ fehler: "Ungültiger Zeitraum" }, { status: 400 });
        }
        return Response.json({ ok: true, ...(await schichtenGenerieren(from, to)) }, { status: 201 });
      }),
    },

    // ---- Wiederkehrende Schicht-Regeln (Admin) ----
    "/api/schicht-regeln": {
      GET: nurSchicht(async () =>
        Response.json(await alle("SELECT * FROM shift_rules ORDER BY sort_order, start, role")),
      ),
      POST: nurSchicht(async (req, ich) => {
        const daten = regelFelder(await req.json().catch(() => null));
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.role))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const max = await eins<{ m: number | null }>("SELECT MAX(sort_order) AS m FROM shift_rules");
        try {
          return Response.json(await RULES.create({ ...daten, active: 1, sort_order: Number(max?.m ?? 0) + 1 }, ich.id), { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },

    // Reihenfolge der Vorlage per Drag & Drop: Array von Regel-IDs = neue Sortierung.
    "/api/schicht-regeln-reihenfolge": {
      PUT: nurSchicht(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) await RULES.patch(ids[i], { sort_order: i + 1 }, ich.id);
        return Response.json({ ok: true });
      }),
    },
    "/api/schicht-regeln/:id": {
      PUT: nurSchicht(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = regelFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.role))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const active = b?.active === 0 || b?.active === false ? 0 : 1;
        try {
          const r = await RULES.patch(req.params.id, { ...daten, active }, ich.id);
          if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          return Response.json(r);
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
      DELETE: nurSchicht(async (req, ich) => {
        // Bereits erzeugte Schichten bleiben stehen – nur die Regel verschwindet.
        if (!(await RULES.remove(req.params.id, ich.id))) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    "/api/schichten/:id": {
      // Zuweisung per Drag & Drop: mitarbeiter_id setzen oder (null) lösen.
      // Regeln: passende Rolle (Admins überall), Slot muss frei sein,
      // und dieselbe Person nie doppelt in überlappenden Zeitfenstern.
      PATCH: nurSchicht(async (req, ich) => {
        const b = await req.json().catch(() => ({}));
        const mid = b?.employee_id ?? null;
        if (mid !== null) {
          const m = await mitarbeiterMitCaps(mid);
          if (!m) return Response.json({ fehler: "Mitarbeiter unbekannt" }, { status: 400 });
          const slot = await SHIFTS.get(req.params.id);
          if (!slot) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          if (slot.employee_id) {
            return Response.json(
              { fehler: "Dieser Platz ist schon besetzt – erst die Zuweisung lösen." },
              { status: 409 },
            );
          }
          if (!rollePasst(m, slot.role)) {
            return Response.json(
              { fehler: `${m.name} (${m.role}) passt nicht auf eine ${slot.role}-Schicht.` },
              { status: 409 },
            );
          }
          // Zeitliche Doppelbelegung derselben Person am selben Tag verhindern.
          const spanne = (von: string, bis: string) => {
            const s = lokalTs(slot.date, von);
            let e = lokalTs(slot.date, bis);
            if (e <= s) e += 86400000; // über Mitternacht
            return [s, e] as const;
          };
          const [zs, ze] = spanne(slot.start, slot.end);
          const andere = await alle<{ role: string; start: string; end: string }>(
            'SELECT role, start, "end" FROM shifts WHERE employee_id = ? AND date = ? AND id != ?',
            mid, slot.date, req.params.id,
          );
          for (const a of andere) {
            const [as, ae] = spanne(a.start, a.end);
            if (as < ze && zs < ae) {
              return Response.json(
                { fehler: `${m.name} ist an dem Tag schon von ${a.start}–${a.end} (${a.role}) eingeplant.` },
                { status: 409 },
              );
            }
          }
        }
        const r = await SHIFTS.patch(req.params.id, { employee_id: mid }, ich.id);
        if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, employee_id: mid });
      }),
      PUT: nurSchicht(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = schichtFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.role))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        try {
          const r = await SHIFTS.patch(req.params.id, daten, ich.id);
          if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          return Response.json(r);
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
      DELETE: nurSchicht(async (req, ich) => {
        if (!(await SHIFTS.remove(req.params.id, ich.id))) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Feier-Anfragen ----
    "/api/anfragen": {
      GET: nurReserv(async () =>
        Response.json(await alle("SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 200")),
      ),
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const name = text(b.name, 120);
        const email = text(b.email, 160);
        const note = text(b.note, 2000);
        if (!name || !email || !note) {
          return Response.json({ fehler: "Bitte Name, E-Mail und eine kurze Beschreibung angeben." }, { status: 400 });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ fehler: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
        }
        const guests = Number(b.guests);
        try {
          const zeile = await INQUIRIES.create({
            name, email,
            phone: text(b.phone, 40) || null,
            occasion: text(b.occasion, 80) || null,
            date: res.istDatum(b.date) ? b.date : null,
            guests: Number.isInteger(guests) && guests > 0 ? guests : null,
            note, status: "neu", created_at: Date.now(),
          }, "guest");
          return Response.json({ ok: true, id: zeile.id }, { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      },
    },

    // ---- Session: Login läuft ausschließlich über Passkeys (unten); hier nur Status & Logout ----
    "/api/session": {
      // Terminal fragt beim Laden: Bin ich noch angemeldet? (inkl. Schichtstatus/Klärung)
      GET: async (req) => {
        const ich = await wer(req);
        if (!ich) return Response.json({ fehler: "nicht angemeldet" }, { status: 401 });
        return Response.json(await loginPayload(ich));
      },
      DELETE: () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": logoutCookie() } }),
    },

    // ---- Passkey-Status: Bootstrap nur, solange niemand einen Passkey hat ----
    "/api/passkey/status": async () =>
      Response.json({ bootstrap: await passkey.istBootstrap() }),

    // ---- Einladung ansehen (öffentlich, für den Begrüßungs-Screen) ----
    "/api/einladung/:code": async (req) => {
      const erg = await passkey.einladungPruefen(req.params.code);
      if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 404 });
      return Response.json({ name: erg.wert.name, vorname: erg.wert.vorname, role: erg.wert.role });
    },

    // ---- Passkey: Konto erstellen – Bootstrap (allererster) oder per Einladung ----
    "/api/passkey/registrierung/optionen": {
      POST: async (req) => {
        const b = await req.json().catch(() => ({}));
        const einladung = text(b?.einladung, 64);
        let erg;
        if (einladung) {
          erg = await passkey.einladungOptionen(req, einladung);
        } else {
          const vorname = text(b?.vorname, 60);
          if (!vorname) return Response.json({ fehler: "Bitte einen Vornamen angeben." }, { status: 400 });
          erg = await passkey.bootstrapOptionen(req, vorname, text(b?.nachname, 60));
        }
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 409 });
        return Response.json(erg.wert.optionen);
      },
    },
    "/api/passkey/registrierung/abschluss": {
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await passkey.registrierungAbschliessen(req, b);
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        const emp = await mitarbeiterMitCaps(erg.wert);
        return Response.json(await loginPayload(emp!), {
          headers: { "Set-Cookie": sessionCookie(tokenFuer(erg.wert)) },
        });
      },
    },

    // ---- Passkey: Anmelden (ohne Benutzername, der Passkey kennt die Person) ----
    "/api/passkey/login/optionen": {
      POST: async (req) => Response.json(await passkey.loginOptionen(req)),
    },
    "/api/passkey/login/abschluss": {
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await passkey.loginAbschliessen(req, b);
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 401 });
        const emp = await mitarbeiterMitCaps(erg.wert.id);
        return Response.json(await loginPayload(emp!), {
          headers: { "Set-Cookie": sessionCookie(tokenFuer(erg.wert.id)) },
        });
      },
    },

    // ---- Einladungslink für eine Person erstellen (ersetzt eine offene Einladung) ----
    "/api/mitarbeiter/:id/einladung": {
      POST: nurTeamAdmin(async (req) => {
        const m = await eins<Mitarbeiter>(`SELECT ${MA_COLS} FROM mitarbeiter WHERE id = ?`, req.params.id);
        if (!m) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        const code = randomUUID().replace(/-/g, "").slice(0, 20);
        await lauf("DELETE FROM einladungen WHERE mitarbeiter_id = ? AND benutzt IS NULL", m.id);
        await lauf(
          "INSERT INTO einladungen (code, mitarbeiter_id, erstellt, gueltig_bis, benutzt) VALUES (?, ?, ?, ?, NULL)",
          code, m.id, Date.now(), Date.now() + 7 * 86400000,
        );
        const basis = req.headers.get("origin") ?? new URL(req.url).origin;
        return Response.json({ code, url: `${basis}/app?einladung=${code}`, gueltigTage: 7 }, { status: 201 });
      }),
    },

    // ---- Wer bin ich? (Dashboard fragt beim Laden) ----
    "/api/me": async (req) => {
      const ich = await wer(req);
      if (!ich) return Response.json({ fehler: "nicht angemeldet" }, { status: 401 });
      return Response.json({
        id: ich.id, name: ich.name, vorname: ich.vorname, nachname: ich.nachname,
        role: ich.role, caps: ich.caps ?? [],
        admin: hatCap(ich, "team.admin") || (ich.caps ?? []).includes("*"),
      });
    },

    // ---- Meine Zeiten: eigene Stempel-Sitzungen ansehen (nur lesend) ----
    "/api/meine-zeiten": nurTeam(async (req, ich) => {
      const q = new URL(req.url).searchParams;
      const from = Number(q.get("from") ?? 0);
      const to = Number(q.get("to") ?? Date.now() + 1);
      return Response.json(await sitzungenFuer(ich.id, from, to));
    }),

    // ---- Zeiten korrigieren: nur Admin, für beliebige Mitarbeiter ----
    "/api/zeiten/:mitarbeiterId": {
      GET: nurZeitenAdmin(async (req) => {
        const q = new URL(req.url).searchParams;
        const from = Number(q.get("from") ?? 0);
        const to = Number(q.get("to") ?? Date.now() + 1);
        return Response.json(await sitzungenFuer(req.params.mitarbeiterId, from, to));
      }),
      POST: nurZeitenAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const start = Number(b?.start), end = Number(b?.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return Response.json({ fehler: "Start muss vor dem Ende liegen." }, { status: 400 });
        }
        return Response.json(await sitzungAnlegen(req.params.mitarbeiterId, start, end, ich.id), { status: 201 });
      }),
      PUT: nurZeitenAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const start = Number(b?.start);
        const end = b?.end == null ? null : Number(b.end);
        if (!b?.inId || !Number.isFinite(start) || (end != null && end <= start)) {
          return Response.json({ fehler: "Ungültige Zeiten." }, { status: 400 });
        }
        if (!(await sitzungAendern(req.params.mitarbeiterId, { inId: b.inId, outId: b.outId ?? null, start, end }, ich.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return Response.json({ ok: true });
      }),
      DELETE: nurZeitenAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        if (!b?.inId) return Response.json({ fehler: "inId fehlt" }, { status: 400 });
        if (!(await sitzungLoeschen(req.params.mitarbeiterId, b.inId, b.outId ?? null, ich.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Terminal: ein-/ausstempeln (toggelt anhand des letzten Events) ----
    // Läuft über die eigene Session (Passkey-Login). Ist eine Schicht geplant,
    // gilt: frühestens 2 h vor Beginn rein, spätestens 2 h nach Ende raus.
    "/api/stamp": {
      POST: nurTeam(async (req, emp) => {
        const last = await lastEvent(emp.id);
        const type: "in" | "out" = last?.type === "in" ? "out" : "in";
        const ts = Date.now();

        if (type === "in") {
          const fenster = await schichtFenster(emp.id, res.alsDatum(new Date()));
          if (fenster) {
            if (ts < fenster.start - STEMPEL_PUFFER_MS) {
              return Response.json({
                fehler: `Deine Schicht beginnt erst um ${uhrzeit(fenster.start)} – einstempeln geht ab ${uhrzeit(fenster.start - STEMPEL_PUFFER_MS)}.`,
              }, { status: 409 });
            }
            if (ts > fenster.ende + STEMPEL_PUFFER_MS) {
              return Response.json({
                fehler: `Deine heutige Schicht war bis ${uhrzeit(fenster.ende)} geplant – so spät geht einstempeln nicht mehr. Sprich mit deinem Admin.`,
              }, { status: 409 });
            }
          }
        } else {
          // Überfälliges Ausstempeln läuft über die Klärung, nicht über einen Live-Stempel.
          const klaerung = await klaerungFuer(emp.id, last);
          if (klaerung) {
            return Response.json({ fehler: "Bitte kläre zuerst, wann deine Schicht geendet hat.", klaerung }, { status: 409 });
          }
        }

        await eventAnlegen(emp.id, type, ts);
        return Response.json({ name: emp.name, type, ts });
      }),
    },

    // ---- Klärung: vergessenes Ausstempeln nachtragen (schließt die offene Sitzung) ----
    "/api/klaerung": {
      POST: nurTeam(async (req, ich) => {
        const b = await req.json().catch(() => ({}));
        const last = await lastEvent(ich.id);
        if (last?.type !== "in") {
          return Response.json({ fehler: "Es gibt keine offene Schicht zu klären." }, { status: 400 });
        }
        const zeit = text(b?.zeit, 5); // HH:MM am Tag des Einstempelns
        if (!/^\d{2}:\d{2}$/.test(zeit)) {
          return Response.json({ fehler: "Bitte eine Uhrzeit angeben." }, { status: 400 });
        }
        const seitTag = res.alsDatum(new Date(last.ts));
        let ende = lokalTs(seitTag, zeit);
        if (ende <= last.ts) ende += 86400000; // Feierabend nach Mitternacht
        if (ende > Date.now()) {
          return Response.json({ fehler: "Das Ende kann nicht in der Zukunft liegen." }, { status: 400 });
        }
        await eventAnlegen(ich.id, "out", ende);
        return Response.json({ ok: true, ende });
      }),
    },

    // ---- Dashboard (Admin): aktueller Präsenz-Status aller Mitarbeiter ----
    "/api/status": nurAuswertung(async () => {
      const rows = await Promise.all(
        (await listAll()).map(async (m) => {
          const last = await lastEvent(m.id);
          const clockedIn = last?.type === "in";
          return {
            id: m.id,
            name: m.name,
            role: m.role,
            clockedIn,
            since: clockedIn ? last!.ts : null,
          };
        }),
      );
      return Response.json(rows);
    }),

    // ---- Dashboard (Admin): Zeiten pro Mitarbeiter im Fenster [from, to) ----
    "/api/report": nurAuswertung(async (req) => {
      const q = new URL(req.url).searchParams;
      const from = Number(q.get("from") ?? 0);
      const to = Number(q.get("to") ?? Date.now());
      const now = Date.now();
      const rows = await Promise.all(
        (await listAll()).map(async (m) => {
          const evs = await alle<Ev>(
            "SELECT type, ts FROM time_events WHERE employee_id = ? ORDER BY ts ASC", m.id,
          );
          const clipped = clip(sessionsFor(evs), from, to, now);
          return {
            id: m.id,
            name: m.name,
            role: m.role,
            totalMs: durationMs(clipped, now),
            sessions: clipped,
          };
        }),
      );
      return Response.json(rows);
    }),

    // ---- Website-Karte: pflegen nur Admin (die Website liest direkt aus der DB) ----
    "/api/karte": nurKarteAdmin(async () => {
      const groups = await alle("SELECT * FROM menu_groups ORDER BY sort_order, title");
      const items = await alle("SELECT * FROM menu_items ORDER BY sort_order, name");
      return Response.json({ kapitel: KAPITEL_META, groups, items });
    }),

    "/api/karte/gruppen": {
      POST: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = karteGruppeFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const max = await eins<{ m: number | null }>("SELECT MAX(sort_order) AS m FROM menu_groups");
        try {
          return Response.json(await GROUPS.create({ ...daten, sort_order: Number(max?.m ?? 0) + 1 }, ich.id), { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },
    "/api/karte/gruppen/:id": {
      PUT: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = karteGruppeFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        try {
          const r = await GROUPS.patch(req.params.id, daten, ich.id);
          if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          return Response.json(r);
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
      DELETE: nurKarteAdmin(async (req, ich) => {
        if (!(await GROUPS.remove(req.params.id, ich.id))) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    "/api/karte/positionen": {
      POST: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = await kartePositionFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const max = await eins<{ m: number | null }>(
          "SELECT MAX(sort_order) AS m FROM menu_items WHERE group_id = ?", daten.group_id,
        );
        try {
          return Response.json(await ITEMS.create({ ...daten, sort_order: Number(max?.m ?? 0) + 1 }, ich.id), { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },
    "/api/karte/positionen/:id": {
      PUT: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const daten = await kartePositionFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        try {
          const r = await ITEMS.patch(req.params.id, daten, ich.id);
          if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          return Response.json(r);
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
      DELETE: nurKarteAdmin(async (req, ich) => {
        if (!(await ITEMS.remove(req.params.id, ich.id))) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // Reihenfolge der Positionen (innerhalb einer Gruppe) bzw. der Gruppen per Drag & Drop.
    "/api/karte/positionen-reihenfolge": {
      PUT: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) await ITEMS.patch(ids[i], { sort_order: i + 1 }, ich.id);
        return Response.json({ ok: true });
      }),
    },
    "/api/karte/gruppen-reihenfolge": {
      PUT: nurKarteAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) await GROUPS.patch(ids[i], { sort_order: i + 1 }, ich.id);
        return Response.json({ ok: true });
      }),
    },

    // ---- Team-Chat: Raum „Team“ für alle + automatisch ein Direkt-Chat je Mitarbeiter ----
    "/api/chat/raeume": nurTeam(async (_req, ich) => Response.json(await chat.raeumeFuer(ich))),
    "/api/chat/ungelesen": nurTeam(async (_req, ich) =>
      Response.json({ ungelesen: await chat.ungelesenGesamt(ich) })),
    "/api/chat/raum/:raum": {
      GET: nurTeam(async (req, ich) => {
        const raum = req.params.raum;
        if (!(await chat.darfRaum(ich, raum))) {
          return Response.json({ fehler: "Kein Zugriff auf diesen Chat." }, { status: 403 });
        }
        const seit = Number(new URL(req.url).searchParams.get("seit") ?? 0) || 0;
        return Response.json({ raum, nachrichten: await chat.nachrichten(ich, raum, seit) });
      }),
      POST: nurTeam(async (req, ich) => {
        const raum = req.params.raum;
        if (!(await chat.darfRaum(ich, raum))) {
          return Response.json({ fehler: "Kein Zugriff auf diesen Chat." }, { status: 403 });
        }
        const b = await req.json().catch(() => null);
        const inhalt = text(b?.text, 2000);
        if (!inhalt) return Response.json({ fehler: "Bitte eine Nachricht eingeben." }, { status: 400 });
        const n = await chat.senden(ich, raum, inhalt);
        // Erst die Skill-Flows: Start eines Flows oder Antwort auf eine Rückfrage. Sonst antwortet die KI.
        const uebernommen = await skills.handleChat(ich, raum, inhalt).catch((e) => { console.error("Skill-Fehler:", e); return false; });
        if (!uebernommen) ki.antworte(raum); // läuft im Hintergrund, Antwort kommt gestreamt über den WebSocket
        return Response.json(n, { status: 201 });
      }),
    },
    "/api/chat/nachricht/:id": {
      DELETE: nurTeam(async (req, ich) => {
        if (!(await chat.loeschen(ich, req.params.id))) {
          return Response.json({ fehler: "Nicht gefunden oder nicht erlaubt." }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Skill-Flows: Katalog, Läufe, manueller Start, Abbruch ----
    "/api/skills": nurTeam(async () => Response.json(skills.catalog())),
    "/api/skills/laeufe": nurTeam(async (req, ich) =>
      Response.json(await skills.runs(ich, hatCap(ich, "team.admin"), new URL(req.url).searchParams.get("flow")))),
    "/api/skills/pending": nurTeam(async (req, ich) =>
      Response.json(await skills.pending(ich, new URL(req.url).searchParams.get("raum") ?? ""))),
    "/api/skills/laeufe/:id/export": nurTeam(async (req, ich) => {
      const b = await skills.exportRun(req.params.id, ich, hatCap(ich, "team.admin"));
      if (!b) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
      return new Response(JSON.stringify(b, null, 2), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="skill-lauf-${req.params.id.slice(0, 8)}.json"`,
        },
      });
    }),
    "/api/skills/laeufe/:id": {
      DELETE: nurTeam(async (req, ich) =>
        (await skills.cancel(req.params.id, ich, hatCap(ich, "team.admin")))
          ? new Response(null, { status: 204 })
          : Response.json({ fehler: "nicht gefunden" }, { status: 404 })),
    },
    "/api/skills/:id/start": {
      POST: nurTeam(async (req, ich) => {
        const flow = skills.FLOWS.find((f) => f.id === req.params.id);
        if (!flow) return Response.json({ fehler: "Flow nicht gefunden" }, { status: 404 });
        if (flow.system || flow.component) return Response.json({ fehler: "Dieser Flow wird nicht direkt gestartet." }, { status: 400 });
        const b = await req.json().catch(() => ({}));
        const startText = text(b?.text, 500) || flow.examples[0] || flow.name;
        // Der Flow läuft im Chat: Mitarbeiter im eigenen Direkt-Chat, Chat-Admins (sehen ihren eigenen nicht) im Team-Raum.
        const raum = b?.raum === chat.TEAM_RAUM || hatCap(ich, "chat.admin") ? chat.TEAM_RAUM : chat.dmRaum(ich.id);
        await chat.senden(ich, raum, startText);
        const id = await skills.start(flow, ich, raum, startText);
        return Response.json({ id, raum }, { status: 201 });
      }),
    },
    // Trigger von Hand auslösen (für Flows mit Zeit-/Ereignis-Triggern) – nur Team-Admin.
    "/api/skills/:id/trigger": {
      POST: nurTeamAdmin(async (req, ich) => {
        const flow = skills.FLOWS.find((f) => f.id === req.params.id);
        if (!flow) return Response.json({ fehler: "Flow nicht gefunden" }, { status: 404 });
        if (flow.system || flow.component) return Response.json({ fehler: "Dieser Flow wird nicht ausgelöst." }, { status: 400 });
        const id = await skills.fire(flow, { kind: "manual" }, ich, chat.TEAM_RAUM, "");
        return Response.json({ id }, { status: 201 });
      }),
    },
    "/skills-canvas": async (req: Request) => {
      if (!(await wer(req))) return new Response("Bitte anmelden", { status: 401 });
      return new Response(Bun.file("public/skills-canvas.html"), { headers: { "Content-Type": "text/html; charset=utf-8" } });
    },

    // ---- Rollen-Katalog: lesen fürs Team, pflegen nur Admin ----
    // Rollen = Capability-Bundles. GET liefert Rollen + Katalog (fürs ganze Team lesbar).
    "/api/rollen": {
      GET: nurTeam(async () =>
        Response.json({
          rollen: (await alle<{ name: string; capabilities: string }>(
            "SELECT name, capabilities FROM rollen ORDER BY name",
          )).map((r) => ({ name: r.name, caps: r.capabilities.split(",").map((c) => c.trim()).filter(Boolean) })),
          katalog: CAPABILITIES,
        }),
      ),
      POST: nurTeamAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const name = text(b?.name, 40);
        if (!name) return Response.json({ fehler: "Bitte einen Rollennamen angeben." }, { status: 400 });
        if (await eins("SELECT 1 AS x FROM rollen WHERE lower(name) = lower(?)", name)) {
          return Response.json({ fehler: "Diese Rolle gibt es schon." }, { status: 409 });
        }
        const caps = capsAusBody(b?.caps);
        await lauf("INSERT INTO rollen (name, capabilities) VALUES (?, ?)", name, caps.join(","));
        return Response.json({ name, caps }, { status: 201 });
      }),
    },
    "/api/rollen/:name": {
      // Fähigkeiten-Bundle einer Rolle setzen.
      PUT: nurTeamAdmin(async (req, ich) => {
        const name = decodeURIComponent(req.params.name);
        const b = await req.json().catch(() => null);
        const caps = capsAusBody(b?.caps);
        // Schutz vor Aussperren: die eigene Rolle darf team.admin nicht verlieren.
        if (ich.role === name && !caps.includes("*") && !caps.includes("team.admin")) {
          return Response.json({ fehler: "Deine eigene Rolle braucht „Team verwalten“ – sonst sperrst du dich aus." }, { status: 409 });
        }
        const r = await lauf("UPDATE rollen SET capabilities = ? WHERE name = ?", caps.join(","), name);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ name, caps });
      }),
      DELETE: nurTeamAdmin(async (req) => {
        const name = decodeURIComponent(req.params.name);
        if (await eins("SELECT 1 AS x FROM mitarbeiter WHERE role = ?", name)) {
          return Response.json(
            { fehler: "Rolle ist noch Mitarbeitern zugewiesen – erst umziehen, dann löschen." },
            { status: 409 },
          );
        }
        const r = await lauf("DELETE FROM rollen WHERE name = ?", name);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Abendführung: Ablauf-Checklisten ----
    "/api/ablauf": nurTeam(async (req) => {
      const q = new URL(req.url).searchParams;
      const process = q.get("process");
      const date = q.get("date") ?? res.alsDatum(new Date());
      if (!ablauf.istProzess(process)) return Response.json({ fehler: "Unbekannter Prozess" }, { status: 400 });
      if (!res.istDatum(date)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      return Response.json(await ablauf.tag(process, date));
    }),
    "/api/ablauf/status": nurTeam(async (req) => {
      const date = new URL(req.url).searchParams.get("date") ?? res.alsDatum(new Date());
      if (!res.istDatum(date)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      return Response.json(await ablauf.status(date));
    }),
    "/api/ablauf/erledigt": {
      POST: nurTeam(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const taskId = text(b?.task_id, 40);
        const date = text(b?.date, 10) || res.alsDatum(new Date());
        if (!taskId || !res.istDatum(date)) return Response.json({ fehler: "Ungültige Angabe" }, { status: 400 });
        try { await ablauf.erledigtSetzen(taskId, date, ich.id); }
        catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
        return Response.json({ ok: true });
      }),
      DELETE: nurTeam(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const taskId = text(b?.task_id, 40);
        const date = text(b?.date, 10) || res.alsDatum(new Date());
        if (!taskId || !res.istDatum(date)) return Response.json({ fehler: "Ungültige Angabe" }, { status: 400 });
        await ablauf.erledigtLoeschen(taskId, date, ich.id);
        return Response.json({ ok: true });
      }),
    },
    // Katalog pflegen (Admin)
    "/api/ablauf/aufgaben": {
      POST: nurAblaeufe(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const process = b?.process;
        const title = text(b?.title, 200);
        if (!ablauf.istProzess(process)) return Response.json({ fehler: "Unbekannter Prozess" }, { status: 400 });
        if (!title) return Response.json({ fehler: "Titel ist Pflicht" }, { status: 400 });
        try {
          const zeile = await ablauf.TASKS.create({
            process, group: text(b?.group, 60) || null, title, info: text(b?.info, 1000) || null,
            sort_order: await ablauf.naechsteSortierung(process), active: 1,
          }, ich.id);
          return Response.json(zeile, { status: 201 });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
    },
    // Reihenfolge innerhalb eines Prozesses: Array von Aufgaben-IDs = neue Sortierung.
    "/api/ablauf/aufgaben-reihenfolge": {
      PUT: nurAblaeufe(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) await ablauf.TASKS.patch(ids[i], { sort_order: i }, ich.id);
        return Response.json({ ok: true });
      }),
    },
    "/api/ablauf/aufgaben/:id": {
      PUT: nurAblaeufe(async (req, ich) => {
        const b = await req.json().catch(() => null);
        const title = text(b?.title, 200);
        if (!title) return Response.json({ fehler: "Titel ist Pflicht" }, { status: 400 });
        const active = b?.active === 0 || b?.active === false ? 0 : 1;
        try {
          const r = await ablauf.TASKS.patch(req.params.id, { group: text(b?.group, 60) || null, title, info: text(b?.info, 1000) || null, active }, ich.id);
          if (!r) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          return Response.json({ ok: true });
        } catch (e) { return datenFehler(e) ?? Response.json({ fehler: "Speichern fehlgeschlagen" }, { status: 500 }); }
      }),
      DELETE: nurAblaeufe(async (req, ich) => {
        if (!(await ablauf.TASKS.remove(req.params.id, ich.id))) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Team-CRUD (Admin): Identität = Vorname + Nachname, Login = Passkey ----
    "/api/mitarbeiter": {
      GET: nurTeam(async () => {
        const team = await listAll();
        // Passkey-Status je Person (Team-Tab) + Fähigkeiten der Rolle (Schichtplan-Chips).
        const mitKeys = new Set(
          (await alle<{ mitarbeiter_id: string }>("SELECT DISTINCT mitarbeiter_id FROM passkeys"))
            .map((r) => r.mitarbeiter_id),
        );
        const capsJeRolle = new Map(
          (await alle<{ name: string; capabilities: string }>("SELECT name, capabilities FROM rollen"))
            .map((r) => [r.name, r.capabilities.split(",").map((c) => c.trim()).filter(Boolean)]),
        );
        return Response.json(team.map((m) => {
          const caps = capsJeRolle.get(m.role) ?? [];
          if (m.admin && !caps.includes("*")) caps.push("*");
          return { ...m, caps, hatPasskey: mitKeys.has(m.id) };
        }));
      }),
      POST: nurTeamAdmin(async (req) => {
        const { vorname, nachname, role, ma_code, personalnr, soll_std } = await req.json();
        const vn = (vorname ?? "").toString().trim();
        const nn = (nachname ?? "").toString().trim();
        if (!vn || !role?.trim()) {
          return Response.json({ error: "Vorname und Rolle sind Pflicht" }, { status: 400 });
        }
        if (!(await rolleImKatalog(role.trim()))) {
          return Response.json({ error: "Unbekannte Rolle – bitte aus dem Katalog wählen" }, { status: 400 });
        }
        const code = leerZuNull(ma_code);
        const pnr = leerZuNull(personalnr);
        const soll = parseSoll(soll_std);
        if (soll === false) return Response.json({ error: "Soll-Wochenstunden muss eine Zahl ≥ 0 sein" }, { status: 400 });
        if (code && (await byMaCode(code))) return Response.json({ error: "MA-Code bereits vergeben" }, { status: 409 });
        if (pnr && (await byPersonalnr(pnr))) return Response.json({ error: "Personal-Nr. bereits vergeben" }, { status: 409 });

        const row: Mitarbeiter = {
          id: randomUUID(), name: nn ? `${vn} ${nn}` : vn, vorname: vn, nachname: nn || null,
          role: role.trim(), admin: 0, ma_code: code, personalnr: pnr, soll_std: soll,
        };
        await lauf(
          "INSERT INTO mitarbeiter (id, name, vorname, nachname, role, admin, ma_code, personalnr, soll_std) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)",
          row.id, row.name, row.vorname, row.nachname, row.role, row.ma_code, row.personalnr, row.soll_std,
        );
        return Response.json({ ...row, hatPasskey: false }, { status: 201 });
      }),
    },

    "/api/mitarbeiter/:id": {
      PUT: nurTeamAdmin(async (req) => {
        const { vorname, nachname, role, ma_code, personalnr, soll_std } = await req.json();
        const { id } = req.params;
        const vn = (vorname ?? "").toString().trim();
        const nn = (nachname ?? "").toString().trim();
        if (!vn || !role?.trim()) {
          return Response.json({ error: "Vorname und Rolle sind Pflicht" }, { status: 400 });
        }
        if (!(await rolleImKatalog(role.trim()))) {
          return Response.json({ error: "Unbekannte Rolle – bitte aus dem Katalog wählen" }, { status: 400 });
        }
        const code = leerZuNull(ma_code);
        const pnr = leerZuNull(personalnr);
        const soll = parseSoll(soll_std);
        if (soll === false) return Response.json({ error: "Soll-Wochenstunden muss eine Zahl ≥ 0 sein" }, { status: 400 });
        const codeClash = code ? await byMaCode(code) : null;
        if (codeClash && codeClash.id !== id) return Response.json({ error: "MA-Code bereits vergeben" }, { status: 409 });
        const pnrClash = pnr ? await byPersonalnr(pnr) : null;
        if (pnrClash && pnrClash.id !== id) return Response.json({ error: "Personal-Nr. bereits vergeben" }, { status: 409 });

        const name = nn ? `${vn} ${nn}` : vn;
        const res = await lauf(
          "UPDATE mitarbeiter SET name = ?, vorname = ?, nachname = ?, role = ?, ma_code = ?, personalnr = ?, soll_std = ? WHERE id = ?",
          name, vn, nn || null, role.trim(), code, pnr, soll, id,
        );
        if (res.changes === 0) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        return Response.json({ id, name, vorname: vn, nachname: nn || null, role: role.trim(), ma_code: code, personalnr: pnr, soll_std: soll });
      }),
      DELETE: nurTeamAdmin(async (req, ich) => {
        const id = req.params.id;
        if (!(await eins("SELECT 1 AS x FROM mitarbeiter WHERE id = ?", id))) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        // Fachdaten hängen im Dokumentenspeicher ohne Fremdschlüssel – Kaskaden hier nachziehen.
        await dok.alsWer(ich.id);
        await lauf("DELETE FROM dokumente WHERE schema_id = 'time_events' AND data->>'employee_id' = ?", id);
        await lauf("UPDATE dokumente SET data = data || '{\"employee_id\": null}'::jsonb WHERE schema_id = 'shifts' AND data->>'employee_id' = ?", id);
        await lauf("UPDATE dokumente SET data = data || '{\"employee_id\": null}'::jsonb WHERE schema_id = 'routine_done' AND data->>'employee_id' = ?", id);
        await lauf("DELETE FROM mitarbeiter WHERE id = ?", id);
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Generischer Dokumentenspeicher: Schemata (JSON Schema) + validiertes CRUD – SSOT für Fachdaten ----
    "/api/daten/schemas": {
      GET: nurTeam(async (_req, ich) => Response.json((await dok.schemata()).filter((s) => dok.darf(ich, s, "lesen")))),
      POST: nurDatenAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültiges JSON" }, { status: 400 });
        await dok.alsWer(ich.id);
        const r = await dok.schemaAnlegen(b);
        return r.ok ? Response.json(r.schema, { status: 201 }) : Response.json({ fehler: r.fehler }, { status: 400 });
      }),
    },
    "/api/daten/schemas/:id": {
      GET: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.id);
        if (!s || !dok.darf(ich, s, "lesen")) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json(s);
      }),
      PUT: nurDatenAdmin(async (req, ich) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültiges JSON" }, { status: 400 });
        await dok.alsWer(ich.id);
        const r = await dok.schemaAendern(req.params.id, b);
        return r.ok ? Response.json(r.schema) : Response.json({ fehler: r.fehler }, { status: r.fehler === "nicht gefunden" ? 404 : 400 });
      }),
      DELETE: nurDatenAdmin(async (req, ich) => {
        await dok.alsWer(ich.id);
        return (await dok.schemaLoeschen(req.params.id)) ? new Response(null, { status: 204 })
          : Response.json({ fehler: "System-Schema oder nicht gefunden" }, { status: 400 });
      }),
    },
    // ---- Historie: jede Aenderung an Schemata und Dokumenten, mit Wiederherstellung ----
    "/api/daten/verlauf": {
      GET: nurDatenAdmin(async (req) => {
        const q = new URL(req.url).searchParams;
        return Response.json(await dok.verlauf({ schema: q.get("schema") ?? undefined, dokument: q.get("dokument") ?? undefined }, Number(q.get("limit") ?? 200), Number(q.get("offset") ?? 0)));
      }),
    },
    "/api/daten/verlauf/:seq/wiederherstellen": {
      POST: nurDatenAdmin(async (req, ich) => {
        await dok.alsWer(ich.id);
        const r = await dok.wiederherstellen(Number(req.params.seq));
        return r.ok ? Response.json({ ok: true, dokument: r.dokument }) : Response.json({ fehler: r.fehler }, { status: r.konflikt ? 409 : 400 });
      }),
    },
    "/api/daten/schema-verlauf": {
      GET: nurDatenAdmin(async (req) => Response.json(await dok.schemaVerlauf(new URL(req.url).searchParams.get("schema") ?? undefined))),
    },
    "/api/daten/schema-verlauf/:seq/wiederherstellen": {
      POST: nurDatenAdmin(async (req, ich) => {
        await dok.alsWer(ich.id);
        const r = await dok.schemaWiederherstellen(Number(req.params.seq));
        return r.ok ? Response.json({ ok: true, schema: r.schema }) : Response.json({ fehler: r.fehler }, { status: 400 });
      }),
    },
    "/api/daten/:schema": {
      GET: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "lesen")) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        const q = new URL(req.url).searchParams;
        const filter: Record<string, string> = {};
        for (const [k, v] of q) if (k.startsWith("f.")) filter[k.slice(2)] = v;
        return Response.json(await dok.liste(s, filter, Number(q.get("limit") ?? 200), Number(q.get("offset") ?? 0)));
      }),
      POST: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "lesen")) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        if (!dok.darf(ich, s, "schreiben")) return Response.json({ fehler: "Keine Schreibrechte" }, { status: 403 });
        const b = await req.json().catch(() => null);
        await dok.alsWer(ich.id);
        const r = await dok.anlegen(s, b, typeof b?.id === "string" ? b.id : undefined);
        return r.ok ? Response.json(r.dokument, { status: 201 }) : Response.json({ fehler: r.fehler }, { status: r.konflikt ? 409 : 400 });
      }),
    },
    "/api/daten/:schema/validieren": {
      POST: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "lesen")) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        const p = dok.pruefen(s, await req.json().catch(() => null));
        return Response.json(p.ok ? { ok: true, data: p.data } : { ok: false, fehler: p.fehler });
      }),
    },
    "/api/daten/:schema/:id": {
      GET: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "lesen")) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        const d = await dok.lesen(s, req.params.id);
        return d ? Response.json(d) : Response.json({ fehler: "nicht gefunden" }, { status: 404 });
      }),
      PUT: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "schreiben")) return Response.json({ fehler: "Keine Schreibrechte" }, { status: s ? 403 : 404 });
        await dok.alsWer(ich.id);
        const r = await dok.ersetzen(s, req.params.id, await req.json().catch(() => null));
        if (r === null) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return r.ok ? Response.json(r.dokument) : Response.json({ fehler: r.fehler }, { status: r.konflikt ? 409 : 400 });
      }),
      PATCH: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "schreiben")) return Response.json({ fehler: "Keine Schreibrechte" }, { status: s ? 403 : 404 });
        await dok.alsWer(ich.id);
        const r = await dok.aendern(s, req.params.id, await req.json().catch(() => null));
        if (r === null) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return r.ok ? Response.json(r.dokument) : Response.json({ fehler: r.fehler }, { status: r.konflikt ? 409 : 400 });
      }),
      DELETE: nurTeam(async (req, ich) => {
        const s = await dok.schema(req.params.schema);
        if (!s || !dok.darf(ich, s, "schreiben")) return Response.json({ fehler: "Keine Schreibrechte" }, { status: s ? 403 : 404 });
        await dok.alsWer(ich.id);
        return (await dok.loeschen(s, req.params.id)) ? new Response(null, { status: 204 }) : Response.json({ fehler: "nicht gefunden" }, { status: 404 });
      }),
    },

    // ---- Passkeys einer Person zurücksetzen (z. B. Gerät verloren) ----
    "/api/mitarbeiter/:id/passkeys": {
      DELETE: nurTeamAdmin(async (req) => {
        await lauf("DELETE FROM passkeys WHERE mitarbeiter_id = ?", req.params.id);
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Live-Kanal (WebSocket): Auth über das Session-Cookie beim Upgrade ----
    "/ws": async (req: Request) => {
      const ich = await wer(req);
      if (!ich) return new Response("Bitte anmelden", { status: 401 });
      const ok = server.upgrade(req, { data: { id: ich.id, caps: ich.caps ?? [] } });
      return ok ? (undefined as unknown as Response) : new Response("WebSocket erwartet", { status: 426 });
    },
};

const server = Bun.serve<live.WsDaten>({
  port: Number(process.env.PORT ?? 3000),
  routes: live.mitSignalen(routen) as never,
  websocket: live.websocket,
  fetch: (req) =>
    new URL(req.url).pathname.startsWith("/api/")
      ? Response.json({ fehler: "nicht gefunden" }, { status: 404 })
      : html(nichtGefundenPage, 404),
});
live.starten(server);

console.log(`Läuft auf http://localhost:${server.port}`);
