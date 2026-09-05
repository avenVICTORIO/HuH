import { expect, test, type Page } from '@playwright/test';

const DATE = '2026-09-01';
const EPOCH_14 = Date.parse('2026-09-01T14:00:00+02:00');

async function resetApp(page: Page, epoch = EPOCH_14): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ epoch, date }) => {
    const api = window.__HAH_TEST__!;
    api.setNow(epoch);
    api.reset();
    api.setNow(epoch);
    api.selectServiceDate(date);
  }, { epoch, date: DATE });
  await expect(page.getByTestId('floor-plan')).toBeVisible();
}

async function openTasks(page: Page): Promise<void> {
  await page.getByTestId('task-bell').click();
  await expect(page.getByTestId('task-dropdown')).toBeVisible();
}

async function mockWeatherApis(page: Page): Promise<void> {
  await page.route((url) => url.hostname === 'nominatim.openstreetmap.org', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ display_name: 'Berlin, Deutschland', lat: '52.5200', lon: '13.4050' }]),
    });
  });
  await page.route((url) => url.hostname === 'api.brightsky.dev', async (route) => {
    const start = Date.parse('2026-09-01T14:00:00+02:00');
    const weather = Array.from({ length: 7 * 24 }, (_, index) => ({
      timestamp: new Date(start + index * 60 * 60_000).toISOString(),
      temperature: 19 + (index % 8),
      precipitation: index % 4 === 0 ? 0.4 : 0,
      precipitation_probability: index % 4 === 0 ? 75 : 20,
      wind_speed: 11 + (index % 5),
      wind_gust_speed: 24 + (index % 7),
      icon: index % 4 === 0 ? 'rain' : 'partly-cloudy-day',
      condition: index % 4 === 0 ? 'rain' : 'dry',
    }));
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ weather }) });
  });
}

async function clickTimelineTime(page: Page, tableId: string, serviceDate: string, time: string, force = false): Promise<void> {
  const opening = page.getByTestId(`timeline-${tableId}`).locator(`[data-opening-date="${serviceDate}"]`).first();
  await expect(opening).toBeVisible();
  const start = await opening.getAttribute('data-opening-start');
  const end = await opening.getAttribute('data-opening-end');
  const minutes = (value: string): number => {
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  };
  const ratio = (minutes(time) - minutes(start!)) / (minutes(end!) - minutes(start!));
  const box = (await opening.boundingBox())!;
  await opening.click({ force, position: { x: Math.max(1, Math.min(box.width - 1, box.width * ratio)), y: box.height / 2 } });
}


test('tablet-first reservation wizard stores preference, auto-places, and persists after reload', async ({ page }) => {
  await resetApp(page);
  await expect(page.locator('.workspace')).toBeVisible();
  await expect(page.getByRole('button', { name: '＋ Reservierung' })).toBeVisible();
  await page.getByRole('button', { name: '＋ Reservierung' }).click();
  await page.getByRole('button', { name: 'Telefonisch' }).click();
  await page.getByTestId('reservation-date').fill(DATE);
  await page.getByTestId('reservation-time').fill('18:00');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: /Mehr/ }).click();
  await page.getByTestId('preference-outside').click();
  await page.getByTestId('reservation-name').fill('Terrassen Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByTestId('finish-auto').click();
  await expect(page.getByTestId('toast')).toContainText('automatisch platziert');

  const beforeReload = await page.evaluate(() => window.__HAH_TEST__!.getState());
  const reservation = beforeReload.reservations.find((item) => item.name === 'Terrassen Test');
  expect(reservation?.preference).toBe('outside');
  expect(reservation?.assignment?.region).toBe('outside');

  await page.reload();
  const afterReload = await page.evaluate(() => window.__HAH_TEST__!.getState());
  expect(afterReload.reservations.find((item) => item.name === 'Terrassen Test')?.assignment?.region).toBe('outside');
});

test('reservation search reliably matches normalized phone numbers and is easy to clear', async ({ page }) => {
  await resetApp(page);
  const ids = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const phoneMatch = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 2, name: 'Familie Öztürk', phone: '030 / 12 34-56', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 90 });
    const other = api.createReservation({ serviceDate: date, startTime: '19:00', partySize: 2, name: 'Andere Gruppe', phone: '0177 999999', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 90 });
    api.autoAssign(other);
    return { phoneMatch, other };
  }, { date: DATE });

  await page.getByRole('button', { name: 'Platziert', exact: true }).click();
  await expect(page.getByTestId(`reservation-${ids.other}`)).toBeVisible();
  await page.getByLabel('Reservierungen durchsuchen').fill('030123456');
  await expect(page.getByTestId(`reservation-${ids.phoneMatch}`)).toBeVisible();
  await expect(page.getByTestId(`reservation-${ids.other}`)).toHaveCount(0);
  await expect(page.getByText('1 Treffer')).toBeVisible();
  const clearSearch = page.getByRole('button', { name: 'Suche löschen' });
  const clearBox = await clearSearch.boundingBox();
  expect(clearBox!.width).toBeGreaterThanOrEqual(44);
  expect(clearBox!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'reports/ui-review/reservation-search-1024x768.png' });
  await clearSearch.click();
  await expect(page.getByTestId(`reservation-${ids.other}`)).toBeVisible();
  await expect(page.getByTestId(`reservation-${ids.phoneMatch}`)).toHaveCount(0);
});

