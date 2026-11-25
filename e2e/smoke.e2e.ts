import { expect, test } from '@playwright/test';
import { synthLog } from '../src/lib/synth';

test('add a vehicle, load a log, see the result', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Add a vehicle' }).click();
	await page.getByRole('button', { name: 'Add vehicle', exact: true }).click();
	await page.getByRole('button', { name: 'Done' }).click();

	await page.locator('input[type=file][multiple]').setInputFiles({ name: 'pull.csv', mimeType: 'text/csv', buffer: Buffer.from(synthLog()) });

	await expect(page.getByLabel('Run name')).toHaveValue('pull');
	await expect(page.getByText(/@ [\d,]+ rpm/).first()).toBeVisible();
	await expect(page.locator('.u-wrap canvas').first()).toBeVisible();

	// The built page forbids all network requests, so a log cannot be sent anywhere.
	expect(await page.evaluate(() => fetch('/favicon.svg').then(() => 'allowed', () => 'blocked'))).toBe('blocked');

	// Pointing at a run card dims the other runs without rebuilding the chart.
	await page.getByLabel('Run name').hover();

	// Vehicles, runs and their logs all survive a reload.
	await page.reload();
	await expect(page.getByLabel('Run name')).toHaveValue('pull');
	await expect(page.getByText(/@ [\d,]+ rpm/).first()).toBeVisible();
	await page.getByRole('button', { name: 'Vehicles' }).click();
	await expect(page.getByRole('button', { name: 'New vehicle' })).toBeVisible();
	await page.getByRole('button', { name: 'Done' }).click();

	// Removing the run removes its stored log too.
	await page.getByRole('button', { name: 'Remove pull' }).click();
	// The save is asynchronous; wait for it to land before reloading, as a person would.
	await expect
		.poll(() =>
			page.evaluate(
				() =>
					new Promise((resolve) => {
						const open = indexedDB.open('logdyno');
						open.onsuccess = () => {
							const all = open.result.transaction('kv').objectStore('kv').getAllKeys();
							all.onsuccess = () => resolve(all.result.filter((k) => String(k).startsWith('table:')).length);
						};
					})
			)
		)
		.toBe(0);
	await page.reload();
	await expect(page.getByRole('button', { name: 'Try an example' })).toBeVisible();
});
