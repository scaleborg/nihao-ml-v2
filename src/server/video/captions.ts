import { exec } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink } from 'fs/promises';

const execAsync = promisify(exec);

interface Caption {
	start: string;
	dur: string;
	text: string;
}

/**
 * Parse VTT subtitle content into Caption array
 */
function parseVTT(vttContent: string): Caption[] {
	const captions: Caption[] = [];
	const lines = vttContent.split('\n');

	let i = 0;
	// Skip header
	while (i < lines.length && !lines[i].includes('-->')) {
		i++;
	}

	while (i < lines.length) {
		const line = lines[i].trim();

		// Look for timestamp line (e.g., "00:00:06.166 --> 00:00:07.266")
		if (line.includes('-->')) {
			const [startTime, endTime] = line.split('-->').map((t) => t.trim());

			// Collect text lines until next timestamp or empty line
			const textLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].includes('-->') && lines[i].trim() !== '') {
				// Skip lines that are just numbers (cue identifiers)
				if (!/^\d+$/.test(lines[i].trim())) {
					textLines.push(lines[i].trim());
				}
				i++;
			}

			if (textLines.length > 0) {
				const text = textLines.join(' ').replace(/<[^>]+>/g, ''); // Remove HTML tags
				const start = vttTimeToSeconds(startTime);
				const end = vttTimeToSeconds(endTime);
				const dur = (end - start).toFixed(3);

				captions.push({
					start: start.toFixed(3),
					dur,
					text
				});
			}
		} else {
			i++;
		}
	}

	return captions;
}

/**
 * Convert VTT timestamp to seconds
 */
function vttTimeToSeconds(time: string): number {
	// Format: HH:MM:SS.mmm or MM:SS.mmm
	const parts = time.split(':');
	if (parts.length === 3) {
		const [hours, minutes, seconds] = parts;
		return parseFloat(hours) * 3600 + parseFloat(minutes) * 60 + parseFloat(seconds);
	} else if (parts.length === 2) {
		const [minutes, seconds] = parts;
		return parseFloat(minutes) * 60 + parseFloat(seconds);
	}
	return 0;
}

/**
 * Fetch Chinese captions from a YouTube video using yt-dlp
 * Fetches auto-generated captions in zh-Hans (Simplified Chinese)
 */
export async function fetchChineseCaptions(videoId: string): Promise<Caption[]> {
	const outputPath = join(tmpdir(), `yt-${videoId}`);
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	// Language codes to try in order of preference
	const languages = ['zh-Hans', 'zh-Hant', 'zh', 'zh-CN', 'zh-TW'];

	for (const lang of languages) {
		try {
			// Use yt-dlp to download auto-generated subtitles
			const cmd = `yt-dlp --write-auto-sub --sub-lang "${lang}" --sub-format vtt --skip-download -o "${outputPath}" "${videoUrl}" 2>&1`;

			await execAsync(cmd, { timeout: 30000 });

			// Check for downloaded subtitle file
			const subtitlePath = `${outputPath}.${lang}.vtt`;

			try {
				const vttContent = await readFile(subtitlePath, 'utf-8');

				// Clean up the file
				await unlink(subtitlePath).catch(() => {});

				const captions = parseVTT(vttContent);
				if (captions.length > 0) {
					return captions;
				}
			} catch {
				// File doesn't exist for this language, try next
				continue;
			}
		} catch {
			// yt-dlp failed for this language, try next
			continue;
		}
	}

	return [];
}

/**
 * Convert caption timestamps to seconds
 */
export function captionToSeconds(caption: Caption): { start: number; end: number } {
	const start = parseFloat(caption.start);
	const duration = parseFloat(caption.dur);
	return {
		start,
		end: start + duration
	};
}
