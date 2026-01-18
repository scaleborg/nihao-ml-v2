import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

// PATCH: Update familiarity for a character
export const PATCH: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { character_id, familiarity } = body;

	if (!character_id || typeof familiarity !== 'number' || familiarity < 1 || familiarity > 5) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	// Find existing user character
	const existing = await prisma_client.userCharacter.findUnique({
		where: {
			user_id_character_id: {
				user_id: user.id,
				character_id
			}
		}
	});

	if (!existing) {
		return json({ error: 'Character not found in your notebook' }, { status: 404 });
	}

	// Update familiarity
	const updated = await prisma_client.userCharacter.update({
		where: { id: existing.id },
		data: {
			familiarity,
			// If marked as known (5), update state
			state: familiarity === 5 ? 2 : existing.state
		}
	});

	return json({ success: true, familiarity: updated.familiarity });
};

// GET: Fetch paginated characters
export const GET: RequestHandler = async ({ url, locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const page = parseInt(url.searchParams.get('page') || '1');
	const per_page = parseInt(url.searchParams.get('per_page') || '24');
	const hsk = url.searchParams.get('hsk');
	const familiarity = url.searchParams.get('familiarity');
	const sort = url.searchParams.get('sort') || 'recent';

	// Build where clause
	const where: {
		user_id: string;
		character?: { hsk_level?: number | { gte: number } };
		familiarity?: number | { lt: number };
	} = {
		user_id: user.id
	};

	if (hsk) {
		const hsk_level = parseInt(hsk);
		if (hsk_level === 7) {
			where.character = { hsk_level: { gte: 4 } };
		} else if (hsk_level >= 1 && hsk_level <= 6) {
			where.character = { hsk_level };
		}
	}

	if (familiarity) {
		const fam = parseInt(familiarity);
		if (fam === 0) {
			where.familiarity = 1;
		} else if (fam === 5) {
			where.familiarity = 5;
		} else {
			where.familiarity = { lt: 5 };
		}
	}

	// Build order
	let orderBy: object = { first_seen: 'desc' };
	if (sort === 'oldest') orderBy = { first_seen: 'asc' };
	else if (sort === 'hsk') orderBy = { character: { hsk_level: 'asc' } };
	else if (sort === 'familiarity') orderBy = { familiarity: 'asc' };

	const [characters, total] = await Promise.all([
		prisma_client.userCharacter.findMany({
			where,
			orderBy,
			skip: (page - 1) * per_page,
			take: per_page,
			include: {
				character: {
					select: {
						id: true,
						pinyin: true,
						definition: true,
						hsk_level: true,
						radical: true,
						stroke_count: true
					}
				}
			}
		}),
		prisma_client.userCharacter.count({ where })
	]);

	return json({
		characters,
		total,
		page,
		per_page,
		total_pages: Math.ceil(total / per_page)
	});
};