test('four independent solo walk-ins share one four-top and are all visible at the table', async ({ page }) => {
  await resetApp(page);
  const result = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const ids = Array.from({ length: 4 }, () => api.createWalkIn(1, 'inside', date, '18:00'));
    api.applyAutoPlan(date);
    for (const id of ids) api.markArrived(id);
    const state = api.getState();
    const reservations = ids.map((id) => state.reservations.find((item) => item.id === id)!);
    return {
      ids,
      tableIds: reservations.map((item) => item.assignment?.tableIds[0]),
      modes: reservations.map((item) => item.assignment?.mode),
    };
  }, { date: DATE });

  expect(new Set(result.tableIds).size).toBe(1);
  expect(result.modes).toEqual(['shared', 'shared', 'shared', 'shared']);
  const tableId = result.tableIds[0]!;
  await page.getByTestId(`table-${tableId}`).click();
  await expect(page.getByTestId('table-detail')).toBeVisible();
  await expect(page.locator('.timeline-card.current')).toHaveCount(4);
  await expect(page.getByText('Jetzt am Tisch')).toBeVisible();
});

test('table detail makes the next arrival prominent and following reservations compact', async ({ page }) => {
  await resetApp(page);
  const ids = await page.evaluate(({ date, now }) => {
    const api = window.__HAH_TEST__!;
    const current = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 4, name: 'Aktuelle Runde', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
    const next = api.createReservation({ serviceDate: date, startTime: '20:00', partySize: 4, name: 'Nächste Gruppe', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
    const following = api.createReservation({ serviceDate: date, startTime: '21:30', partySize: 4, name: 'Spätere Gruppe', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
    api.manualAssign(current, 'table:1');
    api.manualAssign(next, 'table:1');
    api.manualAssign(following, 'table:1');
    api.setNow(now);
    api.markArrived(current);
    return { current, next, following };
  }, { date: DATE, now: Date.parse('2026-09-01T18:00:00+02:00') });

  await page.getByTestId('table-1').click();
  await expect(page.getByTestId('next-reservation')).toContainText('Nächste Gruppe');
  await expect(page.locator('.following-row')).toHaveCount(1);
  await expect(page.locator('.following-row')).toContainText('Spätere Gruppe');
  const nextBox = await page.getByTestId('next-reservation').boundingBox();
  const followingBox = await page.locator('.following-row').boundingBox();
  expect(nextBox!.height).toBeGreaterThan(followingBox!.height);

  await page.getByTestId('next-reservation').click();
  await expect(page.getByRole('button', { name: 'Zurück zu Tisch 1' })).toBeVisible();
  await page.getByRole('button', { name: 'Zurück zu Tisch 1' }).click();
  await expect(page.getByTestId('table-detail')).toBeVisible();

  await page.getByTestId('table-detail').getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.getByTestId(`reservation-${ids.next}`).click();
  await expect(page.getByRole('button', { name: /Zurück zu Tisch/ })).toHaveCount(0);
});

test('arrival confirmation stays hidden until twenty minutes before expected arrival', async ({ page }) => {
  await resetApp(page);
  const id = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const reservationId = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 2, name: 'Spätere Ankunft', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 90 });
    api.autoAssign(reservationId);
    return reservationId;
  }, { date: DATE });

  await page.getByTestId(`reservation-${id}`).click();
  await expect(page.getByTestId('arrival-wait-state')).toContainText('Bestätigung ab 17:40');
  await expect(page.getByTestId('mark-arrived')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'No-Show' })).toHaveCount(0);

  await page.evaluate(() => {
    window.__HAH_TEST__!.setNow(Date.parse('2026-09-01T17:40:00+02:00'));
    window.__HAH_TEST__!.tick();
  });
  await expect(page.getByTestId('mark-arrived')).toBeVisible();
  await expect(page.getByTestId('arrival-wait-state')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'No-Show' })).toHaveCount(0);

  await page.evaluate(() => {
    window.__HAH_TEST__!.setNow(Date.parse('2026-09-01T18:00:00+02:00'));
    window.__HAH_TEST__!.tick();
  });
  await expect(page.getByRole('button', { name: 'No-Show' })).toBeVisible();
});

