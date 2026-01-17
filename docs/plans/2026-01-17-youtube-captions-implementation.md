# YouTube Chinese Captions - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace yt-dlp with hybrid client+server caption fetching that works on Vercel.

**Architecture:** Client-side fetches captions via CORS proxy (primary), server-side uses youtube-transcript npm as fallback. Client passes fetched subtitles to server action.

**Tech Stack:** SvelteKit, TypeScript, youtube-transcript npm, corsproxy.io

---

## Task 1: Add youtube-transcript dependency

**Files:**

- Modify: `package.json`

**Step 1: Install the package**

```bash
pnpm add youtube-transcript
```

**Step 2: Verify installation**

```bash
pnpm list youtube-transcript
```

Expected: Shows `youtube-transcript` in dependencies

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore: add youtube-transcript dependency"
```

---

## Task 2: Create client-side caption fetcher

**Files:**

- Create: `src/lib/youtube-captions.ts`

**Step 1: Create the module**

```typescript
/**
 * Client-side YouTube caption extraction
 * Uses CORS proxy to fetch captions from YouTube
 */

export type Subtitle = {
	start: number;
	end: number;
	text: string;
};

type CaptionTrack = {
	baseUrl: string;
	languageCode: string;
	name?: { simpleText?: string };
	kind?: string;
};

