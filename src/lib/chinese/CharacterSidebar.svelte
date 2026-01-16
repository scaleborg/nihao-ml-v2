<script lang="ts">
	import { clickOutside } from '$actions/click_outside';

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	interface Props {
		character: string;
		data: CharacterData | null;
		loading: boolean;
		error: string | null;
		familiarity: number;
		is_authenticated: boolean;
		onclose: () => void;
		onsave: (level: number) => void;
	}

	let { character, data, loading, error, familiarity, is_authenticated, onclose, onsave }: Props =
		$props();

	const familiarity_buttons = [
		{ level: 1, label: '1', title: 'New - Never seen' },
		{ level: 2, label: '2', title: 'Recognized' },
		{ level: 3, label: '3', title: 'Familiar' },
		{ level: 4, label: '4', title: 'Learned' },
		{ level: 5, label: '✓', title: 'Known' }
	];

	function get_hsk_color(level: number): string {
		const colors: Record<number, string> = {
			1: '#22c55e',
			2: '#84cc16',
			3: '#eab308',
			4: '#f97316',
			5: '#ef4444',
			6: '#dc2626'
		};
		return colors[level] || '#6b7280';
	}

	function handle_familiarity_click(level: number) {
		if (!is_authenticated) return;
		onsave(level);
	}

	function handle_keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault();
			onclose();
		}
		// Number keys 1-4 and 5 for known
		if (is_authenticated && /^[1-5]$/.test(event.key)) {
			event.preventDefault();
			onsave(parseInt(event.key));
		}
	}
</script>

