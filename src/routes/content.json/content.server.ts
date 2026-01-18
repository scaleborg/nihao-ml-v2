import { prisma_client } from '$/server/prisma-client';

interface Block {
	breadcrumbs: string[];
	content: string;
	href: string;
	id: string;
}

export async function content() {
	const blocks: Block[] = [];

	// Get real videos from database
	const videos = await prisma_client.video.findMany({
		where: {
			is_public: true
		},
		orderBy: { created_at: 'desc' }
	});

	// Add videos to search index
	videos.forEach((video) => {
		blocks.push({
			breadcrumbs: [video.title],
			content: video.title,
			href: `/video/${video.slug}`,
			id: video.id
		});
	});

	return blocks;
}
