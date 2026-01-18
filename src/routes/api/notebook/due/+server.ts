import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '50');

	// Get characters due for review:
	// 1. next_review is null and state is 0 (new cards not yet reviewed)
	// 2. next_review is <= now (due for review)
	const now = new Date();

	const due_characters = await prisma_client.userCharacter.findMany({
		where: {
			user_id: user.id,
			OR: [{ next_review: { lte: now } }, { next_review: null, state: 0 }]
		},
		orderBy: [
			{ state: 'asc' }, // New cards first
			{ next_review: 'asc' } // Then by due date
		],
		take: limit,
		include: {
			character: {
				select: {
					id: true,
					pinyin: true,
					definition: true,
					hsk_level: true
				}
			}
		}
	});

	return json({
		characters: due_characters,
		count: due_characters.length
	});
};
