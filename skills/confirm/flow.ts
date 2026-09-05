// Component "Bestätigung" (leaf skill): asks a yes/no question in chat and
// understands the answer by AI – yes, no, a correction, or cancel. Used by other
// flows via `call`. Input: { question }. Output state: { decision, correction?, answer }.
import type { Flow } from "../types";
import ask from "./actors/ask";

export const CONFIRM_INPUT = {
  type: "object",
  required: ["question"],
  properties: { question: { type: "string", minLength: 1 } },
};

export const CONFIRM_OUTPUT = {
  type: "object",
  required: ["decision"],
  properties: {
    decision: { type: "string", enum: ["yes", "no", "correction", "cancel"] },
    correction: { type: ["string", "null"] },
    answer: { type: "string" },
  },
};

const flow: Flow = {
  id: "confirm",
  name: "Bestätigung",
  description: "Wiederverwendbarer Baustein: stellt eine Rückfrage und versteht Ja, Nein, eine Korrektur oder einen Rückzieher – ohne Schlüsselwörter.",
  examples: [],
  component: true,
  start: "ask",
  actors: [ask],
  edges: [{ from: "ask", to: "ask", label: "unklar" }],
  input: CONFIRM_INPUT,
  output: CONFIRM_OUTPUT,
};

export default flow;
