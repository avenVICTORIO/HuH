// Actor „eintragen“ (JS): schreibt die Sitzung als Ein-/Ausstempel-Paar und meldet Vollzug.
import type { Actor } from "../../typen";
import { sitzungAnlegen } from "../../../auth";
import * as live from "../../../live";

const actor: Actor = {
  id: "eintragen",
  name: "Eintragen",
  art: "js",
  beschreibung: "Legt die Zeit als Stempel-Paar an und stößt die Live-Aktualisierung der Zeiten an.",
  pos: { x: 940, y: 120 },
  async handle(_post, k) {
    const g = k.zustand.geprueft as { start: number; ende: number; anzeige: string };
    const s = await sitzungAnlegen(k.person.id, g.start, g.ende);
    live.sende("alle", { typ: "zeiten" });
    return {
      fertig: `Eingetragen: ${g.anzeige}. Du findest die Zeit unter „Meine Zeiten“.`,
      zustand: { eingetragen: { inId: s.inId, outId: s.outId } },
    };
  },
};

export default actor;
