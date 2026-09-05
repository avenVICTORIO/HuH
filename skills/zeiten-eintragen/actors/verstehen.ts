// Actor „verstehen“ (KI): holt Datum, Von und Bis aus der Nachricht.
// Fehlt etwas, fragt er nach – die Antwort landet wieder in seiner Inbox.
// Erkennt auch, wenn die Person abbrechen möchte.
import type { Actor } from "../../typen";

type Extrakt = { datum: string | null; von: string | null; bis: string | null; rueckfrage?: string | null; abbruch?: boolean };

const WT = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

const actor: Actor = {
  id: "verstehen",
  name: "Verstehen",
  art: "ki",
  beschreibung: "Liest Datum, Beginn und Ende aus der Nachricht; fragt nach, was fehlt; erkennt einen Abbruchwunsch.",
  pos: { x: 40, y: 120 },
  async handle(post, k) {
    if (!k.ki.aktiv) return { abbruch: "Die KI ist gerade nicht verfügbar – bitte trag die Zeit über „Meine Zeiten“ nach oder sag der Leitung Bescheid." };
    const bisher = (k.zustand.zeit as Partial<Extrakt> | undefined) ?? {};
    const text = post.art === "weiter" ? String(k.zustand.korrektur ?? "") : post.text;
    const heuteD = new Date(k.heute + "T12:00:00");

    const system = [
      `Du extrahierst Arbeitszeiten aus Chat-Nachrichten eines Restaurant-Teams. Heute ist ${WT[heuteD.getDay()]}, der ${k.heute}.`,
      `Antworte NUR mit JSON: {"datum":"YYYY-MM-DD"|null,"von":"HH:MM"|null,"bis":"HH:MM"|null,"rueckfrage":string|null,"abbruch":boolean}.`,
      `Relative Angaben (gestern, vorgestern, Montag, letzten Freitag) in ein konkretes Datum heute oder in der Vergangenheit umrechnen.`,
      `Uhrzeiten 24h; „halb fünf“ = 16:30 am Nachmittag, wenn es um Gastro-Schichten geht. Bereits Bekanntes: ${JSON.stringify(bisher)} –`,
      `nur überschreiben, wenn die Nachricht etwas Neues dazu sagt. Fehlt etwas, formuliere in "rueckfrage" eine kurze, freundliche Frage (per Du)`,
      `nach genau dem, was fehlt. abbruch = true, wenn die Person nicht mehr eintragen möchte (z. B. „vergiss es“, „lass gut sein“, „stopp“).`,
    ].join(" ");
    const neu = await k.ki.json<Extrakt>(system, text || "(keine neue Angabe)");
    if (neu.abbruch) return { abbruch: "Alles klar, ich trage nichts ein." };

    const zeit: Extrakt = {
      datum: neu.datum ?? bisher.datum ?? null,
      von: neu.von ?? bisher.von ?? null,
      bis: neu.bis ?? bisher.bis ?? null,
    };
    const fehlt = [!zeit.datum && "das Datum", !zeit.von && "den Beginn", !zeit.bis && "das Ende"].filter(Boolean) as string[];
    if (fehlt.length) {
      const frage = neu.rueckfrage?.trim() || `Für welchen Tag und von wann bis wann? Mir fehlt noch ${fehlt.join(" und ")}.`;
      return { frage, zustand: { zeit, korrektur: null } };
    }
    return { weiter: "pruefen", zustand: { zeit, korrektur: null } };
  },
};

export default actor;
