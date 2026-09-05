// Actor „bestätigen“ (JS): zeigt die Zusammenfassung, wartet auf Ja/Nein.
import type { Actor } from "../../typen";

const JA = /^\s*(ja|jo|jep|jup|yes|passt|stimmt|genau|ok(ay)?|klar|gerne|mach|bitte|👍|✅)\b/i;
const NEIN = /^\s*(nein|nö|ne|nope|falsch|stopp?|nicht|anders|ändern|korrigier)/i;

const actor: Actor = {
  id: "bestaetigen",
  name: "Bestätigen",
  art: "js",
  beschreibung: "Fasst zusammen und holt ein klares Ja ein, bevor etwas geschrieben wird.",
  pos: { x: 640, y: 120 },
  async handle(post, k) {
    const g = k.zustand.geprueft as { anzeige: string };
    if (post.art !== "antwort") {
      return { frage: `Ich trage ein: ${g.anzeige}. Passt das? (ja / nein)` };
    }
    if (JA.test(post.text)) return { weiter: "eintragen" };
    if (NEIN.test(post.text)) {
      return { weiter: "verstehen", sag: "Okay – dann sag mir Datum und Uhrzeiten noch einmal.", zustand: { zeit: {}, geprueft: null } };
    }
    // Vielleicht hat die Person direkt korrigierte Zeiten geschickt.
    if (/\d{1,2}[:.]\d{2}|\d{1,2}\s*uhr|gestern|heute|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag/i.test(post.text)) {
      return { weiter: "verstehen", zustand: { zeit: {}, geprueft: null, korrektur: post.text } };
    }
    return { frage: `Kurz ja oder nein: ${g.anzeige} eintragen?` };
  },
};

export default actor;
