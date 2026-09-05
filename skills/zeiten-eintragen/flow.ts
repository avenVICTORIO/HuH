// Flow „Zeiten eintragen“ – aus der Brille einer Mitarbeiterin:
//   „Trag mir bitte gestern 16:30 bis 23:00 ein.“
//   -> verstehen (KI) -> prüfen (JS) -> [Baustein „Bestätigung“ (KI)] -> entscheiden (JS) -> eintragen (JS)
// Gestartet wird er vom Skill-Router (KI) anhand von Beschreibung und Beispielen.
// Die Rückfrage ist kein eigener Actor mehr, sondern der wiederverwendbare Flow
// „bestaetigung“, den „prüfen“ mit `rufe` aufruft; die Antwort kommt bei „entscheiden“ an.
import type { Flow } from "../typen";
import verstehen from "./actors/verstehen";
import pruefen from "./actors/pruefen";
import entscheiden from "./actors/entscheiden";
import eintragen from "./actors/eintragen";

const flow: Flow = {
  id: "zeiten-eintragen",
  name: "Zeiten eintragen",
  beschreibung:
    "Eine vergessene oder nicht gestempelte Arbeitszeit direkt im Chat nachtragen: Datum und Uhrzeiten nennen, Rückfrage bestätigen – fertig.",
  beispiele: [
    "Trag mir bitte gestern 16:30 bis 23:00 ein.",
    "Ich hab vergessen zu stempeln – Montag 15 bis 22:30 Uhr.",
    "Zeit nachtragen: heute 12:00–15:00",
  ],
  start: "verstehen",
  actors: [verstehen, pruefen, entscheiden, eintragen],
  verweise: [{ flow: "bestaetigung", pos: { x: 640, y: 120 } }],
  kanten: [
    { von: "verstehen", nach: "verstehen", label: "Rückfrage" },
    { von: "verstehen", nach: "pruefen" },
    { von: "pruefen", nach: "verstehen", label: "unplausibel" },
    { von: "pruefen", nach: "flow:bestaetigung", label: "ruft" },
    { von: "flow:bestaetigung", nach: "entscheiden", label: "Rückkehr" },
    { von: "entscheiden", nach: "eintragen", label: "ja" },
    { von: "entscheiden", nach: "verstehen", label: "korrigieren" },
  ],
};

export default flow;
