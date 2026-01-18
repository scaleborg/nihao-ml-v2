<script lang="ts">
	interface Props {
		active_tab: 'collection' | 'review' | 'stats';
		due_count: number;
		ontabchange: (tab: 'collection' | 'review' | 'stats') => void;
	}

	let { active_tab, due_count, ontabchange }: Props = $props();
</script>

<div class="tabs">
	<button
		class="tab"
		class:active={active_tab === 'collection'}
		onclick={() => ontabchange('collection')}
	>
		Collection
	</button>
	<button class="tab" class:active={active_tab === 'review'} onclick={() => ontabchange('review')}>
		Review
		{#if due_count > 0}
			<span class="due-badge">{due_count}</span>
		{/if}
	</button>
	<button class="tab" class:active={active_tab === 'stats'} onclick={() => ontabchange('stats')}>
		Stats
	</button>
</div>

<style>
	.tabs {
		display: flex;
		gap: 0.25rem;
		border-bottom: 1px solid var(--black-7);
		margin-bottom: 1.5rem;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		font-size: 0.875rem;
		font-family: var(--body-font-family);
		background: transparent;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--black-4);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.tab:hover {
		color: var(--white);
	}

	.tab.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
	}

	.due-badge {
		padding: 0.125rem 0.5rem;
		font-size: 0.75rem;
		font-weight: 600;
		background: var(--primary);
		color: var(--black-10);
		border-radius: 10px;
	}
</style>
