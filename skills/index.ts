// Runtime für Skill-Flows: Registry, Chat-Trigger, Inbox-Zustellung, Persistenz.
//
// Ablauf: Eine Chat-Nachricht kommt an -> verarbeite():
//   1. Wartet in diesem Raum ein Lauf dieser Person auf eine Antwort? Dann ist
//      die Nachricht die Antwort und geht in die Inbox des wartenden Actors.
//   2. Sonst: Passt ein Flow-Auslöser? Dann neuer Lauf, Start-Post an den Start-Actor.
//   3. Sonst: nicht zuständig (die normale KI antwortet).
// Der Flow spricht im Chat als KI-Assistenz (avenVictorio), mit Flow-Präfix.
import { randomUUID } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "../db";
import * as chat from "../chat";
import * as live from "../live";
import * as ki from "../ki";
import { alsDatum } from "../reservierungen";
import type { Actor, Ergebnis, Flow, Kontext, LaufStatus, Post, Zustand } from "./typen";

import zeitenEintragen from "./zeiten-eintragen/flow";

/** Alle Flows – jeder Ordner registriert sich hier. */
export const FLOWS: Flow[] = [zeitenEintragen];

const flowVon = (id: string) => FLOWS.find((f) => f.id === id);
const actorVon = (f: Flow, id: string) => f.actors.find((a) => a.id === id);
const MAX_HOPS = 20;

export type Lauf = {
  id: string; flow: string; mitarbeiter_id: string; raum: string; status: LaufStatus;
  aktueller_actor: string | null; zustand: string; erstellt: number; aktualisiert: number;
};

// ------------------------------------------------------------------ Chat-Trigger

/** Gibt true zurück, wenn ein Flow die Nachricht übernommen hat. */
export async function verarbeite(person: Mitarbeiter, raum: string, text: string): Promise<boolean> {
  const wartend = await eins<Lauf>(
    "SELECT * FROM skill_laeufe WHERE mitarbeiter_id = ? AND raum = ? AND status = 'wartet' ORDER BY aktualisiert DESC LIMIT 1",
    person.id, raum,
  );
  if (wartend) {
    if (/^(abbruch|abbrechen|stopp?|cancel|egal|lass(en)? (gut|sein)|vergiss es)\b/i.test(text.trim())) {
      await beenden(wartend, "abgebrochen", "Alles klar, abgebrochen.");
      return true;
    }
    void zustelle(wartend.id, wartend.aktueller_actor!, { art: "antwort", text });
    return true;
  }
  const flow = await erkenneFlow(text);
  if (!flow) return false;
  await starte(flow, person, raum, text);
  return true;
}

/** Welcher Flow passt zur Nachricht? Erst Regex (schnell), dann KI-Router über die Flow-Beschreibungen. */
async function erkenneFlow(text: string): Promise<Flow | undefined> {
  const direkt = FLOWS.find((f) => f.ausloeser.some((re) => re.test(text)));
  if (direkt || !ki.aktiv || text.trim().length < 8) return direkt;
  const katalog = FLOWS.map((f) =>
    `- ${f.id}: ${f.name} – ${f.beschreibung} Beispiele: ${f.beispiele.map((b) => `„${b}“`).join(" / ")}`).join("\n");
  try {
    const r = await ki.kiJson<{ flow: string | null }>(
      `Du bist der Router eines Restaurant-Team-Chats. Entscheide, ob die Nachricht einen dieser Abläufe starten soll:\n${katalog}\n` +
      `Antworte NUR mit JSON {"flow": "<id>" | null}. null bei normaler Unterhaltung, Fragen oder Smalltalk – nur bei klarer Absicht einen Ablauf wählen.`,
      text,
    );
    return FLOWS.find((f) => f.id === r.flow);
  } catch (e) {
    console.error("Skill-Router:", e);
    return undefined;
  }
}

