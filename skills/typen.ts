// Skill-Flows: n8n-inspirierte Abläufe aus Actors. Jeder Flow ist ein eigener,
// in sich geschlossener Ordner (flow.ts + actors/*). Jeder Actor ist eine
// Black Box mit einer Inbox: er bekommt eine Post, arbeitet und sagt dem
// Runtime, wohin es weitergeht – zum nächsten Actor, mit einer Rückfrage an
// die Person (Lauf pausiert), oder fertig.
import type { Mitarbeiter } from "../db";

/** Was in der Inbox eines Actors landet. */
export type Post =
  | { art: "start"; text: string }            // die auslösende Chat-Nachricht (oder Text des Aufrufers)
  | { art: "weiter"; von: string }            // Übergabe vom vorherigen Actor
  | { art: "antwort"; text: string }          // Antwort der Person auf eine Rückfrage
  | { art: "rueckkehr"; flow: string; status: LaufStatus; zustand: Zustand }; // ein gerufener Sub-Flow ist fertig

/** Gemeinsamer Zustand eines Laufs – jeder Actor darf ergänzen/überschreiben. */
export type Zustand = Record<string, unknown>;

/** Was ein Actor zurückgibt. Leerer Text bei fertig/abbruch = still beenden (nichts in den Chat). */
export type Ergebnis =
  | { weiter: string; sag?: string; zustand?: Zustand }   // Post an die Inbox des nächsten Actors
  | { frage: string; zustand?: Zustand }                  // Person fragen; Antwort landet wieder hier
  | { starte: string; text?: string; zustand?: Zustand }  // an einen anderen Flow übergeben (ohne Rückkehr)
  | { rufe: string; dann: string; text?: string; eingabe?: Zustand; zustand?: Zustand } // Sub-Flow rufen; Ergebnis kommt als Post „rueckkehr“ in Actor `dann`
  | { fertig: string; zustand?: Zustand }                 // Lauf erfolgreich beendet
  | { abbruch: string; zustand?: Zustand };               // Lauf beendet ohne Ergebnis

/** Öffentliche Beschreibung eines Flows – so sieht der Router die anderen Flows. */
export type FlowInfo = { id: string; name: string; beschreibung: string; beispiele: string[] };

/** Was der Runtime jedem Actor mitgibt. */
export type Kontext = {
  lauf: { id: string; flow: string };
  person: Mitarbeiter;
  raum: string;
  /** Heute als YYYY-MM-DD (lokal). */
  heute: string;
  zustand: Zustand;
  /** Alle startbaren Flows (ohne System-Flows) – für Router-artige Actors. */
  flows: FlowInfo[];
  /** KI-Zugang für „smarte“ Actors – JSON-Antwort bzw. freier Text. */
  ki: {
    json<T = Record<string, unknown>>(system: string, user: string): Promise<T>;
    text(system: string, user: string): Promise<string>;
    aktiv: boolean;
  };
};

export type ActorArt = "js" | "ki";

export type Actor = {
  id: string;
  name: string;
  art: ActorArt;
  beschreibung: string;
  /** Position im Canvas (Flow-Ordner bestimmt sein eigenes Layout). */
  pos: { x: number; y: number };
  handle(post: Post, k: Kontext): Promise<Ergebnis>;
};

export type Kante = { von: string; nach: string; label?: string };

export type Flow = {
  id: string;
  name: string;
  beschreibung: string;
  /** Beispielsätze, mit denen man den Flow im Chat startet – der Router lernt daraus, was gemeint ist. */
  beispiele: string[];
  /** System-Flows (z. B. der Router) laufen für jede Nachricht und werden nicht manuell gestartet. */
  system?: boolean;
  /** Bausteine (Leaf-Skills) werden nur von anderen Flows gerufen, nie direkt aus dem Chat. */
  baustein?: boolean;
  /** Actor, der die Start-Post bekommt. */
  start: string;
  actors: Actor[];
  /** Andere Flows, die dieser Flow ruft – erscheinen im Canvas als Knoten „flow:<id>“. */
  verweise?: { flow: string; pos: { x: number; y: number } }[];
  /** Kanten zwischen Actors; Ziel/Quelle darf auch „flow:<id>“ (Verweis) sein. */
  kanten: Kante[];
};

/** kind = wartet auf einen gerufenen Sub-Flow. */
export type LaufStatus = "laeuft" | "wartet" | "kind" | "fertig" | "abgebrochen" | "fehler";
