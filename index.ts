import { randomUUID } from "node:crypto";
import { db } from "./db";
import { page } from "./ui";

type Mitarbeiter = { id: string; name: string; role: string };

const listAll = () =>
  db
    .query("SELECT id, name, role FROM mitarbeiter ORDER BY name")
    .all() as Mitarbeiter[];

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () =>
      new Response(page, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      }),

    "/api/mitarbeiter": {
      GET: () => Response.json(listAll()),

      POST: async (req) => {
        const { name, role } = await req.json();
        if (!name?.trim() || !role?.trim()) {
          return Response.json(
            { error: "name und role sind Pflicht" },
            { status: 400 },
          );
        }
        const row: Mitarbeiter = {
          id: randomUUID(),
          name: name.trim(),
          role: role.trim(),
        };
        db.prepare(
          "INSERT INTO mitarbeiter (id, name, role) VALUES (?, ?, ?)",
        ).run(row.id, row.name, row.role);
        return Response.json(row, { status: 201 });
      },
    },

    "/api/mitarbeiter/:id": {
      PUT: async (req) => {
        const { name, role } = await req.json();
        if (!name?.trim() || !role?.trim()) {
          return Response.json(
            { error: "name und role sind Pflicht" },
            { status: 400 },
          );
        }
        const { id } = req.params;
        const res = db
          .prepare("UPDATE mitarbeiter SET name = ?, role = ? WHERE id = ?")
          .run(name.trim(), role.trim(), id);
        if (res.changes === 0) {
          return Response.json({ error: "nicht gefunden" }, { status: 404 });
        }
        return Response.json({ id, name: name.trim(), role: role.trim() });
      },

      DELETE: (req) => {
        const { id } = req.params;
        const res = db
          .prepare("DELETE FROM mitarbeiter WHERE id = ?")
          .run(id);
        if (res.changes === 0) {
          return Response.json({ error: "nicht gefunden" }, { status: 404 });
        }
        return new Response(null, { status: 204 });
      },
    },
  },

  fetch: () => new Response("Not Found", { status: 404 }),
});

console.log(`Läuft auf http://localhost:${server.port}`);
