// Actor "summarize" (code): hours per person for the previous calendar week (Mon–Sun).
import type { Actor } from "../../types";
import { alle } from "../../../db";
import { sitzungenFuer } from "../../../auth";
import { hatCap } from "../../../auth";

const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];
const tag = (d: Date) => `${d.getDate()}. ${MON[d.getMonth()]}`;
const std = (ms: number) => (ms / 3600000).toFixed(1).replace(".", ",");

const actor: Actor = {
  id: "summarize",
  name: "Zusammenfassen",
  kind: "code",
  description: "Rechnet die Stunden der Vorwoche je Person aus den Stempelzeiten zusammen.",
  pos: { x: 40, y: 120 },
  output: {
    type: "object",
    properties: {
      week: { type: "object", properties: { from: { type: "number" }, to: { type: "number" } } },
      hours: { type: "array", items: { type: "object", required: ["name", "hours"], properties: { name: { type: "string" }, hours: { type: "number" } } } },
    },
  },
  async handle(_message, ctx) {
    // Previous week: Monday 00:00 to next Monday 00:00 (local time).
    const now = new Date();
    const dow = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    const from = new Date(monday); from.setDate(monday.getDate() - 7);
    const to = monday;

    const all = hatCap(ctx.person, "auswertung");
    const people = all
      ? await alle<{ id: string; name: string; vorname: string | null }>("SELECT id, name, vorname FROM mitarbeiter ORDER BY lower(coalesce(vorname, name))")
      : [{ id: ctx.person.id, name: ctx.person.name, vorname: ctx.person.vorname }];
    const rows: { name: string; hours: number }[] = [];
    for (const p of people) {
      const s = await sitzungenFuer(p.id, from.getTime(), to.getTime());
      const ms = s.reduce((sum, x) => sum + (Math.min(x.end ?? Date.now(), to.getTime()) - Math.max(x.start, from.getTime())), 0);
      rows.push({ name: p.vorname ?? p.name, hours: Math.round((ms / 3600000) * 100) / 100 });
    }
    const total = rows.reduce((s, r) => s + r.hours, 0);
    const bis = new Date(to.getTime() - 1);
    const header = `Wochenstunden ${tag(from)} – ${tag(bis)}`;
    const body = rows.length
      ? rows.map((r) => `${r.name}: ${std(r.hours * 3600000)} h`).join("\n") + (all && rows.length > 1 ? `\nGesamt: ${std(total * 3600000)} h` : "")
      : "Keine Zeiten erfasst.";
    return { done: `${header}\n${body}`, state: { week: { from: from.getTime(), to: to.getTime() }, hours: rows } };
  },
};

export default actor;
