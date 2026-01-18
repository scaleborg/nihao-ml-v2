<script lang="ts">
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

	function get_status(char: string): 'new' | 'learning' | 'known' {
		const uc = user_characters[char];
		if (!uc) return 'new';
		if (uc.familiarity === 5) return 'known';
		return 'learning';
	}

	function get_familiarity(char: string): number {
		return user_characters[char]?.familiarity ?? 0;
	}

	function handle_pill_click(char: string) {
		if (expanded_char === char) {
			onexpand(null);
		} else {
			onexpand(char);
		}
	}

	function handle_known_click(char: string) {
		// Start graduation animation
		graduating.add(char);
		graduating = graduating; // trigger reactivity

		// Save as known
		onsave(char, 5);

		// After animation, notify parent to remove
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

	// Get array of characters for rendering
	let char_list = $derived([...characters.keys()]);
	let count = $derived(char_list.length);
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="word-pool">
	<div class="pool-header">
		<span class="pool-title">STUDY NOTEBOOK</span>
		<span class="pool-count-badge">{count}</span>
	</div>

	{#if count === 0}
		<div class="pool-empty">
			<p class="empty-text">Tap any character in the transcript</p>
		</div>
	{:else}
		<div class="pool-pills">
			{#each char_list as char (char)}
				{@const status = get_status(char)}
				{@const data = characters.get(char)}
				{@const familiarity = get_familiarity(char)}
				{@const is_expanded = expanded_char === char}
				{@const is_graduating = graduating.has(char)}

				<div class="pill-container" class:expanded={is_expanded} class:graduating={is_graduating}>
					<button
						class="pill"
						class:new={status === 'new'}
						class:learning={status === 'learning'}
						class:known={status === 'known'}
						onclick={() => handle_pill_click(char)}
					>
						{char}
					</button>

					{#if is_expanded && data}
						<div class="pill-details">
							<div class="details-header">
								<span class="char-large">{char}</span>
								<span class="pinyin">{data.pinyin}</span>
							</div>
							<div class="definition">{data.definition}</div>
							<div class="meta">
								{#if data.hsk_level}
									<span class="hsk">HSK {data.hsk_level}</span>
								{/if}
								{#if data.stroke_count}
									<span class="strokes">{data.stroke_count} strokes</span>
								{/if}
							</div>

							{#if is_authenticated}
								<div class="familiarity-row">
									<div class="familiarity-dots">
										{#each [1, 2, 3, 4, 5] as level}
											<button
												class="dot"
												class:filled={familiarity >= level}
												onclick={() => handle_familiarity_click(char, level)}
												title="Level {level}"
											>
												{familiarity >= level ? '●' : '○'}
											</button>
										{/each}
									</div>
									<button class="known-btn" onclick={() => handle_known_click(char)}>
										Known
									</button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.word-pool {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--black-8);
		min-height: 100px;
	}

	.pool-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--black-7);
		margin-bottom: 0.75rem;
	}

	.pool-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--black-2);
		letter-spacing: 0.12em;
	}

	.pool-count-badge {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--primary);
	}

	.pool-empty {
		padding: 2rem 0;
	}

	.empty-text {
		margin: 0;
		font-family: var(--body-font-family);
		font-size: 0.75rem;
		color: var(--black-5);
	}

	.pool-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.pill-container {
		display: flex;
		flex-direction: column;
		transition: all 0.3s ease;
	}

	.pill-container.graduating {
		animation: graduate 0.5s ease-out forwards;
	}

	@keyframes graduate {
		0% {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
		50% {
			opacity: 0.8;
			transform: translateY(-10px) scale(1.1);
			filter: brightness(1.5);
		}
		100% {
			opacity: 0;
			transform: translateY(-30px) scale(0.8);
		}
	}

	.pill {
		padding: 0.375rem 0.5rem;
		font-size: 1.25rem;
		font-family: inherit;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.pill.new {
		background: #3b82f6;
		color: white;
	}

	.pill.learning {
		background: var(--primary);
		color: var(--black-10);
	}

	.pill.known {
		background: #22c55e;
		color: white;
	}

	.pill:hover {
		transform: scale(1.1);
	}

	.pill-container.expanded {
		flex-basis: 100%;
	}

	.pill-details {
		margin-top: 0.5rem;
		padding: 0.75rem;
		background: var(--black-7);
		border-radius: 6px;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.details-header {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.char-large {
		font-size: 2rem;
		color: var(--white);
	}

	.pinyin {
		font-size: 1rem;
		color: var(--black-3);
		font-family: var(--body-font-family);
	}

	.definition {
		font-size: 0.875rem;
		color: var(--black-2);
		line-height: 1.4;
	}

	.meta {
		display: flex;
		gap: 0.75rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		color: var(--black-4);
	}

	.familiarity-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--black-6);
	}

	.familiarity-dots {
		display: flex;
		gap: 0.25rem;
	}

	.dot {
		background: transparent;
		border: none;
		color: var(--black-4);
		font-size: 1rem;
		cursor: pointer;
		padding: 0.125rem;
		transition: color 0.15s;
	}

	.dot:hover {
		color: var(--primary);
	}

	.dot.filled {
		color: var(--primary);
	}

	.known-btn {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		background: #22c55e;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.known-btn:hover {
		background: #16a34a;
	}
</style>
