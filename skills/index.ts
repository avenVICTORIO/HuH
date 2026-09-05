// Runtime für Skill-Flows: Registry, Chat-Eingang, Inbox-Zustellung, Komposition, Persistenz.
//
// Chat-Nachricht kommt an -> verarbeite():
//   1. Wartet in diesem Raum ein Lauf dieser Person auf eine Antwort? -> Antwort in dessen Inbox.
//   2. Sonst bekommt der System-Flow „router“ die Nachricht. Sein KI-Actor entscheidet,
//      ob er an einen Flow übergibt (Ergebnis `starte`). Übergibt er nicht, antwortet die KI normal.
// Komposition: Ein Actor kann mit `rufe` einen anderen Flow als Sub-Flow starten; der
// Eltern-Lauf wartet (Status „kind“), und wenn der Kind-Lauf endet, landet sein Ergebnis
// als Post „rueckkehr“ im benannten Actor des Eltern-Laufs. Beliebig tief schachtelbar.
import { randomUUID } from "node:crypto";
import { alle, eins, lauf, type Mitarbeiter } from "../db";
import * as chat from "../chat";
import * as live from "../live";
import * as ki from "../ki";
import { alsDatum } from "../reservierungen";
import type { Actor, Ergebnis, Flow, FlowInfo, Kontext, LaufStatus, Post, Zustand } from "./typen";

import router from "./router/flow";
import bestaetigung from "./bestaetigung/flow";
import zeitenEintragen from "./zeiten-eintragen/flow";

/** Alle Flows – jeder Ordner registriert sich hier. */
export const FLOWS: Flow[] = [router, bestaetigung, zeitenEintragen];
export const ROUTER_ID = router.id;

const flowVon = (id: string) => FLOWS.find((f) => f.id === id);
const actorVon = (f: Flow, id: string) => f.actors.find((a) => a.id === id);
const MAX_HOPS = 20;
/** Flows, die der Router starten darf (keine System-Flows, keine Bausteine). */
const startbare = (): FlowInfo[] =>
  FLOWS.filter((f) => !f.system && !f.baustein).map(({ id, name, beschreibung, beispiele }) => ({ id, name, beschreibung, beispiele }));

export type Lauf = {
  id: string; flow: string; mitarbeiter_id: string; raum: string; status: LaufStatus;
  aktueller_actor: string | null; zustand: string; erstellt: number; aktualisiert: number;
  eltern_id: string | null; rueckkehr_actor: string | null;
};

type Ausgang = { status: LaufStatus; uebergeben?: string };

// ------------------------------------------------------------------ Chat-Eingang

/** true, wenn ein Flow die Nachricht übernommen hat (Antwort auf Rückfrage oder Start). */
export async function verarbeite(person: Mitarbeiter, raum: string, text: string): Promise<boolean> {
  const wartend = await eins<Lauf>(
    "SELECT * FROM skill_laeufe WHERE mitarbeiter_id = ? AND raum = ? AND status = 'wartet' ORDER BY aktualisiert DESC LIMIT 1",
    person.id, raum,
  );
  if (wartend) {
    void zustelle(wartend.id, wartend.aktueller_actor!, { art: "antwort", text });
    return true;
  }
  // Der Router ist selbst ein Flow: sein Lauf wird abgewartet, damit klar ist, ob übergeben wurde.
  const r = flowVon(ROUTER_ID);
  if (!r) return false;
  const id = await neuerLauf(r, person, raum, {});
  const ausgang = await zustelle(id, r.start, { art: "start", text });
  return !!ausgang?.uebergeben;
}

/** Lauf manuell starten (Skills-Seite). Läuft im Hintergrund. */
export async function starte(flow: Flow, person: Mitarbeiter, raum: string, text: string): Promise<string> {
  const id = await neuerLauf(flow, person, raum, {});
  void zustelle(id, flow.start, { art: "start", text });
  return id;
}

async function neuerLauf(flow: Flow, person: Mitarbeiter, raum: string, zustand: Zustand, eltern?: { id: string; actor: string }): Promise<string> {
  const id = randomUUID(), jetzt = Date.now();
  await lauf(
    `INSERT INTO skill_laeufe (id, flow, mitarbeiter_id, raum, status, aktueller_actor, zustand, erstellt, aktualisiert, eltern_id, rueckkehr_actor)
     VALUES (?, ?, ?, ?, 'laeuft', ?, ?, ?, ?, ?, ?)`,
    id, flow.id, person.id, raum, flow.start, JSON.stringify(zustand), jetzt, jetzt, eltern?.id ?? null, eltern?.actor ?? null,
  );
  signal();
  return id;
}

