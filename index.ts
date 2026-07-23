import { randomUUID } from "node:crypto";
import { alle, eins, lauf, allocatePin, type Mitarbeiter } from "./db";
import { sessionsFor, durationMs, clip, type Ev } from "./time";
import { terminalPage } from "./terminal";
import { dashboardPage } from "./dashboard";
import { homePage } from "./site/home";
import { karteSeite, karteInvalidieren } from "./site/karte";
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
import * as kueche from "./rezepte";
import { OEFFNUNG } from "./site/info";
import {
  logoutCookie,
  nurAdmin,
  nurTeam,
  sessionCookie,
  sitzungAendern,
  sitzungAnlegen,
  sitzungLoeschen,
  sitzungenFuer,
  tokenFuer,
  wer,
} from "./auth";

const html = (s: string, status = 200) =>
  new Response(s, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });

/** Dauerhafte Umleitung – hält die Links der alten Website am Leben. */
const um = (ziel: string) => () => Response.redirect(ziel, 301);

const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

const INV_BEREICHE = ["kueche", "bar", "keller"];

/** Passt eine Person auf eine Schicht-Rolle? Admins dürfen überall einspringen. */
const rollePasst = (m: Mitarbeiter, schichtRolle: string) =>
  !!m.admin || m.role.trim().toLowerCase() === schichtRolle.trim().toLowerCase();

/** Feldprüfung einer Karten-Gruppe. */
function karteGruppeFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const kapitel = text(b.kapitel, 30);
  const titel = text(b.titel, 120);
  if (!KAPITEL_META.some((k) => k.id === kapitel)) return { fehler: "Unbekanntes Kapitel." };
  if (!titel) return { fehler: "Bitte einen Gruppentitel angeben." };
  return {
    kapitel,
    titel,
    spalten: text(b.spalten, 60) || null,
    fussnote: text(b.fussnote, 300) || null,
  };
}

/** Feldprüfung einer Karten-Position. */
async function kartePositionFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" } as const;
  const gruppe_id = text(b.gruppe_id, 64);
  const name = text(b.name, 160);
  if (!name) return { fehler: "Bitte einen Namen angeben." } as const;
  if (!(await eins("SELECT 1 AS x FROM karte_gruppen WHERE id = ?", gruppe_id))) {
    return { fehler: "Gruppe nicht gefunden." } as const;
  }
  const tags = text(b.tags, 20)
    .split(",").map((t) => t.trim()).filter((t) => ["v", "vg", "gf"].includes(t)).join(",");
  return {
    gruppe_id,
    name,
    text: text(b.text, 500) || null,
    option: text(b.option, 200) || null,
    tags: tags || null,
    stern: b.stern ? 1 : 0,
    preise: text(b.preise, 60) || null,
    aktiv: b.aktiv === 0 || b.aktiv === false ? 0 : 1,
  };
}

/** Rezept-Body normalisieren (Prüfung übernimmt rezepte.ts). */
function rezeptBody(b: Record<string, unknown> | null): kueche.NeuesRezept {
  const zutaten = Array.isArray(b?.zutaten) ? b!.zutaten : [];
  return {
    name: text(b?.name, 80),
    ergibt: Number(b?.ergibt ?? 4),
    notiz: text(b?.notiz, 500) || null,
    zutaten: zutaten
      .map((z: Record<string, unknown>) => ({ inventar_id: text(z?.inventar_id, 64), menge: Number(z?.menge) }))
      .filter((z) => z.inventar_id),
  };
}

/** Gericht-Body normalisieren. */
function gerichtBody(b: Record<string, unknown> | null): kueche.NeuesGericht {
  const komponenten = Array.isArray(b?.komponenten) ? b!.komponenten : [];
  return {
    name: text(b?.name, 80),
    preis: text(b?.preis, 12) || null,
    komponenten: komponenten
      .map((k: Record<string, unknown>) => ({ rezept_id: text(k?.rezept_id, 64), portionen: Number(k?.portionen ?? 1) }))
      .filter((k) => k.rezept_id),
  };
}

