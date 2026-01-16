import type { Video } from '@prisma/client';

export async function check_for_cached_mp3(path: string) {
	if (typeof caches !== 'undefined') {
		try {
			const cache = await caches.open('mp3-cache');
			const cache_response = await cache.match(path);
			return cache_response;
		} catch (error) {
			console.error('Failed to retrieve MP3 file from cache:', error);
			return null;
		}
	}
	return null;
}

// takes in a video and returns either a cached or network version.
export async function get_cached_or_network_show(video: Video): Promise<Video> {
	const cached_response = await check_for_cached_mp3(video.url);
	if (cached_response) {
		const meta = cached_response.headers.get('Metadata');
		const meta_parsed = JSON.parse(meta ?? '');
		const blob = await cached_response.blob();
		if (blob) {
			// Create a new URL object from the blob
			const url = URL.createObjectURL(blob);
			return {
				...meta_parsed,
				url
			};
		}
	}
	return video;
}
