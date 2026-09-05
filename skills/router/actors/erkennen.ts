// Actor „erkennen“ (KI): ordnet eine Nachricht einem Flow zu – oder keinem.
import type { Actor } from "../../typen";

type Urteil = { flow: string | null; sicherheit: number; grund?: string };

const actor: Actor = {
  id: "erkennen",
  name: "Absicht erkennen",
  art: "ki",
  beschreibung: "Vergleicht die Nachricht mit Beschreibung und Beispielen aller Skills und übergibt bei klarer Absicht an den passenden Flow.",
  pos: { x: 40, y: 120 },
  async handle(post, k) {
    if (post.art !== "start" || !k.ki.aktiv || !k.flows.length) return { fertig: "" };
    const katalog = k.flows
      .map((f) => `- id "${f.id}": ${f.name} – ${f.beschreibung} Beispiele: ${f.beispiele.map((b) => `„${b}“`).join(" / ")}`)
      .join("\n");
    const system = [
      "Du bist der Router im Team-Chat eines Restaurants. Prüfe, ob die Nachricht einen dieser Abläufe (Skills) starten soll:",
      katalog,
      'Antworte NUR mit JSON: {"flow": "<id>" | null, "sicherheit": 0..1, "grund": "kurz"}.',
      "flow = null bei normaler Unterhaltung, Fragen, Smalltalk, Bestätigungen oder wenn die Person nur über das Thema redet,",
      "ohne den Ablauf jetzt ausführen zu wollen. Wähle nur bei klarer Handlungsabsicht.",
    ].join("\n");
    const u = await k.ki.json<Urteil>(system, post.text);
    const ziel = k.flows.find((f) => f.id === u.flow);
    if (!ziel || Number(u.sicherheit ?? 0) < 0.6) return { fertig: "", zustand: { urteil: u } };
    return { starte: ziel.id, text: post.text, zustand: { urteil: u } };
  },
};

export default actor;
