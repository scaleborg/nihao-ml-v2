import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	// Get overall stats
	const [total_count, state_counts, familiarity_counts, hsk_counts, recent_reviews] =
		await Promise.all([
			// Total characters
			prisma_client.userCharacter.count({
				where: { user_id: user.id }
			}),

			// By state
			prisma_client.userCharacter.groupBy({
				by: ['state'],
				where: { user_id: user.id },
				_count: { _all: true }
			}),

			// By familiarity
			prisma_client.userCharacter.groupBy({
				by: ['familiarity'],
				where: { user_id: user.id },
				_count: { _all: true }
			}),

			// By HSK level (via character relation)
			prisma_client.$queryRaw`
				SELECT c.hsk_level, COUNT(*) as count
				FROM UserCharacter uc
				JOIN \`Character\` c ON uc.character_id = c.id
				WHERE uc.user_id = ${user.id}
				GROUP BY c.hsk_level
				ORDER BY c.hsk_level
			` as Promise<{ hsk_level: number | null; count: bigint }[]>,

			// Recent reviews (last 7 days)
			prisma_client.userCharacter.count({
				where: {
					user_id: user.id,
					last_review: {
						gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
					}
				}
			})
		]);

	// Process state counts
	const state_map: Record<number, number> = {};
	for (const s of state_counts) {
		state_map[s.state] = s._count._all;
	}

	// Process familiarity counts
	const fam_map: Record<number, number> = {};
	for (const f of familiarity_counts) {
		fam_map[f.familiarity] = f._count._all;
	}

	// Process HSK counts
	const hsk_map: Record<string, number> = {};
	for (const h of hsk_counts) {
		const key = h.hsk_level ? `hsk${h.hsk_level}` : 'none';
		hsk_map[key] = Number(h.count);
	}

	// Calculate summary stats
	const known_count = fam_map[5] || 0;
	const new_count = state_map[0] || 0;
	const learning_count = total_count - known_count - new_count;

	// Get due count
	const now = new Date();
	const due_count = await prisma_client.userCharacter.count({
		where: {
			user_id: user.id,
			OR: [{ next_review: { lte: now } }, { next_review: null, state: 0 }]
		}
	});

	return json({
		total: total_count,
		new: new_count,
		learning: learning_count,
		known: known_count,
		due: due_count,
		recent_reviews,
		by_state: state_map,
		by_familiarity: fam_map,
		by_hsk: hsk_map
	});
};
