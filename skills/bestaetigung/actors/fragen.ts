// Actor „fragen“ (KI): stellt die übergebene Frage und ordnet die Antwort ein.
import type { Actor } from "../../typen";

type Urteil = { entscheidung: "ja" | "nein" | "korrektur" | "abbruch" | "unklar"; korrektur?: string | null };

const actor: Actor = {
  id: "fragen",
  name: "Fragen & verstehen",
  art: "ki",
  beschreibung: "Stellt die Frage des Aufrufers und versteht die Antwort: Ja, Nein, Korrektur oder Abbruch.",
  pos: { x: 40, y: 120 },
  async handle(post, k) {
    const frage = String(k.zustand.frage ?? "Passt das?");
    if (post.art !== "antwort") return { frage, zustand: { versuche: 0 } };
    if (!k.ki.aktiv) return { abbruch: "" };

    const system = [
      `Eine Person wurde gefragt: „${frage}“. Ordne ihre Antwort ein.`,
      `Antworte NUR mit JSON: {"entscheidung":"ja"|"nein"|"korrektur"|"abbruch"|"unklar","korrektur":string|null}.`,
      `"ja" = Zustimmung (auch „passt“, „genau“, „mach“, „gerne“). "korrektur" = sie nennt eine geänderte Angabe (den Wortlaut in "korrektur").`,
      `"nein" = Ablehnung ohne neue Angabe. "abbruch" = sie will das Ganze nicht mehr. "unklar" = weder noch.`,
    ].join(" ");
    const u = await k.ki.json<Urteil>(system, post.text);
    const versuche = Number(k.zustand.versuche ?? 0) + 1;
    if (u.entscheidung === "unklar" && versuche < 3) return { frage: `Kurz ja oder nein: ${frage}`, zustand: { versuche } };
    const entscheidung = u.entscheidung === "unklar" ? "nein" : u.entscheidung;
    return { fertig: "", zustand: { entscheidung, korrektur: u.korrektur ?? null, antwort: post.text } };
  },
};

export default actor;