// ------------------------------------------------------------------ Zustellung

/** Post in die Inbox eines Actors legen und den Lauf treiben, bis er wartet, ruft oder endet. */
async function zustelle(laufId: string, actorId: string, post: Post): Promise<Ausgang | undefined> {
  const l = await eins<Lauf>("SELECT * FROM skill_laeufe WHERE id = ?", laufId);
  if (!l) return;
  const flow = flowVon(l.flow);
  const person = await eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE id = ?", l.mitarbeiter_id);
  if (!flow || !person) return abschluss(l, "fehler", "Der Ablauf ist nicht mehr verfügbar.", {});

  let zustand: Zustand = {};
  try { zustand = JSON.parse(l.zustand || "{}"); } catch {}
  let aktuell: Actor | undefined = actorVon(flow, actorId);
  let eingang: Post = post;
  await setze(l.id, "laeuft", actorId, zustand);

  for (let hop = 0; hop < MAX_HOPS && aktuell; hop++) {
    const k: Kontext = {
      lauf: { id: l.id, flow: flow.id }, person, raum: l.raum, heute: alsDatum(new Date()),
      zustand, flows: startbare(), ki: kiZugang(),
    };
    const t0 = Date.now();
    let erg: Ergebnis;
    try {
      erg = await aktuell.handle(eingang, k);
    } catch (e) {
      await schritt(l.id, aktuell.id, "fehler", eingang, { fehler: String(e) }, Date.now() - t0);
      return abschluss(l, "fehler", flow.system ? "" : `Da ist etwas schiefgelaufen (${aktuell.name}). Bitte versuch es später noch einmal.`, zustand);
    }
    if (erg.zustand) zustand = { ...zustand, ...erg.zustand };
    await schritt(l.id, aktuell.id, art(erg), eingang, erg, Date.now() - t0);

    if ("weiter" in erg) {
      if (erg.sag) await sage(l.raum, flow, erg.sag);
      const naechster = actorVon(flow, erg.weiter);
      if (!naechster) return abschluss(l, "fehler", `Actor „${erg.weiter}“ fehlt im Flow.`, zustand);
      eingang = { art: "weiter", von: aktuell.id };
      aktuell = naechster;
      await setze(l.id, "laeuft", aktuell.id, zustand);
      continue;
    }
    if ("frage" in erg) {
      await setze(l.id, "wartet", aktuell.id, zustand);
      await sage(l.raum, flow, erg.frage);
      return { status: "wartet" };
    }
    if ("starte" in erg) {
      // Übergabe ohne Rückkehr: dieser Lauf endet still, der Ziel-Flow bekommt die Nachricht als Start.
      const ziel = flowVon(erg.starte);
      if (!ziel) return abschluss(l, "fehler", `Flow „${erg.starte}“ nicht gefunden.`, zustand);
      await setze(l.id, "fertig", aktuell.id, zustand);
      const kindId = await neuerLauf(ziel, person, l.raum, {});
      void zustelle(kindId, ziel.start, { art: "start", text: erg.text ?? "" });
      return { status: "fertig", uebergeben: ziel.id };
    }
    if ("rufe" in erg) {
      // Sub-Flow mit Rückkehr: Eltern-Lauf wartet (kind), Kind-Lauf startet mit eigener Zustands-Eingabe.
      const ziel = flowVon(erg.rufe);
      if (!ziel) return abschluss(l, "fehler", `Flow „${erg.rufe}“ nicht gefunden.`, zustand);
      if (!actorVon(flow, erg.dann)) return abschluss(l, "fehler", `Rückkehr-Actor „${erg.dann}“ fehlt im Flow.`, zustand);
      await setze(l.id, "kind", erg.dann, zustand);
      const kindId = await neuerLauf(ziel, person, l.raum, erg.eingabe ?? {}, { id: l.id, actor: erg.dann });
      void zustelle(kindId, ziel.start, { art: "start", text: erg.text ?? "" });
      return { status: "kind" };
    }
    if ("fertig" in erg) return abschluss(l, "fertig", erg.fertig, zustand);
    if ("abbruch" in erg) return abschluss(l, "abgebrochen", erg.abbruch, zustand);
  }
  return abschluss(l, "fehler", "Der Ablauf hat sich verlaufen (zu viele Schritte).", zustand);
}