test('split opening hours exclude closed gaps from reservation times and persist', async ({ page }) => {
  await resetApp(page);
  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Daten & Zeiten' }).click();
  await page.getByTestId('opening-tuesday-0-from').fill('09:00');
  await page.getByTestId('opening-tuesday-0-until').fill('12:00');
  await page.getByTestId('opening-tuesday-add').click();
  await page.getByTestId('opening-tuesday-1-from').fill('17:00');
  await page.getByTestId('opening-tuesday-1-until').fill('22:00');
  await page.screenshot({ path: 'reports/ui-review/opening-hours-split-1024x768.png', fullPage: true });
  await page.getByRole('button', { name: 'Öffnungszeiten speichern' }).click();
  await expect(page.getByTestId('toast')).toContainText('Einstellungen gespeichert');
  await page.getByRole('button', { name: 'Betrieb schließen' }).click();

  await page.getByRole('button', { name: '＋ Reservierung' }).click();
  await page.getByRole('button', { name: 'Telefonisch' }).click();
  const wizard = page.getByRole('dialog', { name: 'Neue Reservierung' });
  await expect(page.getByTestId('reservation-time')).toHaveValue('09:00');
  await expect(wizard.getByRole('button', { name: '09:00', exact: true })).toBeVisible();
  await expect(wizard.getByRole('button', { name: '11:30', exact: true })).toBeVisible();
  await expect(wizard.getByRole('button', { name: '17:00', exact: true })).toBeVisible();
  await expect(wizard.getByRole('button', { name: '21:30', exact: true })).toBeVisible();
  await expect(wizard.getByRole('button', { name: '12:00', exact: true })).toHaveCount(0);
  await expect(wizard.getByRole('button', { name: '22:00', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Schließen' }).click();

  await page.reload();
  const tuesday = await page.evaluate(() => window.__HAH_TEST__!.getState().settings.openingHours.tuesday);
  expect(tuesday).toEqual({
    intervals: [
      { opensAt: '09:00', closesAt: '12:00' },
      { opensAt: '17:00', closesAt: '22:00' },
    ],
  });
});

test('empty tables hide actions until a matching open reservation can be placed', async ({ page }) => {
  await resetApp(page);
  await expect(page.getByRole('button', { name: 'Auto-Plan' })).toHaveCount(0);

  await page.getByTestId('table-17A').click();
  await expect(page.getByTestId('table-empty-state')).toContainText('Tisch ist frei');
  await expect(page.getByText('Keine weitere Reservierung')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Offene Reservierung hier platzieren/ })).toHaveCount(0);
  await page.screenshot({ path: 'reports/ui-review/table-empty-1024x768.png' });
  await page.getByTestId('table-detail').getByRole('button', { name: 'Schließen', exact: true }).click();

  const id = await page.evaluate(({ date }) => window.__HAH_TEST__!.createReservation({
    serviceDate: date,
    startTime: '18:00',
    partySize: 2,
    name: 'Passende Runde',
    source: 'phone',
    preference: 'none',
    allowTableSharing: false,
    durationMinutes: 90,
  }), { date: DATE });

  await page.getByTestId('table-17A').click();
  const placeOpenReservation = page.getByRole('button', { name: /Offene Reservierung hier platzieren.*1 passende Reservierung/ });
  await expect(placeOpenReservation).toBeVisible();
  await placeOpenReservation.click();
  const selectionDialog = page.getByRole('dialog', { name: 'Reservierung auswählen' });
  await expect(selectionDialog).toBeVisible();
  await selectionDialog.getByRole('button', { name: /Passende Runde/ }).click();
  // Neue Direkt-Platzierung: passender Tisch wird sofort belegt; bei 2+ freien
  // Restplätzen folgt nur noch die Freigeben-Frage.
  await expect(page.getByTestId('share-ask')).toBeVisible();
  await page.getByTestId('share-no').click();
  const placedState = await page.evaluate(() => window.__HAH_TEST__!.getState());
  expect(placedState.reservations.find((item) => item.name === 'Passende Runde')?.assignment?.tableIds).toContain('17A');
  expect(id).toBeTruthy();
});

test('placed walk-ins are seated immediately and Escape closes layered dialogs', async ({ page }) => {
  await resetApp(page, Date.parse('2026-09-01T18:00:00+02:00'));
  const status = await page.evaluate(() => {
    const api = window.__HAH_TEST__!;
    const id = api.createWalkIn(2, 'none');
    api.autoAssign(id);
    return api.getState().reservations.find((reservation) => reservation.id === id)!.status;
  });
  expect(status).toBe('seated');

  await page.getByRole('button', { name: /＋ Reservierung/ }).click();
  await expect(page.getByRole('dialog', { name: 'Neue Reservierung' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Neue Reservierung' })).toBeHidden();

  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await expect(page.getByTestId('operations-drawer')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('operations-drawer')).toBeHidden();
});

test('Auto-Plan stays reachable on tablet but has no apply action when nothing can change', async ({ page }) => {
  await resetApp(page);
  await page.evaluate(({ date }) => window.__HAH_TEST__!.createReservation({
    serviceDate: date,
    startTime: '18:00',
    partySize: 50,
    name: 'Nicht platzierbar',
    source: 'phone',
    preference: 'none',
    allowTableSharing: false,
    durationMinutes: 90,
  }), { date: DATE });

  await page.getByRole('button', { name: /Auto-Plan/ }).click();
  await expect(page.getByText('Plan ist bereits aktuell')).toBeVisible();
  await expect(page.getByTestId('apply-plan')).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Auto-Plan prüfen' }).locator('.modal-actions').getByRole('button', { name: 'Schließen' })).toBeVisible();
});

test('weather location enables an informational three-hour overlay and seven-day detail without operational side effects', async ({ page }) => {
  await mockWeatherApis(page);
  await resetApp(page);
  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Betrieb', exact: true }).click();
  await page.getByTestId('weather-location-query').fill('Berlin');
  await page.getByRole('button', { name: 'Standort suchen' }).click();
  await page.getByRole('button', { name: /Berlin, Deutschland.*Auswählen/ }).click();
  await expect(page.getByTestId('toast')).toContainText('Wetterstandort gespeichert');
  await page.getByRole('button', { name: 'Betrieb schließen' }).click();

  const overlay = page.getByTestId('weather-overlay');
  await expect(overlay).toBeVisible();
  await expect(overlay.locator('.weather-hour')).toHaveCount(3);
  const operationalState = await page.evaluate((date) => window.__HAH_TEST__!.getState().serviceDays[date], DATE);
  expect(operationalState.weather).toBe('dry');
  expect(operationalState.outsideOpen).toBe(true);
  await expect(page.getByTestId('toast')).toBeHidden({ timeout: 5_000 });
  await page.screenshot({ path: 'reports/ui-review/weather-overlay-1024x768.png' });

  await overlay.locator('.weather-overlay-main').click();
  await expect(page.getByRole('dialog', { name: '7-Tage-Wettervorhersage' })).toBeVisible();
  await expect(page.getByText('Nur zur Information')).toBeVisible();
  await expect(page.locator('.weather-day-grid button')).toHaveCount(7);
  await page.screenshot({ path: 'reports/ui-review/weather-detail-1024x768.png' });
  await page.getByTestId('weather-detail').getByRole('button', { name: 'Schließen', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(overlay).toBeVisible();
  const mobileOverlay = await overlay.boundingBox();
  expect(mobileOverlay!.x).toBeGreaterThanOrEqual(0);
  expect(mobileOverlay!.x + mobileOverlay!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'reports/ui-review/weather-overlay-mobile-390x844.png', animations: 'disabled' });
});

test('a free table timeline slot creates an atomically assigned reservation for that table', async ({ page }) => {
  await resetApp(page);
  await page.getByTestId('table-3').click();
  await expect(page.getByText('Belegungszeit')).toBeVisible();
  await clickTimelineTime(page, '3', DATE, '18:00', true);
  const wizard = page.getByRole('dialog', { name: 'Neue Reservierung · Tisch 3' });
  await wizard.getByRole('button', { name: 'Telefonisch' }).click();
  await expect(page.getByTestId('reservation-time')).toHaveValue('18:00');
  await wizard.getByRole('button', { name: 'Weiter' }).click();
  await expect(wizard.getByText('Tisch 3 fest ausgewählt')).toBeVisible();
  await wizard.getByRole('button', { name: 'Weiter' }).click();
  await page.getByTestId('reservation-name').fill('Direkt am Tisch');
  await wizard.getByRole('button', { name: 'Weiter' }).click();
  await page.getByTestId('finish-selected-table').click();
  await expect(page.getByTestId('toast')).toContainText('verbindlich am Tisch angelegt');

  const reservation = await page.evaluate(() => window.__HAH_TEST__!.getState().reservations.find((item) => item.name === 'Direkt am Tisch'));
  expect(reservation?.assignment?.optionId).toBe('table:3');
  expect(reservation?.assignment?.locked).toBe(true);
  await page.getByRole('button', { name: 'Schließen', exact: true }).first().click();
  await page.getByTestId('table-3').click();
  await expect(page.getByTestId(`timeline-reservation-${reservation!.id}-3`)).toBeVisible();
  await page.getByLabel('Tisch-Zeitleiste Zoom').fill('1000');
  await expect(page.getByTestId('table-timeline-view')).toHaveAttribute('data-visible-minutes', '180');
  await expect(page.getByTestId('table-date-axis')).toBeVisible();
  await expect(page.getByTestId('table-time-axis')).toHaveAttribute('data-tick-minutes', '30');
  expect(await page.getByTestId('table-date-axis').locator('.timeline-date-boundary').count()).toBeGreaterThan(1);
  await page.locator('.table-timeline-scroll').evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(page.getByLabel('Tisch-Zeitleiste Datum')).not.toHaveValue('01.09.2026');
  await expect(page.getByTestId('table-date-axis')).toContainText('Mi.');
  await page.getByRole('dialog', { name: 'Tischbelegung' }).screenshot({ path: 'reports/ui-review/table-timeline-multiday-scroll-1024x768.png' });
  await page.getByLabel('Tisch-Zeitleiste Datum').fill('01.09.2026');
  await page.getByLabel('Tisch-Zeitleiste Datum').press('Tab');
  await page.getByLabel('Tisch-Zeitleiste Zoom').fill('0');
  await expect(page.getByTestId('table-timeline-view')).toHaveAttribute('data-visible-minutes', '43200');
  await expect(page.getByTestId('table-time-axis')).toHaveAttribute('data-tick-minutes', '60');
  await page.getByLabel('Tisch-Zeitleiste Datum').fill('01.09.2027');
  await page.getByLabel('Tisch-Zeitleiste Datum').press('Tab');
  await expect(page.getByLabel('Tisch-Zeitleiste Datum')).toHaveValue('01.09.2027');
  await page.getByLabel('Tisch-Zeitleiste Datum').fill('01.09.2026');
  await page.getByLabel('Tisch-Zeitleiste Datum').press('Tab');
  await page.getByLabel('Tisch-Zeitleiste Zoom').fill('840');
  await expect(page.getByTestId(`timeline-reservation-${reservation!.id}-3`)).toBeVisible();
  await page.getByRole('dialog', { name: 'Tischbelegung' }).screenshot({ path: 'reports/ui-review/table-timeline-direct-1024x768.png' });
});

test('the zoomable time plan is an alternative main view with grouped table lanes', async ({ page, browser }) => {
  await resetApp(page);
  const ids = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const reservationId = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 4, name: 'Zeitplan-Gruppe', source: 'phone', preference: 'inside', allowTableSharing: false, durationMinutes: 90 });
    api.manualAssign(reservationId, 'table:1');
    const nextDayId = api.createReservation({ serviceDate: '2026-09-02', startTime: '18:00', partySize: 4, name: 'Folgetag-Gruppe', source: 'phone', preference: 'inside', allowTableSharing: false, durationMinutes: 90 });
    api.manualAssign(nextDayId, 'table:1');
    const futureId = api.createReservation({ serviceDate: '2027-09-01', startTime: '18:00', partySize: 2, name: 'Nächstes Jahr', source: 'phone', preference: 'inside', allowTableSharing: false, durationMinutes: 90 });
    api.manualAssign(futureId, 'table:3');
    return { reservationId, nextDayId, futureId };
  }, { date: DATE });

  await page.locator('.workspace-view-tabs').getByRole('button', { name: /Zeitplan/ }).click();
  await expect(page.getByTestId('schedule-view')).toBeVisible();
  await expect(page.getByRole('button', { name: /Innen.*23 Tische/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Außen.*10 Tische/ })).toBeVisible();
  const block = page.getByTestId(`timeline-reservation-${ids.reservationId}-1`);
  await expect(block).toBeVisible();
  const timeline = page.getByTestId('timeline-1');
  const firstOpening = timeline.locator('[data-opening-date="2026-09-01"]').first();
  const nextOpening = timeline.locator('[data-opening-date="2026-09-02"]').first();
  const firstOpeningBox = (await firstOpening.boundingBox())!;
  const nextOpeningBox = (await nextOpening.boundingBox())!;
  const compressedNightWidth = nextOpeningBox.x - firstOpeningBox.x - firstOpeningBox.width;
  expect(compressedNightWidth).toBeLessThanOrEqual(firstOpeningBox.width / 5.5);
  await expect(page.getByTestId('schedule-date-axis')).toBeVisible();
  await expect(page.getByTestId('schedule-time-axis')).toHaveAttribute('data-tick-minutes', '30');
  const initialBlockWidth = (await block.boundingBox())!.width;
  const scheduleScroll = page.locator('.schedule-scroll');
  await scheduleScroll.evaluate((element) => {
    for (let step = 0; step < 10; step += 1) {
      element.scrollLeft += element.clientWidth * .05;
      element.dispatchEvent(new Event('scroll'));
    }
  });
  await expect(page.getByTestId('timeline-visible-date')).toHaveAttribute('data-service-date', '2026-09-02');
  const stableNextOpeningWidth = (await nextOpening.boundingBox())!.width;
  const scheduleViewportWidth = await scheduleScroll.evaluate((element) => element.clientWidth - 116);
  expect(stableNextOpeningWidth / scheduleViewportWidth).toBeGreaterThan(.63);
  expect(stableNextOpeningWidth / scheduleViewportWidth).toBeLessThan(.7);
  await scheduleScroll.evaluate((element) => {
    for (let step = 0; step < 6; step += 1) {
      element.scrollLeft += element.clientWidth * .05;
      element.dispatchEvent(new Event('scroll'));
    }
  });
  const nextDayBlock = page.getByTestId(`timeline-reservation-${ids.nextDayId}-1`);
  await expect(nextDayBlock).toBeVisible();
  expect((await nextDayBlock.boundingBox())!.width).toBeCloseTo(initialBlockWidth, 0);
  await page.screenshot({ path: 'reports/ui-review/time-plan-continuous-next-day-1024x768.png' });
  await page.getByLabel('Servicetag wählen').fill('2026-09-01');
  await expect(page.getByTestId('timeline-visible-date')).toHaveAttribute('data-service-date', '2026-09-01');
  await page.getByLabel('Zeitplan Zoom').fill('1000');
  await expect(page.getByTestId('schedule-view')).toHaveAttribute('data-visible-minutes', '180');
  await page.locator('.schedule-scroll').evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event('scroll'));
  });
  await expect(page.getByTestId('timeline-visible-date')).not.toHaveAttribute('data-service-date', '2026-09-01');
  await expect(page.getByTestId('schedule-date-axis')).toContainText('Mi.');
  await page.getByTestId('schedule-view').screenshot({ path: 'reports/ui-review/time-plan-detail-multiday-1024x768.png' });
  await page.getByLabel('Servicetag wählen').fill('2026-09-01');
  await page.getByLabel('Zeitplan Zoom').fill('0');
  await expect(page.getByTestId('schedule-view')).toHaveAttribute('data-visible-minutes', '43200');
  await expect(page.getByTestId('schedule-time-axis')).toHaveAttribute('data-tick-minutes', '60');
  await page.locator('.schedule-scroll').evaluate((element) => {
    element.scrollLeft = element.scrollWidth - element.clientWidth;
    element.dispatchEvent(new Event('scroll'));
  });
  await page.getByLabel('Servicetag wählen').fill('2027-09-01');
  await expect(page.getByTestId(`timeline-reservation-${ids.futureId}-3`)).toBeVisible();
  await page.screenshot({ path: 'reports/ui-review/time-plan-1024x768.png' });

  const mobileContext = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 390, height: 844 },
    locale: 'de-DE',
    timezoneId: 'Europe/Rome',
  });
  const mobilePage = await mobileContext.newPage();
  await resetApp(mobilePage);
  await mobilePage.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const reservationId = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 4, name: 'Zeitplan-Gruppe', source: 'phone', preference: 'inside', allowTableSharing: false, durationMinutes: 90 });
    api.manualAssign(reservationId, 'table:1');
  }, { date: DATE });
  await mobilePage.locator('.workspace-view-tabs').getByRole('button', { name: /Zeitplan/ }).click();
  expect(await mobilePage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(mobilePage.getByTestId('schedule-view')).toBeVisible();
  const hiddenSidebar = await mobilePage.locator('.sidebar-shell').boundingBox();
  expect(hiddenSidebar!.x + hiddenSidebar!.width).toBeLessThanOrEqual(1);
  await mobilePage.screenshot({ path: 'reports/ui-review/time-plan-mobile-390x844.png' });
  await mobileContext.close();
});

