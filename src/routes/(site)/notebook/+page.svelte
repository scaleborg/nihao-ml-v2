<script lang="ts">
	import NotebookTabs from '$lib/notebook/NotebookTabs.svelte';
	import NotebookFilters from '$lib/notebook/NotebookFilters.svelte';
	import CharacterGrid from '$lib/notebook/CharacterGrid.svelte';
	import NotebookStats from '$lib/notebook/NotebookStats.svelte';
	import CharacterDetail from '$lib/notebook/CharacterDetail.svelte';
	import ReviewSession from '$lib/notebook/ReviewSession.svelte';

	let { data } = $props();

	let active_tab = $state<'collection' | 'review' | 'stats'>('collection');
	let selected_character = $state<{
		char: (typeof data.user_characters)[0]['character'];
		user_char: (typeof data.user_characters)[0];
	} | null>(null);
	let show_review = $state(false);

	function handle_tab_change(tab: 'collection' | 'review' | 'stats') {
		active_tab = tab;
		if (tab === 'review' && data.due_count > 0) {
			show_review = true;
		}
	}

	function handle_character_select(
		char: (typeof data.user_characters)[0]['character'],
		user_char: (typeof data.user_characters)[0]
	) {
		selected_character = { char, user_char };
	}

	function handle_close_detail() {
		selected_character = null;
	}

	function handle_close_review() {
		show_review = false;
		active_tab = 'collection';
	}

	async function handle_familiarity_change(char_id: string, level: number) {
		const response = await fetch('/api/notebook/characters', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ character_id: char_id, familiarity: level })
		});

		if (response.ok) {
			// Update local state
			const idx = data.user_characters.findIndex((uc) => uc.character.id === char_id);
			if (idx !== -1) {
				data.user_characters[idx].familiarity = level;
				if (selected_character?.char.id === char_id) {
					selected_character.user_char.familiarity = level;
				}
			}
		}
	}
</script>

<svelte:head>
	<title>Study Notebook | nihao.ml</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<section class="notebook-page">
	<header class="page-header">
		<h1 class="page-title">STUDY NOTEBOOK</h1>
		<div class="header-stats">
			<span class="stat">
				<span class="stat-value">{data.stats.total}</span>
				<span class="stat-label">total</span>
			</span>
		</div>
	</header>

	<NotebookTabs {active_tab} due_count={data.due_count} ontabchange={handle_tab_change} />

	{#if active_tab === 'collection'}
		<NotebookFilters
			hsk={data.filters.hsk}
			familiarity={data.filters.familiarity}
			sort={data.filters.sort}
		/>
		<CharacterGrid
			characters={data.user_characters}
			page={data.pagination.page}
			total_count={data.total_count}
			perPage={data.pagination.per_page}
			onselect={handle_character_select}
		/>
	{:else if active_tab === 'review'}
		{#if data.due_count === 0}
			<div class="no-reviews">
				<p class="no-reviews-title">All caught up!</p>
				<p class="no-reviews-text">No characters are due for review right now.</p>
			</div>
		{:else if !show_review}
			<div class="review-prompt">
				<p class="review-count">{data.due_count} characters due</p>
				<button class="start-review-btn" onclick={() => (show_review = true)}>
					Start Review Session
				</button>
			</div>
		{:else}
			<ReviewSession due_count={data.due_count} onclose={handle_close_review} />
		{/if}
	{:else if active_tab === 'stats'}
		<NotebookStats stats={data.stats} />
	{/if}
</section>

{#if selected_character}
	<CharacterDetail
		character={selected_character.char}
		user_character={selected_character.user_char}
		onclose={handle_close_detail}
		onfamiliaritychange={handle_familiarity_change}
	/>
{/if}

<style>
	.notebook-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.page-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--white);
		letter-spacing: 0.12em;
		margin: 0;
	}

	.header-stats {
		display: flex;
		gap: 1.5rem;
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 0.375rem;
	}

	.stat-value {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--primary);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--black-4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.no-reviews,
	.review-prompt {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.no-reviews-title,
	.review-count {
		font-size: 1.5rem;
		color: var(--white);
		margin: 0 0 0.5rem;
	}

	.no-reviews-text {
		font-size: 0.875rem;
		color: var(--black-4);
		margin: 0;
	}

	.review-count {
		font-family: 'Space Grotesk', system-ui, sans-serif;
	}

	.start-review-btn {
		margin-top: 1.5rem;
		padding: 0.875rem 2rem;
		font-size: 1rem;
		font-family: var(--body-font-family);
		background: var(--primary);
		color: var(--black-10);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.start-review-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}
</style>
