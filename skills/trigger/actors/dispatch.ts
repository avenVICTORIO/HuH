// Actor "dispatch" (code): hands a fired trigger off to its target flow.
import type { Actor } from "../../types";

const actor: Actor = {
  id: "dispatch",
  name: "Auslösen",
  kind: "code",
  description: "Übergibt einen ausgelösten Zeitplan oder ein Ereignis an den Ziel-Skill (mit dem Trigger im Zustand).",
  pos: { x: 40, y: 120 },
  input: {
    type: "object",
    required: ["target", "trigger"],
    properties: {
      target: { type: "string", minLength: 1 },
      trigger: { type: "object", required: ["kind"], properties: { kind: { type: "string", enum: ["cron", "event", "manual"] } } },
    },
  },
  delegates: [{ via: "handoff", to: "triggered" }],
  async handle(message, ctx) {
    if (message.kind !== "start") return { done: "" };
    return { handoff: String(ctx.state.target), text: message.text, input: { trigger: ctx.state.trigger } };
  },
};

export default actor;
