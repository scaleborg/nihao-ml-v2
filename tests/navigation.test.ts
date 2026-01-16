import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
	test('can navigate to videos', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/videos"]');
		await expect(page).toHaveURL('/videos');
	});

	test('can navigate to about', async ({ page }) => {
		await page.goto('/');
		await page.click('a[href="/about"]');
		await expect(page).toHaveURL('/about');
	});

	test('logo links home', async ({ page }) => {
		await page.goto('/videos');
		await page.locator('.logo a').click();
		await expect(page).toHaveURL('/');
	});
});

test.describe('Mobile Navigation', () => {
	test.use({ viewport: { width: 375, height: 667 } });

	test('mobile menu works', async ({ page }) => {
		await page.goto('/');

		const menuButton = page.locator('button:has-text("Menu")');
		await expect(menuButton).toBeVisible();

		await menuButton.click();
		await expect(page.locator('.menu')).toBeVisible();

		await page.locator('.close-button').click();
		await expect(page.locator('.menu')).not.toBeVisible();
	});
});
