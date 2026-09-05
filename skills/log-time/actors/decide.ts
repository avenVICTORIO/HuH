// Actor "decide" (code): receives the return of the HITL component and routes on.
// Two HITL contexts (state.hitl): "confirm" (the summary) and "future" (shift still running).
import type { Actor } from "../../types";
import { hm } from "./validate";

const actor: Actor = {
  id: "decide",
  name: "Entscheiden",
  kind: "code",
  description: "Wertet die menschliche Antwort (HITL) aus: eintragen, bis jetzt eintragen, korrigieren oder abbrechen.",
  pos: { x: 640, y: 300 },
  output: {
    type: "object",
    properties: {
      time: { type: "object" }, checked: { type: ["object", "null"] },
      correction: { type: ["string", "null"] }, hint: { type: ["string", "null"] }, hitl: { type: ["string", "null"] },
    },
  },
  async handle(message, ctx) {
    if (message.kind !== "return") return { cancel: "" };
    if (message.status !== "done") return { cancel: "Alles klar, ich trage nichts ein." };
    const r = message.state as { decision?: string; text?: string | null; answer?: string };
    const t = (ctx.state.time ?? {}) as { date?: string; from?: string; to?: string };
    const context = ctx.state.hitl;

    if (context === "future") {
      switch (r.decision) {
        case "until_now": return { tell: "validate", state: { hitl: null, time: { ...t, to: hm(Date.now()) } } };
        case "other": return { tell: "understand", state: { hitl: null, time: { date: t.date }, hint: "Okay – von wann bis wann warst du da?" } };
        case "text": return { tell: "understand", state: { hitl: null, correction: r.text || r.answer || "" } };
        default: return { cancel: "Alles klar, ich trage nichts ein." };
      }
    }
    switch (r.decision) {
      case "yes": return { tell: "record" };
      // Free answer = correction: keep what is known – "understand" only overwrites what the person changes.
      case "text": return { tell: "understand", state: { hitl: null, checked: null, correction: r.text || r.answer || "" } };
      case "no": return { tell: "understand", state: { hitl: null, checked: null, time: { date: t.date }, hint: "Okay – welche Zeit soll es sein? Sag mir von wann bis wann." } };
      default: return { cancel: "Alles klar, ich trage nichts ein." };
    }
  },
};

export default actor;
