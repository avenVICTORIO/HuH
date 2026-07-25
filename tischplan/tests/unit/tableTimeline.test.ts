import { describe, expect, it } from 'vitest';
import { tableById } from '../../src/domain/tableCatalog';
import {
  MAX_TIMELINE_MINUTES,
  MIN_TIMELINE_MINUTES,
  tableSlotIsAvailable,
  timelineDateMarkers,
  timelineEpochAtPosition,
  timelinePositionAt,
  timelineProjection,
  timelineReservationsForTable,
  timelineSpanLabel,
  timelineTickMinutes,
  timelineTimeMarkers,
  timelineVisibleMinutes,
  timelineWindow,
} from '../../src/domain/tableTimeline';
import { serviceDateTime } from '../../src/domain/time';
import { BASE_DATE, BASE_NOW, createHarness, draft } from '../helpers';

describe('table timeline', () => {
  it('offers only opening-hour slots that remain physically free through cleaning', () => {
    const { controller } = createHarness();
    controller.createReservationAtTable(draft({ startTime: '18:00', durationMinutes: 60 }), '3');
    const state = controller.snapshot();
    const table = tableById('3');
    expect(tableSlotIsAvailable(state, table, BASE_DATE, '18:30', BASE_NOW, 60)).toBe(false);
    expect(tableSlotIsAvailable(state, table, BASE_DATE, '19:15', BASE_NOW, 60)).toBe(true);
    expect(tableSlotIsAvailable(state, table, BASE_DATE, '16:45', BASE_NOW, 60)).toBe(false);
    expect(timelineReservationsForTable(state, '3', BASE_DATE)).toHaveLength(1);
  });

  it('maps the continuous zoom, buffers detailed views across days, and separates date and time markers', () => {
    expect(timelineVisibleMinutes(1_000)).toBe(MIN_TIMELINE_MINUTES);
    expect(timelineVisibleMinutes(0)).toBe(MAX_TIMELINE_MINUTES);
    expect(timelineSpanLabel(timelineVisibleMinutes(0))).toBe('1 Monat');
    const zoomedIn = timelineWindow(BASE_NOW, MIN_TIMELINE_MINUTES, 900);
    const zoomedOut = timelineWindow(BASE_NOW, MAX_TIMELINE_MINUTES, 900);
    const state = createHarness().controller.snapshot();
    const zoomedInProjection = timelineProjection(state, zoomedIn, 900);
    const zoomedOutProjection = timelineProjection(state, zoomedOut, 900);
    expect(zoomedIn.pixelsPerMinute).toBeGreaterThan(zoomedOut.pixelsPerMinute);
    expect((zoomedIn.endAt - zoomedIn.startAt) / 60_000).toBeGreaterThanOrEqual(30 * 24 * 60);
    expect(timelineTickMinutes(zoomedIn.visibleMinutes)).toBe(30);
    expect(timelineTickMinutes(zoomedOut.visibleMinutes)).toBe(60);
    expect(timelineTimeMarkers(zoomedOut, zoomedOutProjection)[0].label).toMatch(/:/);
    expect(timelineDateMarkers(state, zoomedIn, zoomedInProjection)[0].label).toMatch(/\./);
    expect(zoomedOut.width).toBe(4_500);
  });

  it('keeps the detailed pixel scale stable while scrolling from service into a closed night', () => {
    const state = createHarness().controller.snapshot();
    const openWindow = timelineWindow(serviceDateTime(BASE_DATE, '20:00'), 9 * 60, 900);
    const closedWindow = timelineWindow(serviceDateTime('2026-09-02', '02:00'), 9 * 60, 900);
    const openProjection = timelineProjection(state, openWindow, 900);
    const closedProjection = timelineProjection(state, closedWindow, 900);
    expect(openProjection.pixelsPerDisplayMinute).toBeCloseTo(900 / (9 * 60), 8);
    expect(closedProjection.pixelsPerDisplayMinute).toBeCloseTo(openProjection.pixelsPerDisplayMinute, 8);
  });

  it('compresses each closed phase to at most one displayed hour and keeps the mapping invertible', () => {
    const { controller } = createHarness();
    const state = controller.snapshot();
    state.settings.openingHours.tuesday.intervals = [
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '17:00', closesAt: '23:00' },
    ];
    const center = serviceDateTime(BASE_DATE, '16:00');
    const window = timelineWindow(center, 24 * 60, 1_000);
    const projection = timelineProjection(state, window, 1_000);
    const position = (date: string, time: string) => timelinePositionAt(serviceDateTime(date, time), projection);

    const morningWidth = position(BASE_DATE, '12:00') - position(BASE_DATE, '09:00');
    const lunchClosureWidth = position(BASE_DATE, '17:00') - position(BASE_DATE, '12:00');
    const eveningWidth = position(BASE_DATE, '23:00') - position(BASE_DATE, '17:00');
    const overnightClosureWidth = position('2026-09-02', '17:00') - position(BASE_DATE, '23:00');
    expect(lunchClosureWidth / morningWidth).toBeCloseTo(1 / 3, 5);
    expect(overnightClosureWidth / eveningWidth).toBeCloseTo(1 / 6, 5);

    const actual = serviceDateTime(BASE_DATE, '14:37');
    expect(timelineEpochAtPosition(timelinePositionAt(actual, projection), projection)).toBeCloseTo(actual, -2);
  });
});
