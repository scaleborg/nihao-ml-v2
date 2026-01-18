/**
 * Import all videos from a YouTube channel
 *
 * POLICY: Only import videos with MANUAL Chinese (Simplified) subtitles
 * Auto-generated captions (kind === 'asr') are NOT accepted
 */

import { PrismaClient } from '@prisma/client';
import slug from 'speakingurl';
import 'dotenv/config';

const prisma = new PrismaClient();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_TRANSCRIPT_API_KEY = process.env.YOUTUBE_TRANSCRIPT_API_KEY;

if (!YOUTUBE_API_KEY) {
	console.error('YOUTUBE_API_KEY not set');
	process.exit(1);
}

// POLICY: Only accept Simplified Chinese (reject Traditional, auto-generated)
const SIMPLIFIED_CHINESE_LANGS = ['chinese (simplified)', 'zh', 'zh-hans', 'zh-cn', '简体中文'];

/**
 * Remove emojis and special Unicode symbols from text
 */
function stripEmojis(text: string): string {
	return text
		.replace(
			/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu,
			''
		)
		.replace(/【|】/g, ' ') // Replace fullwidth brackets with space
		.replace(/\s+/g, ' ') // Collapse multiple spaces
		.trim();
}

function isSimplifiedChinese(lang: string): boolean {
	const lower = lang.toLowerCase();
	// Reject Traditional Chinese explicitly
	if (
		lower.includes('traditional') ||
		lower.includes('繁體') ||
		lower.includes('zh-hant') ||
		lower.includes('zh-tw')
	) {
		return false;
	}
	return SIMPLIFIED_CHINESE_LANGS.some((zh) => lower.includes(zh));
}

interface YouTubeVideo {
	id: string;
	title: string;
	channelTitle: string;
	thumbnail: string;
}

interface Caption {
	start: number;
	end: number;
	text: string;
}

// Simple pinyin generator (placeholder - uses the actual function from the codebase)
function generatePinyin(text: string): string {
	// This is a placeholder - in production, import from $/server/video/pinyin
	return text;
}

async function getChannelId(handle: string): Promise<string | null> {
	// Remove @ if present
	const cleanHandle = handle.replace('@', '');

	const url = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${cleanHandle}&key=${YOUTUBE_API_KEY}`;

	const response = await fetch(url);
	const data = await response.json();

	if (data.items && data.items.length > 0) {
		return data.items[0].id;
	}
	return null;
}

async function getChannelVideos(channelId: string): Promise<YouTubeVideo[]> {
	const videos: YouTubeVideo[] = [];
	let pageToken = '';

	do {
		const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=50&order=date&type=video&key=${YOUTUBE_API_KEY}${pageToken ? `&pageToken=${pageToken}` : ''}`;

		const response = await fetch(url);
		const data = await response.json();

		if (data.items) {
			for (const item of data.items) {
				videos.push({
					id: item.id.videoId,
					title: item.snippet.title,
					channelTitle: item.snippet.channelTitle,
					thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url
				});
			}
		}

		pageToken = data.nextPageToken || '';
	} while (pageToken);

	return videos;
}