const CORS_PROXY = (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`;
const CHINESE_LANGS = ['zh-Hans', 'zh-CN', 'zh-Hant', 'zh-TW', 'zh'];

function parseSubtitleXml(xml: string): Subtitle[] {
	const subtitles: Subtitle[] = [];
	const textRegex = /<text[^>]*start="([^"]*)"[^>]*dur="([^"]*)"[^>]*>([^<]*)<\/text>/g;
	let match: RegExpExecArray | null;

	while ((match = textRegex.exec(xml)) !== null) {
		const start = parseFloat(match[1]);
		const duration = parseFloat(match[2]);
		const text = match[3]
			?.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\\n/g, ' ')
			.trim();

		if (Number.isFinite(start) && Number.isFinite(duration) && text) {
			subtitles.push({ start, end: start + duration, text });
		}
	}

	return subtitles;
}

function selectChineseTrack(tracks: CaptionTrack[]): CaptionTrack | null {
	for (const lang of CHINESE_LANGS) {
		const match = tracks.find((track) => track.languageCode === lang);
		if (match) return match;
	}

	return (
		tracks.find(
			(track) =>
				track.languageCode?.startsWith('zh') ||
				track.name?.simpleText?.includes('Chinese') ||
				track.name?.simpleText?.includes('中文')
		) || null
	);
}

async function fetchCaptionTracksFromPage(videoId: string): Promise<CaptionTrack[]> {
	try {
		const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
		const response = await fetch(CORS_PROXY(watchUrl));

		if (!response.ok) return [];

		const html = await response.text();
		const playerResponseMatch = html.match(/var ytInitialPlayerResponse\s*=\s*({.+?});/s);

		if (!playerResponseMatch) return [];

		const playerResponse = JSON.parse(playerResponseMatch[1]);
		const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

		return Array.isArray(tracks) ? tracks : [];
	} catch {
		return [];
	}
}

async function fetchSubtitlesFromTrack(baseUrl: string): Promise<Subtitle[]> {
	const formats = ['srv3', 'srv1', ''];

	for (const fmt of formats) {
		try {
			const url = new URL(baseUrl);
			if (fmt) url.searchParams.set('fmt', fmt);

			const response = await fetch(CORS_PROXY(url.toString()));
			if (!response.ok) continue;

			const xml = await response.text();
			if (!xml.includes('<text')) continue;

			const subtitles = parseSubtitleXml(xml);
			if (subtitles.length > 0) return subtitles;
		} catch {
			continue;
		}
	}

	return [];
}

/**
 * Fetch Chinese subtitles from a YouTube video (client-side)
 */
export async function fetchChineseSubtitles(videoId: string): Promise<Subtitle[] | null> {
	const tracks = await fetchCaptionTracksFromPage(videoId);
	if (tracks.length === 0) return null;

	const chineseTrack = selectChineseTrack(tracks);
	if (!chineseTrack) return null;

	const subtitles = await fetchSubtitlesFromTrack(chineseTrack.baseUrl);
	return subtitles.length > 0 ? subtitles : null;
}

/**
 * Extract video ID from a YouTube URL
 */
export function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}

	return null;
}
```

**Step 2: Run type check**

```bash
pnpm check
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/youtube-captions.ts
git commit -m "feat: add client-side YouTube caption fetcher"
```

---

## Task 3: Rewrite server-side captions module

**Files:**

- Modify: `src/server/video/captions.ts`

**Step 1: Replace yt-dlp with youtube-transcript**

```typescript
import { YoutubeTranscript } from 'youtube-transcript';

export interface Caption {
	start: number;
	end: number;
	text: string;
}

const CHINESE_LANGS = ['zh-Hans', 'zh-CN', 'zh-Hant', 'zh-TW', 'zh'];

/**
 * Fetch Chinese captions from YouTube using youtube-transcript npm package
 * Server-side fallback when client-side fetch fails
 */
export async function fetchChineseCaptions(videoId: string): Promise<Caption[]> {
	for (const lang of CHINESE_LANGS) {
		try {
			const entries = await YoutubeTranscript.fetchTranscript(videoId, { lang });

			if (entries && entries.length > 0) {
				return entries
					.map((entry) => ({
						start: entry.offset / 1000,
						end: (entry.offset + entry.duration) / 1000,
						text: entry.text?.trim() || ''
					}))
					.filter((c) => c.text.length > 0);
			}
		} catch {
			continue;
		}
	}

	return [];
}

/**
 * Convert legacy caption format (for backwards compatibility)
 * @deprecated Use Caption interface directly
 */
export function captionToSeconds(caption: { start: string; dur: string }): {
	start: number;
	end: number;
} {
	const start = parseFloat(caption.start);
	const duration = parseFloat(caption.dur);
	return { start, end: start + duration };
}
```

**Step 2: Run type check**

```bash
pnpm check
```

Expected: No errors (or type errors in page.server.ts which we'll fix next)

**Step 3: Commit**

```bash
git add src/server/video/captions.ts
git commit -m "feat: replace yt-dlp with youtube-transcript npm"
```

---

## Task 4: Update import form with client-side fetch

**Files:**

- Modify: `src/routes/(site)/admin/import/+page.svelte`

**Step 1: Add client-side caption fetching**

Replace the entire file with:

```svelte
<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { fetchChineseSubtitles, extractVideoId, type Subtitle } from '$lib/youtube-captions';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();
	let loading = $state(false);
	let status = $state('');
	let client_subtitles = $state<Subtitle[] | null>(null);
</script>

<svelte:head>
	<title>Import Video | Nihao.ml Admin</title>
</svelte:head>

<div class="import-page">
	<header>
		<a href="/admin" class="back-link">← Back to Admin</a>
		<h1>Import Video</h1>
		<p class="description">
			Paste a YouTube URL to import a video with Chinese captions. The system will automatically
			fetch the Chinese subtitles and generate pinyin for each line.
		</p>
	</header>

	{#if form?.error}
		<div class="error">
			{form.error}
		</div>
	{/if}

	{#if status}
		<div class="status">
			{status}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={({ formData }) => {
			loading = true;
			status = '';

			// Add client subtitles if we fetched them
			if (client_subtitles) {
				formData.set('client_subtitles', JSON.stringify(client_subtitles));
			}

			return async ({ update }) => {
				loading = false;
				status = '';
				client_subtitles = null;
				await update();
			};
		}}
		onsubmit={async (e) => {
			const form_el = e.currentTarget as HTMLFormElement;
			const url = new FormData(form_el).get('url') as string;
			const video_id = extractVideoId(url);

			if (!video_id) return; // Let server validate

			// Try client-side fetch first
			status = 'Fetching captions...';
			try {
				client_subtitles = await fetchChineseSubtitles(video_id);
				if (client_subtitles) {
					status = `Found ${client_subtitles.length} caption lines`;
				} else {
					status = 'No captions found client-side, server will try...';
				}
			} catch {
				status = 'Client fetch failed, server will try...';
			}
		}}
	>
		<div class="field">
			<label for="url">YouTube URL</label>
			<input
				type="url"
				id="url"
				name="url"
				placeholder="https://www.youtube.com/watch?v=..."
				value={form?.url ?? ''}
				required
				disabled={loading}
			/>
			<span class="hint">Supports youtube.com/watch, youtu.be, and embed URLs</span>
		</div>

		<div class="field checkbox">
			<label>
				<input type="checkbox" name="is_public" disabled={loading} />
				<span>Make public</span>
			</label>
			<span class="hint">
				Public videos appear in the browse list. Leave unchecked for personal imports.
			</span>
		</div>

		<button type="submit" disabled={loading}>
			{#if loading}
				<span class="spinner"></span>
				Importing...
			{:else}
				Import Video
			{/if}
		</button>
	</form>

	<section class="tips">
		<h2>Tips for finding videos with Chinese captions</h2>
		<ul>
			<li>Look for videos from Chinese language learning channels</li>
			<li>Chinese vlogs often have community-contributed subtitles</li>
			<li>Music videos with lyrics may have Chinese captions</li>
			<li>Filter YouTube search by "Subtitles/CC" to find captioned content</li>
		</ul>
	</section>
</div>

<style>
	.import-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	.back-link {
		color: var(--fg-2);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: var(--primary);
	}

	h1 {
		margin: 0.5rem 0;
		font-size: 1.75rem;
	}

	.description {
		color: var(--fg-2);
		line-height: 1.5;
	}

	.error {
		background: var(--error-bg, #fee2e2);
		color: var(--error-fg, #dc2626);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	.status {
		background: var(--info-bg, #dbeafe);
		color: var(--info-fg, #1d4ed8);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field.checkbox {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
	}

	.field.checkbox label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.field.checkbox .hint {
		width: 100%;
		margin-left: 1.5rem;
	}

	label {
		font-weight: 500;
	}

	input[type='url'] {
		padding: 0.75rem 1rem;
		border: 2px solid var(--bg-2);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--bg-0);
		color: var(--fg-0);
	}

	input[type='url']:focus {
		outline: none;
		border-color: var(--primary);
	}

	input[type='url']:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	input[type='checkbox'] {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--primary);
	}

	.hint {
		font-size: 0.875rem;
		color: var(--fg-2);
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid white;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tips {
		margin-top: 3rem;
		padding: 1.5rem;
		background: var(--bg-1);
		border-radius: 8px;
	}

	.tips h2 {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.tips ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.tips li {
		color: var(--fg-2);
		line-height: 1.6;
	}
</style>
```

**Step 2: Run type check**

```bash
pnpm check
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/\(site\)/admin/import/+page.svelte
git commit -m "feat: add client-side caption fetching to import form"
```

---

## Task 5: Update server action to accept client subtitles

**Files:**

- Modify: `src/routes/(site)/admin/import/+page.server.ts`

**Step 1: Update action to use client subtitles with server fallback**

```typescript
import { fail, redirect } from '@sveltejs/kit';
import { prisma_client } from '$/server/prisma-client';
import { extractVideoId, fetchVideoMetadata } from '$/server/video/youtube_api';
import { fetchChineseCaptions, type Caption } from '$/server/video/captions';
import { generatePinyin } from '$/server/video/pinyin';
import slug from 'speakingurl';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const form_data = await request.formData();
		const url = form_data.get('url') as string;
		const is_public = form_data.get('is_public') === 'on';
		const client_subtitles_raw = form_data.get('client_subtitles') as string | null;

		// Validate URL
		if (!url || typeof url !== 'string') {
			return fail(400, { error: 'Please enter a YouTube URL', url });
		}

		// Extract video ID
		const video_id = extractVideoId(url);
		if (!video_id) {
			return fail(400, { error: 'Invalid YouTube URL', url });
		}

		// Check if video already exists
		const existing = await prisma_client.video.findUnique({
			where: { id: video_id }
		});

		if (existing) {
			throw redirect(303, `/video/${existing.slug}`);
		}

		// Fetch metadata from YouTube
		const metadata = await fetchVideoMetadata(video_id);
		if (!metadata) {
			return fail(400, {
				error: 'Could not fetch video metadata. Video may be private or unavailable.',
				url
			});
		}

		// Try client-provided subtitles first, then server fallback
		let captions: Caption[] = [];

		if (client_subtitles_raw) {
			try {
				const parsed = JSON.parse(client_subtitles_raw);
				if (Array.isArray(parsed) && parsed.length > 0) {
					captions = parsed.map((s: { start: number; end: number; text: string }) => ({
						start: s.start,
						end: s.end,
						text: s.text
					}));
				}
			} catch {
				// Invalid JSON, fall through to server fetch
			}
		}

		// Server-side fallback if client didn't provide subtitles
		if (captions.length === 0) {
			try {
				captions = await fetchChineseCaptions(video_id);
			} catch (e) {
				console.error('Server caption fetch error:', e);
			}
		}

		if (captions.length === 0) {
			return fail(400, {
				error:
					'No Chinese captions found for this video. Please choose a video with Chinese subtitles.',
				url
			});
		}

		// Generate slug from title
		const video_slug = slug(metadata.title);

		// Create video with transcript and lines
		try {
			const video = await prisma_client.video.create({
				data: {
					id: video_id,
					slug: video_slug,
					url: `https://www.youtube.com/watch?v=${video_id}`,
					title: metadata.title,
					channel_name: metadata.author_name,
					thumbnail: metadata.thumbnail_url,
					is_public,
					transcript: {
						create: {
							lines: {
								create: captions.map((caption, index) => ({
									index,
									start_time: caption.start,
									end_time: caption.end,
									text: caption.text,
									pinyin: generatePinyin(caption.text)
								}))
							}
						}
					}
				}
			});

			throw redirect(303, `/video/${video.slug}`);
		} catch (e) {
			// Re-throw redirects
			if (e && typeof e === 'object' && 'status' in e && 'location' in e) {
				throw e;
			}
			console.error('Database error:', e);
			return fail(500, { error: 'Error saving video to database.', url });
		}
	}
} satisfies Actions;
```

**Step 2: Run type check**

```bash
pnpm check
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/routes/\(site\)/admin/import/+page.server.ts
git commit -m "feat: accept client subtitles with server fallback"
```

---

## Task 6: Test the complete flow

**Step 1: Start dev server**

```bash
pnpm dev
```

**Step 2: Test import with a known Chinese video**

1. Navigate to `/admin/import`
2. Paste a YouTube URL with Chinese captions (e.g., a Chinese learning video)
3. Verify status shows "Found X caption lines" (client-side worked)
4. Submit and verify redirect to video page with transcript

**Step 3: Verify build works**

```bash
pnpm build
```

Expected: Build completes without errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete YouTube captions hybrid fetch system

- Client-side fetch via CORS proxy (primary)
- Server-side youtube-transcript npm (fallback)
- Removes yt-dlp system dependency
- Works on Vercel serverless"
```

---

## Summary

| Task | Description                           |
| ---- | ------------------------------------- |
| 1    | Add youtube-transcript npm dependency |
| 2    | Create client-side caption fetcher    |
| 3    | Rewrite server captions module        |
| 4    | Update import form with client fetch  |
| 5    | Update server action for hybrid flow  |
| 6    | Test and verify                       |