/** Neuen Lauf anlegen (auch manuell aus der Skills-Seite). */
export async function starte(flow: Flow, person: Mitarbeiter, raum: string, text: string): Promise<string> {
  const id = randomUUID(), jetzt = Date.now();
  await lauf(
    "INSERT INTO skill_laeufe (id, flow, mitarbeiter_id, raum, status, aktueller_actor, zustand, erstellt, aktualisiert) VALUES (?, ?, ?, ?, 'laeuft', ?, '{}', ?, ?)",
    id, flow.id, person.id, raum, flow.start, jetzt, jetzt,
  );
  signal();
  void zustelle(id, flow.start, { art: "start", text });
  return id;
}

// ------------------------------------------------------------------ Zustellung

/** Post in die Inbox eines Actors legen und den Lauf so lange treiben, bis er wartet oder endet. */
async function zustelle(laufId: string, actorId: string, post: Post) {
  const l = await eins<Lauf>("SELECT * FROM skill_laeufe WHERE id = ?", laufId);
  if (!l) return;
  const flow = flowVon(l.flow);
  const person = await eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE id = ?", l.mitarbeiter_id);
  if (!flow || !person) { await beenden(l, "fehler", "Der Ablauf ist nicht mehr verfügbar."); return; }

  let zustand: Zustand = {};
  try { zustand = JSON.parse(l.zustand || "{}"); } catch {}
  let aktuell: Actor | undefined = actorVon(flow, actorId);
  let eingang: Post = post;
  await setze(l.id, "laeuft", actorId, zustand);

  for (let hop = 0; hop < MAX_HOPS && aktuell; hop++) {
    const k: Kontext = { lauf: { id: l.id, flow: flow.id }, person, raum: l.raum, heute: alsDatum(new Date()), zustand, ki: kiZugang() };
    const t0 = Date.now();
    let erg: Ergebnis;
    try {
      erg = await aktuell.handle(eingang, k);
    } catch (e) {
      await schritt(l.id, aktuell.id, "fehler", eingang, { fehler: String(e) }, Date.now() - t0);
      await beenden({ ...l, zustand: JSON.stringify(zustand) }, "fehler", `Da ist etwas schiefgelaufen (${aktuell.name}). Bitte versuch es später noch einmal.`);
      return;
    }
    if (erg.zustand) zustand = { ...zustand, ...erg.zustand };
    await schritt(l.id, aktuell.id, art(erg), eingang, erg, Date.now() - t0);

    if ("weiter" in erg) {
      if (erg.sag) await sage(l.raum, flow, erg.sag);
      const naechster = actorVon(flow, erg.weiter);
      if (!naechster) { await beenden(l, "fehler", `Actor „${erg.weiter}“ fehlt im Flow.`); return; }
      eingang = { art: "weiter", von: aktuell.id };
      aktuell = naechster;
      await setze(l.id, "laeuft", aktuell.id, zustand);
      continue;
    }
    if ("frage" in erg) {
      await setze(l.id, "wartet", aktuell.id, zustand);
      await sage(l.raum, flow, erg.frage);
      return;
    }
    if ("fertig" in erg) { await setze(l.id, "fertig", aktuell.id, zustand); await sage(l.raum, flow, erg.fertig); return; }
    if ("abbruch" in erg) { await setze(l.id, "abgebrochen", aktuell.id, zustand); await sage(l.raum, flow, erg.abbruch); return; }
  }
  await beenden(l, "fehler", "Der Ablauf hat sich verlaufen (zu viele Schritte).");
}

const art = (e: Ergebnis) => "weiter" in e ? "weiter" : "frage" in e ? "frage" : "fertig" in e ? "fertig" : "abbruch";

async function setze(id: string, status: LaufStatus, actor: string | null, zustand: Zustand) {
  await lauf("UPDATE skill_laeufe SET status = ?, aktueller_actor = ?, zustand = ?, aktualisiert = ? WHERE id = ?",
    status, actor, JSON.stringify(zustand), Date.now(), id);
  signal();
}

