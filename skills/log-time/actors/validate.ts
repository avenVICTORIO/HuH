// Actor "validate" (code): plausibility, overlaps, duration. Pure logic, no AI.
// Problems go back to "understand" as ONE hint (one question). A shift that is still
// running today is offered via HITL ("bis jetzt eintragen"). If everything fits, the
// HITL component asks for confirmation; the human answer returns to "decide".
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
export const hm = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const actor: Actor = {
  id: "validate",
  name: "Prüfen",
  kind: "code",
  description: "Prüft Datum und Uhrzeiten, erkennt Überschneidungen, rechnet die Dauer; bietet bei laufender Schicht „bis jetzt“ an und holt sonst über HITL die Bestätigung ein.",
  pos: { x: 340, y: 120 },
  delegates: [{ via: "call", to: ["hitl"] }],
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
      hint: { type: ["string", "null"] },
      hitl: { type: ["string", "null"], enum: ["confirm", "future", null] },
      checked: {
        type: ["object", "null"],
        required: ["start", "end", "hours", "label"],
        properties: { start: { type: "number" }, end: { type: "number" }, hours: { type: "number" }, label: { type: "string" } },
      },
    },
  },
  async handle(_message, ctx) {
    const t = ctx.state.time as { date: string; from: string; to: string };
    const now = Date.now();
    const back = (hint: string, time: Partial<typeof t>) => ({ tell: "understand", state: { hint, time, checked: null } });

    if (t.date > ctx.today) {
      return back("Das Datum liegt in der Zukunft – ich kann Zeiten nur nachtragen, nicht vorplanen. Welcher Tag war es?", { from: t.from, to: t.to });
    }
    const start = localTs(t.date, t.from);
    let end = localTs(t.date, t.to);
    if (end <= start) end += 86400000; // closing after midnight
    const hours = (end - start) / 3600000;
    if (hours > 16) {
      return back(`${t.from} bis ${t.to} wären ${hours.toFixed(1)} Stunden – das passt nicht. Von wann bis wann war es wirklich?`, { date: t.date });
    }
    if (start > now) {
      return back("Diese Zeit liegt noch vor dir – ich kann nur eintragen, was schon war. Von wann bis wann warst du da?", { date: t.date });
    }
    if (end > now) {
      // Shift is still running: offer to record until now instead of looping.
      return {
        call: "hitl",
        then: "decide",
        input: {
          question: `Deine Schicht endet erst um ${t.to} Uhr – so weit sind wir heute noch nicht. Soll ich ${t.from}–${hm(now)} Uhr (bis jetzt) eintragen?`,
          options: [{ id: "until_now", label: `Bis jetzt (${hm(now)}) eintragen` }, { id: "other", label: "Andere Zeit nennen" }],
          allowText: true,
        },
        state: { hitl: "future", checked: null },
      };
    }
    const existing = await sitzungenFuer(ctx.person.id, start - 86400000, end + 86400000);
    const overlapping = existing.filter((s) => s.start < end && (s.end ?? now) > start);
    if (overlapping.length) {
      const list = overlapping.map((s) => `${hm(s.start)}–${s.end ? hm(s.end) : "offen"}`).join(", ");
      return back(`An dem Tag ist schon Zeit erfasst (${list}), die sich damit überschneidet. Welche Zeit soll ich stattdessen eintragen?`, { date: t.date });
    }
    const label = `${prettyDate(t.date)}, ${t.from}–${t.to} Uhr (${hours.toFixed(hours % 1 ? 1 : 0).replace(".", ",")} h)`;
    return {
      call: "hitl",
      then: "decide",
      input: {
        question: `Ich trage ein: ${label}. Passt das?`,
        options: [{ id: "yes", label: "Ja, eintragen" }, { id: "no", label: "Nein, andere Zeit" }],
        allowText: true, // e.g. „bis 22 Uhr“ directly as a correction
      },
      state: { hitl: "confirm", checked: { start, end, hours: Math.round(hours * 100) / 100, label } },
    };
  },
};

export default actor;