<svelte:window onkeydown={handle_keydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="sidebar-overlay" onclick={onclose} onkeydown={(e) => e.key === 'Escape' && onclose()}>
	<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_element_to_interactive_role -->
	<aside
		class="sidebar"
		use:clickOutside
		onclick-outside={onclose}
		onclick={(e) => e.stopPropagation()}
		onkeydown={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-label="Character details"
	>
		<button class="close-btn" onclick={onclose} aria-label="Close sidebar">×</button>

		<div class="sidebar-content">
			{#if loading}
				<div class="loading-state">
					<span class="char-large">{character}</span>
					<span class="loading-text">Loading...</span>
				</div>
			{:else if error}
				<div class="error-state">
					<span class="char-large">{character}</span>
					<span class="error-text">{error}</span>
				</div>
			{:else if data}
				<div class="character-info">
					<div class="header-row">
						<span class="char-large">{data.id}</span>
						{#if data.hsk_level}
							<span class="hsk-badge" style="background: {get_hsk_color(data.hsk_level)}">
								HSK {data.hsk_level}
							</span>
						{/if}
					</div>

					<div class="pinyin">{data.pinyin}</div>
					<div class="definition">{data.definition}</div>

					{#if data.radical || data.stroke_count}
						<div class="meta-row">
							{#if data.radical}
								<span class="meta-item">Radical: <strong>{data.radical}</strong></span>
							{/if}
							{#if data.stroke_count}
								<span class="meta-item">Strokes: <strong>{data.stroke_count}</strong></span>
							{/if}
						</div>
					{/if}

					<div class="divider"></div>

					<div class="familiarity-section">
						<h4>Familiarity</h4>
						{#if is_authenticated}
							<div class="familiarity-buttons">
								{#each familiarity_buttons as btn}
									<button
										class="familiarity-btn"
										class:active={familiarity === btn.level}
										class:known={btn.level === 5}
										onclick={() => handle_familiarity_click(btn.level)}
										title={btn.title}
									>
										{btn.label}
									</button>
								{/each}
							</div>
							<p class="familiarity-hint">Press 1-5 or click to set familiarity</p>
						{:else}
							<div class="auth-prompt">
								<p>Sign in to track your character knowledge</p>
								<a href="/api/oauth/github" class="sign-in-btn">Sign in with GitHub</a>
							</div>
						{/if}
					</div>
				</div>
			{:else}
				<div class="not-found-state">
					<span class="char-large">{character}</span>
					<span class="not-found-text">Character not in dictionary</span>

					{#if is_authenticated}
						<div class="familiarity-section">
							<h4>Mark as known anyway?</h4>
							<div class="familiarity-buttons">
								{#each familiarity_buttons as btn}
									<button
										class="familiarity-btn"
										class:active={familiarity === btn.level}
										class:known={btn.level === 5}
										onclick={() => handle_familiarity_click(btn.level)}
										title={btn.title}
									>
										{btn.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</aside>
</div>

<style>
	.sidebar-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.4);
		z-index: 1000;
		display: flex;
		justify-content: flex-end;
	}

	.sidebar {
		position: relative;
		width: 320px;
		max-width: 90vw;
		height: 100%;
		background: var(--bg-1);
		box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
		overflow-y: auto;
		animation: slide-in 0.2s ease-out;
	}

	@keyframes slide-in {
		from {
			transform: translateX(100%);
		}
		to {
			transform: translateX(0);
		}
	}

	.close-btn {
		position: absolute;
		top: 1rem;
		right: 1rem;
		width: 32px;
		height: 32px;
		border: none;
		background: var(--bg-2);
		border-radius: 50%;
		font-size: 1.25rem;
		color: var(--fg-2);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1;
	}

	.close-btn:hover {
		background: var(--bg-0);
		color: var(--fg-1);
	}

	.sidebar-content {
		padding: 1.5rem;
		padding-top: 3.5rem;
	}

	.char-large {
		font-size: 4rem;
		line-height: 1.1;
		display: block;
		text-align: center;
		margin-bottom: 0.5rem;
	}

	.loading-state,
	.error-state,
	.not-found-state {
		text-align: center;
	}

	.loading-text,
	.not-found-text {
		display: block;
		font-size: 0.875rem;
		color: var(--fg-2);
		margin-top: 0.5rem;
	}

	.error-text {
		display: block;
		font-size: 0.875rem;
		color: #ef4444;
		margin-top: 0.5rem;
	}

	.character-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.header-row {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 1rem;
	}

	.hsk-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: white;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
		margin-top: 0.5rem;
	}

	.pinyin {
		font-size: 1.25rem;
		color: var(--primary);
		text-align: center;
	}

	.definition {
		font-size: 1rem;
		color: var(--fg-1);
		line-height: 1.5;
		text-align: center;
	}

	.meta-row {
		display: flex;
		justify-content: center;
		gap: 1.5rem;
		font-size: 0.875rem;
		color: var(--fg-2);
	}

	.meta-item strong {
		color: var(--fg-1);
	}

	.divider {
		height: 1px;
		background: var(--bg-2);
		margin: 0.75rem 0;
	}

	.familiarity-section {
		margin-top: 0.5rem;
	}

	.familiarity-section h4 {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--fg-2);
		margin: 0 0 0.75rem;
		text-align: center;
	}

	.familiarity-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.familiarity-btn {
		width: 44px;
		height: 44px;
		border: 2px solid var(--bg-2);
		background: var(--bg-0);
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		color: var(--fg-2);
		cursor: pointer;
		transition: all 0.15s;
	}

	.familiarity-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.familiarity-btn.active {
		background: var(--yellow-3, #fbbf24);
		border-color: var(--yellow-3, #fbbf24);
		color: #000;
	}

	.familiarity-btn.known.active {
		background: #22c55e;
		border-color: #22c55e;
		color: white;
	}

	.familiarity-hint {
		font-size: 0.75rem;
		color: var(--fg-2);
		text-align: center;
		margin: 0.75rem 0 0;
	}

	.auth-prompt {
		text-align: center;
		padding: 1rem;
		background: var(--bg-0);
		border-radius: 8px;
	}

	.auth-prompt p {
		font-size: 0.875rem;
		color: var(--fg-2);
		margin: 0 0 1rem;
	}

	.sign-in-btn {
		display: inline-block;
		padding: 0.5rem 1rem;
		background: var(--primary);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.sign-in-btn:hover {
		opacity: 0.9;
	}
</style>
