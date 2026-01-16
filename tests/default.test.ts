import { expect, test } from '@playwright/test';

test('index page has expected heading', async ({ page }) => {
	await page.goto('/');
	await expect(page.locator('.logo-text')).toContainText('nihao');
});

test('about page loads', async ({ page }) => {
	await page.goto('/about');
	await expect(page.locator('h1')).toBeVisible();
});

test('admin page requires login', async ({ page }) => {
	await page.goto('/admin');
	await expect(page).toHaveURL(/\/login/);
});

test('login page loads', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
});
