import { prisma_client } from '$/server/prisma-client';
import type { Video } from '@prisma/client';

interface Block {
	breadcrumbs: string[];
	content: string;
	href: string;
	id: string;
}

export async function content() {
	const blocks: Block[] = [];
	const videos = await prisma_client.video.findMany({
		where: {
			is_public: true
		},
		orderBy: { created_at: 'desc' }
	});

	videos.forEach((video) => {
		blocks.push({
			breadcrumbs: [video.title],
			content: video.title,
			href: `/watch/${video.slug}`,
			id: video.id
		});
	});
	return blocks;
}
