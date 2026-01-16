<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>All Videos | nihao.ml</title>
</svelte:head>

<section class="videos-page">
	<div class="header">
		<h1>All Videos</h1>
	</div>

	<div class="video-grid">
		{#each data.videos as video}
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
</section>

<style>
	.videos-page {
		padding: 2rem 0;
	}

	.header {
		margin-bottom: 2rem;
	}

	.header h1 {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.header h1::before,
	.header h1::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--fg-2, rgba(255, 255, 255, 0.3));
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
