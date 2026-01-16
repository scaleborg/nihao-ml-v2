import { expect, test } from '@playwright/test';

test.describe('/videos page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/videos');
	});

	test('page loads with heading', async ({ page }) => {
		await expect(page.locator('h1')).toBeVisible();
	});

	test('video grid displays', async ({ page }) => {
		const videoGrid = page.locator('.video-grid');
		await expect(videoGrid).toBeVisible();
	});

	test('has filter controls', async ({ page }) => {
		// Just check there are buttons in the filter area
		await expect(page.locator('.list-heading button').first()).toBeVisible();
	});

	test('clicking video card navigates', async ({ page }) => {
		const firstCard = page.locator('.video-card').first();
		await firstCard.click();
		await expect(page).toHaveURL(/\/video\//);
	});
});
