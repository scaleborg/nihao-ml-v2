/**
 * Server-side YouTube caption fetching via YouTubeTranscript.io API
 *
 * POLICY: Only import videos with MANUAL Chinese (Simplified) subtitles
 * Auto-generated captions (kind === 'asr') are NOT accepted
 */

import { YOUTUBE_TRANSCRIPT_API_KEY } from '$env/static/private';

export interface Caption {
	start: number;
	end: number;
	text: string;
}

export interface CaptionResult {
	captions: Caption[];
	availableLanguages: string[];
	hasChinese: boolean;
}

// Only accept Simplified Chinese subtitles
const SIMPLIFIED_CHINESE_LANGS = ['chinese (simplified)', 'zh', 'zh-hans', 'zh-cn', '简体中文'];

interface TranscriptTrack {
	language: string;
	languageCode?: string;
	kind?: string; // 'asr' indicates auto-generated captions
	transcript: Array<{
		text: string;
		start: string;
		dur: string;
	}>;
}

interface TranscriptResponse {
	id: string;
	title: string;
	tracks: TranscriptTrack[];
	languages?: Array<{ label: string; languageCode: string }>;
	text?: string;
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

/**
 * Fetch Simplified Chinese captions from YouTube using YouTubeTranscript.io API
 * Returns captions and available languages for better error messages
 * Only accepts zh-Hans, zh-CN variants (rejects Traditional Chinese)
 */
export async function fetchChineseCaptions(videoId: string): Promise<CaptionResult> {
	const emptyResult: CaptionResult = { captions: [], availableLanguages: [], hasChinese: false };

	if (!YOUTUBE_TRANSCRIPT_API_KEY) {
		console.error('YOUTUBE_TRANSCRIPT_API_KEY not configured');
		return emptyResult;
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
			console.error('YouTubeTranscript.io API error:', response.status);
			return emptyResult;
		}

		const data: TranscriptResponse[] = await response.json();

		if (!data || data.length === 0) {
			return emptyResult;
		}

		const videoData = data[0];

		// Get available languages from both tracks and languages array
		const availableLanguages: string[] = [];

		if (videoData.languages) {
			availableLanguages.push(...videoData.languages.map((l) => l.label));
		}

		if (videoData.tracks) {
			videoData.tracks.forEach((t) => {
				if (t.language && !availableLanguages.includes(t.language)) {
					availableLanguages.push(t.language);
				}
			});
		}

		// Check if Simplified Chinese is available
		const hasChinese = availableLanguages.some(isSimplifiedChinese);

		// POLICY: Filter out auto-generated captions (kind === 'asr')
		const manualTracks = videoData.tracks?.filter((track) => track.kind !== 'asr') || [];

		// Find Simplified Chinese track from manual tracks only
		const simplifiedTrack = manualTracks.find(
			(track) =>
				isSimplifiedChinese(track.language || '') || isSimplifiedChinese(track.languageCode || '')
		);

		if (simplifiedTrack && simplifiedTrack.transcript?.length > 0) {
			const captions = simplifiedTrack.transcript
				.map((entry) => ({
					start: parseFloat(entry.start),
					end: parseFloat(entry.start) + parseFloat(entry.dur),
					text: entry.text?.replace(/\n/g, ' ').trim() || ''
				}))
				.filter((c) => c.text.length > 0 && Number.isFinite(c.start) && Number.isFinite(c.end));

			return { captions, availableLanguages, hasChinese: true };
		}

		return { captions: [], availableLanguages, hasChinese };
	} catch (error) {
		console.error('YouTubeTranscript.io fetch error:', error);
		return emptyResult;
	}
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
