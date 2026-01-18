import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

function getS3Client() {
	if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
		throw new Error('R2 environment variables not configured');
	}

	return new S3Client({
		region: 'auto',
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY
		}
	});
}

/**
 * Upload a video file to Cloudflare R2
 * @param video_id - YouTube video ID (used as base for the key)
 * @param buffer - Video file buffer
 * @returns Object with storage key and public URL
 */
export async function uploadVideoToR2(
	video_id: string,
	buffer: Buffer
): Promise<{ key: string; url: string }> {
	const key = `videos/${video_id}.mp4`;
	const s3_client = getS3Client();

	await s3_client.send(
		new PutObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: 'video/mp4'
		})
	);

	return {
		key,
		url: `${env.R2_PUBLIC_URL}/${key}`
	};
}

/**
 * Delete a video file from Cloudflare R2
 * @param key - R2 object key to delete
 */
export async function deleteVideoFromR2(key: string): Promise<void> {
	const s3_client = getS3Client();

	await s3_client.send(
		new DeleteObjectCommand({
			Bucket: env.R2_BUCKET_NAME,
			Key: key
		})
	);
}

/**
 * Check if R2 is configured (all required env vars present)
 */
export function isR2Configured(): boolean {
	return !!(
		env.R2_ACCOUNT_ID &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY &&
		env.R2_BUCKET_NAME &&
		env.R2_PUBLIC_URL
	);
}
