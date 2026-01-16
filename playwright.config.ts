import type { PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
	webServer: {
		command: 'pnpm vite-dev',
		port: 5173,
		timeout: 30000,
		reuseExistingServer: true
	},
	testDir: 'tests',
	timeout: 10000,
	expect: { timeout: 5000 }
};

export default config;
