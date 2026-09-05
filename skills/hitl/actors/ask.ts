// Actor "ask" (AI): asks the caller's question, offers the options, and maps the
// human answer to a decision – exact option match first, otherwise by AI.
import type { Actor, Schema } from "../../types";
import { OPTION } from "../schema";

type Option = { id: string; label: string };
const DEFAULT_OPTIONS: Option[] = [{ id: "yes", label: "Ja" }, { id: "no", label: "Nein" }];

const actor: Actor = {
  id: "ask",
  name: "Fragen & verstehen",
  kind: "ai",
  description: "Stellt die Frage mit Optionen; ordnet die Antwort einer Option, einer freien Angabe oder einem Abbruch zu.",
  pos: { x: 40, y: 120 },
  input: { type: "object", required: ["question"], properties: { question: { type: "string", minLength: 1 }, options: { type: "array", items: OPTION }, allowText: { type: "boolean" } } },
  output: {
    type: "object",
    properties: {
      options: { type: "array", items: OPTION },
      allowText: { type: "boolean" },
      attempts: { type: "integer", minimum: 0 },
      decision: { type: "string", minLength: 1 },
      text: { type: ["string", "null"] },
      answer: { type: "string" },
    },
  },
  async handle(message, ctx) {
    const question = String(ctx.state.question);
    const options = (Array.isArray(ctx.state.options) && (ctx.state.options as Option[]).length ? ctx.state.options : DEFAULT_OPTIONS) as Option[];
    const allowText = ctx.state.allowText !== false;
    if (message.kind !== "answer") return { ask: question, state: { options, allowText, attempts: 0 } };

    const text = message.text.trim();
    const exact = options.find((o) => o.label.toLowerCase() === text.toLowerCase() || o.id.toLowerCase() === text.toLowerCase());
    if (exact) return { done: "", state: { decision: exact.id, text: null, answer: text } };
    if (!ctx.ai.active) return { done: "", state: { decision: allowText ? "text" : "cancel", text, answer: text } };

    const ids = options.map((o) => o.id);
    const schema: Schema = {
      type: "object",
      required: ["decision"],
      properties: { decision: { type: "string", enum: [...ids, "text", "cancel", "unclear"] }, text: { type: ["string", "null"] } },
      additionalProperties: false,
    };
    const system = [
      `Eine Person wurde gefragt: „${question}“. Mögliche Antworten:`,
      ...options.map((o) => `- id "${o.id}": ${o.label}`),
      'Antworte NUR mit JSON: {"decision": "<option-id>" | "text" | "cancel" | "unclear", "text": string | null}.',
      "Wähle die option-id, die die Antwort sinngemäß meint (auch „passt“, „genau“, „mach“ = Zustimmung).",
      allowText
        ? '"text" = die Person macht eine eigene Angabe oder Korrektur (Wortlaut in "text").'
        : '"text" ist hier NICHT erlaubt – ordne einer Option zu oder wähle "unclear".',
      '"cancel" = sie will das Ganze nicht mehr. "unclear" = weder noch.',
    ].join("\n");
    const j = await ctx.ai.json<{ decision: string; text?: string | null }>(system, text, schema);
    const attempts = Number(ctx.state.attempts ?? 0) + 1;
    if (j.decision === "unclear" && attempts < 3) {
      return { ask: `Kurz: ${options.map((o) => o.label).join(" / ")}?`, state: { attempts } };
    }
    if (j.decision === "unclear") return { done: "", state: { decision: "cancel", text: null, answer: text } };
    return { done: "", state: { decision: j.decision, text: j.decision === "text" ? (j.text ?? text) : null, answer: text } };
  },
};

export default actor;
