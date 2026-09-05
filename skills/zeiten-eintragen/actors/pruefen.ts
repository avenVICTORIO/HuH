// Actor „prüfen“ (JS): Plausibilität, Überschneidungen, Dauer. Reine Logik, keine KI.
import type { Actor } from "../../typen";
import { sitzungenFuer } from "../../../auth";

const WT = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MON = ["Jan.", "Feb.", "März", "April", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

export function lokalTs(datum: string, zeit: string): number {
  const [y, m, d] = datum.split("-").map(Number);
  const [hh, mm] = zeit.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm).getTime();
}
export function datumSchoen(datum: string) {
  const [y, m, d] = datum.split("-").map(Number);
  const x = new Date(y, m - 1, d);
  return `${WT[x.getDay()]}, ${d}. ${MON[m - 1]}`;
}
const hm = (ts: number) => { const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };

const actor: Actor = {
  id: "pruefen",
  name: "Prüfen",
  art: "js",
  beschreibung: "Prüft Datum und Uhrzeiten, erkennt Überschneidungen mit vorhandenen Zeiten, rechnet die Dauer und ruft den Baustein „Bestätigung“.",
  pos: { x: 340, y: 120 },
  async handle(_post, k) {
    const z = k.zustand.zeit as { datum: string; von: string; bis: string };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(z.datum) || !/^\d{2}:\d{2}$/.test(z.von) || !/^\d{2}:\d{2}$/.test(z.bis)) {
      return { weiter: "verstehen", sag: "Das habe ich nicht sauber lesen können – sag mir Datum und Uhrzeiten bitte noch einmal.", zustand: { zeit: {} } };
    }
    if (z.datum > k.heute) {
      return { weiter: "verstehen", sag: "Das Datum liegt in der Zukunft – Zeiten kann ich nur nachtragen, nicht vorbuchen. Welcher Tag war es?", zustand: { zeit: { von: z.von, bis: z.bis } } };
    }
    const start = lokalTs(z.datum, z.von);
    let ende = lokalTs(z.datum, z.bis);
    if (ende <= start) ende += 86400000; // Feierabend nach Mitternacht
    const dauerH = (ende - start) / 3600000;
    if (dauerH > 16) {
      return { weiter: "verstehen", sag: `${z.von} bis ${z.bis} wären ${dauerH.toFixed(1)} Stunden – das passt nicht. Von wann bis wann war es wirklich?`, zustand: { zeit: { datum: z.datum } } };
    }
    if (ende > Date.now()) {
      return { weiter: "verstehen", sag: "Das Ende liegt noch in der Zukunft. Bis wann warst du da?", zustand: { zeit: { datum: z.datum, von: z.von } } };
    }
    const vorhandene = await sitzungenFuer(k.person.id, start - 86400000, ende + 86400000);
    const ueberlappt = vorhandene.filter((s) => s.start < ende && (s.end ?? Date.now()) > start);
    if (ueberlappt.length) {
      const liste = ueberlappt.map((s) => `${hm(s.start)}–${s.end ? hm(s.end) : "offen"}`).join(", ");
      return { weiter: "verstehen", sag: `An dem Tag ist schon Zeit erfasst (${liste}), die sich damit überschneidet. Welche Zeit soll ich stattdessen eintragen?`, zustand: { zeit: { datum: z.datum } } };
    }
    const anzeige = `${datumSchoen(z.datum)}, ${z.von}–${z.bis} Uhr (${dauerH.toFixed(dauerH % 1 ? 1 : 0).replace(".", ",")} h)`;
    // Rückfrage über den Baustein „Bestätigung“ – die Antwort kommt bei „entscheiden“ an.
    return {
      rufe: "bestaetigung",
      dann: "entscheiden",
      eingabe: { frage: `Ich trage ein: ${anzeige}. Passt das?` },
      zustand: { geprueft: { start, ende, dauerH: Math.round(dauerH * 100) / 100, anzeige } },
    };
  },
};

export default actor;
