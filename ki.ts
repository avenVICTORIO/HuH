// KI im Team-Chat: liest in jedem Raum mit und antwortet direkt – serverseitig
// über die Phala Confidential-AI-API (OpenAI-kompatibel, TEE-attestiert).
// Die Antwort wird gestreamt: Zwischenstände gehen als chat.tippt über den
// WebSocket an alle Beteiligten, am Ende wird die fertige Nachricht gespeichert
// und wie jede andere Nachricht (chat.nachricht) verteilt.
import { randomUUID } from "node:crypto";
import * as chat from "./chat";
import * as live from "./live";
import { HAUS } from "./site/info";

const BASIS = process.env.PHALA_BASE_URL ?? "https://inference.phala.com/v1";
const MODELL = process.env.KI_MODELL ?? "qwen/qwen3.8-27b";
const KEY = process.env.PHALA_API_KEY;
export const aktiv = !!KEY;
console.log(aktiv ? `🤖 KI im Chat an – ${MODELL} über ${BASIS}` : "🤖 KI im Chat aus – PHALA_API_KEY fehlt (.env)");

const STUMM = "[stumm]";
const KONTEXT = 30; // so viele letzte Nachrichten sieht das Modell

function systemPrompt(raumTitel: string) {
  return [
    `Du bist ${chat.KI_NAME}, die KI-Assistenz im Team-Chat des Restaurants ${HAUS.name} in ${HAUS.stadt}.`,
    `Wenn dich jemand nach deinem Namen fragt, heißt du ${chat.KI_NAME}.`,
    `Du liest im Raum „${raumTitel}“ mit. Antworte auf jede Nachricht kurz, freundlich und konkret –`,
    `auf Deutsch, außer die Nachricht ist in einer anderen Sprache. Du hilfst dem Team bei Fragen zu Service,`,
    `Küche, Abläufen, Formulierungen, Übersetzungen, Rechnen und Planung. Nachrichten anderer sind mit`,
    `„Name: Text“ markiert; sprich Leute mit Vornamen an. Keine Markdown-Überschriften, höchstens ein paar Sätze.`,
    `Nur bei reinen Bestätigungen ohne Inhalt (z. B. „ok“, „danke“, „👍“) antwortest du exakt mit ${STUMM}.`,
  ].join(" ");
}

// Pro Raum läuft höchstens eine Antwort; kommen währenddessen neue Nachrichten, folgt danach eine weitere.
const laufend = new Map<string, { nochmal: boolean }>();

/** Nach einer Team-Nachricht aufrufen – läuft im Hintergrund, blockiert die API-Antwort nicht. */
export function antworte(raum: string) {
  if (!aktiv) return;
  const l = laufend.get(raum);
  if (l) { l.nochmal = true; return; }
  laufend.set(raum, { nochmal: false });
  antwortLauf(raum)
    .catch((e) => console.error("KI-Antwort fehlgeschlagen:", e))
    .finally(() => {
      const s = laufend.get(raum);
      laufend.delete(raum);
      if (s?.nochmal) antworte(raum);
    });
}

async function antwortLauf(raum: string) {
  const verlauf = await chat.verlaufFuerKi(raum, KONTEXT);
  if (!verlauf.length || verlauf[verlauf.length - 1].ki) return; // zuletzt hat schon die KI gesprochen
  const titel = raum === chat.TEAM_RAUM ? "Team (alle im Haus)" : "Direkt-Chat";
  const messages = [
    { role: "system", content: systemPrompt(titel) },
    ...verlauf.map((n) => n.ki
      ? { role: "assistant", content: n.text }
      : { role: "user", content: `${n.von_name}: ${n.text}` }),
  ];

  const job = randomUUID();
  const themen = chat.themenFuer(raum);
  let text = "", gesendet = 0, zuletzt = 0;
  const tippt = (extra: Record<string, unknown> = {}) => {
    for (const t of themen) live.sende(t, { typ: "chat.tippt", raum, job, text, ...extra });
  };

  try {
    tippt(); gesendet = 0; // sofort „KI schreibt …“ zeigen, noch bevor das erste Wort da ist
    const res = await fetch(`${BASIS}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      // reasoning aus: sonst „denkt“ Qwen erst sekundenlang und der sichtbare Text kommt spät und in Klumpen.
      body: JSON.stringify({ model: MODELL, messages, stream: true, max_tokens: 700, temperature: 0.6, reasoning: { enabled: false } }),
    });
    if (!res.ok || !res.body) {
      console.error("KI: HTTP", res.status, (await res.text().catch(() => "")).slice(0, 300));
      tippt({ abbruch: true });
      return;
    }
    // SSE lesen: Zeilen "data: {...}", Ende mit "data: [DONE]".
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let puffer = "", stumm: boolean | null = null;
    lesen: while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      puffer += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = puffer.indexOf("\n")) >= 0) {
        const zeile = puffer.slice(0, idx).trim();
        puffer = puffer.slice(idx + 1);
        if (!zeile.startsWith("data:")) continue;
        const daten = zeile.slice(5).trim();
        if (daten === "[DONE]") break lesen;
        let j: { choices?: { delta?: { content?: unknown } }[] };
        try { j = JSON.parse(daten); } catch { continue; }
        const delta = j.choices?.[0]?.delta?.content;
        if (typeof delta !== "string" || !delta) continue;
        text += delta;
        // Erst entscheiden, ob die Antwort „[stumm]“ ist, bevor irgendetwas rausgeht.
        if (stumm === null) {
          const t = text.trimStart().toLowerCase();
          if (t.length < STUMM.length && STUMM.startsWith(t)) continue;
          stumm = t.startsWith("[stumm");
          if (stumm) break lesen;
        }
        const jetzt = Date.now();
        // Häufig genug pushen, dass man das Tippen sieht (ca. 15×/s oder alle paar Wörter).
        if (jetzt - zuletzt > 60 || text.length - gesendet > 16) { tippt(); zuletzt = jetzt; gesendet = text.length; }
      }
    }
    try { await reader.cancel(); } catch {}
    if (stumm === null) stumm = text.trim().toLowerCase().startsWith("[stumm");
    const fertig = text.replace(/\[stumm\]/gi, "").trim();
    if (stumm || !fertig) { tippt({ abbruch: true }); return; }
    await chat.kiNachricht(raum, fertig, job);
  } catch (e) {
    tippt({ abbruch: true });
    throw e;
  }
}
