import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

// POST - Save single character familiarity
export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;

	if (!user) {
		error(401, 'Authentication required');
	}

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		error(400, 'Invalid JSON body');
	}

	const { character, familiarity } = body as { character?: string; familiarity?: number };

	// Validate character
	if (!character || typeof character !== 'string' || [...character].length !== 1) {
		error(400, 'Invalid character: must be a single character');
	}

	// Validate familiarity (1-5)
	if (
		familiarity === undefined ||
		typeof familiarity !== 'number' ||
		!Number.isInteger(familiarity) ||
		familiarity < 1 ||
		familiarity > 5
	) {
		error(400, 'Invalid familiarity: must be integer 1-5');
	}

	// Upsert the UserCharacter record
	const user_character = await prisma_client.userCharacter.upsert({
		where: {
			user_id_character_id: {
				user_id: user.id,
				character_id: character
			}
		},
		update: {
			familiarity
		},
		create: {
			user_id: user.id,
			character_id: character,
			familiarity
		},
		select: {
			character_id: true,
			familiarity: true,
			state: true
		}
	});

	return json({
		success: true,
		character: user_character.character_id,
		familiarity: user_character.familiarity,
		state: user_character.state
	});
};
