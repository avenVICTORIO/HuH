import { mkdir, readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const SERVICE_DATE = '2026-09-01';
const NOW = Date.parse('2026-09-01T17:31:00+02:00');
const SCREENSHOT_DIRECTORY = 'docs/assets/user-guide';
const SCREENSHOT_NAMES = [
  '01-raumplan.png',
  '02-tischansicht.png',
  '03-reservierung-mit-zurueck.png',
  '04-aufgaben.png',
  '05-reservierung-anlegen.png',
  '06-walk-in.png',
  '07-suche.png',
  '08-zeitplan.png',
  '09-auto-plan.png',
  '10-manuelle-platzierung.png',
  '11-oeffnungszeiten.png',
  '12-wetter.png',
  '13-stossbetrieb.png',
] as const;

test.beforeAll(async () => {
  await mkdir(SCREENSHOT_DIRECTORY, { recursive: true });
});

async function mockWeatherApis(page: import('@playwright/test').Page): Promise<void> {
  await page.route((url) => url.hostname === 'nominatim.openstreetmap.org', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([{ display_name: 'Berlin, Deutschland', lat: '52.5200', lon: '13.4050' }]),
    });
  });
  await page.route((url) => url.hostname === 'api.brightsky.dev', async (route) => {
    const weather = Array.from({ length: 7 * 24 }, (_, index) => ({
      timestamp: new Date(NOW + index * 60 * 60_000).toISOString(),
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

test('generates the committed German user-guide screenshots', async ({ page }) => {
  await mockWeatherApis(page);
  await page.goto('/');
  const reservationIds = await page.evaluate(({ now, serviceDate }) => {
    const api = window.__HAH_TEST__!;
    api.setNow(now);
    api.reset();
    api.setNow(now);
    api.selectServiceDate(serviceDate);

    const next = api.createReservation({
      serviceDate,
      startTime: '18:00',
      partySize: 4,
      name: 'Familie Sommer',
      source: 'phone',
      preference: 'inside',
      allowTableSharing: false,
      durationMinutes: 60,
    });
    const later = api.createReservation({
      serviceDate,
      startTime: '20:00',
      partySize: 4,
      name: 'Geburtstag Kaya',
      source: 'online',
      preference: 'inside',
      allowTableSharing: false,
      durationMinutes: 90,
    });
    const joined = api.createReservation({
      serviceDate,
      startTime: '19:00',
      partySize: 8,
      name: 'Tafelrunde Lehmann',
      source: 'phone',
      preference: 'inside',
      allowTableSharing: false,
      durationMinutes: 120,
    });
    const open = api.createReservation({
      serviceDate,
      startTime: '18:30',
      partySize: 3,
      name: 'Familie Weber',
      source: 'phone',
      preference: 'inside',
      allowTableSharing: false,
      durationMinutes: 90,
    });
    api.manualAssign(next, 'table:1');
    api.manualAssign(later, 'table:1');
    api.manualAssign(joined, 'join:14+13');
    api.tick();
    return { next, later, joined, open };
  }, { now: NOW, serviceDate: SERVICE_DATE });

  await expect(page.getByTestId('floor-plan')).toBeVisible();
  await expect(page.getByTestId('task-bell')).toHaveAccessibleName('Aufgaben, 2 offen');
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/01-raumplan.png`,
    animations: 'disabled',
  });

  await page.getByTestId('table-1').click();
  await expect(page.getByTestId('next-reservation')).toContainText('Familie Sommer');
  await page.getByRole('dialog', { name: 'Tischbelegung' }).screenshot({
    path: `${SCREENSHOT_DIRECTORY}/02-tischansicht.png`,
    animations: 'disabled',
  });

  await page.getByTestId('next-reservation').click();
  await expect(page.getByRole('button', { name: 'Zurück zu Tisch 1' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Reservierung' }).screenshot({
    path: `${SCREENSHOT_DIRECTORY}/03-reservierung-mit-zurueck.png`,
    animations: 'disabled',
  });

  await page.getByRole('button', { name: 'Zurück zu Tisch 1' }).click();
  await expect(page.getByTestId('table-detail')).toBeVisible();
  await page.getByTestId('table-detail').getByRole('button', { name: 'Schließen', exact: true }).click();

  await page.getByTestId('task-bell').click();
  await expect(page.getByRole('dialog', { name: 'Aktuelle Aufgaben' })).toBeVisible();
  await page.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/04-aufgaben.png`,
    animations: 'disabled',
  });

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '＋ Reservierung' }).click();
  await page.getByRole('button', { name: 'Telefonisch' }).click();
  await page.getByRole('dialog', { name: 'Neue Reservierung' }).getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: /Mehr/ }).click();
  await expect(page.getByTestId('preference-none')).toBeVisible();
  await page.getByRole('dialog', { name: 'Neue Reservierung' }).screenshot({
    path: `${SCREENSHOT_DIRECTORY}/05-reservierung-anlegen.png`,
    animations: 'disabled',
  });
  await page.getByRole('dialog', { name: 'Neue Reservierung' }).getByRole('button', { name: 'Schließen' }).click();

  await page.getByRole('button', { name: '＋ Walk-in' }).click();
  await expect(page.getByText('Walk-in · Gästezahl')).toBeVisible();
  await page.getByRole('dialog', { name: 'Walk-in' }).screenshot({
    path: `${SCREENSHOT_DIRECTORY}/06-walk-in.png`,
    animations: 'disabled',
  });
  await page.getByRole('dialog', { name: 'Walk-in' }).getByRole('button', { name: 'Schließen' }).click();

  await page.getByLabel('Reservierungen durchsuchen').fill('Lehmann');
  await expect(page.getByText('1 Treffer · alle Status')).toBeVisible();
  await page.locator('.reservation-sidebar').screenshot({
    path: `${SCREENSHOT_DIRECTORY}/07-suche.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Suche löschen' }).click();

  await page.locator('.workspace-view-tabs').getByRole('button', { name: /Zeitplan/ }).click();
  await expect(page.getByTestId('schedule-view')).toBeVisible();
  await page.locator('.workspace-main').screenshot({
    path: `${SCREENSHOT_DIRECTORY}/08-zeitplan.png`,
    animations: 'disabled',
  });
  await page.locator('.workspace-view-tabs').getByRole('button', { name: /Raumplan/ }).click();

  await page.getByRole('button', { name: /Auto-Plan/ }).click();
  const planDialog = page.getByRole('dialog', { name: 'Auto-Plan prüfen' });
  await expect(planDialog.getByTestId('apply-plan')).toBeVisible();
  await planDialog.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/09-auto-plan.png`,
    animations: 'disabled',
  });
  await planDialog.getByRole('button', { name: 'Abbrechen' }).click();

  await page.getByTestId(`reservation-${reservationIds.open}`).click();
  await page.getByRole('button', { name: 'Tisch auswählen' }).click();
  await page.getByTestId('table-6').click();
  // Direkt-Platzierung: der Tisch wird sofort belegt; bei 2+ freien
  // Restplätzen folgt die Freigeben-Frage.
  const shareDialog = page.getByRole('dialog', { name: 'Restplätze freigeben?' });
  await expect(shareDialog).toBeVisible();
  await shareDialog.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/10-manuelle-platzierung.png`,
    animations: 'disabled',
  });
  await page.getByTestId('share-no').click();

  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Daten & Zeiten' }).click();
  await page.getByTestId('opening-tuesday-0-from').fill('09:00');
  await page.getByTestId('opening-tuesday-0-until').fill('12:00');
  await page.getByTestId('opening-tuesday-add').click();
  await page.getByTestId('opening-tuesday-1-from').fill('17:00');
  await page.getByTestId('opening-tuesday-1-until').fill('22:00');
  await expect(page.getByTestId('toast')).toBeHidden({ timeout: 5_000 });
  await page.getByTestId('operations-drawer').screenshot({
    path: `${SCREENSHOT_DIRECTORY}/11-oeffnungszeiten.png`,
    animations: 'disabled',
  });
  await page.getByRole('button', { name: 'Betrieb schließen' }).click();

  await page.getByRole('button', { name: 'Betrieb und Aufgaben' }).click();
  await page.getByRole('button', { name: 'Betrieb', exact: true }).click();
  await page.getByTestId('weather-location-query').fill('Berlin');
  await page.getByRole('button', { name: 'Standort suchen' }).click();
  await page.getByRole('button', { name: /Berlin, Deutschland.*Auswählen/ }).click();
  await page.getByRole('button', { name: 'Betrieb schließen' }).click();
  await expect(page.getByTestId('weather-overlay')).toBeVisible();
  await page.getByTestId('weather-overlay').locator('.weather-overlay-main').click();
  const weatherDialog = page.getByRole('dialog', { name: '7-Tage-Wettervorhersage' });
  await expect(weatherDialog.getByText('Nur zur Information')).toBeVisible();
  await weatherDialog.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/12-wetter.png`,
    animations: 'disabled',
  });
  await page.getByTestId('weather-detail').getByRole('button', { name: 'Schließen', exact: true }).click();
  await expect(page.getByTestId('toast')).toBeHidden({ timeout: 5_000 });

  await page.evaluate((serviceDate) => window.__HAH_TEST__!.startRush(serviceDate), SERVICE_DATE);
  await page.getByTestId('rush-banner').click();
  const operationsDrawer = page.getByTestId('operations-drawer');
  const rushSection = operationsDrawer.locator('.rush-section');
  await rushSection.scrollIntoViewIfNeeded();
  await rushSection.screenshot({
    path: `${SCREENSHOT_DIRECTORY}/13-stossbetrieb.png`,
    animations: 'disabled',
  });

  const userGuide = await readFile('docs/USER_GUIDE.de.md', 'utf8');
  for (const screenshotName of SCREENSHOT_NAMES) {
    expect(userGuide).toContain(`assets/user-guide/${screenshotName}`);
  }
});
