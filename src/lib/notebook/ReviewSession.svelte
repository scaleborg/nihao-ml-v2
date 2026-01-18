<script lang="ts">
	import { onMount } from 'svelte';
	import StrokeAnimation from './StrokeAnimation.svelte';

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
	}

	interface DueCharacter {
		id: string;
		character_id: string;
		familiarity: number;
		state: number;
		character: CharacterData;
	}

	interface Props {
		due_count: number;
		onclose: () => void;
	}

	let { due_count, onclose }: Props = $props();

	let queue = $state<DueCharacter[]>([]);
	let current_index = $state(0);
	let is_revealed = $state(false);
	let is_loading = $state(true);
	let session_stats = $state({ reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 });
	let is_complete = $state(false);

	let current_card = $derived(queue[current_index]);
	let progress = $derived(current_index / due_count);

	onMount(async () => {
		await load_due_characters();
	});

	async function load_due_characters() {
		is_loading = true;
		try {
			const response = await fetch('/api/notebook/due');
			if (response.ok) {
				const data = await response.json();
				queue = data.characters;
			}
		} finally {
			is_loading = false;
		}
	}

	function reveal() {
		is_revealed = true;
	}

	async function grade(rating: 'again' | 'hard' | 'good' | 'easy') {
		if (!current_card) return;

		// Map rating to grade (1-4)
		const grade_map = { again: 1, hard: 2, good: 3, easy: 4 };
		const grade = grade_map[rating];

		// Submit review
		await fetch('/api/notebook/review', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				user_character_id: current_card.id,
				grade
			})
		});

		// Update session stats
		session_stats.reviewed++;
		session_stats[rating]++;

		// Move to next card or complete
		if (current_index < queue.length - 1) {
			current_index++;
			is_revealed = false;
		} else {
			is_complete = true;
		}
	}

	function get_interval_preview(rating: 'again' | 'hard' | 'good' | 'easy'): string {
		// Simplified interval previews (actual calculation in FSRS)
		switch (rating) {
			case 'again':
				return '1m';
			case 'hard':
				return '6m';
			case 'good':
				return '1d';
			case 'easy':
				return '4d';
		}
	}
</script>

