// Passkey-Login (WebAuthn) für das Team: ersetzt die frühere PIN-Logik.
// Registrierung legt einen discoverable Passkey an (Face ID / Touch ID /
// Geräte-PIN), der Login funktioniert ohne Benutzername direkt am Terminal.

import { randomUUID } from "node:crypto";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { alle, eins, lauf, type Mitarbeiter } from "./db";

const RP_NAME = "Hand aufs Herz";

/** rpID/Origin aus dem Request ableiten – localhost in Dev, Domain in Produktion. */
export function rpAus(req: Request) {
  const url = new URL(req.url);
  const origin = req.headers.get("origin") ?? `${url.protocol}//${url.host}`;
  return { rpID: url.hostname, origin };
}

// Offene Challenges (kurzlebig). Überlebt Hot-Reloads via globalThis.
type OffeneChallenge = {
  zweck: "registrierung" | "login";
  mitarbeiterId?: string;
  einladung?: string;
  bootstrap?: boolean;
  ablauf: number;
};
const g = globalThis as { __huh_challenges?: Map<string, OffeneChallenge> };
const CHALLENGES = (g.__huh_challenges ??= new Map());

function merkeChallenge(challenge: string, daten: Omit<OffeneChallenge, "ablauf">) {
  for (const [c, d] of CHALLENGES) if (d.ablauf < Date.now()) CHALLENGES.delete(c);
  CHALLENGES.set(challenge, { ...daten, ablauf: Date.now() + 5 * 60_000 });
}

function nimmChallenge(challenge: string, zweck: OffeneChallenge["zweck"]): OffeneChallenge | null {
  const d = CHALLENGES.get(challenge);
  if (!d || d.zweck !== zweck || d.ablauf < Date.now()) return null;
  CHALLENGES.delete(challenge);
  return d;
}

const b64url = (u8: Uint8Array) => Buffer.from(u8).toString("base64url");

export type PasskeyZeile = {
  id: string;
  mitarbeiter_id: string;
  public_key: string;
  counter: number;
  transports: string | null;
};

export const passkeysVon = (mitarbeiterId: string) =>
  alle<PasskeyZeile>("SELECT * FROM passkeys WHERE mitarbeiter_id = ?", mitarbeiterId);

// -------------------------------------------------------------- Registrierung

export type Ergebnis<T> = { ok: true; wert: T } | { ok: false; fehler: string };

/** Bootstrap-Modus: solange noch niemand im Haus einen Passkey hat. */
export async function istBootstrap(): Promise<boolean> {
  return !(await eins("SELECT 1 AS x FROM passkeys LIMIT 1"));
}

export type Einladung = {
  code: string;
  mitarbeiter_id: string;
  gueltig_bis: number;
  benutzt: number | null;
};

/** Einladung prüfen; liefert den eingeladenen Mitarbeiter. */
export async function einladungPruefen(code: string): Promise<Ergebnis<Mitarbeiter>> {
  const e = await eins<Einladung>("SELECT * FROM einladungen WHERE code = ?", code);
  if (!e) return { ok: false, fehler: "Diese Einladung gibt es nicht." };
  if (e.benutzt) return { ok: false, fehler: "Diese Einladung wurde schon benutzt." };
  if (e.gueltig_bis < Date.now()) return { ok: false, fehler: "Diese Einladung ist abgelaufen – bitte beim Admin eine neue holen." };
  const m = await eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE id = ?", e.mitarbeiter_id);
  return m ? { ok: true, wert: m } : { ok: false, fehler: "Das eingeladene Konto existiert nicht mehr." };
}

async function optionenFuer(req: Request, m: Mitarbeiter, extra: Partial<OffeneChallenge>) {
  const { rpID } = rpAus(req);
  const optionen = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userID: new TextEncoder().encode(m.id),
    userName: m.name,
    userDisplayName: m.name,
    attestationType: "none",
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  merkeChallenge(optionen.challenge, { zweck: "registrierung", mitarbeiterId: m.id, ...extra });
  return optionen;
}

/**
 * Bootstrap-Registrierung: Nur solange es im ganzen Haus noch keinen Passkey
 * gibt. Der allererste Passkey macht die Person zum Inhaber/Admin – danach ist
 * jede Registrierung invite-only.
 */
export async function bootstrapOptionen(
  req: Request,
  vorname: string,
  nachname: string,
): Promise<Ergebnis<{ optionen: unknown }>> {
  if (!(await istBootstrap())) {
    return { ok: false, fehler: "Konten gibt es nur per Einladungslink vom Admin." };
  }
  const name = nachname ? `${vorname} ${nachname}` : vorname;
  // Namensgleiches Seed-Konto übernehmen, sonst neu anlegen – in jedem Fall Inhaber.
  let m = await eins<Mitarbeiter>(
    "SELECT * FROM mitarbeiter WHERE lower(vorname) = lower(?) AND lower(COALESCE(nachname, '')) = lower(?)",
    vorname, nachname,
  );
  if (m) {
    await lauf("UPDATE mitarbeiter SET role = 'Inhaber', admin = 1 WHERE id = ?", m.id);
  } else {
    m = {
      id: randomUUID(), name, vorname, nachname: nachname || null,
      role: "Inhaber", admin: 1, ma_code: null, personalnr: null, soll_std: null,
    };
    await lauf(
      "INSERT INTO mitarbeiter (id, name, vorname, nachname, role, admin) VALUES (?, ?, ?, ?, 'Inhaber', 1)",
      m.id, m.name, m.vorname, m.nachname,
    );
  }
  return { ok: true, wert: { optionen: await optionenFuer(req, m, { bootstrap: true }) } };
}