async function schritt(laufId: string, actor: string, art: string, eingabe: unknown, ausgabe: unknown, dauer: number) {
  await lauf(
    "INSERT INTO skill_schritte (id, lauf_id, actor, art, eingabe, ausgabe, dauer_ms, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    randomUUID(), laufId, actor, art, JSON.stringify(eingabe).slice(0, 4000), JSON.stringify(ausgabe).slice(0, 4000), dauer, Date.now(),
  );
}

async function beenden(l: Lauf, status: LaufStatus, text: string) {
  await lauf("UPDATE skill_laeufe SET status = ?, aktualisiert = ? WHERE id = ?", status, Date.now(), l.id);
  signal();
  const flow = flowVon(l.flow);
  if (flow) await sage(l.raum, flow, text);
}

/** Der Flow spricht im Chat – als KI-Assistenz, mit Flow-Präfix. */
async function sage(raum: string, flow: Flow, text: string) {
  await chat.kiNachricht(raum, `⚙️ ${flow.name}\n${text}`, randomUUID());
}

const signal = () => live.sende("alle", { typ: "skills" });

function kiZugang(): Kontext["ki"] {
  return {
    aktiv: ki.aktiv,
    json: (system, user) => ki.kiJson(system, user),
    text: (system, user) => ki.kiText(system, user),
  };
}

// ------------------------------------------------------------------ Für die Skills-Seite

export function katalog() {
  return FLOWS.map((f) => ({
    id: f.id, name: f.name, beschreibung: f.beschreibung, beispiele: f.beispiele, start: f.start,
    actors: f.actors.map((a) => ({ id: a.id, name: a.name, art: a.art, beschreibung: a.beschreibung, pos: a.pos })),
    kanten: f.kanten,
  }));
}

export async function laeufe(person: Mitarbeiter, alleSehen: boolean, limit = 30) {
  const rows = alleSehen
    ? await alle<Lauf & { person: string }>(
        `SELECT l.*, COALESCE(NULLIF(TRIM(CONCAT(m.vorname, ' ', COALESCE(m.nachname, ''))), ''), m.name) AS person
           FROM skill_laeufe l LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiter_id ORDER BY l.aktualisiert DESC LIMIT ?`, limit)
    : await alle<Lauf & { person: string }>(
        `SELECT l.*, ? AS person FROM skill_laeufe l WHERE l.mitarbeiter_id = ? ORDER BY l.aktualisiert DESC LIMIT ?`,
        person.vorname ?? person.name, person.id, limit);
  const ids = rows.map((r) => r.id);
  const schritte = ids.length
    ? await alle<{ lauf_id: string; actor: string; art: string; ausgabe: string; dauer_ms: number; ts: number }>(
        `SELECT lauf_id, actor, art, ausgabe, dauer_ms, ts FROM skill_schritte WHERE lauf_id IN (${ids.map(() => "?").join(",")}) ORDER BY ts ASC`, ...ids)
    : [];
  return rows.map((r) => ({
    ...r, erstellt: Number(r.erstellt), aktualisiert: Number(r.aktualisiert),
    zustand: (() => { try { return JSON.parse(r.zustand); } catch { return {}; } })(),
    schritte: schritte.filter((s) => s.lauf_id === r.id).map((s) => ({
      actor: s.actor, art: s.art, dauer_ms: Number(s.dauer_ms), ts: Number(s.ts),
      ausgabe: (() => { try { return JSON.parse(s.ausgabe); } catch { return s.ausgabe; } })(),
    })),
  }));
}

export async function abbrechen(id: string, person: Mitarbeiter, darfAlle: boolean): Promise<boolean> {
  const l = await eins<Lauf>("SELECT * FROM skill_laeufe WHERE id = ?", id);
  if (!l || (l.mitarbeiter_id !== person.id && !darfAlle)) return false;
  if (l.status === "laeuft" || l.status === "wartet") await beenden(l, "abgebrochen", "Abgebrochen.");
  return true;
}
