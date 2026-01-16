<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { video } = $derived(data);

	let show_pinyin = $state(true);
	let current_line_index = $state(-1);
	let player_ready = $state(false);
	let is_playing = $state(false);

	// YouTube Player API
	let player: YT.Player | null = null;
	let player_container: HTMLDivElement;
	let transcript_container: HTMLDivElement;
	let time_update_interval: ReturnType<typeof setInterval>;

	// Load YouTube IFrame API
	onMount(() => {
		if (!browser) return;

		// Load the YouTube IFrame API script
		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		const firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

		// @ts-ignore - YouTube API callback
		window.onYouTubeIframeAPIReady = () => {
			player = new YT.Player(player_container, {
				videoId: video.id,
				playerVars: {
					autoplay: 0,
					modestbranding: 1,
					rel: 0
				},
				events: {
					onReady: onPlayerReady,
					onStateChange: onPlayerStateChange
				}
			});
		};

		// If API is already loaded
		// @ts-ignore
		if (window.YT && window.YT.Player) {
			// @ts-ignore
			window.onYouTubeIframeAPIReady();
		}

		return () => {
			if (time_update_interval) clearInterval(time_update_interval);
			player?.destroy();
		};
	});

	function onPlayerReady() {
		player_ready = true;
	}

	function onPlayerStateChange(event: YT.OnStateChangeEvent) {
		if (event.data === YT.PlayerState.PLAYING) {
			is_playing = true;
			startTimeTracking();
		} else {
			is_playing = false;
			if (time_update_interval) clearInterval(time_update_interval);
		}
	}

	function startTimeTracking() {
		if (time_update_interval) clearInterval(time_update_interval);

		time_update_interval = setInterval(() => {
			if (!player || !is_playing) return;

			const currentTime = player.getCurrentTime();
			updateCurrentLine(currentTime);
		}, 100);
	}

	function updateCurrentLine(currentTime: number) {
		if (!video.transcript?.lines) return;

		const lines = video.transcript.lines;
		let newIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			if (currentTime >= lines[i].start_time && currentTime < lines[i].end_time) {
				newIndex = i;
				break;
			}
			// Handle gaps between lines
			if (
				currentTime >= lines[i].start_time &&
				(i === lines.length - 1 || currentTime < lines[i + 1].start_time)
			) {
				newIndex = i;
				break;
			}
		}

		if (newIndex !== current_line_index) {
			current_line_index = newIndex;
			scrollToCurrentLine();
		}
	}

	async function scrollToCurrentLine() {
		if (current_line_index < 0 || !transcript_container) return;

		await tick();
		const activeElement = transcript_container.querySelector('.line.active');
		if (activeElement) {
			activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	}

	function seekToLine(index: number) {
		if (!player || !video.transcript?.lines[index]) return;

		const line = video.transcript.lines[index];
		player.seekTo(line.start_time, true);
		player.playVideo();
		current_line_index = index;
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
</script>

<svelte:head>
	<title>{video.title} | Nihao.ml</title>
	<meta name="description" content="Learn Chinese with: {video.title}" />
</svelte:head>

<div class="video-page">
	<header>
		<a href="/" class="back-link">← Home</a>
		<h1>{video.title}</h1>
		{#if video.channel_name}
			<p class="channel">{video.channel_name}</p>
		{/if}
	</header>

	<div class="content">
		<div class="player-section">
			<div class="player-wrapper">
				<div bind:this={player_container}></div>
			</div>
		</div>

		<div class="transcript-section" bind:this={transcript_container}>
			<div class="transcript-header">
				<h2>Transcript</h2>
				<label class="pinyin-toggle">
					<input type="checkbox" bind:checked={show_pinyin} />
					<span>Show pinyin</span>
				</label>
			</div>

			{#if video.transcript?.lines && video.transcript.lines.length > 0}
				<div class="transcript-lines">
					{#each video.transcript.lines as line, i}
						<button
							class="line"
							class:active={current_line_index === i}
							onclick={() => seekToLine(i)}
						>
							<span class="time">{formatTime(line.start_time)}</span>
							<div class="text-content">
								{#if show_pinyin && line.pinyin}
									<span class="pinyin">{line.pinyin}</span>
								{/if}
								<span class="chinese">{line.text}</span>
							</div>
						</button>
					{/each}
				</div>
			{:else}
				<p class="no-transcript">No transcript available for this video.</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.video-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}

	header {
		margin-bottom: 1.5rem;
	}

	.back-link {
		color: var(--fg-2);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: var(--primary);
	}

	h1 {
		margin: 0.5rem 0 0.25rem;
		font-size: 1.5rem;
		line-height: 1.3;
	}

	.channel {
		color: var(--fg-2);
		font-size: 0.875rem;
		margin: 0;
	}

	.content {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 900px) {
		.content {
			grid-template-columns: 1fr 400px;
		}
	}

	.player-section {
		position: sticky;
		top: 1rem;
	}

	.player-wrapper {
		position: relative;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		height: 0;
		overflow: hidden;
		border-radius: 12px;
		background: var(--bg-1);
	}

	.player-wrapper :global(iframe) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	.transcript-section {
		background: var(--bg-1);
		border-radius: 12px;
		padding: 1rem;
		max-height: calc(100vh - 200px);
		overflow-y: auto;
	}

	.transcript-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		position: sticky;
		top: 0;
		background: var(--bg-1);
		padding: 0.5rem 0;
		z-index: 1;
	}

	.transcript-header h2 {
		font-size: 1rem;
		margin: 0;
	}

	.pinyin-toggle {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		cursor: pointer;
		color: var(--fg-2);
	}

	.pinyin-toggle input {
		accent-color: var(--primary);
	}

	.transcript-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.line {
		display: flex;
		gap: 1rem;
		padding: 0.75rem;
		background: var(--bg-0);
		border: 2px solid transparent;
		border-radius: 8px;
		cursor: pointer;
		text-align: left;
		width: 100%;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.line:hover {
		border-color: var(--bg-2);
	}

	.line.active {
		border-color: var(--primary);
		background: color-mix(in srgb, var(--primary) 10%, var(--bg-0));
	}

	.time {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--fg-2);
		font-variant-numeric: tabular-nums;
		padding-top: 0.25rem;
	}

	.text-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.pinyin {
		font-size: 0.875rem;
		color: var(--fg-2);
	}

	.chinese {
		font-size: 1.125rem;
		line-height: 1.5;
	}

	.no-transcript {
		color: var(--fg-2);
		text-align: center;
		padding: 2rem;
	}
</style>
