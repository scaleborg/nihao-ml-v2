import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

// GET - Batch lookup user's character states
// Example: GET /api/user-characters?chars=你好世界
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;

	if (!user) {
		// Return empty for anonymous users
		return json({ characters: {}, is_authenticated: false });
	}

	const chars_param = url.searchParams.get('chars');

	if (!chars_param) {
		error(400, 'Missing chars parameter');
	}

	// Extract unique characters
	const chars = [...new Set([...chars_param])];

	if (chars.length === 0) {
		return json({ characters: {}, is_authenticated: true });
	}

	// Limit to prevent abuse
	if (chars.length > 1000) {
		error(400, 'Too many characters (max 1000)');
	}

	// Fetch user's character states
	const user_characters = await prisma_client.userCharacter.findMany({
		where: {
			user_id: user.id,
			character_id: { in: chars }
		},
		select: {
			character_id: true,
			familiarity: true,
			state: true
		}
	});

	// Build response map
	const characters: Record<string, { familiarity: number; state: number }> = {};
	for (const uc of user_characters) {
		characters[uc.character_id] = {
			familiarity: uc.familiarity,
			state: uc.state
		};
	}

	return json({ characters, is_authenticated: true });
};