test('operations can generate a realistic demo month and reset the complete local state', async ({ page }) => {
  await resetApp(page);
  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Betrieb', exact: true }).click();
  await page.getByTestId('generate-demo-month').click();
  await expect(page.getByText('Bestehenden Arbeitsstand ersetzen?')).toBeVisible();
  await page.screenshot({ path: 'reports/ui-review/demo-tools-1024x768.png' });
  await page.getByTestId('confirm-demo-month').click();
  await expect(page.getByTestId('toast')).toContainText(/Demo-Reservierungen für 30 Tage erzeugt/);
  const demoState = await page.evaluate(() => window.__HAH_TEST__!.getState());
  expect(demoState.reservations.length).toBeGreaterThan(300);
  expect(Object.keys(demoState.serviceDays)).toHaveLength(30);
  const joinedReservations = demoState.reservations.filter((reservation) => (
    (reservation.assignment?.tableIds.length ?? 0) > 1
  ));
  expect(joinedReservations).toHaveLength(10);
  await expect(page.getByTestId('toast')).toContainText('10 mit verbundenen Tischen');
  await expect(page.getByTestId('task-bell')).toHaveAccessibleName('Aufgaben, 0 offen');
  await expect(page.getByTestId('next-action')).toHaveCount(0);
  await expect(page.locator('.join-outline')).toHaveCount(1);
  await page.screenshot({
    path: 'reports/ui-review/demo-joined-tables-1024x768.png',
    animations: 'disabled',
  });

  await page.locator('.workspace-view-tabs').getByRole('button', { name: /Zeitplan/ }).click();
  await page.getByLabel('Zeitplan Zoom').fill('0');
  await expect(page.getByTestId('schedule-view')).toHaveAttribute('data-visible-minutes', '43200');
  await page.screenshot({ path: 'reports/ui-review/demo-month-time-plan-1024x768.png' });

  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Betrieb', exact: true }).click();
  await page.getByTestId('reset-all').click();
  await expect(page.getByText('Wirklich alles auf null setzen?')).toBeVisible();
  await page.getByTestId('confirm-reset-all').click();
  await expect(page.getByTestId('toast')).toContainText('Lokaler Arbeitsstand gelöscht');
  const resetState = await page.evaluate(() => window.__HAH_TEST__!.getState());
  expect(resetState.reservations).toHaveLength(0);
  expect(resetState.settings.weatherLocation).toBeNull();
});

