import { prisma_client } from '$server/prisma-client';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user;

	if (!user) {
		throw redirect(302, '/login?redirect=/notebook');
	}

	// Get query params for filtering
	const hsk = url.searchParams.get('hsk');
	const familiarity = url.searchParams.get('familiarity');
	const sort = url.searchParams.get('sort') || 'recent';
	const page = parseInt(url.searchParams.get('page') || '1');
	const per_page = 24;

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
			// "HSK 4+" means levels 4, 5, 6
			where.character = { hsk_level: { gte: 4 } };
		} else if (hsk_level >= 1 && hsk_level <= 6) {
			where.character = { hsk_level };
		}
	}

	if (familiarity) {
		const fam_level = parseInt(familiarity);
		if (fam_level === 0) {
			// "New" - not yet rated
			where.familiarity = 1;
		} else if (fam_level === 5) {
			// "Known"
			where.familiarity = 5;
		} else if (fam_level >= 1 && fam_level <= 4) {
			// "Learning" (1-4)
			where.familiarity = { lt: 5 };
		}
	}

	// Build order clause
	let orderBy: object = { first_seen: 'desc' };
	if (sort === 'oldest') {
		orderBy = { first_seen: 'asc' };
	} else if (sort === 'hsk') {
		orderBy = { character: { hsk_level: 'asc' } };
	} else if (sort === 'familiarity') {
		orderBy = { familiarity: 'asc' };
	}

	// Fetch characters with pagination
	const [user_characters, total_count, due_count] = await Promise.all([
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
		prisma_client.userCharacter.count({ where }),
		prisma_client.userCharacter.count({
			where: {
				user_id: user.id,
				OR: [{ next_review: { lte: new Date() } }, { next_review: null, state: 0 }]
			}
		})
	]);

	// Get quick stats
	const stats = await prisma_client.userCharacter.groupBy({
		by: ['state'],
		where: { user_id: user.id },
		_count: { _all: true }
	});

	const stats_summary = {
		total: 0,
		new: 0,
		learning: 0,
		known: 0
	};

	for (const stat of stats) {
		stats_summary.total += stat._count._all;
		if (stat.state === 0) stats_summary.new += stat._count._all;
		else if (stat.state === 1 || stat.state === 3) stats_summary.learning += stat._count._all;
		else if (stat.state === 2) stats_summary.known += stat._count._all;
	}

	// Also count by familiarity for "known" (familiarity 5)
	const known_count = await prisma_client.userCharacter.count({
		where: { user_id: user.id, familiarity: 5 }
	});
	stats_summary.known = known_count;
	stats_summary.learning = stats_summary.total - stats_summary.new - stats_summary.known;

	return {
		user_characters,
		total_count,
		due_count,
		stats: stats_summary,
		pagination: {
			page,
			per_page,
			total_pages: Math.ceil(total_count / per_page)
		},
		filters: {
			hsk,
			familiarity,
			sort
		},
		meta: {
			title: 'Study Notebook | nihao.ml',
			canonical: `${url.protocol}//${url.host}/notebook`
		}
	};
};
