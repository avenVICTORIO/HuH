// Actor "validate" (code): plausibility, overlaps, duration. Pure logic, no AI.
// Then calls the component "confirm"; its answer returns to "decide".
import type { Actor } from "../../types";
import { sitzungenFuer } from "../../../auth";

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

export function localTs(date: string, time: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}
export function prettyDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  return `${WD[x.getDay()]}, ${d}. ${MON[m - 1]}`;
}
const hm = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const actor: Actor = {
  id: "validate",
  name: "Prüfen",
  kind: "code",
  description: "Prüft Datum und Uhrzeiten, erkennt Überschneidungen mit vorhandenen Zeiten, rechnet die Dauer und ruft den Baustein „Bestätigung“.",
  pos: { x: 340, y: 120 },
  delegates: [{ via: "call", to: ["confirm"] }],
  input: {
    type: "object",
    required: ["time"],
    properties: {
      time: {
        type: "object",
        required: ["date", "from", "to"],
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          from: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
          to: { type: "string", pattern: "^\\d{2}:\\d{2}$" },
        },
      },
    },
  },
  output: {
    type: "object",
    properties: {
      time: { type: "object" },
      checked: {
        type: ["object", "null"],
        required: ["start", "end", "hours", "label"],
        properties: { start: { type: "number" }, end: { type: "number" }, hours: { type: "number" }, label: { type: "string" } },
      },
    },
  },
  async handle(_message, ctx) {
    const t = ctx.state.time as { date: string; from: string; to: string };
    if (t.date > ctx.today) {
      return { tell: "understand", say: "Das Datum liegt in der Zukunft – Zeiten kann ich nur nachtragen, nicht vorbuchen. Welcher Tag war es?", state: { time: { from: t.from, to: t.to } } };
    }
    const start = localTs(t.date, t.from);
    let end = localTs(t.date, t.to);
    if (end <= start) end += 86400000; // closing after midnight
    const hours = (end - start) / 3600000;
    if (hours > 16) {
      return { tell: "understand", say: `${t.from} bis ${t.to} wären ${hours.toFixed(1)} Stunden – das passt nicht. Von wann bis wann war es wirklich?`, state: { time: { date: t.date } } };
    }
    if (end > Date.now()) {
      return { tell: "understand", say: "Das Ende liegt noch in der Zukunft. Bis wann warst du da?", state: { time: { date: t.date, from: t.from } } };
    }
    const existing = await sitzungenFuer(ctx.person.id, start - 86400000, end + 86400000);
    const overlapping = existing.filter((s) => s.start < end && (s.end ?? Date.now()) > start);
    if (overlapping.length) {
      const list = overlapping.map((s) => `${hm(s.start)}–${s.end ? hm(s.end) : "offen"}`).join(", ");
      return { tell: "understand", say: `An dem Tag ist schon Zeit erfasst (${list}), die sich damit überschneidet. Welche Zeit soll ich stattdessen eintragen?`, state: { time: { date: t.date } } };
    }
    const label = `${prettyDate(t.date)}, ${t.from}–${t.to} Uhr (${hours.toFixed(hours % 1 ? 1 : 0).replace(".", ",")} h)`;
    return {
      call: "confirm",
      then: "decide",
      input: { question: `Ich trage ein: ${label}. Passt das?` },
      state: { checked: { start, end, hours: Math.round(hours * 100) / 100, label } },
    };
  },
};

export default actor;
