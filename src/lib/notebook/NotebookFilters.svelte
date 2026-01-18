<script lang="ts">
	import SelectMenu from '$lib/SelectMenu.svelte';

	interface Props {
		hsk: string | null;
		familiarity: string | null;
		sort: string;
	}

	let { hsk, familiarity, sort }: Props = $props();
</script>

<div class="filters">
	<SelectMenu
		popover_id="filter-hsk"
		onselect={() => {}}
		button_text="HSK"
		button_icon="filter"
		value={hsk || ''}
		options={[
			{ value: '', label: 'All Levels' },
			{ value: '1', label: 'HSK 1' },
			{ value: '2', label: 'HSK 2' },
			{ value: '3', label: 'HSK 3' },
			{ value: '7', label: 'HSK 4+' }
		]}
	/>
	<SelectMenu
		popover_id="filter-familiarity"
		onselect={() => {}}
		button_text="Status"
		button_icon="filter"
		value={familiarity || ''}
		options={[
			{ value: '', label: 'All Status' },
			{ value: '0', label: 'New' },
			{ value: '1', label: 'Learning' },
			{ value: '5', label: 'Known' }
		]}
	/>
	<SelectMenu
		popover_id="filter-sort"
		onselect={() => {}}
		button_text="Sort"
		button_icon="sort"
		value={sort}
		options={[
			{ value: 'recent', label: 'Most Recent' },
			{ value: 'oldest', label: 'Oldest First' },
			{ value: 'hsk', label: 'HSK Level' },
			{ value: 'familiarity', label: 'Familiarity' }
		]}
	/>
</div>

<style>
	.filters {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		margin-bottom: 1.5rem;
	}
</style>
