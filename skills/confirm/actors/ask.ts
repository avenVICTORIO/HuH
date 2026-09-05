// Actor "ask" (AI): asks the caller's question and classifies the answer.
import type { Actor, Schema } from "../../types";

type Judgement = { decision: "yes" | "no" | "correction" | "cancel" | "unclear"; correction?: string | null };

const JUDGEMENT: Schema = {
  type: "object",
  required: ["decision"],
  properties: {
    decision: { type: "string", enum: ["yes", "no", "correction", "cancel", "unclear"] },
    correction: { type: ["string", "null"] },
  },
  additionalProperties: false,
};

const actor: Actor = {
  id: "ask",
  name: "Fragen & verstehen",
  kind: "ai",
  description: "Stellt die Frage des Aufrufers und versteht die Antwort: Ja, Nein, Korrektur oder Abbruch.",
  pos: { x: 40, y: 120 },
  input: { type: "object", required: ["question"], properties: { question: { type: "string", minLength: 1 } } },
  output: {
    type: "object",
    properties: {
      attempts: { type: "integer", minimum: 0 },
      decision: { type: "string", enum: ["yes", "no", "correction", "cancel"] },
      correction: { type: ["string", "null"] },
      answer: { type: "string" },
    },
  },
  async handle(message, ctx) {
    const question = String(ctx.state.question);
    if (message.kind !== "answer") return { ask: question, state: { attempts: 0 } };
    if (!ctx.ai.active) return { cancel: "" };

    const system = [
      `Eine Person wurde gefragt: „${question}“. Ordne ihre Antwort ein.`,
      'Antworte NUR mit JSON: {"decision":"yes"|"no"|"correction"|"cancel"|"unclear","correction":string|null}.',
      '"yes" = Zustimmung (auch „passt“, „genau“, „mach“, „gerne“). "correction" = sie nennt eine geänderte Angabe (Wortlaut in "correction").',
      '"no" = Ablehnung ohne neue Angabe. "cancel" = sie will das Ganze nicht mehr. "unclear" = weder noch.',
    ].join(" ");
    const j = await ctx.ai.json<Judgement>(system, message.text, JUDGEMENT);
    const attempts = Number(ctx.state.attempts ?? 0) + 1;
    if (j.decision === "unclear" && attempts < 3) return { ask: `Kurz ja oder nein: ${question}`, state: { attempts } };
    const decision = j.decision === "unclear" ? "no" : j.decision;
    return { done: "", state: { decision, correction: j.correction ?? null, answer: message.text } };
  },
};

export default actor;
