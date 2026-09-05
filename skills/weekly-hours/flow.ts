// Flow "Wochenstunden": posts the team's hours of the past week.
// Two ways in: the Trigger flow fires it every Monday 09:00 (cron), and the
// Intent-Router starts it from chat ("Wie viele Stunden hatten wir letzte Woche?").
import type { Flow } from "../types";
import summarize from "./actors/summarize";

const flow: Flow = {
  id: "weekly-hours",
  name: "Wochenstunden",
  description:
    "Fasst die Arbeitsstunden der vergangenen Woche zusammen – automatisch jeden Montag um 9 Uhr im Team-Raum, oder auf Zuruf im Chat. Wer keine Auswertungs-Rechte hat, sieht nur die eigenen Stunden.",
  examples: [
    "Wie viele Stunden hatte das Team letzte Woche?",
    "Wochenstunden bitte",
    "Wie viel habe ich letzte Woche gearbeitet?",
  ],
  triggers: [{ kind: "cron", cron: "0 9 * * 1", room: "team" }],
  start: "summarize",
  actors: [summarize],
  edges: [],
};

export default flow;
