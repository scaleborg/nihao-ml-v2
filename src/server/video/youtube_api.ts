import { prisma_client } from '$/server/prisma-client';
import slug from 'speakingurl';

// YouTube video importer for nihao.ml
// Imports individual videos with Chinese captions

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

interface YouTubeOEmbed {
	title: string;
	author_name: string;
	thumbnail_url: string;
}

/**
 * Extract video ID from various YouTube URL formats
 */
export function extractVideoId(url: string): string | null {
	const patterns = [
		/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
		/^([a-zA-Z0-9_-]{11})$/ // Direct ID
	];

	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match) return match[1];
	}
	return null;
}

/**
 * Fetch video metadata from YouTube oEmbed API
 */
export async function fetchVideoMetadata(videoId: string): Promise<YouTubeOEmbed | null> {
	const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

	try {
		const response = await fetch(url);
		if (!response.ok) return null;
		return await response.json();
	} catch {
		return null;
	}
}

/**
 * Import a YouTube video into the database
 */
export async function importVideo(
	urlOrId: string,
	options: { isPublic?: boolean; addedBy?: string } = {}
) {
	const videoId = extractVideoId(urlOrId);
	if (!videoId) {
		throw new Error('Invalid YouTube URL or video ID');
	}

	// Check if video already exists
	const existing = await prisma_client.video.findUnique({
		where: { id: videoId }
	});

	if (existing) {
		return existing;
	}

	// Fetch metadata
	const metadata = await fetchVideoMetadata(videoId);
	if (!metadata) {
		throw new Error('Could not fetch video metadata');
	}

	// Clean title (remove emojis, special brackets)
	const cleanTitle = stripEmojis(metadata.title);

	// Create video record
	const video = await prisma_client.video.create({
		data: {
			id: videoId,
			slug: slug(cleanTitle),
			url: `https://www.youtube.com/watch?v=${videoId}`,
			title: cleanTitle,
			channel_name: metadata.author_name,
			thumbnail: metadata.thumbnail_url,
			is_public: options.isPublic ?? false,
			added_by: options.addedBy ?? null
		}
	});

	return video;
}

/**
 * Get a video by ID or slug
 */
export async function getVideo(idOrSlug: string) {
	return prisma_client.video.findFirst({
		where: {
			OR: [{ id: idOrSlug }, { slug: idOrSlug }]
		},
		include: {
			transcript: {
				include: {
					lines: {
						orderBy: { index: 'asc' }
					}
				}
			}
		}
	});
}

/**
 * List public videos
 */
export async function listPublicVideos(limit = 20) {
	return prisma_client.video.findMany({
		where: { is_public: true },
		orderBy: { created_at: 'desc' },
		take: limit
	});
}

/**
 * List videos for a specific user
 */
export async function listUserVideos(userId: string) {
	return prisma_client.userVideo.findMany({
		where: { user_id: userId },
		include: { video: true },
		orderBy: { added_at: 'desc' }
	});
}
