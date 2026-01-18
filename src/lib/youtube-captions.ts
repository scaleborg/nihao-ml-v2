/**
 * Client-side YouTube caption extraction
 * Uses CORS proxy to fetch captions from YouTube
 *
 * POLICY: Only import videos with MANUAL Chinese (Simplified) subtitles
 * Auto-generated captions (kind === 'asr') are NOT accepted
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
const SIMPLIFIED_CHINESE_LANGS = ['zh-Hans', 'zh-CN'];

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

function selectSimplifiedChineseTrack(tracks: CaptionTrack[]): CaptionTrack | null {
	// POLICY: Filter out auto-generated captions (kind === 'asr')
	const manualTracks = tracks.filter((track) => track.kind !== 'asr');

	// Only match Simplified Chinese tracks (zh-Hans, zh-CN)
	for (const lang of SIMPLIFIED_CHINESE_LANGS) {
		const match = manualTracks.find((track) => track.languageCode === lang);
		if (match) return match;
	}

	// Fallback: check for tracks explicitly named Simplified Chinese
	return (
		manualTracks.find(
			(track) =>
				track.name?.simpleText?.includes('简体') || track.name?.simpleText?.includes('Simplified')
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
 * Fetch Simplified Chinese subtitles from a YouTube video (client-side)
 */
export async function fetchChineseSubtitles(videoId: string): Promise<Subtitle[] | null> {
	const tracks = await fetchCaptionTracksFromPage(videoId);
	if (tracks.length === 0) return null;

	const simplifiedTrack = selectSimplifiedChineseTrack(tracks);
	if (!simplifiedTrack) return null;

	const subtitles = await fetchSubtitlesFromTrack(simplifiedTrack.baseUrl);
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
