import { expect, test } from '@playwright/test';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const filesystemBuildUrl = pathToFileURL(resolve('dist-file/Hand-aufs-Herz.html')).href;

test('the standalone filesystem build starts and persists data through file://', async ({ page }) => {
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('requestfailed', (request) => failedRequests.push(request.url()));

  await page.goto(filesystemBuildUrl);
  await expect(page.getByTestId('floor-plan')).toBeVisible();
  await expect(page.evaluate(() => window.__HAH_TEST__)).resolves.toBeUndefined();

  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  const selectedServiceDate = await page.evaluate(() => {
    const now = new Date();
    const pad = (value: number): string => String(value).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
  await page.getByRole('button', { name: '＋ Reservierung' }).click();
  await page.getByRole('button', { name: 'Telefonisch' }).click();
  await page.getByTestId('reservation-date').fill(selectedServiceDate);
  await page.getByTestId('reservation-time').fill('18:00');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByRole('button', { name: /Mehr/ }).click();
  await page.getByTestId('preference-inside').click();
  await page.getByTestId('reservation-name').fill('Datei Test');
  await page.getByRole('button', { name: 'Weiter' }).click();
  await page.getByTestId('finish-auto').click();
  await expect(page.getByTestId('toast')).toContainText('Reservierung');

  const storedBeforeReload = await page.evaluate(() => window.localStorage.getItem('hand-aufs-herz.app-state.v1'));
  expect(storedBeforeReload).toContain('Datei Test');
  await page.reload();
  await expect(page.getByRole('complementary').getByText('Datei Test', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('hand-aufs-herz.app-state.v1'))).toBe(storedBeforeReload);
  expect(pageErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});
