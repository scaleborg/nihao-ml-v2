import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('hero section displays correctly', async ({ page }) => {
		// Logo text visible in hero
		await expect(page.locator('.logo-text')).toBeVisible();

		// Tagline visible
		await expect(page.locator('h2').first()).toBeVisible();
	});

	test('video grid shows videos', async ({ page }) => {
		const videoGrid = page.locator('.video-grid');
		await expect(videoGrid).toBeVisible();

		const cards = videoGrid.locator('.video-card');
		const count = await cards.count();
		expect(count).toBeGreaterThan(0);
		expect(count).toBeLessThanOrEqual(9);
	});

	test('see all videos button exists', async ({ page }) => {
		const seeAllButton = page.locator('a[href="/videos"]').first();
		await expect(seeAllButton).toBeVisible();
	});

	test('navigation exists', async ({ page }) => {
		await expect(page.locator('nav')).toBeVisible();
	});

	test('footer exists', async ({ page }) => {
		await expect(page.locator('footer').first()).toBeVisible();
	});
});
