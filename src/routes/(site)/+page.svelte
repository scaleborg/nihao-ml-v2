<script lang="ts">
	import NihaoHero from '$lib/NihaoHero.svelte';

	let { data } = $props();

	// Use all_videos if logged in (shows private videos too), otherwise just public
	let videos = $derived(data.user ? data.all_videos : data.videos);
</script>

<h1 class="visually-hidden">nihao.ml - Learn Chinese from Real Content</h1>
<NihaoHero user={data.user} />

{#if videos && videos.length > 0}
	<section class="videos">
		<h2>Videos</h2>
		<div class="video-grid">
			{#each videos as video}
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
						{#if !video.is_public}
							<span class="private-badge">Private</span>
						{/if}
					</div>
				</a>
			{/each}
		</div>
		<div class="see-all-wrapper">
			<a href="/videos" class="see-all-button">See all videos</a>
		</div>
	</section>
{:else}
	<section class="features">
		<h2>How it works</h2>
		<div class="grid">
			<div class="feature">
				<h3>1. Import</h3>
				<p>Paste a YouTube URL with Chinese captions</p>
			</div>
			<div class="feature">
				<h3>2. Study</h3>
				<p>Watch with synced transcript and pinyin</p>
			</div>
			<div class="feature">
				<h3>3. Review</h3>
				<p>Master characters with spaced repetition</p>
			</div>
		</div>
	</section>
{/if}

<style>
	/* Videos Section */
	.videos {
		padding: 2rem 0;
	}

	.see-all-wrapper {
		display: flex;
		justify-content: center;
		margin-top: 2rem;
	}

	.see-all-button {
		white-space: nowrap;
		cursor: pointer;
		text-decoration: none;
		border: none;
		font-family: var(--body-font-family);
		font-weight: 600;
		padding: 6px 15px;
		font-size: var(--body-font-size, 1rem);
		border-radius: var(--brad, 5px);
		background: var(--primary);
		color: var(--yellow-8, #5c4813);
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
		box-shadow: inset 0 0 0 1.5px rgba(0, 0, 0, 0.2);
		transition: background 0.2s ease-in-out;
	}

	.videos h2 {
		margin-bottom: 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		text-align: center;
	}

	.videos h2::before,
	.videos h2::after {
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

	.private-badge {
		display: inline-block;
		font-size: 0.625rem;
		text-transform: uppercase;
		background: var(--warning);
		color: var(--black);
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		margin-top: 0.5rem;
	}

	/* Features Section (shown when no videos) */
	.features {
		padding: 2rem 0;
	}

	.features h2 {
		text-align: center;
		margin-bottom: 2rem;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}

	.feature {
		padding: 1.5rem;
		border: 1px solid var(--bg-root);
		border-radius: 8px;
	}

	.feature h3 {
		margin-bottom: 0.5rem;
	}
</style>
