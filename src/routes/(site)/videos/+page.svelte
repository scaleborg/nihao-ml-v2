<script lang="ts">
	import { page } from '$app/stores';
	import Pagination from '$lib/Pagination.svelte';
	import SelectMenu from '$lib/SelectMenu.svelte';
	import { queryParameters } from 'sveltekit-search-params';

	let { data } = $props();

	const store = queryParameters<{
		level?: string;
		perPage?: string;
		order?: string;
		page: string;
	}>();

	let isNoindexPage = $derived(
		['order', 'level', 'sort', 'perPage'].some((filter) => $page.url.searchParams.has(filter))
	);

	// Pagination logic
	let currentPage = $derived(parseInt($store.page || '1'));
	let perPage = $derived(parseInt($store.perPage || '9'));
	let startIndex = $derived((currentPage - 1) * perPage);
	let paginatedVideos = $derived(data.videos?.slice(startIndex, startIndex + perPage) || []);
</script>

<svelte:head>
	<title>All Videos | nihao.ml</title>
	{#if isNoindexPage}
		<meta name="robots" content="noindex" />
	{/if}
</svelte:head>

<section class="videos-page">
	<div class="list-heading">
		<h1 class="h3">All Videos</h1>
		<div style="display:flex; gap: 10px;">
			<SelectMenu
				popover_id="filter-level"
				onselect={(e) => {
					$store.level = e.detail;
				}}
				button_text="Level"
				button_icon="filter"
				value={$store.level || ''}
				options={[
					{ value: '', label: 'All' },
					{ value: 'hsk1', label: 'HSK 1' },
					{ value: 'hsk2', label: 'HSK 2' },
					{ value: 'hsk3', label: 'HSK 3' },
					{ value: 'hsk4', label: 'HSK 4+' }
				]}
			/>
			<SelectMenu
				popover_id="filter-perPage"
				onselect={(e) => {
					$store.perPage = e.detail;
					$store.page = '1';
				}}
				value_as_label
				button_text="Per Page"
				value={$store.perPage?.toString() || '9'}
				options={[
					{ value: '9', label: '9' },
					{ value: '18', label: '18' },
					{ value: '36', label: '36' }
				]}
			/>
			<SelectMenu
				popover_id="filter-order"
				onselect={(e) => {
					$store.order = e.detail;
				}}
				value={$store.order || 'desc'}
				button_text="Sort"
				button_icon="sort"
				options={[
					{ value: 'desc', label: 'Newest To Oldest' },
					{ value: 'asc', label: 'Oldest To Newest' }
				]}
			/>
		</div>
	</div>

	<Pagination page={currentPage} count={data.videos?.length || 50} {perPage} />

	<div class="video-grid">
		{#each paginatedVideos as video}
			<a href="/video/{video.slug}" class="video-card">
				{#if video.thumbnail}
					<img src={video.thumbnail} alt={video.title} class="thumbnail" />
				{:else}
					<div class="thumbnail placeholder"></div>
				{/if}
				<div class="video-info">
					<h3>{video.title}</h3>
					{#if video.channel_name}
						<p class="channel">{video.channel_name}</p>
					{/if}
					{#if video.transcript?._count?.lines}
						<p class="lines">{video.transcript._count.lines} lines</p>
					{/if}
				</div>
			</a>
		{/each}
	</div>

	<Pagination page={currentPage} count={data.videos?.length || 50} {perPage} />
</section>

<style lang="postcss">
	.videos-page {
		display: grid;
		gap: 20px;
		margin-bottom: 20px;
	}

	.list-heading {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		flex-direction: column;
		margin-bottom: 2rem;
		@media (--above_med) {
			flex-direction: row;
		}
	}

	.video-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.5rem;
	}

	.video-card {
		display: block;
		text-decoration: none;
		color: inherit;
		background: var(--bg-1);
		border-radius: 12px;
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.video-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.thumbnail {
		width: 100%;
		aspect-ratio: 16 / 9;
		object-fit: cover;
		background: var(--bg-2);
	}

	.thumbnail.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.video-info {
		padding: 1rem;
	}

	.video-info h3 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.channel {
		font-size: 0.875rem;
		color: var(--fg-2);
		margin: 0 0 0.25rem;
	}

	.lines {
		font-size: 0.75rem;
		color: var(--fg-2);
		margin: 0;
	}
</style>
