// Actor "detect" (AI): maps a message to a flow – or to none.
import type { Actor, Schema } from "../../types";

type Verdict = { flow: string | null; confidence: number; reason?: string };

const VERDICT: Schema = {
  type: "object",
  required: ["flow", "confidence"],
  properties: {
    flow: { type: ["string", "null"] },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string" },
  },
  additionalProperties: false,
};

const actor: Actor = {
  id: "detect",
  name: "Absicht erkennen",
  kind: "ai",
  description: "Vergleicht die Nachricht mit Beschreibung und Beispielen aller Skills und übergibt bei klarer Absicht an den passenden Flow.",
  pos: { x: 40, y: 120 },
  output: { type: "object", properties: { verdict: VERDICT } },
  // Kann an jeden startbaren Skill übergeben – der Katalog zeichnet dafür die Handoff-Knoten.
  delegates: [{ via: "handoff", to: "startable" }],
  async handle(message, ctx) {
    if (message.kind !== "start" || !ctx.ai.active || !ctx.flows.length) return { done: "" };
    const catalog = ctx.flows
      .map((f) => `- id "${f.id}": ${f.name} – ${f.description} Beispiele: ${f.examples.map((b) => `„${b}“`).join(" / ")}`)
      .join("\n");
    const system = [
      "Du bist der Router im Team-Chat eines Restaurants. Prüfe, ob die Nachricht einen dieser Abläufe (Skills) starten soll:",
      catalog,
      'Antworte NUR mit JSON: {"flow": "<id>" | null, "confidence": 0..1, "reason": "kurz"}.',
      "flow = null bei normaler Unterhaltung, Fragen, Smalltalk, Bestätigungen oder wenn die Person nur über das Thema redet,",
      "ohne den Ablauf jetzt ausführen zu wollen. Wähle nur bei klarer Handlungsabsicht.",
    ].join("\n");
    const verdict = await ctx.ai.json<Verdict>(system, message.text, VERDICT);
    const target = ctx.flows.find((f) => f.id === verdict.flow);
    if (!target || verdict.confidence < 0.6) return { done: "", state: { verdict } };
    return { handoff: target.id, text: message.text, state: { verdict } };
  },
};

export default actor;
