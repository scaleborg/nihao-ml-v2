import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Use Google Translate TTS (free, no API key required)
// This fetches the audio for a single Chinese character

export const GET: RequestHandler = async ({ params }) => {
	const char = params.char;

	if (!char || [...char].length !== 1) {
		throw error(400, 'Invalid character');
	}

	// Check if it's a Chinese character
	const CHINESE_REGEX = /[\u4e00-\u9fff]/;
	if (!CHINESE_REGEX.test(char)) {
		throw error(400, 'Not a Chinese character');
	}

	try {
		// Use Google Translate TTS endpoint
		const tts_url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(char)}&tl=zh-CN&client=tw-ob`;

		const response = await fetch(tts_url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
			}
		});

		if (!response.ok) {
			throw error(502, 'Failed to fetch audio');
		}

		const audio_buffer = await response.arrayBuffer();

		return new Response(audio_buffer, {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
			}
		});
	} catch (e) {
		console.error('TTS error:', e);
		throw error(502, 'Audio service unavailable');
	}
};
