import { fail, redirect } from '@sveltejs/kit';
import { prisma_client } from '$/server/prisma-client';
import { extractVideoId, fetchVideoMetadata } from '$/server/video/youtube_api';
import { fetchChineseCaptions, type Caption } from '$/server/video/captions';
import { generatePinyin } from '$/server/video/pinyin';
import { downloadYouTubeVideo, isYtDlpAvailable } from '$/server/video/download';
import { uploadVideoToR2, isR2Configured } from '$/server/storage/r2';
import slug from 'speakingurl';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// Check if native video support is available
	const yt_dlp_available = await isYtDlpAvailable();
	const r2_configured = isR2Configured();
	const native_video_available = yt_dlp_available && r2_configured;

	return {
		native_video_available
	};
};

export const actions = {
	default: async ({ request }) => {
		const form_data = await request.formData();
		const url = form_data.get('url') as string;
		const is_public = form_data.get('is_public') === 'on';
		const native_video = form_data.get('native_video') === 'on';
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
		let availableLanguages: string[] = [];

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
				const result = await fetchChineseCaptions(video_id);
				captions = result.captions;
				availableLanguages = result.availableLanguages;
			} catch (e) {
				console.error('Server caption fetch error:', e);
			}
		}

		if (captions.length === 0) {
			let errorMsg = 'No Simplified Chinese captions found for this video.';

			if (availableLanguages.length > 0) {
				errorMsg += ` Available languages: ${availableLanguages.join(', ')}.`;
			} else {
				errorMsg += ' This video has no subtitles available.';
			}

			errorMsg += ' Please choose a video with Simplified Chinese (简体中文) subtitles.';

			return fail(400, { error: errorMsg, url });
		}

		// Generate slug from title
		const video_slug = slug(metadata.title);

		// Handle native video download and upload if requested
		let video_url: string | null = null;
		let video_key: string | null = null;
		let duration: number | null = null;

		if (native_video && isR2Configured()) {
			try {
				// Download video from YouTube
				const download_result = await downloadYouTubeVideo(video_id);
				duration = download_result.duration;

				// Upload to R2
				const upload_result = await uploadVideoToR2(video_id, download_result.buffer);
				video_url = upload_result.url;
				video_key = upload_result.key;
			} catch (e) {
				console.error('Native video processing error:', e);
				return fail(500, {
					error: `Failed to process native video: ${e instanceof Error ? e.message : 'Unknown error'}`,
					url
				});
			}
		}

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
					duration,
					video_url,
					video_key,
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
