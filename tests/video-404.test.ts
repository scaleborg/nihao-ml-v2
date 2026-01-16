import { expect, test } from '@playwright/test';

test.describe('Video 404 Handling', () => {
	test('placeholder videos show error page', async ({ page }) => {
		await page.goto('/video/placeholder-video-0');

		// Should show error message
		const pageContent = await page.content();
		const hasError =
			pageContent.includes('Oopsie') ||
			pageContent.toLowerCase().includes('not found') ||
			pageContent.includes('404');

		expect(hasError).toBe(true);
	});

	test('non-existent video shows error', async ({ page }) => {
		await page.goto('/video/this-video-does-not-exist');

		const pageContent = await page.content();
		const hasError =
			pageContent.includes('Oopsie') || pageContent.toLowerCase().includes('not found');

		expect(hasError).toBe(true);
	});

	test('navigation still works on error page', async ({ page }) => {
		await page.goto('/video/placeholder-video-0');

		// Logo should still be clickable
		const homeLink = page.locator('a[href="/"]').first();
		await expect(homeLink).toBeVisible();

		// Nav links should exist
		await expect(page.locator('nav')).toBeVisible();
	});

	test('can navigate home from error page', async ({ page }) => {
		await page.goto('/video/placeholder-video-0');

		await page.locator('a[href="/"]').first().click();
		await expect(page).toHaveURL('/');
	});
});
