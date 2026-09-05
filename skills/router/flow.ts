// System flow "Skill-Router": receives every chat message that is not an answer to
// a pending question and decides – by AI, from the flows' descriptions and examples,
// never by keywords – whether and which flow to hand off to.
import type { Flow } from "../types";
import detect from "./actors/detect";

const flow: Flow = {
  id: "router",
  name: "Skill-Router",
  description:
    "Liest jede Chat-Nachricht mit und entscheidet, ob sie einen Skill startet. Versteht Absichten aus den Beschreibungen und Beispielen der Flows – ohne Schlüsselwörter.",
  examples: [],
  system: true,
  start: "detect",
  actors: [detect],
  edges: [],
};

export default flow;