/** Feldprüfung einer wiederkehrenden Schicht-Regel. */
function regelFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const rolle = text(b.rolle, 40);
  const von = text(b.von, 5), bis = text(b.bis, 5);
  const anzahl = Number(b.anzahl ?? 1);
  const rhythmus = text(b.rhythmus, 20) || "woechentlich";
  const tage = Array.isArray(b.tage) ? b.tage.map(Number).filter((t) => t >= 0 && t <= 6) : [];
  if (!rolle) return { fehler: "Bitte eine Rolle wählen." };
  if (!/^\d{2}:\d{2}$/.test(von) || !/^\d{2}:\d{2}$/.test(bis)) {
    return { fehler: "Bitte Zeiten als HH:MM angeben." };
  }
  if (!tage.length) return { fehler: "Bitte mindestens einen Wochentag wählen." };
  if (!Number.isInteger(anzahl) || anzahl < 1 || anzahl > 10) {
    return { fehler: "Anzahl muss zwischen 1 und 10 liegen." };
  }
  if (!["woechentlich", "zweiwoechentlich"].includes(rhythmus)) {
    return { fehler: "Unbekannter Rhythmus." };
  }
  const start = res.istDatum(b.start) ? (b.start as string) : null;
  if (rhythmus === "zweiwoechentlich" && !start) {
    return { fehler: "Zweiwöchentliche Regeln brauchen ein Startdatum." };
  }
  return { rolle, von, bis, tage: [...new Set(tage)].sort().join(","), anzahl, rhythmus, start };
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
  const regeln = await alle<{
    id: string; rolle: string; von: string; bis: string;
    tage: string; anzahl: number; rhythmus: string; start: string | null; aktiv: number;
  }>("SELECT * FROM schicht_regeln");
  const regelnAktiv = regeln.filter((r) => r.aktiv);
  let angelegt = 0, entfernt = 0;

  const [y, m, d] = von.split("-").map(Number);
  const lauf_ = new Date(y, m - 1, d);
  const isoVon = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

  const giltAm = (r: (typeof regeln)[number], datum: string, wt: number) => {
    if (!r.aktiv || !r.tage.split(",").map(Number).includes(wt)) return false;
    if (r.rhythmus === "zweiwoechentlich" && r.start) {
      if ((((wochenIndex(datum) - wochenIndex(r.start)) % 2) + 2) % 2 !== 0) return false;
    }
    return true;
  };

  while (isoVon(lauf_) <= bis) {
    const datum = isoVon(lauf_);
    const wt = lauf_.getDay();

    // 0) Datenhygiene: Zuweisungen lösen, deren Rolle nicht (mehr) zur Schicht passt
    //    (z. B. Service-Kraft auf Koch-Slot aus Altbeständen). Admins dürfen überall.
    const besetzte = await alle<{ id: string; rolle: string; name: string; role: string; admin: number; pin: string; mid: string }>(
      `SELECT s.id, s.rolle, m.id AS mid, m.name, m.role, m.admin, m.pin
         FROM schichten s JOIN mitarbeiter m ON m.id = s.mitarbeiter_id
        WHERE s.datum = ?`, datum,
    );
    for (const s of besetzte) {
      if (!rollePasst({ id: s.mid, name: s.name, role: s.role, admin: s.admin, pin: s.pin }, s.rolle)) {
        await lauf("UPDATE schichten SET mitarbeiter_id = NULL WHERE id = ?", s.id);
      }
    }

    // 1) Verwaiste Slots entfernen – ohne Regel, mit gelöschter/inaktiver Regel oder
    //    an einem Tag, den die Regel nicht mehr abdeckt. Immer nur unbesetzte.
    const vorhandene = await alle<{ id: string; regel_id: string | null; mitarbeiter_id: string | null }>(
      "SELECT id, regel_id, mitarbeiter_id FROM schichten WHERE datum = ?", datum,
    );
    for (const s of vorhandene) {
      if (s.mitarbeiter_id) continue;
      const r = s.regel_id ? regeln.find((x) => x.id === s.regel_id) : undefined;
      if (!r || !giltAm(r, datum, wt)) {
        await lauf("DELETE FROM schichten WHERE id = ?", s.id);
        entfernt++;
      }
    }

    // 2) Je Regel auf Soll-Anzahl bringen: auffüllen oder unbesetzte Überzählige abbauen.
    for (const r of regelnAktiv) {
      if (!giltAm(r, datum, wt)) continue;
      const slots = await alle<{ id: string; mitarbeiter_id: string | null }>(
        "SELECT id, mitarbeiter_id FROM schichten WHERE datum = ? AND regel_id = ?", datum, r.id,
      );
      for (let i = slots.length; i < r.anzahl; i++) {
        await lauf(
          "INSERT INTO schichten (id, datum, rolle, von, bis, mitarbeiter_id, notiz, regel_id) VALUES (?, ?, ?, ?, ?, NULL, NULL, ?)",
          randomUUID(), datum, r.rolle, r.von, r.bis, r.id,
        );
        angelegt++;
      }
      const frei = slots.filter((s) => !s.mitarbeiter_id);
      for (let i = slots.length; i > r.anzahl && frei.length; i--) {
        const opfer = frei.pop()!;
        await lauf("DELETE FROM schichten WHERE id = ?", opfer.id);
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
  const datum = text(b.datum, 10);
  const rolle = text(b.rolle, 40);
  const von = text(b.von, 5);
  const bis = text(b.bis, 5);
  if (!res.istDatum(datum)) return { fehler: "Bitte ein gültiges Datum wählen." };
  if (!rolle) return { fehler: "Bitte eine Rolle angeben (z. B. Koch, Service)." };
  if (!/^\d{2}:\d{2}$/.test(von) || !/^\d{2}:\d{2}$/.test(bis)) {
    return { fehler: "Bitte Zeiten als HH:MM angeben." };
  }
  return { datum, rolle, von, bis, notiz: text(b.notiz, 300) || null };
}

/** Feldprüfung eines Inventar-Artikels. */
function invFelder(b: Record<string, unknown> | null) {
  if (!b) return { fehler: "Ungültige Anfrage" };
  const bereich = text(b.bereich, 10);
  const name = text(b.name, 120);
  const einheit = text(b.einheit, 24);
  const menge = Number(b.menge);
  const soll = b.soll === "" || b.soll == null ? null : Number(b.soll);
  if (!INV_BEREICHE.includes(bereich)) return { fehler: "Unbekannter Bereich" };
  if (!name) return { fehler: "Bitte einen Artikelnamen angeben." };
  if (!einheit) return { fehler: "Bitte eine Einheit angeben (z. B. kg, Flaschen)." };
  if (!Number.isFinite(menge) || menge < 0) return { fehler: "Bitte eine gültige Menge angeben." };
  if (soll != null && (!Number.isFinite(soll) || soll < 0)) return { fehler: "Ungültiger Sollbestand." };
  return { bereich, name, menge, einheit, soll, notiz: text(b.notiz, 300) || null };
}

/**
 * Gemeinsame Feldprüfung der Team-Endpunkte: nur Format, keine Kapazität –
 * das Team entscheidet selbst, was ins Haus passt.
 */
function teamFelder(b: Record<string, unknown>) {
  const name = text(b.name, 120);
  const datum = text(b.datum, 10);
  const zeit = text(b.zeit, 5);
  const personen = Number(b.personen);
  if (!name) return { fehler: "Bitte einen Namen angeben." };
  if (!res.istDatum(datum)) return { fehler: "Bitte ein gültiges Datum wählen." };
  if (!/^\d{2}:\d{2}$/.test(zeit)) return { fehler: "Bitte eine Uhrzeit (HH:MM) angeben." };
  if (!Number.isInteger(personen) || personen < 1) {
    return { fehler: "Bitte die Personenzahl angeben." };
  }
  const bereich = (text(b.bereich, 10) || "drinnen") as res.Bereich;
  if (!res.BEREICHE.includes(bereich)) return { fehler: "Unbekannter Bereich" };
  return {
    name,
    email: text(b.email, 160) || "-",
    telefon: text(b.telefon, 40) || "-",
    datum,
    zeit,
    personen,
    bereich,
    anlass: text(b.anlass, 80) || null,
    notiz: text(b.notiz, 600) || null,
  };
}

const listAll = () =>
  alle<Mitarbeiter>("SELECT id, name, role, pin, admin FROM mitarbeiter ORDER BY name");

const byPin = (pin: string) =>
  eins<Mitarbeiter>("SELECT id, name, role, pin, admin FROM mitarbeiter WHERE pin = ?", pin);

const lastEvent = (id: string) =>
  eins<{ type: "in" | "out"; ts: number }>(
    "SELECT type, ts FROM events WHERE mitarbeiter_id = ? ORDER BY ts DESC LIMIT 1", id,
  );

const isValidPin = (p: unknown): p is string =>
  typeof p === "string" && /^\d{4}$/.test(p) && p !== "0009";

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
  const schichten = await alle<{ von: string; bis: string }>(
    "SELECT von, bis FROM schichten WHERE mitarbeiter_id = ? AND datum = ?", mitarbeiterId, datum,
  );
  if (!schichten.length) return null;
  let start = Infinity, ende = -Infinity;
  for (const s of schichten) {
    start = Math.min(start, lokalTs(datum, s.von));
    let bis = lokalTs(datum, s.bis);
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

const server = Bun.serve({
  port: 3000,
  routes: {
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

    // ---------------- Intern ----------------
    "/terminal": () => html(terminalPage),
    "/team": () => html(dashboardPage),
    "/dashboard": um("/team"),
    "/logo.png": () => new Response(Bun.file("public/logo.png")),

    // ---- Reservierung: freie Zeiten eines Tages ----
    "/api/verfuegbarkeit": async (req) => {
      const q = new URL(req.url).searchParams;
      const datum = q.get("datum") ?? "";
      const personen = Math.max(1, Number(q.get("personen") ?? 2) || 2);
      if (!res.istDatum(datum)) {
        return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      }
      const [y, m, d] = datum.split("-").map(Number);
      if (!OEFFNUNG[new Date(y, m - 1, d).getDay()]) {
        return Response.json({
          datum,
          ruhetag: true,
          slots: [],
          hinweis: `${res.tagName(datum)} ist unser Ruhetag – wir freuen uns an jedem anderen Tag auf euch.`,
        });
      }
      const bereich = (q.get("bereich") ?? "drinnen") as res.Bereich;
      if (!res.BEREICHE.includes(bereich)) {
        return Response.json({ fehler: "Unbekannter Bereich" }, { status: 400 });
      }
      return Response.json({
        datum,
        ruhetag: false,
        personen,
        bereich,
        slots: await res.slotsFuer(datum, personen, bereich),
      });
    },

    // ---- Reservierung anlegen (Gast) / Tagesliste (Team) ----
    "/api/reservierungen": {
      GET: nurTeam(async (req) => {
        const datum = new URL(req.url).searchParams.get("datum");
        if (datum && !res.istDatum(datum)) {
          return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
        }
        return Response.json(datum ? await res.fuerTag(datum) : await res.abHeute());
      }),
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });

        const name = text(b.name, 120);
        const email = text(b.email, 160);
        const telefon = text(b.telefon, 40);
        const personen = Number(b.personen);
        if (!name || !email || !telefon) {
          return Response.json({ fehler: "Bitte Name, E-Mail und Telefon angeben." }, { status: 400 });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ fehler: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
        }

        const bereich = (text(b.bereich, 10) || "drinnen") as res.Bereich;
        if (!res.BEREICHE.includes(bereich)) {
          return Response.json({ fehler: "Unbekannter Bereich" }, { status: 400 });
        }
        const pruefung = await res.pruefe(text(b.datum, 10), text(b.zeit, 5), personen, bereich);
        if (!pruefung.ok) return Response.json({ fehler: pruefung.fehler }, { status: 409 });

        const zeile = await res.anlegen({
          name, email, telefon,
          datum: b.datum, zeit: b.zeit, personen, bereich,
          anlass: text(b.anlass, 80) || null,
          notiz: text(b.notiz, 600) || null,
        });
        return Response.json(zeile, { status: 201 });
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
      POST: nurTeam(async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const daten = teamFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const zeile = await res.anlegen({ ...daten, status: "bestaetigt" });
        return Response.json(zeile, { status: 201 });
      }),
    },

    // ---- Team: Status setzen, bearbeiten, löschen ----
    "/api/team/reservierungen/:id": {
      PATCH: nurTeam(async (req) => {
        const { status } = (await req.json().catch(() => ({}))) as { status?: string };
        const erlaubt = ["offen", "bestaetigt", "abgesagt", "erledigt"] as const;
        if (!erlaubt.includes(status as never)) {
          return Response.json({ fehler: "Unbekannter Status" }, { status: 400 });
        }
        if (!(await res.statusSetzen(req.params.id, status as res.Status))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return Response.json({ id: req.params.id, status });
      }),
      PUT: nurTeam(async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const daten = teamFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const zeile = await res.aktualisieren(req.params.id, daten);
        if (!zeile) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json(zeile);
      }),
      DELETE: nurTeam(async (req) => {
        if (!(await res.loeschen(req.params.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Meine Schichten: kommende eigene Einsätze (nur lesend) ----
    "/api/meine-schichten": nurTeam(async (req, ich) =>
      Response.json(
        await alle(
          "SELECT * FROM schichten WHERE mitarbeiter_id = ? AND datum >= ? ORDER BY datum, von",
          ich.id, res.alsDatum(new Date()),
        ),
      ),
    ),

    // ---- Kapazität (Plätze drinnen/draußen, optionales Gesamt-Limit) ----
    "/api/kapazitaet": {
      GET: nurTeam(async () => Response.json(await res.kapazitaet())),
      PUT: nurAdmin(async (req) => {
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
    "/api/reservierungen-uebersicht": nurTeam(async (req) => {
      const datum = new URL(req.url).searchParams.get("datum") ?? res.alsDatum(new Date());
      if (!res.istDatum(datum)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
      return Response.json(await res.tagesUebersicht(datum));
    }),

    // ---- Inventur: Team zählt Bestände, Artikel & Soll pflegt der Admin ----
    "/api/inventar": {
      GET: nurTeam(async (req) => {
        const bereich = new URL(req.url).searchParams.get("bereich");
        if (bereich && !INV_BEREICHE.includes(bereich)) {
          return Response.json({ fehler: "Unbekannter Bereich" }, { status: 400 });
        }
        const rows = bereich
          ? await alle("SELECT * FROM inventar WHERE bereich = ? ORDER BY name", bereich)
          : await alle("SELECT * FROM inventar ORDER BY bereich, name");
        return Response.json(rows);
      }),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = invFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const zeile = { id: randomUUID(), ...daten, aktualisiert: Date.now() };
        await lauf(
          "INSERT INTO inventar (id, bereich, name, menge, einheit, soll, notiz, aktualisiert) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          zeile.id, zeile.bereich, zeile.name, zeile.menge, zeile.einheit, zeile.soll, zeile.notiz, zeile.aktualisiert,
        );
        return Response.json(zeile, { status: 201 });
      }),
    },

    "/api/inventar/:id": {
      // Ganzes Team: nur den gezählten Ist-Bestand aktualisieren.
      PATCH: nurTeam(async (req) => {
        const b = await req.json().catch(() => null);
        const menge = Number(b?.menge);
        if (!Number.isFinite(menge) || menge < 0) {
          return Response.json({ fehler: "Bitte eine gültige Menge angeben." }, { status: 400 });
        }
        const r = await lauf(
          "UPDATE inventar SET menge = ?, aktualisiert = ? WHERE id = ?",
          menge, Date.now(), req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, menge });
      }),
      // Nur Admin: Artikel umbenennen, Bereich/Einheit/Soll/Notiz ändern.
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = invFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const r = await lauf(
          "UPDATE inventar SET bereich = ?, name = ?, menge = ?, einheit = ?, soll = ?, notiz = ?, aktualisiert = ? WHERE id = ?",
          daten.bereich, daten.name, daten.menge, daten.einheit, daten.soll, daten.notiz, Date.now(), req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, ...daten });
      }),
      DELETE: nurAdmin(async (req) => {
        const r = await lauf("DELETE FROM inventar WHERE id = ?", req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Schichtplanung (Admin, v1): Vorlage einfügen, Slots pflegen, Team zuweisen ----
    "/api/schichten": {
      // ?von=&bis= liefert eine ganze Woche, ?datum= einen einzelnen Tag.
      GET: nurAdmin(async (req) => {
        const q = new URL(req.url).searchParams;
        const von = q.get("von"), bis = q.get("bis");
        // Anzeige-Reihenfolge folgt der Vorlage (Regel-Sortierung); Rest hinten an.
        const sql = `SELECT s.*, m.name AS mitarbeiter_name
                       FROM schichten s
                       LEFT JOIN mitarbeiter m ON m.id = s.mitarbeiter_id
                       LEFT JOIN schicht_regeln r ON r.id = s.regel_id`;
        const reihung = "COALESCE(r.sortierung, 9999), s.von, s.rolle";
        if (von && bis) {
          if (!res.istDatum(von) || !res.istDatum(bis)) {
            return Response.json({ fehler: "Ungültiger Zeitraum" }, { status: 400 });
          }
          // Die Vorlage ist SSOT: jede angezeigte Woche wird automatisch abgeglichen –
          // Regel-Änderungen wirken so ohne manuellen Knopf.
          await schichtenGenerieren(von, bis);
          return Response.json(
            await alle(`${sql} WHERE s.datum >= ? AND s.datum <= ? ORDER BY s.datum, ${reihung}`, von, bis),
          );
        }
        const datum = q.get("datum") ?? res.alsDatum(new Date());
        if (!res.istDatum(datum)) return Response.json({ fehler: "Ungültiges Datum" }, { status: 400 });
        return Response.json(
          await alle(`${sql} WHERE s.datum = ? ORDER BY ${reihung}`, datum),
        );
      }),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = schichtFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.rolle))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const zeile = { id: randomUUID(), ...daten, mitarbeiter_id: null };
        await lauf(
          "INSERT INTO schichten (id, datum, rolle, von, bis, mitarbeiter_id, notiz) VALUES (?, ?, ?, ?, ?, NULL, ?)",
          zeile.id, zeile.datum, zeile.rolle, zeile.von, zeile.bis, zeile.notiz,
        );
        return Response.json(zeile, { status: 201 });
      }),
    },

    // Fehlende Schichten aus den wiederkehrenden Regeln erzeugen (Tag oder Zeitraum).
    "/api/schichten/generieren": {
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const von = text(b?.von, 10), bis = text(b?.bis, 10) || von;
        if (!res.istDatum(von) || !res.istDatum(bis) || bis < von) {
          return Response.json({ fehler: "Ungültiger Zeitraum" }, { status: 400 });
        }
        return Response.json({ ok: true, ...(await schichtenGenerieren(von, bis)) }, { status: 201 });
      }),
    },

    // ---- Wiederkehrende Schicht-Regeln (Admin) ----
    "/api/schicht-regeln": {
      GET: nurAdmin(async () =>
        Response.json(await alle("SELECT * FROM schicht_regeln ORDER BY sortierung, von, rolle")),
      ),
      POST: nurAdmin(async (req) => {
        const daten = regelFelder(await req.json().catch(() => null));
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.rolle))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const max = await eins<{ m: number | null }>("SELECT MAX(sortierung) AS m FROM schicht_regeln");
        const zeile = { id: randomUUID(), ...daten, aktiv: 1, sortierung: Number(max?.m ?? 0) + 1 };
        await lauf(
          "INSERT INTO schicht_regeln (id, rolle, von, bis, tage, anzahl, rhythmus, start, aktiv, sortierung) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)",
          zeile.id, zeile.rolle, zeile.von, zeile.bis, zeile.tage, zeile.anzahl, zeile.rhythmus, zeile.start, zeile.sortierung,
        );
        return Response.json(zeile, { status: 201 });
      }),
    },

    // Reihenfolge der Vorlage per Drag & Drop: Array von Regel-IDs = neue Sortierung.
    "/api/schicht-regeln-reihenfolge": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) {
          await lauf("UPDATE schicht_regeln SET sortierung = ? WHERE id = ?", i + 1, ids[i]);
        }
        return Response.json({ ok: true });
      }),
    },
    "/api/schicht-regeln/:id": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = regelFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.rolle))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const aktiv = b?.aktiv === 0 || b?.aktiv === false ? 0 : 1;
        const r = await lauf(
          "UPDATE schicht_regeln SET rolle = ?, von = ?, bis = ?, tage = ?, anzahl = ?, rhythmus = ?, start = ?, aktiv = ? WHERE id = ?",
          daten.rolle, daten.von, daten.bis, daten.tage, daten.anzahl, daten.rhythmus, daten.start, aktiv, req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, ...daten, aktiv });
      }),
      DELETE: nurAdmin(async (req) => {
        // Bereits erzeugte Schichten bleiben stehen – nur die Regel verschwindet.
        const r = await lauf("DELETE FROM schicht_regeln WHERE id = ?", req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    "/api/schichten/:id": {
      // Zuweisung per Drag & Drop: mitarbeiter_id setzen oder (null) lösen.
      // Regeln: passende Rolle (Admins überall), Slot muss frei sein,
      // und dieselbe Person nie doppelt in überlappenden Zeitfenstern.
      PATCH: nurAdmin(async (req) => {
        const b = await req.json().catch(() => ({}));
        const mid = b?.mitarbeiter_id ?? null;
        if (mid !== null) {
          const m = await eins<Mitarbeiter>(
            "SELECT id, name, role, pin, admin FROM mitarbeiter WHERE id = ?", mid,
          );
          if (!m) return Response.json({ fehler: "Mitarbeiter unbekannt" }, { status: 400 });
          const slot = await eins<{ datum: string; rolle: string; von: string; bis: string; mitarbeiter_id: string | null }>(
            "SELECT datum, rolle, von, bis, mitarbeiter_id FROM schichten WHERE id = ?", req.params.id,
          );
          if (!slot) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
          if (slot.mitarbeiter_id) {
            return Response.json(
              { fehler: "Dieser Platz ist schon besetzt – erst die Zuweisung lösen." },
              { status: 409 },
            );
          }
          if (!rollePasst(m, slot.rolle)) {
            return Response.json(
              { fehler: `${m.name} (${m.role}) passt nicht auf eine ${slot.rolle}-Schicht.` },
              { status: 409 },
            );
          }
          // Zeitliche Doppelbelegung derselben Person am selben Tag verhindern.
          const spanne = (von: string, bis: string) => {
            const s = lokalTs(slot.datum, von);
            let e = lokalTs(slot.datum, bis);
            if (e <= s) e += 86400000; // über Mitternacht
            return [s, e] as const;
          };
          const [zs, ze] = spanne(slot.von, slot.bis);
          const andere = await alle<{ rolle: string; von: string; bis: string }>(
            "SELECT rolle, von, bis FROM schichten WHERE mitarbeiter_id = ? AND datum = ? AND id != ?",
            mid, slot.datum, req.params.id,
          );
          for (const a of andere) {
            const [as, ae] = spanne(a.von, a.bis);
            if (as < ze && zs < ae) {
              return Response.json(
                { fehler: `${m.name} ist an dem Tag schon von ${a.von}–${a.bis} (${a.rolle}) eingeplant.` },
                { status: 409 },
              );
            }
          }
        }
        const r = await lauf("UPDATE schichten SET mitarbeiter_id = ? WHERE id = ?", mid, req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, mitarbeiter_id: mid });
      }),
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = schichtFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        if (!(await rolleImKatalog(daten.rolle))) {
          return Response.json({ fehler: "Unbekannte Rolle – bitte aus dem Katalog wählen." }, { status: 400 });
        }
        const r = await lauf(
          "UPDATE schichten SET datum = ?, rolle = ?, von = ?, bis = ?, notiz = ? WHERE id = ?",
          daten.datum, daten.rolle, daten.von, daten.bis, daten.notiz, req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return Response.json({ id: req.params.id, ...daten });
      }),
      DELETE: nurAdmin(async (req) => {
        const r = await lauf("DELETE FROM schichten WHERE id = ?", req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Feier-Anfragen ----
    "/api/anfragen": {
      GET: nurTeam(async () =>
        Response.json(await alle("SELECT * FROM anfragen ORDER BY erstellt DESC LIMIT 200")),
      ),
      POST: async (req) => {
        const b = await req.json().catch(() => null);
        if (!b) return Response.json({ fehler: "Ungültige Anfrage" }, { status: 400 });
        const name = text(b.name, 120);
        const email = text(b.email, 160);
        const notiz = text(b.notiz, 2000);
        if (!name || !email || !notiz) {
          return Response.json({ fehler: "Bitte Name, E-Mail und eine kurze Beschreibung angeben." }, { status: 400 });
        }
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
          return Response.json({ fehler: "Bitte eine gültige E-Mail-Adresse angeben." }, { status: 400 });
        }
        const personen = Number(b.personen);
        const zeile = {
          id: randomUUID(), name, email,
          telefon: text(b.telefon, 40) || null,
          anlass: text(b.anlass, 80) || null,
          datum: res.istDatum(b.datum) ? b.datum : null,
          personen: Number.isInteger(personen) && personen > 0 ? personen : null,
          notiz, erstellt: Date.now(),
        };
        await lauf(
          `INSERT INTO anfragen (id, name, email, telefon, anlass, datum, personen, notiz, status, erstellt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'neu', ?)`,
          zeile.id, zeile.name, zeile.email, zeile.telefon, zeile.anlass,
          zeile.datum, zeile.personen, zeile.notiz, zeile.erstellt,
        );
        return Response.json({ ok: true, id: zeile.id }, { status: 201 });
      },
    },

    // ---- Terminal: PIN-Login – identifiziert und setzt das Session-Cookie ----
    "/api/session": {
      POST: async (req) => {
        const { pin } = (await req.json().catch(() => ({}))) as { pin?: string };
        const emp = await byPin(String(pin ?? ""));
        if (!emp) return Response.json({ fehler: "unbekannt" }, { status: 401 });
        const last = await lastEvent(emp.id);
        const clockedIn = last?.type === "in";
        return Response.json(
          {
            id: emp.id, name: emp.name, role: emp.role, pin: emp.pin,
            admin: !!emp.admin, clockedIn, since: clockedIn ? last!.ts : null,
            // Vergessenes Ausstempeln? Muss vor allem anderen geklärt werden.
            klaerung: await klaerungFuer(emp.id, last),
          },
          { headers: { "Set-Cookie": sessionCookie(tokenFuer(emp.id)) } },
        );
      },
      DELETE: () =>
        new Response(null, { status: 204, headers: { "Set-Cookie": logoutCookie() } }),
    },

    // ---- Wer bin ich? (Dashboard fragt beim Laden) ----
    "/api/me": async (req) => {
      const ich = await wer(req);
      if (!ich) return Response.json({ fehler: "nicht angemeldet" }, { status: 401 });
      return Response.json({ id: ich.id, name: ich.name, role: ich.role, admin: !!ich.admin });
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
      GET: nurAdmin(async (req) => {
        const q = new URL(req.url).searchParams;
        const from = Number(q.get("from") ?? 0);
        const to = Number(q.get("to") ?? Date.now() + 1);
        return Response.json(await sitzungenFuer(req.params.mitarbeiterId, from, to));
      }),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const start = Number(b?.start), end = Number(b?.end);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
          return Response.json({ fehler: "Start muss vor dem Ende liegen." }, { status: 400 });
        }
        return Response.json(await sitzungAnlegen(req.params.mitarbeiterId, start, end), { status: 201 });
      }),
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const start = Number(b?.start);
        const end = b?.end == null ? null : Number(b.end);
        if (!b?.inId || !Number.isFinite(start) || (end != null && end <= start)) {
          return Response.json({ fehler: "Ungültige Zeiten." }, { status: 400 });
        }
        if (!(await sitzungAendern(req.params.mitarbeiterId, { inId: b.inId, outId: b.outId ?? null, start, end }))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return Response.json({ ok: true });
      }),
      DELETE: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        if (!b?.inId) return Response.json({ fehler: "inId fehlt" }, { status: 400 });
        if (!(await sitzungLoeschen(req.params.mitarbeiterId, b.inId, b.outId ?? null))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Terminal: ein-/ausstempeln (toggelt anhand des letzten Events) ----
    // Ist eine Schicht geplant, gilt: frühestens 2 h vor Beginn rein, spätestens 2 h nach Ende raus.
    "/api/stamp": {
      POST: async (req) => {
        const { pin } = await req.json();
        const emp = await byPin(String(pin ?? ""));
        if (!emp) return Response.json({ error: "unbekannt" }, { status: 404 });
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

        await lauf(
          "INSERT INTO events (id, mitarbeiter_id, type, ts) VALUES (?, ?, ?, ?)",
          randomUUID(), emp.id, type, ts,
        );
        return Response.json({ name: emp.name, type, ts });
      },
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
        await lauf(
          "INSERT INTO events (id, mitarbeiter_id, type, ts) VALUES (?, ?, 'out', ?)",
          randomUUID(), ich.id, ende,
        );
        return Response.json({ ok: true, ende });
      }),
    },

    // ---- Dashboard (Admin): aktueller Präsenz-Status aller Mitarbeiter ----
    "/api/status": nurAdmin(async () => {
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
    "/api/report": nurAdmin(async (req) => {
      const q = new URL(req.url).searchParams;
      const from = Number(q.get("from") ?? 0);
      const to = Number(q.get("to") ?? Date.now());
      const now = Date.now();
      const rows = await Promise.all(
        (await listAll()).map(async (m) => {
          const evs = await alle<Ev>(
            "SELECT type, ts FROM events WHERE mitarbeiter_id = ? ORDER BY ts ASC", m.id,
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
    "/api/karte": nurAdmin(async () => {
      const gruppen = await alle("SELECT * FROM karte_gruppen ORDER BY sortierung, titel");
      const positionen = await alle("SELECT * FROM karte_positionen ORDER BY sortierung, name");
      return Response.json({ kapitel: KAPITEL_META, gruppen, positionen });
    }),

    "/api/karte/gruppen": {
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = karteGruppeFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const max = await eins<{ m: number | null }>("SELECT MAX(sortierung) AS m FROM karte_gruppen");
        const zeile = { id: randomUUID(), ...daten, sortierung: Number(max?.m ?? 0) + 1 };
        await lauf(
          "INSERT INTO karte_gruppen (id, kapitel, titel, spalten, fussnote, sortierung) VALUES (?, ?, ?, ?, ?, ?)",
          zeile.id, zeile.kapitel, zeile.titel, zeile.spalten, zeile.fussnote, zeile.sortierung,
        );
        karteInvalidieren();
        return Response.json(zeile, { status: 201 });
      }),
    },
    "/api/karte/gruppen/:id": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = karteGruppeFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const r = await lauf(
          "UPDATE karte_gruppen SET kapitel = ?, titel = ?, spalten = ?, fussnote = ? WHERE id = ?",
          daten.kapitel, daten.titel, daten.spalten, daten.fussnote, req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        karteInvalidieren();
        return Response.json({ id: req.params.id, ...daten });
      }),
      DELETE: nurAdmin(async (req) => {
        const r = await lauf("DELETE FROM karte_gruppen WHERE id = ?", req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        karteInvalidieren();
        return new Response(null, { status: 204 });
      }),
    },

    "/api/karte/positionen": {
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = await kartePositionFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const max = await eins<{ m: number | null }>(
          "SELECT MAX(sortierung) AS m FROM karte_positionen WHERE gruppe_id = ?", daten.gruppe_id,
        );
        const zeile = { id: randomUUID(), ...daten, sortierung: Number(max?.m ?? 0) + 1 };
        await lauf(
          "INSERT INTO karte_positionen (id, gruppe_id, name, text, option, tags, stern, preise, sortierung, aktiv) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          zeile.id, zeile.gruppe_id, zeile.name, zeile.text, zeile.option, zeile.tags,
          zeile.stern, zeile.preise, zeile.sortierung, zeile.aktiv,
        );
        karteInvalidieren();
        return Response.json(zeile, { status: 201 });
      }),
    },
    "/api/karte/positionen/:id": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const daten = await kartePositionFelder(b);
        if ("fehler" in daten) return Response.json(daten, { status: 400 });
        const r = await lauf(
          "UPDATE karte_positionen SET gruppe_id = ?, name = ?, text = ?, option = ?, tags = ?, stern = ?, preise = ?, aktiv = ? WHERE id = ?",
          daten.gruppe_id, daten.name, daten.text, daten.option, daten.tags,
          daten.stern, daten.preise, daten.aktiv, req.params.id,
        );
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        karteInvalidieren();
        return Response.json({ id: req.params.id, ...daten });
      }),
      DELETE: nurAdmin(async (req) => {
        const r = await lauf("DELETE FROM karte_positionen WHERE id = ?", req.params.id);
        if (r.changes === 0) return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        karteInvalidieren();
        return new Response(null, { status: 204 });
      }),
    },

    // Reihenfolge der Positionen (innerhalb einer Gruppe) bzw. der Gruppen per Drag & Drop.
    "/api/karte/positionen-reihenfolge": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) {
          await lauf("UPDATE karte_positionen SET sortierung = ? WHERE id = ?", i + 1, ids[i]);
        }
        karteInvalidieren();
        return Response.json({ ok: true });
      }),
    },
    "/api/karte/gruppen-reihenfolge": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const ids = Array.isArray(b?.ids) ? b.ids.filter((x: unknown) => typeof x === "string") : [];
        if (!ids.length) return Response.json({ fehler: "ids fehlen" }, { status: 400 });
        for (let i = 0; i < ids.length; i++) {
          await lauf("UPDATE karte_gruppen SET sortierung = ? WHERE id = ?", i + 1, ids[i]);
        }
        karteInvalidieren();
        return Response.json({ ok: true });
      }),
    },

    // ---- Rezepte (Komponenten): lesen fürs Team, pflegen nur Admin ----
    "/api/rezepte": {
      GET: nurTeam(async () => Response.json(await kueche.rezepteLaden())),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await kueche.rezeptSpeichern(rezeptBody(b));
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        return Response.json({ id: erg.wert }, { status: 201 });
      }),
    },
    "/api/rezepte/:id": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await kueche.rezeptSpeichern(rezeptBody(b), req.params.id);
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        return Response.json({ id: erg.wert });
      }),
      DELETE: nurAdmin(async (req) => {
        const erg = await kueche.rezeptLoeschen(req.params.id);
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 409 });
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Gerichte (Karte): Verfügbarkeit fürs Team, Pflege nur Admin ----
    "/api/gerichte": {
      GET: nurTeam(async () => Response.json(await kueche.gerichteLaden())),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await kueche.gerichtSpeichern(gerichtBody(b));
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        return Response.json({ id: erg.wert }, { status: 201 });
      }),
    },
    "/api/gerichte/:id": {
      PUT: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const erg = await kueche.gerichtSpeichern(gerichtBody(b), req.params.id);
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        return Response.json({ id: erg.wert });
      }),
      DELETE: nurAdmin(async (req) => {
        if (!(await kueche.gerichtLoeschen(req.params.id))) {
          return Response.json({ fehler: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      }),
    },

    // ---- Verkauf/Zubereitung buchen: zieht Zutaten vom Inventar ab ----
    "/api/gerichte/:id/kochen": {
      POST: nurTeam(async (req) => {
        const b = await req.json().catch(() => ({}));
        const erg = await kueche.kochen(req.params.id, Number(b?.portionen ?? 1));
        if (!erg.ok) return Response.json({ fehler: erg.fehler }, { status: 400 });
        return Response.json({ ok: true, abgebucht: erg.wert });
      }),
    },

    // ---- Rollen-Katalog: lesen fürs Team, pflegen nur Admin ----
    "/api/rollen": {
      GET: nurTeam(async () =>
        Response.json(
          (await alle<{ name: string }>("SELECT name FROM rollen ORDER BY name")).map((r) => r.name),
        ),
      ),
      POST: nurAdmin(async (req) => {
        const b = await req.json().catch(() => null);
        const name = text(b?.name, 40);
        if (!name) return Response.json({ fehler: "Bitte einen Rollennamen angeben." }, { status: 400 });
        if (await eins("SELECT 1 AS x FROM rollen WHERE lower(name) = lower(?)", name)) {
          return Response.json({ fehler: "Diese Rolle gibt es schon." }, { status: 409 });
        }
        await lauf("INSERT INTO rollen (name) VALUES (?)", name);
        return Response.json({ name }, { status: 201 });
      }),
    },
    "/api/rollen/:name": {
      DELETE: nurAdmin(async (req) => {
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

    // ---- Team-CRUD (Admin) ----
    "/api/mitarbeiter": {
      GET: nurAdmin(async () => Response.json(await listAll())),
      POST: nurAdmin(async (req) => {
        const { name, role, pin: rawPin } = await req.json();
        if (!name?.trim() || !role?.trim()) {
          return Response.json({ error: "Name und Rolle sind Pflicht" }, { status: 400 });
        }
        if (!(await rolleImKatalog(role.trim()))) {
          return Response.json({ error: "Unbekannte Rolle – bitte aus dem Katalog wählen" }, { status: 400 });
        }
        let pin = (rawPin ?? "").toString().trim();
        if (pin === "") pin = await allocatePin();
        else if (!isValidPin(pin)) {
          return Response.json({ error: "PIN muss 4 Ziffern sein (0009 reserviert)" }, { status: 400 });
        }
        if (await byPin(pin)) return Response.json({ error: "PIN bereits vergeben" }, { status: 409 });
        const row: Mitarbeiter = { id: randomUUID(), name: name.trim(), role: role.trim(), pin, admin: 0 };
        await lauf(
          "INSERT INTO mitarbeiter (id, name, role, pin, admin) VALUES (?, ?, ?, ?, 0)",
          row.id, row.name, row.role, row.pin,
        );
        return Response.json(row, { status: 201 });
      }),
    },

    "/api/mitarbeiter/:id": {
      PUT: nurAdmin(async (req) => {
        const { name, role, pin } = await req.json();
        const { id } = req.params;
        if (!name?.trim() || !role?.trim()) {
          return Response.json({ error: "Name und Rolle sind Pflicht" }, { status: 400 });
        }
        if (!(await rolleImKatalog(role.trim()))) {
          return Response.json({ error: "Unbekannte Rolle – bitte aus dem Katalog wählen" }, { status: 400 });
        }
        const p = (pin ?? "").toString().trim();
        if (!isValidPin(p)) {
          return Response.json({ error: "PIN muss 4 Ziffern sein (0009 reserviert)" }, { status: 400 });
        }
        const clash = await byPin(p);
        if (clash && clash.id !== id) {
          return Response.json({ error: "PIN bereits vergeben" }, { status: 409 });
        }
        const res = await lauf(
          "UPDATE mitarbeiter SET name = ?, role = ?, pin = ? WHERE id = ?",
          name.trim(), role.trim(), p, id,
        );
        if (res.changes === 0) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        return Response.json({ id, name: name.trim(), role: role.trim(), pin: p });
      }),
      DELETE: nurAdmin(async (req) => {
        const res = await lauf("DELETE FROM mitarbeiter WHERE id = ?", req.params.id);
        if (res.changes === 0) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      }),
    },
  },

  fetch: (req) =>
    new URL(req.url).pathname.startsWith("/api/")
      ? Response.json({ fehler: "nicht gefunden" }, { status: 404 })
      : html(nichtGefundenPage, 404),
});

console.log(`Läuft auf http://localhost:${server.port}`);
