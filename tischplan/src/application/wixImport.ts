import type { ReservationDraft } from '../domain/model';

// Import des Wix-Reservierungs-Exports ("Tischreservierungen….csv").
// Erwartete Spalten: Uhrzeit, Interne Notiz, Name, Personen, Tischname,
// Status, Herkunft, Erstellungsdatum, Telefonnummer, E-Mail-Adresse, Wunsch.

export interface WixImportResult {
  drafts: ReservationDraft[];
  totalRows: number;
  skippedPast: number;
  skippedStatus: number;
  skippedInvalid: number;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (inQuotes) {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; } else { inQuotes = false; }
      } else {
        field += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      row.push(field); field = '';
    } else if (character === '\n' || character === '\r') {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field); field = '';
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += character;
    }
  }
  row.push(field);
  if (row.some((value) => value.trim() !== '')) rows.push(row);
  return rows;
}

function parseWixDate(value: string): { serviceDate: string; startTime: string } | null {
  const match = value.trim().match(/^(\d{2})\.(\d{2})\.(\d{4}),?\s+(\d{2}):(\d{2})/);
  if (!match) return null;
  return {
    serviceDate: `${match[3]}-${match[2]}-${match[1]}`,
    startTime: `${match[4]}:${match[5]}`,
  };
}

const ACTIVE_STATUSES = new Set(['reserviert', 'bestätigt']);

export function parseWixExport(
  text: string,
  todayServiceDate: string,
  defaultDurationMinutes: (partySize: number) => number,
): WixImportResult {
  const rows = parseCsv(text.replace(/^﻿/, ''));
  const result: WixImportResult = { drafts: [], totalRows: Math.max(0, rows.length - 1), skippedPast: 0, skippedStatus: 0, skippedInvalid: 0 };
  if (rows.length < 2) return result;
  const header = rows[0].map((value) => value.trim().toLowerCase());
  const column = (needle: string) => header.findIndex((value) => value.includes(needle));
  const timeColumn = column('uhrzeit');
  const nameColumn = column('name');
  const paxColumn = column('personen');
  const statusColumn = column('status');
  const phoneColumn = column('telefon');
  const emailColumn = column('e-mail');
  const wishColumn = column('wunsch');
  const internalColumn = column('interne notiz');
  if (timeColumn < 0 || nameColumn < 0 || paxColumn < 0 || statusColumn < 0) return result;

  for (const row of rows.slice(1)) {
    const parsed = parseWixDate(row[timeColumn] ?? '');
    const partySize = Number.parseInt((row[paxColumn] ?? '').trim(), 10);
    const name = (row[nameColumn] ?? '').trim().replace(/\s+/g, ' ');
    if (!parsed || !name || !Number.isFinite(partySize) || partySize < 1) {
      result.skippedInvalid += 1;
      continue;
    }
    const status = (row[statusColumn] ?? '').trim().toLowerCase();
    if (!ACTIVE_STATUSES.has(status)) {
      result.skippedStatus += 1;
      continue;
    }
    if (parsed.serviceDate < todayServiceDate) {
      result.skippedPast += 1;
      continue;
    }
    const notes = [
      internalColumn >= 0 ? (row[internalColumn] ?? '').trim() : '',
      wishColumn >= 0 ? (row[wishColumn] ?? '').trim() : '',
    ].filter(Boolean).join(' · ');
    result.drafts.push({
      serviceDate: parsed.serviceDate,
      startTime: parsed.startTime,
      partySize,
      name,
      phone: phoneColumn >= 0 ? (row[phoneColumn] ?? '').trim() : '',
      email: emailColumn >= 0 ? (row[emailColumn] ?? '').trim() : '',
      notes,
      source: 'online',
      preference: 'none',
      allowTableSharing: false,
      durationMinutes: defaultDurationMinutes(partySize),
    });
  }
  return result;
}
