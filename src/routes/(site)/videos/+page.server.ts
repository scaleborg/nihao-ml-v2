import { prisma_client } from '$/server/prisma-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Fetch all public videos
	const videos = await prisma_client.video.findMany({
		where: { is_public: true },
		orderBy: { created_at: 'desc' },
		include: {
			transcript: {
				select: {
					_count: {
						select: { lines: true }
					}
				}
			}
		}
	});

	return {
		videos,
		meta: {
			title: 'All Videos | nihao.ml',
			canonical: `${url.protocol}//${url.host}/videos`
		}
	};
};
