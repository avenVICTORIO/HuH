// Actor "record" (code): writes the session as a clock-in/clock-out pair and reports back.
import type { Actor } from "../../types";
import { sitzungAnlegen } from "../../../auth";
import * as live from "../../../live";

const actor: Actor = {
  id: "record",
  name: "Eintragen",
  kind: "code",
  description: "Legt die Zeit als Stempel-Paar an und stößt die Live-Aktualisierung der Zeiten an.",
  pos: { x: 940, y: 120 },
  input: {
    type: "object",
    required: ["checked"],
    properties: {
      checked: { type: "object", required: ["start", "end", "label"], properties: { start: { type: "number" }, end: { type: "number" }, label: { type: "string" } } },
    },
  },
  output: {
    type: "object",
    required: ["recorded"],
    properties: { recorded: { type: "object", required: ["inId", "outId"], properties: { inId: { type: "string" }, outId: { type: "string" } } } },
  },
  async handle(_message, ctx) {
    const c = ctx.state.checked as { start: number; end: number; label: string };
    const s = await sitzungAnlegen(ctx.person.id, c.start, c.end);
    live.sende("alle", { typ: "zeiten" });
    return {
      done: `Eingetragen: ${c.label}. Du findest die Zeit unter „Meine Zeiten“.`,
      state: { recorded: { inId: s.inId, outId: s.outId } },
    };
  },
};

export default actor;
