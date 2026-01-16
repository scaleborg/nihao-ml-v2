import coverArt from '$assets/coverart-128.png';
import coverArt512 from '$assets/coverart-512.png';

import type { Video } from '@prisma/client';

export function load_media_session(video: Video) {
	if (!('mediaSession' in navigator)) {
		console.log(`The Media Session API is not supported on this platform.`);
		return;
	}

	console.log(`The Media Session API is supported on this platform.`);
	navigator.mediaSession.metadata = new MediaMetadata({
		title: video.title,
		artist: video.channel_name || 'nihao.ml',
		artwork: [
			{
				src: video.thumbnail || coverArt,
				sizes: '128x128',
				type: 'image/png'
			},
			{
				src: video.thumbnail || coverArt512,
				sizes: '512x512',
				type: 'image/png'
			}
		]
	});
}
