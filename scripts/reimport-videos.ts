#!/usr/bin/env npx tsx
/**
 * Reimport videos with proper R2 upload and captions
 * Run with: npx tsx scripts/reimport-videos.ts
 *
 * POLICY: Only import videos with MANUAL Chinese (Simplified) subtitles
 * Auto-generated captions (ASR) are NOT accepted
 */

import { PrismaClient } from '@prisma/client';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import { join } from 'path';
import { readFile, unlink, stat } from 'fs/promises';
import slug from 'speakingurl';
import 'dotenv/config';
import { generatePinyin } from '../src/server/video/pinyin';

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

// Videos to reimport
const VIDEOS_TO_IMPORT = [
	'02cmt8DasVc', // Weekend Getaway Learn Chinese Immersively
	'fc-rsmOUkt8', // Weekend Getaway in Chaozhou
	'wYosb-w01eY' // 喝早茶学中文 Learn Chinese with Cantonese Dim Sum
];

function stripEmojis(text: string): string {
	return text
		.replace(
			/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1FA00}-\u{1FAFF}]/gu,
			''
		)
		.replace(/【|】/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function getS3Client() {
	if (
		!process.env.R2_ACCOUNT_ID ||
		!process.env.R2_ACCESS_KEY_ID ||
		!process.env.R2_SECRET_ACCESS_KEY
	) {
		throw new Error('R2 environment variables not configured');
	}

	return new S3Client({
		region: 'auto',
		endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: process.env.R2_ACCESS_KEY_ID,
			secretAccessKey: process.env.R2_SECRET_ACCESS_KEY
		}
	});
}

async function uploadVideoToR2(
	videoId: string,
	buffer: Buffer
): Promise<{ key: string; url: string }> {
	const key = `videos/${videoId}.mp4`;
	const s3Client = getS3Client();

	await s3Client.send(
		new PutObjectCommand({
			Bucket: process.env.R2_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: 'video/mp4'
		})
	);

	return {
		key,
		url: `${process.env.R2_PUBLIC_URL}/${key}`
	};
}

async function downloadYouTubeVideo(videoId: string) {
	const outputPath = join(tmpdir(), `nihao-download-${videoId}.mp4`);
	const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

	console.log('  Downloading video...');

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
			outputPath,
			videoUrl
		],
		{ timeout: 600000 }
	);

	const actualPath = stdout.trim() || outputPath;
	const fileStats = await stat(actualPath);
	const buffer = await readFile(actualPath);

	// Get duration
	const { stdout: metadataStdout } = await execFileAsync(
		'yt-dlp',
		['--dump-json', '--skip-download', videoUrl],
		{ timeout: 30000 }
	);
	const metadata = JSON.parse(metadataStdout);

	await unlink(actualPath).catch(() => {});

	return {
		buffer,
		duration: metadata.duration || 0,
		size: fileStats.size,
		title: metadata.title,
		channel: metadata.channel || metadata.uploader,
		thumbnail: metadata.thumbnail
	};
}

interface Caption {
	start: number;
	end: number;
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

				captions.push({ start, end, text });
			}
		} else {
			i++;
		}
	}

	return captions;
}

async function fetchChineseCaptions(videoId: string): Promise<Caption[]> {
	const outputPath = join(tmpdir(), `yt-captions-${videoId}`);
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

async function importVideo(videoId: string) {
	console.log(`\n========================================`);
	console.log(`Importing: ${videoId}`);
	console.log(`========================================`);

	// Check if exists and delete if so
	const existing = await prisma.video.findUnique({ where: { id: videoId } });
	if (existing) {
		console.log(`  Deleting existing video...`);
		await prisma.transcriptLine.deleteMany({
			where: { transcript: { video_id: videoId } }
		});
		await prisma.transcript.deleteMany({ where: { video_id: videoId } });
		await prisma.video.delete({ where: { id: videoId } });
	}

	// Download video and get metadata
	const downloadResult = await downloadYouTubeVideo(videoId);
	console.log(`  Downloaded: ${(downloadResult.size / 1024 / 1024).toFixed(1)} MB`);
	console.log(`  Title: ${downloadResult.title}`);

	// Upload to R2
	console.log('  Uploading to R2...');
	const uploadResult = await uploadVideoToR2(videoId, downloadResult.buffer);
	console.log(`  Uploaded: ${uploadResult.url}`);

	// Fetch captions
	console.log('  Fetching captions...');
	const captions = await fetchChineseCaptions(videoId);

	if (captions.length === 0) {
		console.log(
			'  ⚠️  No manual Chinese (Simplified) subtitles found, importing without transcript'
		);
	}

	// Clean title
	const cleanTitle = stripEmojis(downloadResult.title);
	const videoSlug = slug(cleanTitle);

	// Create video record
	console.log('  Saving to database...');
	await prisma.video.create({
		data: {
			id: videoId,
			slug: videoSlug,
			url: `https://www.youtube.com/watch?v=${videoId}`,
			title: cleanTitle,
			channel_name: downloadResult.channel,
			thumbnail: downloadResult.thumbnail,
			duration: downloadResult.duration,
			video_url: uploadResult.url,
			video_key: uploadResult.key,
			is_public: true,
			transcript:
				captions.length > 0
					? {
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
					: undefined
		}
	});

	console.log(`  ✅ Imported successfully!`);
	console.log(`     URL: /video/${videoSlug}`);
}

async function main() {
	console.log('Reimporting videos with R2 upload...\n');

	for (const videoId of VIDEOS_TO_IMPORT) {
		try {
			await importVideo(videoId);
		} catch (e) {
			console.error(`  ❌ Error importing ${videoId}:`, e);
		}
	}

	console.log('\n\nDone!');
}

main()
	.catch(console.error)
	.finally(() => prisma.$disconnect());