test('mock time drives arrival and overdue tasks deterministically', async ({ page }) => {
  await resetApp(page);
  await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const id = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 2, name: 'Zeit-Test', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
    api.autoAssign(id);
    api.setNow(Date.parse('2026-09-01T17:31:00+02:00'));
    api.tick();
  }, { date: DATE });
  await expect(page.getByTestId('next-action')).toHaveCount(0);
  await expect(page.getByTestId('task-bell')).toHaveAccessibleName('Aufgaben, 1 offen');
  await expect(page.getByTestId('task-dropdown')).toHaveCount(0);
  await openTasks(page);
  await expect(page.getByTestId('task-dropdown')).toContainText('Zeit-Test kommt um 18:00');
  await page.screenshot({ path: 'reports/ui-review/task-dropdown-1024x768.png', animations: 'disabled' });

  await page.evaluate(() => {
    window.__HAH_TEST__!.setNow(Date.parse('2026-09-01T18:16:00+02:00'));
    window.__HAH_TEST__!.tick();
  });
  await expect(page.getByTestId('task-dropdown')).toContainText('Zeit-Test ist überfällig');
  await expect(page.getByTestId('task-bell')).toHaveClass(/critical/);
});

test('rain exposes an existing outside conflict without silently moving the reservation', async ({ page }) => {
  await resetApp(page);
  const id = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const reservationId = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 4, name: 'Regen-Konflikt', source: 'phone', preference: 'outside', allowTableSharing: false, durationMinutes: 60 });
    api.autoAssign(reservationId);
    api.setWeather(date, 'rain');
    return reservationId;
  }, { date: DATE });

  await openTasks(page);
  await expect(page.getByTestId('task-dropdown')).toContainText('Regen-Konflikt kann nicht draußen sitzen');
  const state = await page.evaluate(() => window.__HAH_TEST__!.getState());
  expect(state.reservations.find((item) => item.id === id)?.assignment?.region).toBe('outside');
  expect(state.serviceDays[DATE].outsideOpen).toBe(false);
});

