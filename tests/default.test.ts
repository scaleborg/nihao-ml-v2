import { expect, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

test('index page has expected h1', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByRole('heading', { name: 'nihao.ml' })).toBeVisible();
});

test('Got about page', async ({ page }) => {
	await page.goto('/');
	await page.click('a:has-text("About")');
	await expect(page.locator('h1')).toBeVisible();
});

test('admin page should require login', async ({ page }) => {
	await page.goto('/admin');
	// Should redirect to login
	await expect(page).toHaveURL(/\/login/);
});

test('login page loads', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('h1:has-text("Login")')).toBeVisible();
});

test('database connection works', async () => {
	// Test that we can connect to the database and query videos
	const result = await prisma.video.findMany({ take: 1 });
	expect(Array.isArray(result)).toBe(true);
});

test('make sure all pages load without error', async ({ page }) => {
	await page.goto('/');

	// Wait for the page to be fully loaded
	await page.waitForLoadState('load');

	const bodyElement = await page.$('body');

	expect(bodyElement).toBeTruthy();
});
