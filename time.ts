// Reine Hilfsfunktionen: aus Stempel-Events (in/out) Arbeits-Sessions bilden.

export type Ev = { type: "in" | "out"; ts: number };
export type Session = { start: number; end: number | null }; // end=null => noch offen

/** Events EINES Mitarbeiters (aufsteigend nach ts) zu Sessions paaren. */
export function sessionsFor(events: Ev[]): Session[] {
  const sessions: Session[] = [];
  let openStart: number | null = null;
  for (const e of events) {
    if (e.type === "in") {
      if (openStart === null) openStart = e.ts; // doppeltes 'in' ignorieren
    } else {
      if (openStart !== null) {
        sessions.push({ start: openStart, end: e.ts });
        openStart = null;
      } // 'out' ohne 'in' ignorieren
    }
  }
  if (openStart !== null) sessions.push({ start: openStart, end: null });
  return sessions;
}

/** Gesamtdauer in ms; offene Sessions zählen bis `now`. */
export function durationMs(sessions: Session[], now: number): number {
  return sessions.reduce((sum, s) => sum + ((s.end ?? now) - s.start), 0);
}

/** Sessions auf das Fenster [from, to) zuschneiden (offene bis `now`). */
export function clip(sessions: Session[], from: number, to: number, now: number): Session[] {
  const out: Session[] = [];
  for (const s of sessions) {
    const end = s.end ?? now;
    const a = Math.max(s.start, from);
    const b = Math.min(end, to);
    if (b > a) out.push({ start: a, end: b });
  }
  return out;
}