test('Rush mode is unmistakable and transitions to a required reconciliation', async ({ page }) => {
  await resetApp(page);
  await page.evaluate(({ date }) => window.__HAH_TEST__!.startRush(date), { date: DATE });
  await expect(page.getByTestId('rush-banner')).toContainText('Stoßbetrieb aktiv');
  await page.getByTestId('rush-banner').click();
  await expect(page.locator('.drawer-tabs button.active')).toHaveText(/Betrieb/);
  await expect(page.getByRole('button', { name: /Stoßbetrieb beenden/ })).toBeVisible();
  await page.getByRole('button', { name: 'Betrieb schließen' }).click();

  await page.evaluate(({ date }) => window.__HAH_TEST__!.endRush(date), { date: DATE });
  await expect(page.getByTestId('next-action')).toHaveCount(0);
  expect((await page.evaluate(() => window.__HAH_TEST__!.getState())).serviceDays[DATE].rush.status).toBe('reconciliation-needed');

  await openTasks(page);
  await expect(page.getByTestId('task-dropdown')).toContainText('Raumzustand abgleichen');
  await page.getByTestId('task-dropdown').getByRole('button', { name: 'Abgleich öffnen' }).click();
  await expect(page.locator('.drawer-tabs button.active')).toHaveText(/Betrieb/);
  await expect(page.getByRole('button', { name: /Raumabgleich beginnen/ })).toBeVisible();
  await page.getByRole('button', { name: /Raumabgleich beginnen/ }).click();
  expect((await page.evaluate(() => window.__HAH_TEST__!.getState())).serviceDays[DATE].rush.status).toBe('reconciling');
});

