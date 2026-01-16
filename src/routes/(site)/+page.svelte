<script lang="ts">
	let { data } = $props();

	// Use all_videos if logged in (shows private videos too), otherwise just public
	let videos = $derived(data.user ? data.all_videos : data.videos);
</script>

<section class="hero">
	<h1>nihao.ml</h1>
	<p class="tagline">Learn Chinese from real content</p>

	<div class="hero-actions">
		{#if data.user}
			<a href="/admin/import" class="button primary">Import Video</a>
			<a href="/dashboard" class="button">Dashboard</a>
		{:else}
			<a href="/login" class="button primary">Get Started</a>
		{/if}
	</div>
</section>

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
	.hero {
		text-align: center;
		padding: 4rem 0;
	}

	.hero h1 {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.tagline {
		font-size: 1.5rem;
		opacity: 0.8;
		margin-bottom: 2rem;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.button.primary {
		background: var(--primary);
		color: var(--black);
	}

	/* Videos Section */
	.videos {
		padding: 2rem 0;
	}

	.videos h2 {
		margin-bottom: 1.5rem;
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
