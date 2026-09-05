// System flow "Trigger": starts flows from time (cron) and events (live signals) instead
// of a chat message. The runtime's scheduler creates a run of this flow with
// state { target, trigger }; the "dispatch" actor hands off to the target flow and
// seeds its state with the trigger. Its possible targets (every flow with `triggers`)
// appear in the canvas as handoff nodes labelled with their schedule/event.
import type { Flow } from "../types";
import dispatch from "./actors/dispatch";

const flow: Flow = {
  id: "trigger",
  name: "Trigger (Zeit & Ereignisse)",
  description:
    "Startet Skills ohne Chat: nach Zeitplan (Cron) oder auf Ereignisse im Haus (neue Reservierung, Stempel, Schichtplan …). Läuft im Namen der Leitung, spricht im Team-Raum.",
  examples: [],
  system: true,
  start: "dispatch",
  actors: [dispatch],
  edges: [],
};

export default flow;