test('joined-table cleaning and reset remain explicit operational steps', async ({ page }) => {
  await resetApp(page);
  const id = await page.evaluate(({ date }) => {
    const api = window.__HAH_TEST__!;
    const reservationId = api.createReservation({ serviceDate: date, startTime: '18:00', partySize: 8, name: 'Tafel-Test', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
    api.manualAssign(reservationId, 'join:14+13');
    api.markPrepared(reservationId);
    api.setNow(Date.parse('2026-09-01T18:00:00+02:00'));
    api.markArrived(reservationId);
    api.setNow(Date.parse('2026-09-01T19:00:00+02:00'));
    api.markLeft(reservationId);
    return reservationId;
  }, { date: DATE });

  await openTasks(page);
  await expect(page.getByTestId('task-dropdown')).toContainText('reinigen');
  await page.evaluate((reservationId) => window.__HAH_TEST__!.completeCleaning(reservationId), id);
  await expect(page.getByTestId('task-dropdown')).toContainText('zurückbauen');
  await page.evaluate((reservationId) => window.__HAH_TEST__!.completeReset(reservationId), id);
  const status = await page.evaluate((reservationId) => window.__HAH_TEST__!.getState().reservations.find((item) => item.id === reservationId)?.status, id);
  expect(status).toBe('done');
});

test('backup download and import restore the exact state on the same device', async ({ page }) => {
  await resetApp(page);
  await page.evaluate(({ date }) => {
    window.__HAH_TEST__!.createReservation({ serviceDate: date, startTime: '18:00', partySize: 3, name: 'Backup E2E', source: 'phone', preference: 'none', allowTableSharing: false, durationMinutes: 60 });
  }, { date: DATE });

  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Daten & Zeiten' }).click();
  await page.evaluate(() => {
    const capture = window as typeof window & {
      __HAH_BACKUP_BLOB__?: Blob;
      __HAH_BACKUP_NAME__?: string;
    };
    URL.createObjectURL = (blob) => {
      capture.__HAH_BACKUP_BLOB__ = blob as Blob;
      return 'blob:hah-test';
    };
    URL.revokeObjectURL = () => undefined;
    HTMLAnchorElement.prototype.click = function click(): void {
      capture.__HAH_BACKUP_NAME__ = this.download;
    };
  });
  await page.getByRole('button', { name: '↓ Backup herunterladen' }).click();
  await expect(page.getByTestId('toast')).toContainText('Backup heruntergeladen');
  const captured = await page.evaluate(async () => {
    const capture = window as typeof window & {
      __HAH_BACKUP_BLOB__?: Blob;
      __HAH_BACKUP_NAME__?: string;
    };
    return {
      name: capture.__HAH_BACKUP_NAME__,
      content: await capture.__HAH_BACKUP_BLOB__!.text(),
    };
  });
  expect(captured.name).toBe('hand-aufs-herz-2026-09-01.json');
  expect(JSON.parse(captured.content).format).toBe('hand-aufs-herz-backup');

  await page.evaluate(() => window.__HAH_TEST__!.reset());
  expect((await page.evaluate(() => window.__HAH_TEST__!.getState().reservations.length))).toBe(0);

  const input = page.locator('input[type="file"][accept*="json"]');
  await input.setInputFiles({
    name: 'hand-aufs-herz-2026-09-01.json',
    mimeType: 'application/json',
    buffer: Buffer.from(captured.content),
  });
  await expect(page.getByTestId('toast')).toContainText('Backup vollständig importiert');
  expect((await page.evaluate(() => window.__HAH_TEST__!.getState().reservations.some((item) => item.name === 'Backup E2E')))).toBe(true);
});

test('actions are visually distinct from plan information and the mobile header fits', async ({ page }) => {
  await resetApp(page);
  const id = await page.evaluate(({ date }) => window.__HAH_TEST__!.createReservation({
    serviceDate: date,
    startTime: '18:00',
    partySize: 3,
    name: 'Hierarchie-Test',
    source: 'phone',
    preference: 'inside',
    allowTableSharing: false,
    durationMinutes: 90,
  }), { date: DATE });

  await page.getByTestId(`reservation-${id}`).click();
  const visualHierarchy = await page.evaluate(() => {
    const action = getComputedStyle(document.querySelector<HTMLElement>('.primary-action')!);
    const information = getComputedStyle(document.querySelector<HTMLElement>('.detail-grid > div')!);
    return {
      actionBackground: action.backgroundColor,
      informationBackground: information.backgroundColor,
      actionShadow: action.boxShadow,
      informationBorderWidth: information.borderTopWidth,
    };
  });
  expect(visualHierarchy.actionBackground).not.toBe(visualHierarchy.informationBackground);
  expect(visualHierarchy.actionShadow).not.toBe('none');
  expect(visualHierarchy.informationBorderWidth).toBe('0px');

  await page.getByRole('button', { name: 'Schließen', exact: true }).first().click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.topbar')).toBeVisible();
  const layout = await page.evaluate(() => {
    const visibleButtons = [...document.querySelectorAll<HTMLElement>('.topbar button')]
      .filter((button) => getComputedStyle(button).display !== 'none')
      .map((button) => button.getBoundingClientRect());
    return {
      documentWidth: document.documentElement.scrollWidth,
      appWidth: document.querySelector<HTMLElement>('#app')!.getBoundingClientRect().width,
      topbarWidth: document.querySelector<HTMLElement>('.topbar')!.getBoundingClientRect().width,
      buttonsInsideViewport: visibleButtons.every((rect) => rect.left >= 0 && rect.right <= innerWidth),
      timeFontSize: Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>('[data-testid="current-time"]')!).fontSize),
      dateFontSize: Number.parseFloat(getComputedStyle(document.querySelector<HTMLElement>('[data-testid="current-date"]')!).fontSize),
    };
  });
  expect(layout.documentWidth).toBeLessThanOrEqual(390);
  expect(layout.appWidth).toBeGreaterThanOrEqual(390);
  expect(layout.topbarWidth).toBeGreaterThanOrEqual(390);
  expect(layout.buttonsInsideViewport).toBe(true);
  expect(layout.timeFontSize).toBeGreaterThanOrEqual(19);
  expect(layout.timeFontSize).toBeGreaterThan(layout.dateFontSize);
  await page.locator('.topbar').screenshot({ path: 'reports/ui-review/header-mobile-topbar-390x70.png', animations: 'disabled' });
  await openTasks(page);
  const mobileTaskBounds = await page.getByRole('dialog', { name: 'Aktuelle Aufgaben' }).boundingBox();
  expect(mobileTaskBounds!.x).toBeGreaterThanOrEqual(0);
  expect(mobileTaskBounds!.x + mobileTaskBounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'reports/ui-review/task-dropdown-mobile-390x844.png', animations: 'disabled' });
});
