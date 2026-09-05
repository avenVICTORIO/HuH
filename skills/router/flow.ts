// System-Flow „Skill-Router“: bekommt jede Chat-Nachricht, die nicht die Antwort
// auf eine offene Rückfrage ist, und entscheidet per KI, ob und welcher Flow
// gestartet wird. Keine Regex, keine Schlüsselwörter – nur die Beschreibungen
// und Beispiele der Flows.
import type { Flow } from "../typen";
import erkennen from "./actors/erkennen";

const flow: Flow = {
  id: "router",
  name: "Skill-Router",
  beschreibung:
    "Liest jede Chat-Nachricht mit und entscheidet, ob sie einen Skill startet. Versteht Absichten aus den Beschreibungen und Beispielen der Flows – ohne Schlüsselwörter.",
  beispiele: [],
  system: true,
  start: "erkennen",
  actors: [erkennen],
  kanten: [],
};

export default flow;
