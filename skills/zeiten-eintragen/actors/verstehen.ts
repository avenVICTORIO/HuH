// Actor „verstehen“ (KI): holt Datum, Von und Bis aus der Nachricht.
// Fehlt etwas, fragt er nach – die Antwort landet wieder in seiner Inbox.
import type { Actor } from "../../typen";

type Extrakt = { datum: string | null; von: string | null; bis: string | null; rueckfrage?: string | null };

const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

function fallback(text: string, heute: string): Extrakt {
  // Ohne KI: einfache Muster (HH:MM–HH:MM, heute/gestern/vorgestern).
  const zeiten = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?/gi)].map((m) => `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`);
  const d = new Date(heute + "T12:00:00");
  if (/vorgestern/i.test(text)) d.setDate(d.getDate() - 2);
  else if (/gestern/i.test(text)) d.setDate(d.getDate() - 1);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const datum = /heute|gestern|vorgestern/i.test(text) ? iso(d) : (text.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? null);
  return { datum, von: zeiten[0] ?? null, bis: zeiten[1] ?? null };
}

const actor: Actor = {
  id: "verstehen",
  name: "Verstehen",
  art: "ki",
  beschreibung: "Liest Datum, Beginn und Ende aus der Nachricht; fragt nach, was fehlt.",
  pos: { x: 40, y: 120 },
  async handle(post, k) {
    const bisher = (k.zustand.zeit as Partial<Extrakt> | undefined) ?? {};
    const text = post.art === "weiter" ? "" : post.text;
    const heuteD = new Date(k.heute + "T12:00:00");

    let neu: Extrakt;
    if (k.ki.aktiv) {
      const system = [
        `Du extrahierst Arbeitszeiten aus Chat-Nachrichten eines Restaurant-Teams. Heute ist ${WT[heuteD.getDay()]}, der ${k.heute}.`,
        `Antworte NUR mit JSON: {"datum":"YYYY-MM-DD"|null,"von":"HH:MM"|null,"bis":"HH:MM"|null,"rueckfrage":string|null}.`,
        `Relative Angaben (gestern, Montag, vorgestern) in ein konkretes Datum in der Vergangenheit oder heute umrechnen.`,
        `Uhrzeiten 24h; „halb fünf“ = 16:30 am Nachmittag, wenn es um Gastro-Schichten geht. Wenn etwas fehlt oder unklar ist,`,
        `formuliere in "rueckfrage" eine kurze, freundliche Frage (per Du) nach genau dem, was fehlt. Bereits Bekanntes: ${JSON.stringify(bisher)}.`,
      ].join(" ");
      neu = await k.ki.json<Extrakt>(system, text || "(keine neue Angabe)");
    } else {
      neu = fallback(text, k.heute);
    }

    const zeit: Extrakt = {
      datum: neu.datum ?? bisher.datum ?? null,
      von: neu.von ?? bisher.von ?? null,
      bis: neu.bis ?? bisher.bis ?? null,
    };
    const fehlt = [!zeit.datum && "das Datum", !zeit.von && "den Beginn", !zeit.bis && "das Ende"].filter(Boolean) as string[];
    if (fehlt.length) {
      const frage = neu.rueckfrage?.trim() || `Für welchen Tag und von wann bis wann? Mir fehlt noch ${fehlt.join(" und ")}.`;
      return { frage, zustand: { zeit } };
    }
    return { weiter: "pruefen", zustand: { zeit } };
  },
};

export default actor;