<div class="review-session">
	{#if is_loading}
		<div class="loading">Loading review cards...</div>
	{:else if is_complete}
		<div class="complete-screen">
			<h2 class="complete-title">Session Complete!</h2>
			<div class="session-summary">
				<div class="summary-stat">
					<span class="summary-value">{session_stats.reviewed}</span>
					<span class="summary-label">Cards Reviewed</span>
				</div>
			</div>
			<div class="grade-breakdown">
				<span class="grade-stat again">Again: {session_stats.again}</span>
				<span class="grade-stat hard">Hard: {session_stats.hard}</span>
				<span class="grade-stat good">Good: {session_stats.good}</span>
				<span class="grade-stat easy">Easy: {session_stats.easy}</span>
			</div>
			<button class="done-btn" onclick={onclose}>Done</button>
		</div>
	{:else if current_card}
		<div class="progress-bar">
			<div class="progress-fill" style="width: {progress * 100}%"></div>
		</div>

		<div class="card-counter">
			{current_index + 1} / {queue.length}
		</div>

		<div class="flashcard" class:revealed={is_revealed}>
			<div class="card-front">
				<span class="card-character">{current_card.character.id}</span>
			</div>

			{#if is_revealed}
				<div class="card-back">
					<div class="answer-pinyin">{current_card.character.pinyin}</div>
					<div class="answer-definition">{current_card.character.definition}</div>
					<div class="stroke-preview">
						<StrokeAnimation character={current_card.character.id} size={100} />
					</div>
				</div>
			{/if}
		</div>

		{#if !is_revealed}
			<button class="show-answer-btn" onclick={reveal}>Show Answer</button>
		{:else}
			<div class="grade-buttons">
				<button class="grade-btn again" onclick={() => grade('again')}>
					<span class="grade-label">Again</span>
					<span class="grade-interval">{get_interval_preview('again')}</span>
				</button>
				<button class="grade-btn hard" onclick={() => grade('hard')}>
					<span class="grade-label">Hard</span>
					<span class="grade-interval">{get_interval_preview('hard')}</span>
				</button>
				<button class="grade-btn good" onclick={() => grade('good')}>
					<span class="grade-label">Good</span>
					<span class="grade-interval">{get_interval_preview('good')}</span>
				</button>
				<button class="grade-btn easy" onclick={() => grade('easy')}>
					<span class="grade-label">Easy</span>
					<span class="grade-interval">{get_interval_preview('easy')}</span>
				</button>
			</div>
		{/if}

		<button class="close-session-btn" onclick={onclose}>End Session</button>
	{:else}
		<div class="no-cards">
			<p>No cards to review.</p>
			<button class="done-btn" onclick={onclose}>Close</button>
		</div>
	{/if}
</div>

<style>
	.review-session {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		padding: 2rem;
		max-width: 500px;
		margin: 0 auto;
	}

	.loading,
	.no-cards {
		text-align: center;
		color: var(--black-4);
		padding: 3rem;
	}

	.progress-bar {
		width: 100%;
		height: 4px;
		background: var(--black-7);
		border-radius: 2px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--primary);
		transition: width 0.3s ease;
	}

	.card-counter {
		font-size: 0.875rem;
		color: var(--black-4);
	}

	.flashcard {
		width: 100%;
		min-height: 250px;
		background: var(--black-8);
		border: 1px solid var(--black-7);
		border-radius: 12px;
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
	}

	.card-front {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.card-character {
		font-size: 6rem;
		line-height: 1;
		color: var(--white);
	}

	.card-back {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding-top: 1rem;
		border-top: 1px solid var(--black-7);
		width: 100%;
	}

	.answer-pinyin {
		font-size: 1.5rem;
		color: var(--black-3);
	}

	.answer-definition {
		font-size: 1rem;
		color: var(--black-2);
		text-align: center;
		line-height: 1.5;
	}

	.stroke-preview {
		margin-top: 0.5rem;
	}

	.show-answer-btn {
		padding: 1rem 3rem;
		font-size: 1rem;
		font-family: var(--body-font-family);
		background: var(--primary);
		color: var(--black-10);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.show-answer-btn:hover {
		transform: translateY(-2px);
	}

	.grade-buttons {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
		width: 100%;
	}

	.grade-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 0.5rem;
		font-family: var(--body-font-family);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.grade-btn.again {
		background: #ef4444;
		color: white;
	}

	.grade-btn.hard {
		background: #f97316;
		color: white;
	}

	.grade-btn.good {
		background: #22c55e;
		color: white;
	}

	.grade-btn.easy {
		background: #3b82f6;
		color: white;
	}

	.grade-btn:hover {
		transform: translateY(-2px);
	}

	.grade-label {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.grade-interval {
		font-size: 0.625rem;
		opacity: 0.8;
	}

	.close-session-btn {
		margin-top: 1rem;
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		background: transparent;
		color: var(--black-5);
		border: 1px solid var(--black-6);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.close-session-btn:hover {
		color: var(--white);
		border-color: var(--black-5);
	}

	.complete-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		text-align: center;
		padding: 2rem;
	}

	.complete-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.5rem;
		color: var(--white);
		margin: 0;
	}

	.session-summary {
		display: flex;
		gap: 2rem;
	}

	.summary-stat {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.summary-value {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 3rem;
		font-weight: 700;
		color: var(--primary);
	}

	.summary-label {
		font-size: 0.75rem;
		color: var(--black-4);
		text-transform: uppercase;
	}

	.grade-breakdown {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.grade-stat {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.grade-stat.again {
		background: rgba(239, 68, 68, 0.2);
		color: #ef4444;
	}

	.grade-stat.hard {
		background: rgba(249, 115, 22, 0.2);
		color: #f97316;
	}

	.grade-stat.good {
		background: rgba(34, 197, 94, 0.2);
		color: #22c55e;
	}

	.grade-stat.easy {
		background: rgba(59, 130, 246, 0.2);
		color: #3b82f6;
	}

	.done-btn {
		margin-top: 1rem;
		padding: 0.875rem 2rem;
		font-size: 1rem;
		font-family: var(--body-font-family);
		background: var(--primary);
		color: var(--black-10);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.done-btn:hover {
		transform: translateY(-2px);
	}
</style>
