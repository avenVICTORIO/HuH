import type { AppSettings, Reservation, ReservationDraft } from '../domain/model';
import { durationForPartySize } from '../domain/settings';

export function createReservation(
  draft: ReservationDraft,
  settings: AppSettings,
  id: string,
  now: number,
): Reservation {
  const name = draft.source === 'walk-in'
    ? (draft.name.trim() || 'Walk-in')
    : draft.name.trim();
  if (!name) {
    throw new Error('Ein Name ist erforderlich.');
  }
  if (!Number.isInteger(draft.partySize) || draft.partySize < 1 || draft.partySize > 50) {
    throw new Error('Die Personenzahl muss zwischen 1 und 50 liegen.');
  }

  return {
    id,
    serviceDate: draft.serviceDate,
    startTime: draft.startTime,
    durationMinutes: draft.durationMinutes
      ?? durationForPartySize(draft.partySize, settings),
    delayMinutes: 0,
    partySize: draft.partySize,
    name,
    phone: draft.phone?.trim() ?? '',
    email: draft.email?.trim() ?? '',
    notes: draft.notes?.trim() ?? '',
    source: draft.source,
    preference: draft.preference,
    allowTableSharing: draft.allowTableSharing ?? draft.source === 'walk-in',
    status: 'unassigned',
    createdAt: now,
    updatedAt: now,
  };
}
