// Baustein „Bestätigung“ (Leaf-Skill): stellt eine Ja/Nein-Frage im Chat und
// versteht die Antwort per KI – Ja, Nein, Korrektur oder Abbruch. Wird von
// anderen Flows mit `rufe` verwendet; Eingabe: { frage }, Rückgabe im Zustand:
// { entscheidung: "ja"|"nein"|"korrektur"|"abbruch", korrektur?: string, antwort: string }.
import type { Flow } from "../typen";
import fragen from "./actors/fragen";

const flow: Flow = {
  id: "bestaetigung",
  name: "Bestätigung",
  beschreibung: "Wiederverwendbarer Baustein: stellt eine Rückfrage und versteht Ja, Nein, eine Korrektur oder einen Rückzieher – ohne Schlüsselwörter.",
  beispiele: [],
  baustein: true,
  start: "fragen",
  actors: [fragen],
  kanten: [{ von: "fragen", nach: "fragen", label: "unklar" }],
};

export default flow;
