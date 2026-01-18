import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink, stat } from 'fs/promises';

const execFileAsync = promisify(execFile);

export interface DownloadResult {
	buffer: Buffer;
	duration: number;
	size: number;
}

/**
 * Download a YouTube video as MP4 using yt-dlp
 * Downloads 720p quality for balance between quality and file size
 *
 * @param video_id - YouTube video ID
 * @returns Video buffer, duration in seconds, and file size
 */
export async function downloadYouTubeVideo(video_id: string): Promise<DownloadResult> {
	const output_path = join(tmpdir(), `nihao-download-${video_id}.mp4`);
	const video_url = `https://www.youtube.com/watch?v=${video_id}`;

	try {
		// Download with yt-dlp
		// - Format: best mp4 up to 720p (bestvideo[height<=720]+bestaudio/best[height<=720])
		// - Merge to mp4 format
		// - No subtitles (we handle those separately)
		const { stdout } = await execFileAsync(
			'yt-dlp',
			[
				'-f',
				'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best',
				'--merge-output-format',
				'mp4',
				'--print',
				'after_move:filepath',
				'-o',
				output_path,
				video_url
			],
			{ timeout: 600000 } // 10 minute timeout for large videos
		);

		// yt-dlp may rename the file, get actual path from output
		const actual_path = stdout.trim() || output_path;

		// Get file stats
		const file_stats = await stat(actual_path);

		// Read the video file
		const buffer = await readFile(actual_path);

		// Get video duration from yt-dlp metadata
		const { stdout: metadata_stdout } = await execFileAsync(
			'yt-dlp',
			['--dump-json', '--skip-download', video_url],
			{ timeout: 30000 }
		);
		const metadata = JSON.parse(metadata_stdout);
		const duration = metadata.duration || 0;

		// Clean up temp file
		await unlink(actual_path).catch(() => {});

		return {
			buffer,
			duration,
			size: file_stats.size
		};
	} catch (error) {
		// Clean up on error
		await unlink(output_path).catch(() => {});
		throw new Error(`Failed to download video: ${error instanceof Error ? error.message : error}`);
	}
}

/**
 * Check if yt-dlp is available on the system
 */
export async function isYtDlpAvailable(): Promise<boolean> {
	try {
		await execFileAsync('yt-dlp', ['--version'], { timeout: 5000 });
		return true;
	} catch {
		return false;
	}
}
