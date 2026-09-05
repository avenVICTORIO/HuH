// Scheduler for flow triggers: cron (checked every 30 s, at most once per minute per flow,
// last firing persisted in `einstellungen`) and events (live signals). Both create a run of
// the system flow "trigger", whose actor hands off to the target flow.
import { eins, lauf, type Mitarbeiter } from "../db";
import * as live from "../live";
import type { Flow, Trigger } from "./types";

type Ausloeser = (target: Flow, trigger: Trigger | { kind: "manual" }, person: Mitarbeiter, room: string, text: string) => Promise<string>;

/** Minimal 5-field cron matcher: * , - / with numbers; day-of-week 0–6 (0 = Sunday, 7 = Sunday). */
export function cronMatches(expr: string, d: Date): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const vals = [d.getMinutes(), d.getHours(), d.getDate(), d.getMonth() + 1, d.getDay()];
  const ranges: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 7]];
  return parts.every((p, i) => {
    const v = vals[i];
    return p.split(",").some((piece) => {
      const [rangePart, stepPart] = piece.split("/");
      const step = stepPart ? Number(stepPart) : 1;
      let lo = ranges[i][0], hi = ranges[i][1];
      if (rangePart !== "*") {
        const [a, b] = rangePart.split("-").map(Number);
        lo = a; hi = b ?? a;
      }
      const w = i === 4 && v === 0 ? [0, 7] : [v]; // Sunday as 0 or 7
      return w.some((x) => x >= lo && x <= hi && (x - lo) % step === 0);
    });
  });
}

/** The person triggered runs act for: the first owner account. */
export async function systemPerson(): Promise<Mitarbeiter | null> {
  return eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE admin = 1 OR role = 'Inhaber' ORDER BY admin DESC, name LIMIT 1");
}

const minuteKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export function installiere(flows: Flow[], ausloesen: Ausloeser) {
  const g = globalThis as { __huh_trigger?: ReturnType<typeof setInterval>; __huh_trigger_hook?: boolean };
  // Cron: tick every 30 s; fire when the current minute matches and was not fired yet.
  if (g.__huh_trigger) clearInterval(g.__huh_trigger); // hot reload: replace the old timer
  g.__huh_trigger = setInterval(async () => {
    const now = new Date(), key = minuteKey(now);
    for (const f of flows) {
      for (const t of f.triggers ?? []) {
        if (t.kind !== "cron" || !cronMatches(t.cron, now)) continue;
        const k = `trigger:${f.id}:cron:${t.cron}`;
        const last = await eins<{ v: string }>("SELECT v FROM einstellungen WHERE k = ?", k);
        if (last?.v === key) continue;
        await lauf("INSERT INTO einstellungen (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v", k, key);
        const person = await systemPerson();
        if (!person) continue;
        try { await ausloesen(f, t, person, t.room ?? "team", t.text ?? ""); }
        catch (e) { console.error(`Trigger ${f.id} (cron ${t.cron}):`, e); }
      }
    }
  }, 30000);
  // Events: live signals (reservierungen, zeiten, schichten, ablauf, team, karte).
  if (!g.__huh_trigger_hook) {
    g.__huh_trigger_hook = true;
    live.beiSignal((typ) => {
      if (typ === "skills") return; // never re-trigger on our own signals
      for (const f of flows) {
        for (const t of f.triggers ?? []) {
          if (t.kind !== "event" || t.on !== typ) continue;
          systemPerson().then((person) => person && ausloesen(f, t, person, t.room ?? "team", t.text ?? ""))
            .catch((e) => console.error(`Trigger ${f.id} (event ${t.on}):`, e));
        }
      }
    });
  }
  const n = flows.reduce((s, f) => s + (f.triggers?.length ?? 0), 0);
  if (n) console.log(`Skill-Trigger aktiv: ${n} (${flows.filter((f) => f.triggers?.length).map((f) => f.id).join(", ")})`);
}

export const triggerLabel = (t: Trigger) => (t.kind === "cron" ? `cron ${t.cron}` : `event ${t.on}`);
