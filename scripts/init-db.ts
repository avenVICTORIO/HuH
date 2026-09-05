// Manuell: `bun run init-db` legt data/pg an und führt Migrationen + Seeds aus.
// Bewusst NICHT mehr als postinstall: Läuft dabei parallel der Dev-Server, öffnen zwei
// Prozesse dasselbe PGlite-Verzeichnis und zerstören das WAL. Der Server migriert ohnehin beim Start.
import { existsSync } from "node:fs";
if (existsSync("data/pg/postmaster.pid")) {
  console.error("Abbruch: data/pg ist bereits von einem laufenden Prozess geöffnet (postmaster.pid). Server stoppen oder einfach den Server starten – er migriert selbst.");
  process.exit(1);
}
await import("../db");
console.log("Datenbank bereit (data/pg)");
const g = globalThis as { __huh_pg?: { close(): Promise<void> } };
await g.__huh_pg?.close();
