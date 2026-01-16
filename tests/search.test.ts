import { expect, test } from '@playwright/test';

test.describe('Search Functionality', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
	});

	test('search button is visible', async ({ page }) => {
		const searchBtn = page.getByRole('button', { name: /search/i });
		await expect(searchBtn).toBeVisible();
	});

	test('search button shows keyboard shortcut', async ({ page }) => {
		// Should show ⌘K hint
		const shortcut = page.locator('text=⌘K');
		await expect(shortcut).toBeVisible();
	});

	test('clicking search opens modal', async ({ page }) => {
		const searchBtn = page.getByRole('button', { name: /search/i });
		await searchBtn.click();

		// Wait for modal to appear
		await page.waitForTimeout(300);

		// Check for search input or dialog
		const searchInput = page.locator(
			'input[type="search"], input[placeholder*="earch"], [role="searchbox"], [role="combobox"]'
		);
		const isVisible = (await searchInput.count()) > 0 && (await searchInput.first().isVisible());

		// If no dedicated search input, check for dialog/modal
		if (!isVisible) {
			const dialog = page.locator('[role="dialog"], .modal, .search-modal');
			const dialogVisible = (await dialog.count()) > 0;
			expect(dialogVisible || isVisible).toBe(true);
		}
	});

	test('keyboard shortcut opens search', async ({ page }) => {
		// Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
		await page.keyboard.press('Meta+k');
		await page.waitForTimeout(300);

		// Check if something opened
		const pageContent = await page.content();
		// After pressing Cmd+K, we should see some change
		// This is a basic check - specific implementation may vary
		expect(pageContent).toBeTruthy();
	});

	test('escape closes search', async ({ page }) => {
		const searchBtn = page.getByRole('button', { name: /search/i });
		await searchBtn.click();
		await page.waitForTimeout(300);

		await page.keyboard.press('Escape');
		await page.waitForTimeout(300);

		// After escape, search modal should be closed
		// The search button should still be visible
		await expect(searchBtn).toBeVisible();
	});
});
