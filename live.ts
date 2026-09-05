// Live-Kanal: ein WebSocket pro angemeldetem Browser, Server pusht Ereignisse.
// Kein Polling – Ansichten laden nur nach, wenn hier ein passendes Signal ankommt.
//
// Themen (Pub/Sub von Bun):
//   alle          – jede angemeldete Person (Team-Chat, Änderungssignale)
//   user:<id>     – genau diese Person (Direkt-Chat, eigene Zeiten)
//   chat.admin    – wer alle Mitarbeiter-Chats sieht
import type { Server, ServerWebSocket } from "bun";

export type WsDaten = { id: string; caps: string[] };
type Sock = ServerWebSocket<WsDaten>;
type Eingang = (daten: Record<string, unknown>, ws: Sock) => void | Promise<void>;

let server: Server<WsDaten> | null = null;
const eingaenge = new Map<string, Eingang>();

/** Nach Bun.serve() einmal aufrufen – danach kann überall gesendet werden. */
export function starten(s: Server<WsDaten>) {
  server = s;
}

/** Ereignis an alle Sockets eines Themas. */
export function sende(thema: string, ereignis: Record<string, unknown>) {
  server?.publish(thema, JSON.stringify(ereignis));
}

/** Handler für eingehende Client-Nachrichten eines Typs registrieren (z. B. chat.gelesen). */
export function beiNachricht(typ: string, handler: Eingang) {
  eingaenge.set(typ, handler);
}

export const websocket = {
  open(ws: Sock) {
    ws.subscribe("alle");
    ws.subscribe(`user:${ws.data.id}`);
    if (ws.data.caps.includes("*") || ws.data.caps.includes("chat.admin")) ws.subscribe("chat.admin");
    ws.send(JSON.stringify({ typ: "hallo" }));
  },
  async message(ws: Sock, roh: string | Buffer) {
    let d: Record<string, unknown>;
    try { d = JSON.parse(String(roh)); } catch { return; }
    if (d.typ === "ping") { ws.send('{"typ":"pong"}'); return; }
    const h = eingaenge.get(String(d.typ));
    if (h) { try { await h(d, ws); } catch (e) { console.error("WS-Nachricht fehlgeschlagen:", e); } }
  },
  close() {},
};

// ---------------------------------------------------------------- Änderungssignale
// Jede erfolgreiche schreibende API-Anfrage löst ein Signal aus, damit offene
// Ansichten nachladen. Nur der Themenname geht raus – keine Daten.
const THEMEN: [RegExp, string][] = [
  [/^\/api\/(team\/)?reservierungen|^\/api\/kapazitaet|^\/api\/anfragen/, "reservierungen"],
  [/^\/api\/schicht/, "schichten"],
  [/^\/api\/(stamp|klaerung|zeiten)/, "zeiten"],
  [/^\/api\/ablauf/, "ablauf"],
  [/^\/api\/(mitarbeiter|rollen)/, "team"],
  [/^\/api\/karte/, "karte"],
  [/^\/api\/skills/, "skills"],
];
const SCHREIBEND = ["POST", "PUT", "PATCH", "DELETE"] as const;
type Handler = (req: Request, srv: unknown) => Response | Promise<Response>;

/** Routen-Objekt so umwickeln, dass schreibende Handler nach Erfolg ein Signal senden. */
export function mitSignalen<T extends Record<string, unknown>>(routen: T): T {
  for (const [pfad, wert] of Object.entries(routen)) {
    const thema = THEMEN.find(([re]) => re.test(pfad))?.[1];
    if (!thema || !wert || typeof wert !== "object") continue;
    const methoden = wert as Record<string, unknown>;
    for (const m of SCHREIBEND) {
      const h = methoden[m];
      if (typeof h !== "function") continue;
      methoden[m] = async (req: Request, srv: unknown) => {
        const antwort = await (h as Handler)(req, srv);
        if (antwort && antwort.status < 300) sende("alle", { typ: thema });
        return antwort;
      };
    }
  }
  return routen;
}
