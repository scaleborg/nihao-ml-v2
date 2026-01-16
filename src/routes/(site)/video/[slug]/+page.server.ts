import { error } from '@sveltejs/kit';
import { getVideo } from '$/server/video/youtube_api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const video = await getVideo(params.slug);

	if (!video) {
		error(404, 'Video not found');
	}

	return {
		video
	};
};
