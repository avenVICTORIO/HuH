// Actor „entscheiden“ (JS): nimmt die Rückkehr des Bausteins „Bestätigung“ entgegen
// und leitet weiter – eintragen, noch einmal verstehen oder abbrechen.
import type { Actor } from "../../typen";

const actor: Actor = {
  id: "entscheiden",
  name: "Entscheiden",
  art: "js",
  beschreibung: "Wertet die Antwort des Bausteins „Bestätigung“ aus: eintragen, korrigieren oder abbrechen.",
  pos: { x: 640, y: 300 },
  async handle(post, k) {
    if (post.art !== "rueckkehr") return { abbruch: "" };
    const r = post.zustand as { entscheidung?: string; korrektur?: string | null; antwort?: string };
    if (post.status !== "fertig") return { abbruch: "Alles klar, ich trage nichts ein." };
    switch (r.entscheidung) {
      case "ja": return { weiter: "eintragen" };
      case "korrektur": return { weiter: "verstehen", zustand: { zeit: {}, geprueft: null, korrektur: r.korrektur || r.antwort || "" } };
      case "nein": return { weiter: "verstehen", sag: "Okay – dann sag mir Datum und Uhrzeiten noch einmal.", zustand: { zeit: {}, geprueft: null, korrektur: null } };
      default: return { abbruch: "Alles klar, ich trage nichts ein." };
    }
  },
};

export default actor;
