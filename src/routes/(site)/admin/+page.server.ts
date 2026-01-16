import { prisma_client } from '$/server/prisma-client';

export const load = async () => {
	const videos = await prisma_client.video.findMany({
		orderBy: {
			created_at: 'desc'
		},
		take: 20
	});

	const users = await prisma_client.user.findMany({
		orderBy: {
			created_at: 'desc'
		},
		take: 10
	});

	return {
		videos,
		users
	};
};