/** Lauf beenden, ggf. Text sagen und – falls es ein Kind ist – an den Eltern-Lauf zurückkehren. */
async function abschluss(l: Lauf, status: LaufStatus, text: string, zustand: Zustand): Promise<Ausgang> {
  await setze(l.id, status, l.aktueller_actor, zustand);
  const flow = flowVon(l.flow);
  if (text && flow) await sage(l.raum, flow, text);
  if (l.eltern_id && l.rueckkehr_actor) {
    void zustelle(l.eltern_id, l.rueckkehr_actor, { art: "rueckkehr", flow: l.flow, status, zustand });
  }
  return { status };
}

const art = (e: Ergebnis) =>
  "weiter" in e ? "weiter" : "frage" in e ? "frage" : "starte" in e ? "starte" : "rufe" in e ? "rufe" : "fertig" in e ? "fertig" : "abbruch";

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

/** Der Flow spricht im Chat – als KI-Assistenz, mit Flow-Präfix (System-Flows und Bausteine ohne Präfix). */
async function sage(raum: string, flow: Flow, text: string) {
  const praefix = flow.system || flow.baustein ? "" : `⚙️ ${flow.name}\n`;
  await chat.kiNachricht(raum, praefix + text, randomUUID());
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
    system: !!f.system, baustein: !!f.baustein,
    actors: f.actors.map((a) => ({ id: a.id, name: a.name, art: a.art, beschreibung: a.beschreibung, pos: a.pos })),
    verweise: (f.verweise ?? []).map((v) => ({ ...v, name: flowVon(v.flow)?.name ?? v.flow })),
    kanten: f.kanten,
  }));
}

export async function laeufe(person: Mitarbeiter, alleSehen: boolean, flowId: string | null, limit = 40) {
  const bed: string[] = [], param: unknown[] = [];
  if (!alleSehen) { bed.push("l.mitarbeiter_id = ?"); param.push(person.id); }
  if (flowId) { bed.push("l.flow = ?"); param.push(flowId); }
  const where = bed.length ? "WHERE " + bed.join(" AND ") : "";
  const rows = await alle<Lauf & { person: string }>(
    `SELECT l.*, COALESCE(NULLIF(TRIM(CONCAT(m.vorname, ' ', COALESCE(m.nachname, ''))), ''), m.name) AS person
       FROM skill_laeufe l LEFT JOIN mitarbeiter m ON m.id = l.mitarbeiter_id ${where}
      ORDER BY l.aktualisiert DESC LIMIT ?`, ...param, limit);
  const ids = rows.map((r) => r.id);
  const schritte = ids.length
    ? await alle<{ lauf_id: string; actor: string; art: string; ausgabe: string; dauer_ms: number; ts: number }>(
        `SELECT lauf_id, actor, art, ausgabe, dauer_ms, ts FROM skill_schritte WHERE lauf_id IN (${ids.map(() => "?").join(",")}) ORDER BY ts ASC`, ...ids)
    : [];
  const parse = (s: string) => { try { return JSON.parse(s); } catch { return s; } };
  return rows.map((r) => ({
    ...r, erstellt: Number(r.erstellt), aktualisiert: Number(r.aktualisiert), zustand: parse(r.zustand || "{}"),
    schritte: schritte.filter((s) => s.lauf_id === r.id).map((s) => ({
      actor: s.actor, art: s.art, dauer_ms: Number(s.dauer_ms), ts: Number(s.ts), ausgabe: parse(s.ausgabe),
    })),
  }));
}

/** Lauf abbrechen – Kinder mit; ein abgebrochenes Kind meldet sich beim Eltern-Lauf zurück. */
export async function abbrechen(id: string, person: Mitarbeiter, darfAlle: boolean): Promise<boolean> {
  const l = await eins<Lauf>("SELECT * FROM skill_laeufe WHERE id = ?", id);
  if (!l || (l.mitarbeiter_id !== person.id && !darfAlle)) return false;
  const kinder = await alle<Lauf>("SELECT * FROM skill_laeufe WHERE eltern_id = ? AND status IN ('laeuft','wartet','kind')", id);
  for (const k of kinder) await lauf("UPDATE skill_laeufe SET status = 'abgebrochen', aktualisiert = ? WHERE id = ?", Date.now(), k.id);
  if (l.status === "laeuft" || l.status === "wartet" || l.status === "kind") {
    let zustand: Zustand = {}; try { zustand = JSON.parse(l.zustand || "{}"); } catch {}
    await abschluss(l, "abgebrochen", "Abgebrochen.", zustand);
  }
  return true;
}
