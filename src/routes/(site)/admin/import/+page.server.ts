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
