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
