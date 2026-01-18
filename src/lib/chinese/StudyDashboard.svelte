<script lang="ts">
	import StrokeAnimation from '$lib/notebook/StrokeAnimation.svelte';

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	interface Props {
		characters: Map<string, CharacterData | null>;
		user_characters: Record<string, { familiarity: number; state: number }>;
		expanded_char: string | null;
		is_authenticated: boolean;
		onexpand: (char: string | null) => void;
		onsave: (char: string, level: number) => void;
		ongraduate: (char: string) => void;
	}

	let {
		characters,
		user_characters,
		expanded_char,
		is_authenticated,
		onexpand,
		onsave,
		ongraduate
	}: Props = $props();

	// Track graduating characters for animation
	let graduating = $state<Set<string>>(new Set());

	// Active tab
	let active_tab = $state<'pool' | 'review' | 'practice'>('pool');

	// Mini review state
	let review_queue = $state<string[]>([]);
	let review_index = $state(0);
	let is_revealed = $state(false);

	// Practice state
	let practice_char = $state<string | null>(null);

	function get_status(char: string): 'new' | 'learning' | 'known' {
		const uc = user_characters[char];
		if (!uc) return 'new';
		if (uc.familiarity === 5) return 'known';
		return 'learning';
	}

	function get_familiarity(char: string): number {
		return user_characters[char]?.familiarity ?? 0;
	}

	// Stats derived from pool
	let char_list = $derived([...characters.keys()]);
	let stats = $derived(() => {
		let new_count = 0;
		let learning_count = 0;
		let known_count = 0;
		for (const char of char_list) {
			const status = get_status(char);
			if (status === 'new') new_count++;
			else if (status === 'learning') learning_count++;
			else known_count++;
		}
		return {
			total: char_list.length,
			new: new_count,
			learning: learning_count,
			known: known_count
		};
	});

	function handle_pill_click(char: string) {
		if (expanded_char === char) {
			onexpand(null);
		} else {
			onexpand(char);
		}
	}

	function handle_known_click(char: string) {
		graduating.add(char);
		graduating = graduating;
		onsave(char, 5);
		setTimeout(() => {
			graduating.delete(char);
			graduating = graduating;
			ongraduate(char);
			onexpand(null);
		}, 500);
	}

	function handle_familiarity_click(char: string, level: number) {
		onsave(char, level);
	}

	// Start mini review with characters from pool
	function start_mini_review() {
		const reviewable = char_list.filter((c) => get_status(c) !== 'known');
		if (reviewable.length === 0) return;
		review_queue = [...reviewable].sort(() => Math.random() - 0.5);
		review_index = 0;
		is_revealed = false;
		active_tab = 'review';
	}

	function reveal_answer() {
		is_revealed = true;
	}

	function grade_card(correct: boolean) {
		const char = review_queue[review_index];
		if (correct) {
			const current = get_familiarity(char);
			onsave(char, Math.min(5, current + 1));
		}
		// Move to next card
		if (review_index < review_queue.length - 1) {
			review_index++;
			is_revealed = false;
		} else {
			// Review complete
			active_tab = 'pool';
			review_queue = [];
		}
	}

	// Practice stroke order
	function start_practice(char: string) {
		practice_char = char;
		active_tab = 'practice';
	}

	function close_practice() {
		practice_char = null;
		active_tab = 'pool';
	}

	let current_review_char = $derived(review_queue[review_index]);
	let current_review_data = $derived(
		current_review_char ? characters.get(current_review_char) : null
	);
</script>

