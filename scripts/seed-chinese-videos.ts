#!/usr/bin/env npx tsx
/**
 * Seed real Chinese videos with Chinese subtitles
 * Run with: npx tsx scripts/seed-chinese-videos.ts
 *
 * POLICY: Only import videos with MANUAL Chinese (Simplified) subtitles
 * Auto-generated captions (ASR) are NOT accepted
 */

import { PrismaClient } from '@prisma/client';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink } from 'fs/promises';
import slug from 'speakingurl';
import { generatePinyin } from '../src/server/video/pinyin';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

// Chinese videos with verified Chinese subtitles
const CHINESE_VIDEOS = [
	{
		id: 'oeSp5O7cxEo',
		// YCT 1 Lesson 1 - Hello in Chinese
		note: 'Native zh-CN subtitles'
	},
	{
		id: 'AdP8YGvI3Yk',
		// Master Workplace Chinese
		note: 'Native zh subtitles'
	},
	{
		id: 'S31XLZ31t-I',
		// Hanyu Pinyin alphabet
		note: 'Chinese pinyin lesson'
	},
	{
		id: 'u9Ek9QVx-MY',
		// 5 ways to improve Chinese
		note: 'Chinese learning tips'
	}
];

interface Caption {
	start: string;
	dur: string;
	text: string;
}

function vttTimeToSeconds(time: string): number {
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

function parseVTT(vttContent: string): Caption[] {
	const captions: Caption[] = [];
	const lines = vttContent.split('\n');

	let i = 0;
	while (i < lines.length && !lines[i].includes('-->')) {
		i++;
	}

	while (i < lines.length) {
		const line = lines[i].trim();

		if (line.includes('-->')) {
			const [startTime, endTime] = line.split('-->').map((t) => t.trim());

			const textLines: string[] = [];
			i++;
			while (i < lines.length && !lines[i].includes('-->') && lines[i].trim() !== '') {
				if (!/^\d+$/.test(lines[i].trim())) {
					textLines.push(lines[i].trim());
				}
				i++;
			}

			if (textLines.length > 0) {
				const text = textLines.join(' ').replace(/<[^>]+>/g, '');
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

async function fetchChineseCaptions(videoId: string): Promise<Caption[]> {
	const outputPath = join(tmpdir(), `yt-seed-${videoId}`);
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	// Only Simplified Chinese variants (reject Traditional)
	const languages = ['zh-Hans', 'zh-CN', 'zh'];

	// POLICY: Only accept MANUAL subtitles (--write-sub), never auto-generated
	for (const lang of languages) {
		try {
			await execFileAsync(
				'yt-dlp',
				[
					'--write-sub', // Manual subtitles only, never --write-auto-sub
					'--sub-lang',
					lang,
					'--sub-format',
					'vtt',
					'--skip-download',
					'-o',
					outputPath,
					videoUrl
				],
				{ timeout: 60000 }
			);

			const subtitlePath = `${outputPath}.${lang}.vtt`;

			try {
				const vttContent = await readFile(subtitlePath, 'utf-8');
				await unlink(subtitlePath).catch(() => {});

				const captions = parseVTT(vttContent);
				if (captions.length > 0) {
					console.log(`  Found ${captions.length} manual captions in ${lang}`);
					return captions;
				}
			} catch {
				continue;
			}
		} catch {
			continue;
		}
	}

	return [];
}

async function fetchVideoMetadata(videoId: string) {
	try {
		const { stdout } = await execFileAsync(
			'yt-dlp',
			['--dump-json', '--skip-download', `https://www.youtube.com/watch?v=${videoId}`],
			{ timeout: 30000 }
		);

		const data = JSON.parse(stdout);
		return {
			title: data.title,
			channel_name: data.channel || data.uploader,
			thumbnail: data.thumbnail,
			duration: data.duration
		};
	} catch (e) {
		console.error(`  Failed to fetch metadata: ${e}`);
		return null;
	}
}

async function importVideo(videoId: string) {
	console.log(`\nImporting video: ${videoId}`);

	// Check if exists
	const existing = await prisma.video.findUnique({ where: { id: videoId } });
	if (existing) {
		console.log(`  Already exists: ${existing.title}`);
		return;
	}

	// Fetch metadata
	const metadata = await fetchVideoMetadata(videoId);
	if (!metadata) {
		console.log(`  Skipping: Could not fetch metadata`);
		return;
	}
	console.log(`  Title: ${metadata.title}`);

	// Fetch Chinese captions
	const captions = await fetchChineseCaptions(videoId);
	if (captions.length === 0) {
		console.log(`  Skipping: No manual Chinese (Simplified) subtitles found`);
		return;
	}

	// Create video
	const video_slug = slug(metadata.title);

	try {
		await prisma.video.create({
			data: {
				id: videoId,
				slug: video_slug,
				url: `https://www.youtube.com/watch?v=${videoId}`,
				title: metadata.title,
				channel_name: metadata.channel_name,
				thumbnail: metadata.thumbnail,
				duration: metadata.duration,
				is_public: true,
				transcript: {
					create: {
						lines: {
							create: captions.map((caption, index) => {
								const start = parseFloat(caption.start);
								const duration = parseFloat(caption.dur);
								return {
									index,
									start_time: start,
									end_time: start + duration,
									text: caption.text,
									pinyin: generatePinyin(caption.text)
								};
							})
						}
					}
				}
			}
		});
		console.log(`  ✅ Imported successfully`);
	} catch (e) {
		console.error(`  ❌ Database error: ${e}`);
	}
}

async function main() {
	console.log('Seeding Chinese videos...\n');

	for (const video of CHINESE_VIDEOS) {
		await importVideo(video.id);
	}

	console.log('\nDone!');
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
