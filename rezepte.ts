// Rezepte & Gerichte: Zutaten kommen aus dem Inventar, Rezepte sind Komponenten
// (Knödel, Soße, Salat …), Gerichte setzen sich aus Rezept-Portionen zusammen.
// Daraus ergibt sich der Zutatenbedarf pro Portion – und damit, wie viele
// Portionen der aktuelle Bestand noch hergibt (Engpass-Zutat).

import { randomUUID } from "node:crypto";
import { alle, eins, lauf } from "./db";

export type RezeptZutat = {
  id: string;
  inventar_id: string;
  menge: number; // pro Ansatz, in der Einheit des Inventar-Artikels
  zutat: string;
  einheit: string;
  bestand: number;
};

export type Rezept = {
  id: string;
  name: string;
  ergibt: number; // Portionen pro Ansatz
  notiz: string | null;
  zutaten: RezeptZutat[];
};

// ------------------------------------------------------------------- Rezepte

export async function rezepteLaden(): Promise<Rezept[]> {
  const koepfe = await alle<{ id: string; name: string; ergibt: number; notiz: string | null }>(
    "SELECT * FROM rezepte ORDER BY name",
  );
  const zutaten = await alle<RezeptZutat & { rezept_id: string }>(
    `SELECT z.id, z.rezept_id, z.inventar_id, z.menge,
            i.name AS zutat, i.einheit, i.menge AS bestand
       FROM rezept_zutaten z JOIN inventar i ON i.id = z.inventar_id`,
  );
  return koepfe.map((k) => ({
    ...k,
    zutaten: zutaten.filter((z) => z.rezept_id === k.id),
  }));
}

export type NeuesRezept = {
  name: string;
  ergibt: number;
  notiz: string | null;
  zutaten: { inventar_id: string; menge: number }[];
};

export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: string };

async function rezeptPruefen(r: NeuesRezept): Promise<string | null> {
  if (!r.name) return "Bitte einen Rezeptnamen angeben.";
  if (!Number.isInteger(r.ergibt) || r.ergibt < 1 || r.ergibt > 100) {
    return "„Ergibt Portionen“ muss zwischen 1 und 100 liegen.";
  }
  for (const z of r.zutaten) {
    if (!(z.menge > 0)) return "Zutatenmengen müssen größer als 0 sein.";
    if (!(await eins("SELECT 1 AS x FROM inventar WHERE id = ?", z.inventar_id))) {
      return "Eine Zutat existiert nicht (mehr) im Inventar.";
    }
  }
  return null;
}

export async function rezeptSpeichern(r: NeuesRezept, id?: string): Promise<Ergebnis<string>> {
  const fehler = await rezeptPruefen(r);
  if (fehler) return { ok: false, fehler };
  const klash = await eins<{ id: string }>("SELECT id FROM rezepte WHERE lower(name) = lower(?)", r.name);
  if (klash && klash.id !== id) return { ok: false, fehler: "Ein Rezept mit diesem Namen gibt es schon." };

  if (id) {
    const res = await lauf(
      "UPDATE rezepte SET name = ?, ergibt = ?, notiz = ? WHERE id = ?", r.name, r.ergibt, r.notiz, id,
    );
    if (res.changes === 0) return { ok: false, fehler: "Rezept nicht gefunden." };
    await lauf("DELETE FROM rezept_zutaten WHERE rezept_id = ?", id);
  } else {
    id = randomUUID();
    await lauf("INSERT INTO rezepte (id, name, ergibt, notiz) VALUES (?, ?, ?, ?)", id, r.name, r.ergibt, r.notiz);
  }
  for (const z of r.zutaten) {
    await lauf(
      "INSERT INTO rezept_zutaten (id, rezept_id, inventar_id, menge) VALUES (?, ?, ?, ?)",
      randomUUID(), id, z.inventar_id, z.menge,
    );
  }
  return { ok: true, wert: id };
}

export async function rezeptLoeschen(id: string): Promise<Ergebnis<null>> {
  const verwendet = await eins<{ name: string }>(
    `SELECT g.name FROM gericht_rezepte gr JOIN gerichte g ON g.id = gr.gericht_id
      WHERE gr.rezept_id = ? LIMIT 1`, id,
  );
  if (verwendet) {
    return { ok: false, fehler: `Wird noch im Gericht „${verwendet.name}“ verwendet – erst dort entfernen.` };
  }
  const r = await lauf("DELETE FROM rezepte WHERE id = ?", id);
  return r.changes ? { ok: true, wert: null } : { ok: false, fehler: "Rezept nicht gefunden." };
}

// ------------------------------------------------------------------ Gerichte

export type GerichtKomponente = { id: string; rezept_id: string; rezept: string; portionen: number };
export type Bedarf = { inventar_id: string; zutat: string; einheit: string; proPortion: number; bestand: number };

export type Gericht = {
  id: string;
  name: string;
  preis: string | null;
  aktiv: number;
  komponenten: GerichtKomponente[];
  bedarf: Bedarf[];
  /** Wie viele Portionen der aktuelle Bestand noch hergibt. */
  verfuegbar: number | null;
  /** Die Zutat, die zuerst ausgeht. */
  engpass: string | null;
  /** Ist das Gericht mit einer Position der Website-Karte verknüpft? */
  aufKarte: boolean;
};

