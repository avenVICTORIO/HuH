import type { AppSettings, AppState, Reservation, TableDefinition } from './model';
import { isWithinOpeningHours, openingHoursForDate } from './settings';
import { optionForReservation, placementAvailabilityReason } from './solver';
import { buildTableOptions } from './tableCatalog';
import {
  MINUTE_MS,
  dateToServiceDate,
  formatServiceDate,
  reservationMealEnd,
  reservationResetEnd,
  reservationStart,
  serviceDateTime,
  shiftServiceDate,
} from './time';

export const MIN_TIMELINE_MINUTES = 3 * 60;
export const MAX_TIMELINE_MINUTES = 30 * 24 * 60;
export const TIMELINE_BUFFER_SPANS = 5;
export const MIN_DETAIL_TIMELINE_BUFFER_MINUTES = 30 * 24 * 60;
export const COLLAPSED_CLOSED_MINUTES = 60;

export interface TimelineWindow {
  startAt: number;
  endAt: number;
  centerAt: number;
  visibleMinutes: number;
  pixelsPerMinute: number;
  width: number;
}

export interface TimelineReservation {
  reservation: Reservation;
  startAt: number;
  mealEndAt: number;
  endAt: number;
}

export interface TimelineOpening {
  serviceDate: string;
  startAt: number;
  endAt: number;
}

export interface TimelineMarker {
  at: number;
  major: boolean;
  label: string;
  showLabel: boolean;
}

export interface TimelineDateMarker {
  at: number;
  boundaryAt: number;
  label: string;
  showLabel: boolean;
}

export interface TimelineProjectionSegment {
  startAt: number;
  endAt: number;
  displayStartMinute: number;
  displayEndMinute: number;
  scale: number;
  open: boolean;
}

export interface TimelineProjection {
  segments: TimelineProjectionSegment[];
  pixelsPerDisplayMinute: number;
  width: number;
  startAt: number;
  endAt: number;
}

function clockMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minuteToClock(value: number): string {
  const normalized = ((value % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
}

export function timelineVisibleMinutes(zoomLevel: number): number {
  const normalized = Math.min(1, Math.max(0, zoomLevel / 1_000));
  const ratio = MIN_TIMELINE_MINUTES / MAX_TIMELINE_MINUTES;
  return Math.round(MAX_TIMELINE_MINUTES * ratio ** normalized);
}

export function timelineZoomForVisibleMinutes(minutes: number): number {
  const bounded = Math.min(MAX_TIMELINE_MINUTES, Math.max(MIN_TIMELINE_MINUTES, minutes));
  return Math.round(1_000 * Math.log(bounded / MAX_TIMELINE_MINUTES) / Math.log(MIN_TIMELINE_MINUTES / MAX_TIMELINE_MINUTES));
}

export function timelineWindow(centerAt: number, visibleMinutes: number, viewportWidth: number): TimelineWindow {
  const safeWidth = Math.max(240, viewportWidth);
  const boundedMinutes = Math.min(MAX_TIMELINE_MINUTES, Math.max(MIN_TIMELINE_MINUTES, visibleMinutes));
  const pixelsPerMinute = safeWidth / boundedMinutes;
  const detailedTimeline = boundedMinutes < 24 * 60;
  const minimumBuffer = detailedTimeline ? MIN_DETAIL_TIMELINE_BUFFER_MINUTES : 0;
  const bufferedMinutes = Math.max(minimumBuffer, boundedMinutes * TIMELINE_BUFFER_SPANS);
  const width = safeWidth * bufferedMinutes / boundedMinutes;
  const duration = bufferedMinutes * MINUTE_MS;
  return {
    startAt: centerAt - duration / 2,
    endAt: centerAt + duration / 2,
    centerAt,
    visibleMinutes: boundedMinutes,
    pixelsPerMinute,
    width,
  };
}

export function timelineCenterForDate(serviceDate: string, settings: AppSettings): number {
  const intervals = openingHoursForDate(serviceDate, settings).intervals;
  if (intervals.length === 0) {
    return serviceDateTime(serviceDate, '12:00');
  }
  const first = clockMinutes(intervals[0].opensAt);
  const last = clockMinutes(intervals[intervals.length - 1].closesAt);
  return serviceDateTime(serviceDate, minuteToClock(Math.round((first + last) / 2)));
}

export function timelineSpanLabel(minutes: number): string {
  if (minutes < 24 * 60) {
    const hours = minutes / 60;
    return `${hours < 10 ? hours.toFixed(1).replace('.0', '') : Math.round(hours)} Std.`;
  }
  const days = minutes / (24 * 60);
  if (days < 7) {
    return `${days.toFixed(1).replace('.0', '')} Tage`;
  }
  if (days < 14) {
    return `${(days / 7).toFixed(1).replace('.0', '')} Woche`;
  }
  return days >= 29 ? '1 Monat' : `${Math.round(days)} Tage`;
}

export function timelineTickMinutes(visibleMinutes: number): 30 | 60 {
  return visibleMinutes <= 9 * 60 ? 30 : 60;
}

function projectionSegmentAt(at: number, projection: TimelineProjection): TimelineProjectionSegment | undefined {
  return projection.segments.find((segment, index) => (
    at >= segment.startAt
    && (at < segment.endAt || (index === projection.segments.length - 1 && at === segment.endAt))
  ));
}

export function timelineTimeMarkers(window: TimelineWindow, projection: TimelineProjection): TimelineMarker[] {
  const stepMinutes = timelineTickMinutes(window.visibleMinutes);
  const step = stepMinutes * MINUTE_MS;
  const first = Math.ceil(window.startAt / step) * step;
  const markers: TimelineMarker[] = [];
  let previousLabelPosition = Number.NEGATIVE_INFINITY;
  for (let at = first; at <= window.endAt; at += step) {
    if (!projectionSegmentAt(at, projection)?.open) {
      continue;
    }
    const date = new Date(at);
    const position = timelinePositionAt(at, projection);
    const showLabel = position - previousLabelPosition >= 46;
    markers.push({
      at,
      major: date.getMinutes() === 0 && date.getHours() % 3 === 0,
      label: new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(date),
      showLabel,
    });
    if (showLabel) {
      previousLabelPosition = position;
    }
  }
  return markers;
}

export function timelineDateMarkers(
  state: AppState,
  window: TimelineWindow,
  projection: TimelineProjection,
): TimelineDateMarker[] {
  let serviceDate = dateToServiceDate(new Date(window.startAt));
  const lastDate = dateToServiceDate(new Date(window.endAt));
  const markers: TimelineDateMarker[] = [];
  let previousLabelPosition = Number.NEGATIVE_INFINITY;
  let guard = 0;
  while (serviceDate <= lastDate && guard < 200) {
    const at = timelineCenterForDate(serviceDate, state.settings);
    const position = timelinePositionAt(at, projection);
    const showLabel = position - previousLabelPosition >= 74;
    markers.push({
      at,
      boundaryAt: serviceDateTime(serviceDate, '00:00'),
      label: formatServiceDate(serviceDate),
      showLabel,
    });
    if (showLabel) {
      previousLabelPosition = position;
    }
    serviceDate = shiftServiceDate(serviceDate, 1);
    guard += 1;
  }
  return markers;
}

export function timelineOpeningsBetween(state: AppState, startAt: number, endAt: number): TimelineOpening[] {
  let serviceDate = dateToServiceDate(new Date(startAt - 24 * 60 * MINUTE_MS));
  const lastDate = dateToServiceDate(new Date(endAt + 24 * 60 * MINUTE_MS));
  const openings: TimelineOpening[] = [];
  let guard = 0;
  while (serviceDate <= lastDate && guard < 200) {
    for (const interval of openingHoursForDate(serviceDate, state.settings).intervals) {
      const opening = {
        serviceDate,
        startAt: serviceDateTime(serviceDate, interval.opensAt),
        endAt: serviceDateTime(serviceDate, interval.closesAt),
      };
      if (opening.startAt < endAt && opening.endAt > startAt) {
        openings.push(opening);
      }
    }
    serviceDate = shiftServiceDate(serviceDate, 1);
    guard += 1;
  }
  return openings;
}

function projectionSegments(state: AppState, startAt: number, endAt: number): TimelineProjectionSegment[] {
  const extension = 8 * 24 * 60 * MINUTE_MS;
  const extendedStart = startAt - extension;
  const extendedEnd = endAt + extension;
  const openings = timelineOpeningsBetween(state, extendedStart, extendedEnd)
    .map((opening) => ({ startAt: opening.startAt, endAt: opening.endAt }))
    .sort((left, right) => left.startAt - right.startAt);
  const mergedOpenings: { startAt: number; endAt: number }[] = [];
  for (const opening of openings) {
    const previous = mergedOpenings.at(-1);
    if (previous && opening.startAt <= previous.endAt) {
      previous.endAt = Math.max(previous.endAt, opening.endAt);
    } else {
      mergedOpenings.push({ ...opening });
    }
  }

  const extendedSegments: { startAt: number; endAt: number; scale: number; open: boolean }[] = [];
  let cursor = extendedStart;
  for (const opening of mergedOpenings) {
    if (opening.endAt <= extendedStart || opening.startAt >= extendedEnd) {
      continue;
    }
    const openingStart = Math.max(extendedStart, opening.startAt);
    const openingEnd = Math.min(extendedEnd, opening.endAt);
    if (openingStart > cursor) {
      const closedMinutes = (openingStart - cursor) / MINUTE_MS;
      extendedSegments.push({
        startAt: cursor,
        endAt: openingStart,
        scale: Math.min(1, COLLAPSED_CLOSED_MINUTES / closedMinutes),
        open: false,
      });
    }
    if (openingEnd > cursor) {
      extendedSegments.push({ startAt: Math.max(cursor, openingStart), endAt: openingEnd, scale: 1, open: true });
      cursor = openingEnd;
    }
  }
  if (cursor < extendedEnd) {
    const closedMinutes = (extendedEnd - cursor) / MINUTE_MS;
    extendedSegments.push({
      startAt: cursor,
      endAt: extendedEnd,
      scale: Math.min(1, COLLAPSED_CLOSED_MINUTES / closedMinutes),
      open: false,
    });
  }

  let displayMinute = 0;
  const segments: TimelineProjectionSegment[] = [];
  for (const segment of extendedSegments) {
    const clippedStart = Math.max(startAt, segment.startAt);
    const clippedEnd = Math.min(endAt, segment.endAt);
    if (clippedEnd <= clippedStart) {
      continue;
    }
    const displayDuration = (clippedEnd - clippedStart) / MINUTE_MS * segment.scale;
    segments.push({
      startAt: clippedStart,
      endAt: clippedEnd,
      displayStartMinute: displayMinute,
      displayEndMinute: displayMinute + displayDuration,
      scale: segment.scale,
      open: segment.open,
    });
    displayMinute += displayDuration;
  }
  return segments;
}

function displayMinuteAt(at: number, segments: TimelineProjectionSegment[]): number {
  const first = segments[0];
  const last = segments.at(-1);
  if (!first || !last) {
    return 0;
  }
  if (at <= first.startAt) {
    return first.displayStartMinute + (at - first.startAt) / MINUTE_MS * first.scale;
  }
  if (at >= last.endAt) {
    return last.displayEndMinute + (at - last.endAt) / MINUTE_MS * last.scale;
  }
  const segment = segments.find((candidate, index) => (
    at >= candidate.startAt
    && (at < candidate.endAt || (index === segments.length - 1 && at === candidate.endAt))
  )) ?? last;
  return segment.displayStartMinute + (at - segment.startAt) / MINUTE_MS * segment.scale;
}

export function timelineProjection(state: AppState, window: TimelineWindow, viewportWidth: number): TimelineProjection {
  const segments = projectionSegments(state, window.startAt, window.endAt);
  const visibleStart = window.centerAt - window.visibleMinutes / 2 * MINUTE_MS;
  const visibleEnd = window.centerAt + window.visibleMinutes / 2 * MINUTE_MS;
  const compressedCalendarMinutes = displayMinuteAt(visibleEnd, segments) - displayMinuteAt(visibleStart, segments);
  const detailedTimeline = window.visibleMinutes < 24 * 60;
  const visibleDisplayMinutes = detailedTimeline
    ? window.visibleMinutes
    : Math.max(1, compressedCalendarMinutes);
  const pixelsPerDisplayMinute = Math.max(240, viewportWidth) / visibleDisplayMinutes;
  const width = (segments.at(-1)?.displayEndMinute ?? 0) * pixelsPerDisplayMinute;
  return { segments, pixelsPerDisplayMinute, width, startAt: window.startAt, endAt: window.endAt };
}

export function timelinePositionAt(at: number, projection: TimelineProjection): number {
  return displayMinuteAt(at, projection.segments) * projection.pixelsPerDisplayMinute;
}

export function timelineEpochAtPosition(position: number, projection: TimelineProjection): number {
  const displayMinute = position / projection.pixelsPerDisplayMinute;
  const first = projection.segments[0];
  const last = projection.segments.at(-1);
  if (!first || !last) {
    return projection.startAt;
  }
  if (displayMinute <= first.displayStartMinute) {
    return first.startAt + (displayMinute - first.displayStartMinute) / first.scale * MINUTE_MS;
  }
  if (displayMinute >= last.displayEndMinute) {
    return last.endAt + (displayMinute - last.displayEndMinute) / last.scale * MINUTE_MS;
  }
  const segment = projection.segments.find((candidate) => (
    displayMinute >= candidate.displayStartMinute && displayMinute <= candidate.displayEndMinute
  )) ?? last;
  return segment.startAt + (displayMinute - segment.displayStartMinute) / segment.scale * MINUTE_MS;
}

export function timelineReservationsForTableBetween(
  state: AppState,
  tableId: string,
  startAt: number,
  endAt: number,
): TimelineReservation[] {
  const options = buildTableOptions(true);
  return state.reservations
    .filter((reservation) => (
      reservation.assignment?.tableIds.includes(tableId)
      && !['cancelled', 'no-show'].includes(reservation.status)
    ))
    .map((reservation) => {
      const option = optionForReservation(reservation, options);
      const connectionCount = option?.connectionCount ?? Math.max(0, (reservation.assignment?.tableIds.length ?? 1) - 1);
      return {
        reservation,
        startAt: reservationStart(reservation),
        mealEndAt: reservationMealEnd(reservation),
        endAt: reservationResetEnd(reservation, connectionCount, state.settings),
      };
    })
    .filter((entry) => entry.startAt < endAt && entry.endAt > startAt)
    .sort((left, right) => left.startAt - right.startAt);
}

export function timelineReservationsForTable(state: AppState, tableId: string, serviceDate: string): TimelineReservation[] {
  return timelineReservationsForTableBetween(
    state,
    tableId,
    serviceDateTime(serviceDate, '00:00'),
    serviceDateTime(shiftServiceDate(serviceDate, 1), '00:00'),
  );
}

export function tableSlotIsAvailableAt(
  state: AppState,
  table: TableDefinition,
  slotAt: number,
  now: number,
  durationMinutes = state.settings.defaultDurationSmallMinutes,
): boolean {
  const roundedAt = Math.round(slotAt / (15 * MINUTE_MS)) * 15 * MINUTE_MS;
  const serviceDate = dateToServiceDate(new Date(roundedAt));
  const startTime = minuteToClock(new Date(roundedAt).getHours() * 60 + new Date(roundedAt).getMinutes());
  if (!isWithinOpeningHours(serviceDate, startTime, state.settings) || roundedAt < now) {
    return false;
  }
  const option = buildTableOptions(state.settings.useBarSeatsForSingles)
    .find((candidate) => candidate.id === `table:${table.id}`);
  if (!option) {
    return false;
  }
  const provisional: Reservation = {
    id: '__timeline-provisional__', serviceDate, startTime, durationMinutes, delayMinutes: 0,
    partySize: 1, name: 'Neue Reservierung', phone: '', email: '', notes: '', source: 'phone',
    preference: table.region, allowTableSharing: false, status: 'unassigned', createdAt: now, updatedAt: now,
  };
  return placementAvailabilityReason(state, provisional, option, 'exclusive', now) === null;
}

export function tableSlotIsAvailable(
  state: AppState,
  table: TableDefinition,
  serviceDate: string,
  startTime: string,
  now: number,
  durationMinutes = state.settings.defaultDurationSmallMinutes,
): boolean {
  return tableSlotIsAvailableAt(state, table, serviceDateTime(serviceDate, startTime), now, durationMinutes);
}
