/**
 * FSRS-5 (Free Spaced Repetition Scheduler) Implementation
 *
 * Based on: https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm
 *
 * FSRS uses a mathematical model to predict memory retention and schedule reviews.
 */

// FSRS-5 default parameters
const DEFAULT_PARAMS = {
	w: [
		0.4072, // w0: Initial stability for Again
		1.1829, // w1: Initial stability for Hard
		3.1262, // w2: Initial stability for Good
		15.4722, // w3: Initial stability for Easy
		7.2102, // w4: Difficulty weight
		0.5316, // w5: Stability decay
		1.0651, // w6: Stability increase factor
		0.0046, // w7: Difficulty increase/decrease
		1.5418, // w8: Hard factor
		0.1618, // w9: Easy factor
		1.0, // w10: Hard multiplier
		1.9395, // w11: Easy multiplier
		0.1, // w12: Stability decrease on lapse
		0.3, // w13: Minimum retrievability
		2.2698, // w14: Lapse factor
		0.2315, // w15: Stability after lapse
		2.9898, // w16: Difficulty decay
		0.5148, // w17: Initial difficulty weight
		0.6881 // w18: Stability floor
	],
	request_retention: 0.9, // Target retention rate (90%)
	maximum_interval: 36500 // Maximum interval in days (100 years)
};

export interface FSRSCard {
	stability: number;
	difficulty: number;
	state: number; // 0=new, 1=learning, 2=review, 3=relearning
	reps: number;
	lapses: number;
	last_review: Date | null;
}

export interface FSRSResult {
	stability: number;
	difficulty: number;
	state: number;
	reps: number;
	lapses: number;
	next_review: Date;
	interval_days: number;
}

/**
 * Calculate the next review based on FSRS-5 algorithm
 *
 * @param card Current card state
 * @param grade 1=Again, 2=Hard, 3=Good, 4=Easy
 * @returns Updated card state with next review date
 */
export function schedule_review(card: FSRSCard, grade: 1 | 2 | 3 | 4): FSRSResult {
	const w = DEFAULT_PARAMS.w;
	const now = new Date();

	let new_stability: number;
	let new_difficulty: number;
	let new_state: number;
	let new_reps = card.reps;
	let new_lapses = card.lapses;

	if (card.state === 0) {
		// New card - initialize stability based on grade
		new_stability = w[grade - 1];
		new_difficulty = w[4] - Math.exp(w[5] * (grade - 3)) + 1;
		new_difficulty = Math.max(1, Math.min(10, new_difficulty)); // Clamp between 1-10
		new_state = grade === 1 ? 1 : 2; // Learning if Again, else Review
		new_reps = 1;
	} else if (grade === 1) {
		// Again - card lapses
		new_lapses = card.lapses + 1;
		new_stability = w[12] * Math.pow(card.stability, w[13]);
		new_stability = Math.max(0.1, new_stability); // Minimum stability
		new_difficulty = Math.min(10, card.difficulty + w[7] * 2);
		new_state = 3; // Relearning
		new_reps = card.reps + 1;
	} else {
		// Hard, Good, or Easy - successful review
		const elapsed_days = card.last_review
			? (now.getTime() - card.last_review.getTime()) / (1000 * 60 * 60 * 24)
			: 0;

		// Calculate retrievability
		const retrievability = Math.pow(1 + elapsed_days / (9 * card.stability), -1);

		// Update difficulty
		const delta_d = w[7] * (3 - grade);
		new_difficulty = card.difficulty + delta_d;
		new_difficulty = Math.max(1, Math.min(10, new_difficulty));

		// Calculate stability increase
		let stability_factor: number;
		if (grade === 2) {
			// Hard
			stability_factor = w[10];
		} else if (grade === 4) {
			// Easy
			stability_factor = w[11];
		} else {
			// Good
			stability_factor = 1;
		}

		const s_recall =
			card.stability *
			(1 +
				Math.exp(w[6]) *
					(11 - new_difficulty) *
					Math.pow(card.stability, -w[5]) *
					(Math.exp((1 - retrievability) * w[14]) - 1) *
					stability_factor);

		new_stability = Math.max(0.1, s_recall);
		new_state = 2; // Review
		new_reps = card.reps + 1;
	}

	// Calculate next interval based on desired retention
	const interval_days = calculate_interval(new_stability, DEFAULT_PARAMS.request_retention);

	// Cap interval
	const capped_interval = Math.min(interval_days, DEFAULT_PARAMS.maximum_interval);

	// Calculate next review date
	const next_review = new Date(now.getTime() + capped_interval * 24 * 60 * 60 * 1000);

	return {
		stability: new_stability,
		difficulty: new_difficulty,
		state: new_state,
		reps: new_reps,
		lapses: new_lapses,
		next_review,
		interval_days: capped_interval
	};
}

/**
 * Calculate interval in days for target retention
 */
function calculate_interval(stability: number, retention: number): number {
	return Math.round(9 * stability * (1 / retention - 1));
}

/**
 * Get preview intervals for all grades
 */
export function get_interval_previews(card: FSRSCard): {
	again: string;
	hard: string;
	good: string;
	easy: string;
} {
	const results = {
		again: schedule_review(card, 1),
		hard: schedule_review(card, 2),
		good: schedule_review(card, 3),
		easy: schedule_review(card, 4)
	};

	return {
		again: format_interval(results.again.interval_days),
		hard: format_interval(results.hard.interval_days),
		good: format_interval(results.good.interval_days),
		easy: format_interval(results.easy.interval_days)
	};
}

/**
 * Format interval for display
 */
function format_interval(days: number): string {
	if (days < 1) {
		const minutes = Math.round(days * 24 * 60);
		if (minutes < 60) return `${minutes}m`;
		return `${Math.round(minutes / 60)}h`;
	}
	if (days < 30) return `${Math.round(days)}d`;
	if (days < 365) return `${Math.round(days / 30)}mo`;
	return `${(days / 365).toFixed(1)}y`;
}
