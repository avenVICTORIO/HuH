// Flow „Zeiten eintragen“ – aus der Brille einer Mitarbeiterin:
//   „Trag mir bitte gestern 16:30 bis 23:00 ein.“
//   -> verstehen (KI) -> prüfen (JS) -> bestätigen (JS, Rückfrage) -> eintragen (JS)
// Alles, was dieser Flow braucht, liegt in diesem Ordner.
import type { Flow } from "../typen";
import verstehen from "./actors/verstehen";
import pruefen from "./actors/pruefen";
import bestaetigen from "./actors/bestaetigen";
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
  // Schneller Pfad; alles andere entscheidet der KI-Router anhand von Beschreibung und Beispielen.
  ausloeser: [
    /\btrag\w*\b.{0,80}\bein\b/i,                       // „Trag mir … ein“
    /\b(ein|nach)(trag|tragen|trägst|buchen)\b/i,       // eintragen, nachtragen, nachbuchen
    /\b(zeit(en)?|stunden|schicht|arbeitszeit)\b.{0,40}\b(nachtrag|eintrag|nachbuch)/i,
    /\bvergessen\b.{0,40}\b(stempel|ausstemp|einstemp)/i,
    /\bstempeln\b.{0,40}\bvergessen\b/i,
  ],
  start: "verstehen",
  actors: [verstehen, pruefen, bestaetigen, eintragen],
  kanten: [
    { von: "verstehen", nach: "verstehen", label: "Rückfrage" },
    { von: "verstehen", nach: "pruefen" },
    { von: "pruefen", nach: "verstehen", label: "unplausibel" },
    { von: "pruefen", nach: "bestaetigen" },
    { von: "bestaetigen", nach: "eintragen", label: "ja" },
    { von: "bestaetigen", nach: "verstehen", label: "ändern" },
  ],
};

export default flow;