/** Zutatenbedarf pro Portion eines Gerichts, aggregiert über alle Komponenten. */
async function bedarfFuer(gerichtId: string): Promise<Bedarf[]> {
  const zeilen = await alle<{
    inventar_id: string; zutat: string; einheit: string; bestand: number;
    menge: number; ergibt: number; portionen: number;
  }>(
    `SELECT z.inventar_id, i.name AS zutat, i.einheit, i.menge AS bestand,
            z.menge, r.ergibt, gr.portionen
       FROM gericht_rezepte gr
       JOIN rezepte r        ON r.id = gr.rezept_id
       JOIN rezept_zutaten z ON z.rezept_id = r.id
       JOIN inventar i       ON i.id = z.inventar_id
      WHERE gr.gericht_id = ?`, gerichtId,
  );
  const karte = new Map<string, Bedarf>();
  for (const z of zeilen) {
    const proPortion = (z.menge / z.ergibt) * z.portionen;
    const b = karte.get(z.inventar_id);
    if (b) b.proPortion += proPortion;
    else karte.set(z.inventar_id, {
      inventar_id: z.inventar_id, zutat: z.zutat, einheit: z.einheit,
      proPortion, bestand: z.bestand,
    });
  }
  return [...karte.values()];
}

export async function gerichteLaden(): Promise<Gericht[]> {
  const koepfe = await alle<{ id: string; name: string; preis: string | null; aktiv: number }>(
    "SELECT * FROM gerichte ORDER BY name",
  );
  const komponenten = await alle<GerichtKomponente & { gericht_id: string }>(
    `SELECT gr.id, gr.gericht_id, gr.rezept_id, gr.portionen, r.name AS rezept
       FROM gericht_rezepte gr JOIN rezepte r ON r.id = gr.rezept_id`,
  );
  const verlinkt = new Set(
    (await alle<{ gericht_id: string }>(
      "SELECT DISTINCT gericht_id FROM karte_positionen WHERE gericht_id IS NOT NULL",
    )).map((r) => r.gericht_id),
  );
  const ergebnis: Gericht[] = [];
  for (const k of koepfe) {
    const bedarf = await bedarfFuer(k.id);
    let verfuegbar: number | null = null;
    let engpass: string | null = null;
    for (const b of bedarf) {
      const moeglich = Math.floor(b.bestand / b.proPortion);
      if (verfuegbar == null || moeglich < verfuegbar) {
        verfuegbar = moeglich;
        engpass = b.zutat;
      }
    }
    ergebnis.push({
      ...k,
      komponenten: komponenten.filter((x) => x.gericht_id === k.id),
      bedarf,
      verfuegbar,
      engpass,
      aufKarte: verlinkt.has(k.id),
    });
  }
  return ergebnis;
}

export type NeuesGericht = {
  name: string;
  preis: string | null;
  komponenten: { rezept_id: string; portionen: number }[];
};

export async function gerichtSpeichern(g: NeuesGericht, id?: string): Promise<Ergebnis<string>> {
  if (!g.name) return { ok: false, fehler: "Bitte einen Gerichtnamen angeben." };
  for (const k of g.komponenten) {
    if (!(k.portionen > 0)) return { ok: false, fehler: "Portionen müssen größer als 0 sein." };
    if (!(await eins("SELECT 1 AS x FROM rezepte WHERE id = ?", k.rezept_id))) {
      return { ok: false, fehler: "Eine Komponente existiert nicht (mehr) als Rezept." };
    }
  }
  const klash = await eins<{ id: string }>("SELECT id FROM gerichte WHERE lower(name) = lower(?)", g.name);
  if (klash && klash.id !== id) return { ok: false, fehler: "Ein Gericht mit diesem Namen gibt es schon." };

  if (id) {
    const res = await lauf("UPDATE gerichte SET name = ?, preis = ? WHERE id = ?", g.name, g.preis, id);
    if (res.changes === 0) return { ok: false, fehler: "Gericht nicht gefunden." };
    await lauf("DELETE FROM gericht_rezepte WHERE gericht_id = ?", id);
  } else {
    id = randomUUID();
    await lauf("INSERT INTO gerichte (id, name, preis, aktiv) VALUES (?, ?, ?, 1)", id, g.name, g.preis);
  }
  for (const k of g.komponenten) {
    await lauf(
      "INSERT INTO gericht_rezepte (id, gericht_id, rezept_id, portionen) VALUES (?, ?, ?, ?)",
      randomUUID(), id, k.rezept_id, k.portionen,
    );
  }
  return { ok: true, wert: id };
}

export async function gerichtLoeschen(id: string): Promise<boolean> {
  return (await lauf("DELETE FROM gerichte WHERE id = ?", id)).changes > 0;
}

/**
 * Verkauf/Zubereitung buchen: zieht den Zutatenbedarf der Portionen vom
 * Inventar ab (nie unter 0). Gibt die abgebuchten Mengen zurück.
 */
export async function kochen(
  gerichtId: string,
  portionen: number,
): Promise<Ergebnis<{ zutat: string; abgebucht: number; einheit: string; rest: number }[]>> {
  if (!(portionen > 0)) return { ok: false, fehler: "Portionen müssen größer als 0 sein." };
  const bedarf = await bedarfFuer(gerichtId);
  if (!bedarf.length) return { ok: false, fehler: "Dieses Gericht hat keine hinterlegten Zutaten." };
  const gebucht = [];
  for (const b of bedarf) {
    const menge = b.proPortion * portionen;
    const rest = Math.max(0, Math.round((b.bestand - menge) * 1000) / 1000);
    await lauf("UPDATE inventar SET menge = ?, aktualisiert = ? WHERE id = ?", rest, Date.now(), b.inventar_id);
    gebucht.push({ zutat: b.zutat, abgebucht: Math.round(menge * 1000) / 1000, einheit: b.einheit, rest });
  }
  return { ok: true, wert: gebucht };
}