/** Registrierung über einen Einladungslink (der Normalfall). */
export async function einladungOptionen(
  req: Request,
  code: string,
): Promise<Ergebnis<{ optionen: unknown }>> {
  const e = await einladungPruefen(code);
  if (!e.ok) return e;
  const vorhandene = await passkeysVon(e.wert.id);
  if (vorhandene.length) {
    return { ok: false, fehler: `${e.wert.name} hat schon einen Passkey – bitte „Anmelden“ nutzen.` };
  }
  return { ok: true, wert: { optionen: await optionenFuer(req, e.wert, { einladung: code }) } };
}

/** Registrierungs-Antwort des Browsers prüfen und Passkey speichern. */
export async function registrierungAbschliessen(
  req: Request,
  antwort: { response?: { clientDataJSON?: string } },
): Promise<Ergebnis<string>> {
  const { rpID, origin } = rpAus(req);
  const clientData = antwort?.response?.clientDataJSON;
  if (!clientData) return { ok: false, fehler: "Ungültige Antwort" };
  const challenge = JSON.parse(Buffer.from(clientData, "base64url").toString()).challenge as string;
  const offen = nimmChallenge(challenge, "registrierung");
  if (!offen?.mitarbeiterId) return { ok: false, fehler: "Anmeldeversuch abgelaufen – bitte neu starten." };

  let pruefung;
  try {
    pruefung = await verifyRegistrationResponse({
      response: antwort as never,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (e) {
    return { ok: false, fehler: `Passkey konnte nicht geprüft werden: ${(e as Error).message}` };
  }
  if (!pruefung.verified || !pruefung.registrationInfo) {
    return { ok: false, fehler: "Passkey wurde nicht akzeptiert." };
  }
  // Rennen absichern: Bootstrap gilt nur, solange wirklich noch kein Passkey existiert.
  if (offen.bootstrap && !(await istBootstrap())) {
    return { ok: false, fehler: "Konten gibt es inzwischen nur per Einladungslink vom Admin." };
  }
  if (offen.einladung) {
    const e = await einladungPruefen(offen.einladung);
    if (!e.ok) return e;
    await lauf("UPDATE einladungen SET benutzt = ? WHERE code = ?", Date.now(), offen.einladung);
  }

  const c = pruefung.registrationInfo.credential;
  await lauf(
    "INSERT INTO passkeys (id, mitarbeiter_id, public_key, counter, transports, erstellt) VALUES (?, ?, ?, ?, ?, ?)",
    c.id, offen.mitarbeiterId, b64url(c.publicKey), c.counter,
    c.transports?.join(",") ?? null, Date.now(),
  );
  return { ok: true, wert: offen.mitarbeiterId };
}

// ---------------------------------------------------------------------- Login

/** Login-Optionen: ohne Benutzername, der Passkey identifiziert die Person. */
export async function loginOptionen(req: Request) {
  const { rpID } = rpAus(req);
  const optionen = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });
  merkeChallenge(optionen.challenge, { zweck: "login" });
  return optionen;
}

/** Login-Antwort prüfen; liefert den Mitarbeiter. */
export async function loginAbschliessen(
  req: Request,
  antwort: { id?: string; response?: { clientDataJSON?: string } },
): Promise<Ergebnis<Mitarbeiter>> {
  const { rpID, origin } = rpAus(req);
  const clientData = antwort?.response?.clientDataJSON;
  if (!antwort?.id || !clientData) return { ok: false, fehler: "Ungültige Antwort" };
  const challenge = JSON.parse(Buffer.from(clientData, "base64url").toString()).challenge as string;
  if (!nimmChallenge(challenge, "login")) {
    return { ok: false, fehler: "Anmeldeversuch abgelaufen – bitte neu starten." };
  }

  const zeile = await eins<PasskeyZeile>("SELECT * FROM passkeys WHERE id = ?", antwort.id);
  if (!zeile) return { ok: false, fehler: "Dieser Passkey ist hier nicht (mehr) registriert." };

  let pruefung;
  try {
    pruefung = await verifyAuthenticationResponse({
      response: antwort as never,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: zeile.id,
        publicKey: new Uint8Array(Buffer.from(zeile.public_key, "base64url")),
        counter: zeile.counter,
        transports: zeile.transports?.split(",") as never,
      },
    });
  } catch (e) {
    return { ok: false, fehler: `Anmeldung fehlgeschlagen: ${(e as Error).message}` };
  }
  if (!pruefung.verified) return { ok: false, fehler: "Anmeldung wurde nicht akzeptiert." };

  await lauf(
    "UPDATE passkeys SET counter = ? WHERE id = ?",
    pruefung.authenticationInfo.newCounter, zeile.id,
  );
  const m = await eins<Mitarbeiter>("SELECT * FROM mitarbeiter WHERE id = ?", zeile.mitarbeiter_id);
  return m ? { ok: true, wert: m } : { ok: false, fehler: "Konto nicht gefunden." };
}
