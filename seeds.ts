// Startdaten für eine leere Datenbank. Jeder Seed prüft selbst, ob er schon gelaufen ist,
// und ist damit bei jedem Start harmlos. Fachdaten gehen über den Dokumentenspeicher
// (englische Views), damit Validierung und Historie greifen wie im Betrieb.
import { randomUUID } from "node:crypto";
import { alle, eins, lauf } from "./db";

const leer = async (tabelle: string) =>
  Number((await eins<{ c: number | string }>(`SELECT COUNT(*) AS c FROM ${tabelle}`))?.c ?? 0) === 0;

/** Rollen-Katalog mit Fähigkeiten: Inhaber alles, alle anderen dürfen Reservierungen pflegen. */
async function rollen() {
  if (!(await leer("rollen"))) return;
  const ROLLEN: [string, string][] = [
    ["Inhaber", "*"], ["Koch", "reservierungen"], ["Kochhilfe", "reservierungen"],
    ["Service", "reservierungen"], ["Cleaning", "reservierungen"],
  ];
  for (const [name, caps] of ROLLEN) await lauf("INSERT INTO rollen (name, capabilities) VALUES (?, ?)", name, caps);
  console.log("🌱 Rollen angelegt (Inhaber, Koch, Kochhilfe, Service, Cleaning)");
}

/** Erstes Konto: Inhaber ohne Passkey – der Bootstrap-Login legt den Passkey beim ersten Start an. */
async function team() {
  if (!(await leer("mitarbeiter"))) return;
  await lauf(
    "INSERT INTO mitarbeiter (id, name, vorname, nachname, role, admin) VALUES (?, ?, ?, ?, ?, ?)",
    randomUUID(), "Victorio", "Victorio", null, "Inhaber", 1,
  );
  console.log("🌱 Team befüllt: Victorio (Inhaber/Admin) – Passkey beim ersten Login anlegen");
}

/** Standard-Tag: 1 Koch, 1 Kochhilfe, 2 Service, 1 Cleaning – täglich außer Dienstag (Ruhetag). */
async function schichtVorlage() {
  if (!(await leer("shift_rules"))) return;
  const OHNE_DI = "0,1,3,4,5,6";
  const REGELN: [string, string, string, number][] = [
    ["Koch", "14:00", "22:30", 1],
    ["Kochhilfe", "15:00", "23:00", 1],
    ["Service", "16:30", "22:30", 2],
    ["Cleaning", "12:00", "15:00", 1],
  ];
  for (let i = 0; i < REGELN.length; i++) {
    const [role, start, end, count] = REGELN[i];
    await lauf(
      'INSERT INTO shift_rules (id, role, start, "end", weekdays, count, rhythm, start_date, active, sort_order) VALUES (?, ?, ?, ?, ?, ?, \'woechentlich\', NULL, 1, ?)',
      randomUUID(), role, start, end, OHNE_DI, count, i + 1,
    );
  }
  console.log("🌱 Schicht-Vorlage angelegt (1 Koch, 1 Kochhilfe, 2 Service, 1 Cleaning)");
}

/** Speise- und Getränkekarte aus site/karte-daten.ts (Stand Juli 2026) – danach pflegt das Team sie unter /app/karte. */
async function karte() {
  if (!(await leer("menu_groups"))) return;
  const { SPEISEN, GETRAENKE } = await import("./site/karte-daten");
  let gSort = 0;
  for (const kapitel of [...SPEISEN, ...GETRAENKE]) {
    for (const gruppe of kapitel.gruppen) {
      const gid = randomUUID();
      await lauf(
        "INSERT INTO menu_groups (id, chapter, title, columns, footnote, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
        gid, kapitel.id, gruppe.titel, gruppe.spalten?.join("|") ?? null, gruppe.fussnote ?? null, ++gSort,
      );
      let pSort = 0;
      for (const g of gruppe.gerichte) {
        await lauf(
          "INSERT INTO menu_items (id, group_id, name, text, option, tags, star, prices, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
          randomUUID(), gid, g.name, g.text ?? null, g.option ?? null,
          g.tags?.join(",") ?? null, g.stern ? 1 : 0, g.preis ?? null, ++pSort,
        );
      }
      for (const z of gruppe.zeilen ?? []) {
        await lauf(
          "INSERT INTO menu_items (id, group_id, name, text, option, tags, star, prices, sort_order, active) VALUES (?, ?, ?, ?, NULL, NULL, 0, ?, ?, 1)",
          randomUUID(), gid, z.name, z.text ?? null,
          z.preise.map((p) => p ?? "").join("|"), ++pSort,
        );
      }
    }
  }
  const n = await alle("SELECT 1 AS x FROM menu_items");
  console.log(`🌱 Speisekarte importiert: ${gSort} Gruppen, ${n.length} Positionen`);
}

/** Ablauf-Checklisten (Aufbau/Leerlauf/Abbau) aus ablaeufe-daten.ts. */
async function ablaeufe() {
  if (!(await leer("routine_tasks"))) return;
  const { ABLAEUFE_SEED } = await import("./ablaeufe-daten");
  const sort: Record<string, number> = { aufbau: 0, leerlauf: 0, abbau: 0 };
  for (const a of ABLAEUFE_SEED) {
    await lauf(
      'INSERT INTO routine_tasks (id, process, "group", title, info, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      randomUUID(), a.prozess, a.gruppe, a.titel, a.info, sort[a.prozess]++,
    );
  }
  console.log(`🌱 Abläufe befüllt: ${ABLAEUFE_SEED.length} Aufgaben (Aufbau/Leerlauf/Abbau)`);
}

/** Alle Seeds in Abhängigkeitsreihenfolge; Historie-Einträge tragen den Akteur "seed". */
export async function saeen() {
  await lauf("SELECT set_config('huh.user', 'seed', false)");
  await rollen();
  await team();
  await schichtVorlage();
  await karte();
  await ablaeufe();
  await lauf("SELECT set_config('huh.user', '', false)");
}
