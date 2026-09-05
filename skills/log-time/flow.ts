// Flow "Zeiten eintragen" – from an employee's point of view:
//   "Trag mir bitte gestern 16:30 bis 23:00 ein."
//   -> understand (AI) -> validate (code) -> [component "confirm" (AI)] -> decide (code) -> record (code)
// Everything this flow needs lives in this folder. It is started by the Skill-Router
// (AI) from its description and examples. The confirmation is not an actor of its own
// but the reusable flow "confirm", called by "validate"; the answer returns to "decide".
import type { Flow } from "../types";
import understand from "./actors/understand";
import validate from "./actors/validate";
import decide from "./actors/decide";
import record from "./actors/record";

const flow: Flow = {
  id: "log-time",
  name: "Zeiten eintragen",
  description:
    "Eine vergessene oder nicht gestempelte Arbeitszeit direkt im Chat nachtragen: Datum und Uhrzeiten nennen, Rückfrage bestätigen – fertig.",
  examples: [
    "Trag mir bitte gestern 16:30 bis 23:00 ein.",
    "Ich hab vergessen zu stempeln – Montag 15 bis 22:30 Uhr.",
    "Zeit nachtragen: heute 12:00–15:00",
  ],
  start: "understand",
  actors: [understand, validate, decide, record],
  refs: [{ flow: "confirm", pos: { x: 640, y: 120 } }],
  edges: [
    { from: "understand", to: "understand", label: "Rückfrage" },
    { from: "understand", to: "validate" },
    { from: "validate", to: "understand", label: "unplausibel" },
    { from: "validate", to: "flow:confirm", label: "call" },
    { from: "flow:confirm", to: "decide", label: "return" },
    { from: "decide", to: "record", label: "ja" },
    { from: "decide", to: "understand", label: "korrigieren" },
  ],
  output: {
    type: "object",
    properties: { recorded: { type: "object", required: ["inId", "outId"], properties: { inId: { type: "string" }, outId: { type: "string" } } } },
  },
};

export default flow;