<div class="study-dashboard">
	<!-- Header with tabs -->
	<div class="dashboard-header">
		<div class="header-title">
			<span class="title-text">STUDY NOTEBOOK</span>
			<span class="char-count">{stats().total}</span>
		</div>
		<div class="tabs">
			<button
				class="tab"
				class:active={active_tab === 'pool'}
				onclick={() => (active_tab = 'pool')}
			>
				Characters
			</button>
			<button
				class="tab"
				class:active={active_tab === 'review'}
				onclick={start_mini_review}
				disabled={stats().new + stats().learning === 0}
			>
				Review ({stats().new + stats().learning})
			</button>
			<button
				class="tab"
				class:active={active_tab === 'practice'}
				onclick={() => (active_tab = 'practice')}
				disabled={!practice_char && char_list.length === 0}
			>
				Strokes
			</button>
		</div>
	</div>

	<!-- Stats bar -->
	<div class="stats-bar">
		<div class="stat new">
			<span class="stat-dot"></span>
			<span class="stat-label">New</span>
			<span class="stat-value">{stats().new}</span>
		</div>
		<div class="stat learning">
			<span class="stat-dot"></span>
			<span class="stat-label">Learning</span>
			<span class="stat-value">{stats().learning}</span>
		</div>
		<div class="stat known">
			<span class="stat-dot"></span>
			<span class="stat-label">Known</span>
			<span class="stat-value">{stats().known}</span>
		</div>
	</div>

	<!-- Content area -->
	<div class="dashboard-content">
		{#if active_tab === 'pool'}
			<!-- Character Pool -->
			{#if char_list.length === 0}
				<div class="empty-state">
					<div class="empty-icon">字</div>
					<p class="empty-text">Click any character in the transcript to add it here</p>
				</div>
			{:else}
				<div class="character-pool">
					{#each char_list as char (char)}
						{@const status = get_status(char)}
						{@const data = characters.get(char)}
						{@const familiarity = get_familiarity(char)}
						{@const is_expanded = expanded_char === char}
						{@const is_graduating = graduating.has(char)}

						<div class="char-item" class:expanded={is_expanded} class:graduating={is_graduating}>
							<button
								class="char-pill"
								class:new={status === 'new'}
								class:learning={status === 'learning'}
								class:known={status === 'known'}
								onclick={() => handle_pill_click(char)}
							>
								{char}
							</button>

							{#if is_expanded && data}
								<div class="char-details">
									<div class="details-main">
										<div class="details-top">
											<div class="char-pinyin-row">
												<span class="detail-char">{char}</span>
												<span class="detail-pinyin">{data.pinyin}</span>
											</div>
											<div class="char-stats">
												{#if data.radical}
													<div class="stat-box">
														<span class="stat-value radical">{data.radical}</span>
														<span class="stat-label">radical</span>
													</div>
												{/if}
												{#if data.hsk_level}
													<div class="stat-box">
														<span class="stat-value">{data.hsk_level}</span>
														<span class="stat-label">HSK</span>
													</div>
												{/if}
												{#if data.stroke_count}
													<div class="stat-box">
														<span class="stat-value">{data.stroke_count}</span>
														<span class="stat-label">strokes</span>
													</div>
												{/if}
											</div>
										</div>
										<p class="detail-definition">{data.definition}</p>
									</div>

									<div class="details-actions">
										<button class="action-btn stroke-btn" onclick={() => start_practice(char)}>
											Strokes
										</button>

										{#if is_authenticated}
											<div class="familiarity-control">
												<span class="familiarity-label">How well do you know this?</span>
												<div class="familiarity-buttons">
													{#each [1, 2, 3, 4, 5] as level}
														<button
															class="level-btn"
															class:active={familiarity === level}
															class:passed={familiarity > level}
															onclick={() => handle_familiarity_click(char, level)}
															title="Level {level}"
														>
															{level}
														</button>
													{/each}
													<button
														class="level-btn known"
														class:active={familiarity === 5}
														onclick={() => handle_known_click(char)}
														title="I know this!"
													>
														✓
													</button>
												</div>
											</div>
										{/if}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		{:else if active_tab === 'review'}
			<!-- Mini Flashcard Review -->
			{#if review_queue.length === 0}
				<div class="empty-state">
					<p class="empty-text">No characters to review</p>
					<button
						class="start-btn"
						onclick={start_mini_review}
						disabled={stats().new + stats().learning === 0}
					>
						Start Review
					</button>
				</div>
			{:else if current_review_char && current_review_data}
				<div class="review-card">
					<div class="review-progress">
						<div
							class="progress-fill"
							style="width: {((review_index + 1) / review_queue.length) * 100}%"
						></div>
					</div>
					<span class="review-counter">{review_index + 1} / {review_queue.length}</span>

					<div class="flashcard">
						<span class="flashcard-char">{current_review_char}</span>

						{#if is_revealed}
							<div class="flashcard-answer">
								<span class="answer-pinyin">{current_review_data.pinyin}</span>
								<p class="answer-definition">{current_review_data.definition}</p>
							</div>
						{/if}
					</div>

					{#if !is_revealed}
						<button class="reveal-btn" onclick={reveal_answer}>Show Answer</button>
					{:else}
						<div class="grade-buttons">
							<button class="grade-btn incorrect" onclick={() => grade_card(false)}> Again </button>
							<button class="grade-btn correct" onclick={() => grade_card(true)}> Got It </button>
						</div>
					{/if}
				</div>
			{/if}
		{:else if active_tab === 'practice'}
			<!-- Stroke Practice -->
			<div class="stroke-practice">
				{#if practice_char}
					{@const data = characters.get(practice_char)}
					<div class="practice-header">
						<span class="practice-char">{practice_char}</span>
						{#if data}
							<span class="practice-pinyin">{data.pinyin}</span>
						{/if}
					</div>
					<div class="stroke-area">
						<StrokeAnimation character={practice_char} size={180} />
					</div>
					<button class="close-practice-btn" onclick={close_practice}>Back to Characters</button>
				{:else if char_list.length > 0}
					<div class="practice-select">
						<p class="select-prompt">Select a character to practice:</p>
						<div class="practice-pills">
							{#each char_list as char}
								<button class="practice-pill" onclick={() => start_practice(char)}>
									{char}
								</button>
							{/each}
						</div>
					</div>
				{:else}
					<div class="empty-state">
						<p class="empty-text">Add characters from the transcript first</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.study-dashboard {
		display: flex;
		flex-direction: column;
		height: 100%;
		background: var(--black-9);
		border-left: 1px solid var(--black-7);
		overflow: hidden;
	}

	/* Header */
	.dashboard-header {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--black-7);
		background: var(--black-10);
	}

	.header-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}

	.title-text {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--black-3);
		letter-spacing: 0.15em;
	}

	.char-count {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
	}

	.tabs {
		display: flex;
		gap: 0.25rem;
	}

	.tab {
		flex: 1;
		padding: 0.5rem 0.75rem;
		font-size: 0.7rem;
		font-family: var(--body-font-family);
		font-weight: 500;
		background: transparent;
		border: 1px solid var(--black-7);
		border-radius: 4px;
		color: var(--black-4);
		cursor: pointer;
		transition: all 0.15s;
	}

	.tab:hover:not(:disabled) {
		border-color: var(--black-5);
		color: var(--black-3);
	}

	.tab.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--black-10);
	}

	.tab:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	/* Stats bar */
	.stats-bar {
		display: flex;
		gap: 1rem;
		padding: 0.75rem 1.25rem;
		background: var(--black-10);
		border-bottom: 1px solid var(--black-7);
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.7rem;
		font-family: var(--body-font-family);
	}

	.stat-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}

	.stat.new .stat-dot {
		background: #3b82f6;
	}
	.stat.learning .stat-dot {
		background: var(--primary);
	}
	.stat.known .stat-dot {
		background: #22c55e;
	}

	.stat-label {
		color: var(--black-5);
	}

	.stat-value {
		font-weight: 600;
		color: var(--black-2);
	}

	/* Content area */
	.dashboard-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem 1.25rem;
	}

	/* Empty state */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		text-align: center;
	}

	.empty-icon {
		font-size: 3rem;
		color: var(--black-6);
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.empty-text {
		font-size: 0.8rem;
		color: var(--black-5);
		line-height: 1.5;
		max-width: 200px;
		margin: 0;
	}

	/* Character pool */
	.character-pool {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-content: flex-start;
	}

	.char-item {
		transition: all 0.2s ease;
	}

	.char-item.graduating {
		animation: graduate 0.5s ease-out forwards;
	}

	@keyframes graduate {
		0% {
			opacity: 1;
			transform: scale(1);
		}
		50% {
			opacity: 0.8;
			transform: scale(1.1);
			filter: brightness(1.5);
		}
		100% {
			opacity: 0;
			transform: scale(0.8) translateY(-20px);
		}
	}

	.char-item.expanded {
		flex-basis: 100%;
	}

	.char-pill {
		padding: 0.5rem 0.625rem;
		font-size: 1.375rem;
		font-family: inherit;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.char-pill.new {
		background: #3b82f6;
		color: white;
	}

	.char-pill.learning {
		background: var(--primary);
		color: var(--black-10);
	}

	.char-pill.known {
		background: #22c55e;
		color: white;
	}

	.char-pill:hover {
		transform: scale(1.1);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	/* Character details */
	.char-details {
		margin-top: 0.75rem;
		padding: 1rem;
		background: var(--black-8);
		border-radius: 8px;
		border: 1px solid var(--black-7);
	}

	.details-main {
		margin-bottom: 1rem;
	}

	.details-top {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.char-pinyin-row {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.detail-char {
		font-size: 3rem;
		color: var(--white);
		line-height: 1;
	}

	.detail-pinyin {
		font-size: 1.25rem;
		color: var(--black-3);
		font-family: var(--body-font-family);
	}

	.char-stats {
		display: flex;
		gap: 0.5rem;
	}

	.stat-box {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.375rem 0.625rem;
		background: var(--black-7);
		border-radius: 4px;
		min-width: 44px;
	}

	.stat-value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--white);
		line-height: 1;
	}

	.stat-value.radical {
		font-size: 1.75rem;
		color: var(--primary);
		font-weight: normal;
	}

	.stat-label {
		font-size: 0.5rem;
		color: var(--black-5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.25rem;
	}

	.detail-definition {
		font-size: 0.8rem;
		color: var(--black-3);
		line-height: 1.5;
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.details-actions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--black-7);
	}

	.action-btn {
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		font-weight: 500;
		border: none;
		border-radius: 5px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.stroke-btn {
		background: var(--black-7);
		color: var(--black-2);
	}

	.stroke-btn:hover {
		background: var(--black-6);
		color: var(--white);
	}

	.familiarity-control {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.familiarity-label {
		font-size: 0.7rem;
		color: var(--black-4);
		font-family: var(--body-font-family);
	}

	.familiarity-buttons {
		display: flex;
		gap: 0.375rem;
	}

	.level-btn {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		font-weight: 600;
		background: var(--black-7);
		border: 1px solid var(--black-6);
		border-radius: 6px;
		color: var(--black-4);
		cursor: pointer;
		transition: all 0.15s;
	}

	.level-btn:hover {
		background: var(--black-6);
		border-color: var(--black-5);
		color: var(--white);
	}

	.level-btn.passed {
		background: color-mix(in srgb, var(--primary) 20%, transparent);
		border-color: color-mix(in srgb, var(--primary) 40%, transparent);
		color: var(--primary);
	}

	.level-btn.active {
		background: var(--primary);
		border-color: var(--primary);
		color: var(--black-10);
	}

	.level-btn.known {
		background: var(--black-7);
		border-color: var(--black-6);
		color: var(--black-4);
	}

	.level-btn.known:hover {
		background: #22c55e;
		border-color: #22c55e;
		color: white;
	}

	.level-btn.known.active {
		background: #22c55e;
		border-color: #22c55e;
		color: white;
	}

	/* Review card */
	.review-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.review-progress {
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

	.review-counter {
		font-size: 0.75rem;
		color: var(--black-5);
	}

	.flashcard {
		width: 100%;
		min-height: 160px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--black-8);
		border: 1px solid var(--black-7);
		border-radius: 10px;
	}

	.flashcard-char {
		font-size: 4rem;
		color: var(--white);
		line-height: 1;
	}

	.flashcard-answer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding-top: 1rem;
		border-top: 1px solid var(--black-7);
		width: 100%;
		text-align: center;
	}

	.answer-pinyin {
		font-size: 1.25rem;
		color: var(--black-3);
	}

	.answer-definition {
		font-size: 0.875rem;
		color: var(--black-2);
		margin: 0;
		line-height: 1.4;
		word-wrap: break-word;
		overflow-wrap: break-word;
	}

	.reveal-btn,
	.start-btn {
		padding: 0.75rem 2rem;
		font-size: 0.875rem;
		font-family: var(--body-font-family);
		font-weight: 500;
		background: var(--primary);
		color: var(--black-10);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.reveal-btn:hover,
	.start-btn:hover {
		transform: translateY(-2px);
	}

	.start-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		transform: none;
	}

	.grade-buttons {
		display: flex;
		gap: 0.75rem;
		width: 100%;
	}

	.grade-btn {
		flex: 1;
		padding: 0.75rem 1rem;
		font-size: 0.875rem;
		font-family: var(--body-font-family);
		font-weight: 500;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.grade-btn.incorrect {
		background: #ef4444;
		color: white;
	}

	.grade-btn.correct {
		background: #22c55e;
		color: white;
	}

	.grade-btn:hover {
		transform: translateY(-2px);
	}

	/* Stroke practice */
	.stroke-practice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.practice-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.practice-char {
		font-size: 2.5rem;
		color: var(--white);
	}

	.practice-pinyin {
		font-size: 1.125rem;
		color: var(--black-3);
	}

	.stroke-area {
		padding: 1rem;
		background: var(--black-8);
		border-radius: 10px;
		border: 1px solid var(--black-7);
	}

	.close-practice-btn {
		padding: 0.5rem 1rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		background: transparent;
		color: var(--black-4);
		border: 1px solid var(--black-6);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.close-practice-btn:hover {
		color: var(--white);
		border-color: var(--black-5);
	}

	.practice-select {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
		width: 100%;
	}

	.select-prompt {
		font-size: 0.8rem;
		color: var(--black-4);
		margin: 0;
	}

	.practice-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		justify-content: center;
	}

	.practice-pill {
		padding: 0.5rem 0.75rem;
		font-size: 1.25rem;
		font-family: inherit;
		background: var(--black-8);
		border: 1px solid var(--black-7);
		border-radius: 6px;
		color: var(--white);
		cursor: pointer;
		transition: all 0.15s;
	}

	.practice-pill:hover {
		background: var(--black-7);
		border-color: var(--primary);
		transform: scale(1.05);
	}
</style>