async function fetchChineseCaptions(videoId: string): Promise<Caption[]> {
	if (!YOUTUBE_TRANSCRIPT_API_KEY) {
		console.log('  No YOUTUBE_TRANSCRIPT_API_KEY, skipping caption fetch');
		return [];
	}

	try {
		const response = await fetch('https://www.youtube-transcript.io/api/transcripts', {
			method: 'POST',
			headers: {
				Authorization: `Basic ${YOUTUBE_TRANSCRIPT_API_KEY}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ ids: [videoId] })
		});

		if (!response.ok) {
			console.log(`  Caption API error: ${response.status}`);
			return [];
		}

		const data = await response.json();

		if (!data || data.length === 0) {
			return [];
		}

		const videoData = data[0];

		// Log available languages for debugging
		const availableLangs = videoData.tracks?.map(
			(t: { language?: string; languageCode?: string }) => t.language || t.languageCode
		);
		if (availableLangs?.length > 0) {
			console.log(`  Available languages: ${availableLangs.join(', ')}`);
		}

		// POLICY: Filter out auto-generated captions (kind === 'asr')
		const manualTracks =
			videoData.tracks?.filter((track: { kind?: string }) => track.kind !== 'asr') || [];

		// Find Simplified Chinese track from manual tracks only
		const chineseTrack = manualTracks.find(
			(track: { language?: string; languageCode?: string }) =>
				isSimplifiedChinese(track.language || '') || isSimplifiedChinese(track.languageCode || '')
		);

		if (chineseTrack && chineseTrack.transcript?.length > 0) {
			return chineseTrack.transcript
				.map((entry: { start: string; dur: string; text?: string }) => ({
					start: parseFloat(entry.start),
					end: parseFloat(entry.start) + parseFloat(entry.dur),
					text: entry.text?.replace(/\n/g, ' ').trim() || ''
				}))
				.filter(
					(c: Caption) => c.text.length > 0 && Number.isFinite(c.start) && Number.isFinite(c.end)
				);
		}

		return [];
	} catch (error) {
		console.log(`  Caption fetch error:`, error);
		return [];
	}
}

async function importVideo(video: YouTubeVideo): Promise<boolean> {
	// Check if already exists
	const existing = await prisma.video.findUnique({
		where: { id: video.id }
	});

	if (existing) {
		console.log(`  Already exists: ${video.title}`);
		return false;
	}

	// Fetch captions
	const captions = await fetchChineseCaptions(video.id);

	if (captions.length === 0) {
		console.log(`  No manual Chinese (Simplified) subtitles found: ${video.title}`);
		return false;
	}

	// Clean title (remove emojis, special brackets)
	const cleanTitle = stripEmojis(video.title);
	const videoSlug = slug(cleanTitle);

	await prisma.video.create({
		data: {
			id: video.id,
			slug: videoSlug,
			url: `https://www.youtube.com/watch?v=${video.id}`,
			title: cleanTitle,
			channel_name: video.channelTitle,
			thumbnail: video.thumbnail,
			is_public: true,
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

	console.log(`  Imported: ${video.title} (${captions.length} lines)`);
	return true;
}

async function promptConfirm(question: string): Promise<boolean> {
	const readline = await import('readline');
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

	return new Promise((resolve) => {
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
		});
	});
}

async function main() {
	const channelHandle = process.argv[2] || '@talkinChinese_redred';
	const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y');

	console.log(`Fetching channel: ${channelHandle}`);

	const channelId = await getChannelId(channelHandle);
	if (!channelId) {
		console.error('Could not find channel ID');
		process.exit(1);
	}

	console.log(`Channel ID: ${channelId}`);

	const videos = await getChannelVideos(channelId);
	console.log(`Found ${videos.length} videos\n`);

	// Phase 1: Scan for videos with Chinese subtitles (dry run)
	console.log('=== Phase 1: Scanning for Simplified Chinese subtitles ===\n');

	const videosWithCaptions: { video: YouTubeVideo; captionCount: number }[] = [];
	let scanned = 0;

	for (const video of videos) {
		scanned++;
		process.stdout.write(`\rScanning ${scanned}/${videos.length}...`);

		// Skip if already exists
		const existing = await prisma.video.findUnique({ where: { id: video.id } });
		if (existing) continue;

		const captions = await fetchChineseCaptions(video.id);
		if (captions.length > 0) {
			videosWithCaptions.push({ video, captionCount: captions.length });
			console.log(`\n  ✓ Found: ${video.title} (${captions.length} lines)`);
		}

		await new Promise((resolve) => setTimeout(resolve, 300));
	}

	console.log(`\n\n=== Scan Complete ===`);
	console.log(`Total videos: ${videos.length}`);
	console.log(`Videos with Simplified Chinese subtitles: ${videosWithCaptions.length}`);

	if (videosWithCaptions.length === 0) {
		console.log('\nNo new videos to import.');
		await prisma.$disconnect();
		return;
	}

	console.log('\nVideos to import:');
	videosWithCaptions.forEach(({ video, captionCount }) => {
		console.log(`  - ${video.title.slice(0, 60)}... (${captionCount} lines)`);
	});

	// Phase 2: Confirm before importing
	if (!skipConfirm) {
		const confirmed = await promptConfirm(`\nImport ${videosWithCaptions.length} videos? (y/n): `);
		if (!confirmed) {
			console.log('Cancelled.');
			await prisma.$disconnect();
			return;
		}
	}

	// Phase 3: Import confirmed videos
	console.log('\n=== Phase 2: Importing ===\n');

	let imported = 0;
	for (const { video } of videosWithCaptions) {
		console.log(`Importing: ${video.title}`);
		const success = await importVideo(video);
		if (success) imported++;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	console.log(`\n===== Summary =====`);
	console.log(`Imported: ${imported}/${videosWithCaptions.length}`);

	await prisma.$disconnect();
}

main().catch((e) => {
	console.error(e);
	prisma.$disconnect();
	process.exit(1);
});
