// Actor "decide" (code): receives the return of the HITL component and routes on –
// record, understand again, or cancel.
import type { Actor } from "../../types";

const actor: Actor = {
  id: "decide",
  name: "Entscheiden",
  kind: "code",
  description: "Wertet die menschliche Antwort (HITL) aus: eintragen, korrigieren oder abbrechen.",
  pos: { x: 640, y: 300 },
  output: {
    type: "object",
    properties: { time: { type: "object" }, checked: { type: ["object", "null"] }, correction: { type: ["string", "null"] } },
  },
  async handle(message, ctx) {
    if (message.kind !== "return") return { cancel: "" };
    if (message.status !== "done") return { cancel: "Alles klar, ich trage nichts ein." };
    const r = message.state as { decision?: string; text?: string | null; answer?: string };
    switch (r.decision) {
      case "yes": return { tell: "record" };
      // Freie Antwort = Korrektur: Bekanntes behalten – „understand“ überschreibt nur, was die Person neu sagt.
      case "text": return { tell: "understand", state: { checked: null, correction: r.text || r.answer || "" } };
      case "no": return { tell: "understand", say: "Okay – dann sag mir Datum und Uhrzeiten noch einmal.", state: { time: {}, checked: null, correction: null } };
      default: return { cancel: "Alles klar, ich trage nichts ein." };
    }
  },
};

export default actor;
