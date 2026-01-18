import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';
import { schedule_review } from '$server/srs/fsrs';

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const { user_character_id, grade } = body;

	if (!user_character_id || typeof grade !== 'number' || grade < 1 || grade > 4) {
		return json({ error: 'Invalid request' }, { status: 400 });
	}

	// Get the user character
	const user_char = await prisma_client.userCharacter.findUnique({
		where: { id: user_character_id }
	});

	if (!user_char || user_char.user_id !== user.id) {
		return json({ error: 'Character not found' }, { status: 404 });
	}

	// Calculate next review using FSRS
	const result = schedule_review(
		{
			stability: user_char.stability,
			difficulty: user_char.difficulty,
			state: user_char.state,
			reps: user_char.reps,
			lapses: user_char.lapses,
			last_review: user_char.last_review
		},
		grade as 1 | 2 | 3 | 4
	);

	// Update the character
	const updated = await prisma_client.userCharacter.update({
		where: { id: user_character_id },
		data: {
			stability: result.stability,
			difficulty: result.difficulty,
			state: result.state,
			reps: result.reps,
			lapses: result.lapses,
			last_review: new Date(),
			next_review: result.next_review,
			// Update familiarity based on performance
			familiarity: calculate_familiarity(result.stability, result.state)
		}
	});

	return json({
		success: true,
		next_review: result.next_review,
		interval_days: result.interval_days
	});
};

/**
 * Map FSRS state/stability to familiarity (1-5)
 */
function calculate_familiarity(stability: number, state: number): number {
	// If in learning/relearning, cap at 3
	if (state === 1 || state === 3) {
		return Math.min(3, Math.ceil(stability / 2) + 1);
	}

	// For review state, base on stability
	if (stability < 1) return 1;
	if (stability < 3) return 2;
	if (stability < 10) return 3;
	if (stability < 30) return 4;
	return 5;
}
