// Component "HITL" (human in the loop): a fully generic step that always needs a human
// answer. The caller passes a question plus options (and whether free text is allowed);
// the chat shows the question with option buttons instead of the message input until
// the person answers. The answer comes back as { decision, text, answer }:
//   decision = one of the option ids | "text" (free answer, wording in `text`) | "cancel"
import type { Flow } from "../types";
import ask from "./actors/ask";
import { HITL_INPUT, HITL_OUTPUT } from "./schema";

const flow: Flow = {
  id: "hitl",
  name: "Mensch entscheidet (HITL)",
  description:
    "Generischer Baustein für alles, was eine menschliche Antwort braucht: Frage plus Optionen, im Chat als Antwort-Leiste statt Eingabefeld. Versteht auch freie Antworten und einen Rückzieher.",
  examples: [],
  component: true,
  start: "ask",
  actors: [ask],
  edges: [{ from: "ask", to: "ask", label: "unklar" }],
  input: HITL_INPUT,
  output: HITL_OUTPUT,
};

export default flow;
