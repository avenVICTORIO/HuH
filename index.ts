import { randomUUID } from "node:crypto";
import { db, allocatePin, type Mitarbeiter } from "./db";
import { sessionsFor, durationMs, clip, type Ev } from "./time";
import { terminalPage } from "./terminal";
import { dashboardPage } from "./dashboard";

const html = (s: string) =>
  new Response(s, { headers: { "Content-Type": "text/html; charset=utf-8" } });

const listAll = () =>
  db
    .query("SELECT id, name, role, pin FROM mitarbeiter ORDER BY name")
    .all() as Mitarbeiter[];

const byPin = (pin: string) =>
  db
    .query("SELECT id, name, role, pin FROM mitarbeiter WHERE pin = ?")
    .get(pin) as Mitarbeiter | null;

const lastEvent = (id: string) =>
  db
    .query("SELECT type, ts FROM events WHERE mitarbeiter_id = ? ORDER BY ts DESC LIMIT 1")
    .get(id) as { type: "in" | "out"; ts: number } | null;

const isValidPin = (p: unknown): p is string =>
  typeof p === "string" && /^\d{4}$/.test(p) && p !== "0009";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => html(terminalPage),
    "/dashboard": () => html(dashboardPage),
    "/logo.png": () => new Response(Bun.file("public/logo.png")),

    // ---- Terminal: PIN nachschlagen (mit aktuellem Status) ----
    "/api/lookup": (req) => {
      const pin = new URL(req.url).searchParams.get("pin") ?? "";
      const emp = byPin(pin);
      if (!emp) return Response.json({ error: "unbekannt" }, { status: 404 });
      const last = lastEvent(emp.id);
      const clockedIn = last?.type === "in";
      return Response.json({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        pin: emp.pin,
        clockedIn,
        since: clockedIn ? last!.ts : null,
      });
    },

    // ---- Terminal: ein-/ausstempeln (toggelt anhand des letzten Events) ----
    "/api/stamp": {
      POST: async (req) => {
        const { pin } = await req.json();
        const emp = byPin(String(pin ?? ""));
        if (!emp) return Response.json({ error: "unbekannt" }, { status: 404 });
        const last = lastEvent(emp.id);
        const type: "in" | "out" = last?.type === "in" ? "out" : "in";
        const ts = Date.now();
        db.prepare(
          "INSERT INTO events (id, mitarbeiter_id, type, ts) VALUES (?, ?, ?, ?)",
        ).run(randomUUID(), emp.id, type, ts);
        return Response.json({ name: emp.name, type, ts });
      },
    },

    // ---- Dashboard: aktueller Präsenz-Status aller Mitarbeiter ----
    "/api/status": () => {
      const rows = listAll().map((m) => {
        const last = lastEvent(m.id);
        const clockedIn = last?.type === "in";
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          clockedIn,
          since: clockedIn ? last!.ts : null,
        };
      });
      return Response.json(rows);
    },

    // ---- Dashboard: Zeiten pro Mitarbeiter im Fenster [from, to) ----
    "/api/report": (req) => {
      const q = new URL(req.url).searchParams;
      const from = Number(q.get("from") ?? 0);
      const to = Number(q.get("to") ?? Date.now());
      const now = Date.now();
      const rows = listAll().map((m) => {
        const evs = db
          .query("SELECT type, ts FROM events WHERE mitarbeiter_id = ? ORDER BY ts ASC")
          .all(m.id) as Ev[];
        const clipped = clip(sessionsFor(evs), from, to, now);
        return {
          id: m.id,
          name: m.name,
          role: m.role,
          totalMs: durationMs(clipped, now),
          sessions: clipped,
        };
      });
      return Response.json(rows);
    },

    // ---- Team-CRUD ----
    "/api/mitarbeiter": {
      GET: () => Response.json(listAll()),
      POST: async (req) => {
        const { name, role, pin: rawPin } = await req.json();
        if (!name?.trim() || !role?.trim()) {
          return Response.json({ error: "Name und Rolle sind Pflicht" }, { status: 400 });
        }
        let pin = (rawPin ?? "").toString().trim();
        if (pin === "") pin = allocatePin();
        else if (!isValidPin(pin)) {
          return Response.json({ error: "PIN muss 4 Ziffern sein (0009 reserviert)" }, { status: 400 });
        }
        if (byPin(pin)) return Response.json({ error: "PIN bereits vergeben" }, { status: 409 });
        const row: Mitarbeiter = { id: randomUUID(), name: name.trim(), role: role.trim(), pin };
        db.prepare("INSERT INTO mitarbeiter (id, name, role, pin) VALUES (?, ?, ?, ?)")
          .run(row.id, row.name, row.role, row.pin);
        return Response.json(row, { status: 201 });
      },
    },

    "/api/mitarbeiter/:id": {
      PUT: async (req) => {
        const { name, role, pin } = await req.json();
        const { id } = req.params;
        if (!name?.trim() || !role?.trim()) {
          return Response.json({ error: "Name und Rolle sind Pflicht" }, { status: 400 });
        }
        const p = (pin ?? "").toString().trim();
        if (!isValidPin(p)) {
          return Response.json({ error: "PIN muss 4 Ziffern sein (0009 reserviert)" }, { status: 400 });
        }
        const clash = byPin(p);
        if (clash && clash.id !== id) {
          return Response.json({ error: "PIN bereits vergeben" }, { status: 409 });
        }
        const res = db
          .prepare("UPDATE mitarbeiter SET name = ?, role = ?, pin = ? WHERE id = ?")
          .run(name.trim(), role.trim(), p, id);
        if (res.changes === 0) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        return Response.json({ id, name: name.trim(), role: role.trim(), pin: p });
      },
      DELETE: (req) => {
        const res = db.prepare("DELETE FROM mitarbeiter WHERE id = ?").run(req.params.id);
        if (res.changes === 0) return Response.json({ error: "nicht gefunden" }, { status: 404 });
        return new Response(null, { status: 204 });
      },
    },
  },

  fetch: () => new Response("Not Found", { status: 404 }),
});

console.log(`Läuft auf http://localhost:${server.port}`);
