import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

// POST - Mark multiple characters with a familiarity level
// Body: { characters: ["好", "你"], familiarity: 5 }
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

	const { characters, familiarity } = body as { characters?: string[]; familiarity?: number };

	// Validate characters array
	if (!Array.isArray(characters) || characters.length === 0) {
		error(400, 'Invalid characters: must be non-empty array');
	}

	// Validate each character is a single character
	for (const char of characters) {
		if (typeof char !== 'string' || [...char].length !== 1) {
			error(400, `Invalid character in array: ${char}`);
		}
	}

	// Limit to prevent abuse
	if (characters.length > 1000) {
		error(400, 'Too many characters (max 1000)');
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

	// Deduplicate characters
	const unique_chars = [...new Set(characters)];

	// Use transaction for bulk upsert
	const results = await prisma_client.$transaction(
		unique_chars.map((char) =>
			prisma_client.userCharacter.upsert({
				where: {
					user_id_character_id: {
						user_id: user.id,
						character_id: char
					}
				},
				update: {
					familiarity
				},
				create: {
					user_id: user.id,
					character_id: char,
					familiarity
				},
				select: {
					character_id: true,
					familiarity: true
				}
			})
		)
	);

	return json({
		success: true,
		updated: results.length,
		characters: results.reduce(
			(acc, uc) => {
				acc[uc.character_id] = { familiarity: uc.familiarity };
				return acc;
			},
			{} as Record<string, { familiarity: number }>
		)
	});
};
