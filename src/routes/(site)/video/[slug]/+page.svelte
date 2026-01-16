<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { browser } from '$app/environment';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { video } = $derived(data);

	// Basic playback state
	let show_pinyin = $state(true);
	let current_line_index = $state(-1);
	let player_ready = $state(false);
	let is_playing = $state(false);

	// Phase 1: Enhanced playback controls
	let playback_speed = $state(1);
	let loop_mode = $state(false);
	let auto_pause_mode = $state(false);
	let show_help = $state(false);
	let has_paused_for_line = $state(false); // Track if we've already paused for the current line

	const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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

		// Check if we're at the end of the current line for loop/auto-pause
		if (current_line_index >= 0 && current_line_index < lines.length) {
			const currentLine = lines[current_line_index];
			const lineEndBuffer = 0.15; // Small buffer to catch the end

			// Loop mode: replay current line when it ends
			if (loop_mode && currentTime >= currentLine.end_time - lineEndBuffer) {
				player?.seekTo(currentLine.start_time, true);
				return; // Don't update line index
			}

			// Auto-pause mode: pause at end of each line
			if (
				auto_pause_mode &&
				!has_paused_for_line &&
				currentTime >= currentLine.end_time - lineEndBuffer
			) {
				player?.pauseVideo();
				has_paused_for_line = true;
				return;
			}
		}

		if (newIndex !== current_line_index) {
			current_line_index = newIndex;
			has_paused_for_line = false; // Reset for new line
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

	// Phase 1: Playback control functions
	function togglePlayPause() {
		if (!player || !player_ready) return;
		if (is_playing) {
			player.pauseVideo();
		} else {
			player.playVideo();
		}
	}

	function goToPreviousLine() {
		if (current_line_index > 0) {
			seekToLine(current_line_index - 1);
		} else if (current_line_index === 0) {
			// Replay current line if at the beginning
			seekToLine(0);
		}
	}

	function goToNextLine() {
		if (!video.transcript?.lines) return;
		if (current_line_index < video.transcript.lines.length - 1) {
			seekToLine(current_line_index + 1);
		}
	}

	function repeatCurrentLine() {
		if (current_line_index >= 0) {
			seekToLine(current_line_index);
		}
	}

	function seekRelative(seconds: number) {
		if (!player || !player_ready) return;
		const currentTime = player.getCurrentTime();
		player.seekTo(Math.max(0, currentTime + seconds), true);
	}

	function setSpeed(speed: number) {
		if (!player || !player_ready) return;
		playback_speed = speed;
		// @ts-expect-error - setPlaybackRate is a valid YouTube API method but not in types
		player.setPlaybackRate(speed);
	}

	function adjustSpeed(delta: number) {
		const currentIndex = SPEED_OPTIONS.indexOf(playback_speed);
		let newIndex = currentIndex + delta;
		if (newIndex < 0) newIndex = 0;
		if (newIndex >= SPEED_OPTIONS.length) newIndex = SPEED_OPTIONS.length - 1;
		setSpeed(SPEED_OPTIONS[newIndex]);
	}

	function toggleLoopMode() {
		loop_mode = !loop_mode;
		// If turning on loop mode, turn off auto-pause (mutually exclusive behavior makes more sense)
	}

	function toggleAutoPause() {
		auto_pause_mode = !auto_pause_mode;
		has_paused_for_line = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		// Ignore if user is typing in an input
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
			return;
		}

		switch (event.key.toLowerCase()) {
			case ' ':
				event.preventDefault();
				togglePlayPause();
				break;
			case 'a':
				event.preventDefault();
				goToPreviousLine();
				break;
			case 's':
				event.preventDefault();
				goToNextLine();
				break;
			case 'r':
				event.preventDefault();
				repeatCurrentLine();
				break;
			case 'arrowleft':
				event.preventDefault();
				seekRelative(-5);
				break;
			case 'arrowright':
				event.preventDefault();
				seekRelative(5);
				break;
			case '[':
				event.preventDefault();
				adjustSpeed(-1);
				break;
			case ']':
				event.preventDefault();
				adjustSpeed(1);
				break;
			case 'l':
				event.preventDefault();
				toggleLoopMode();
				break;
			case 'p':
				event.preventDefault();
				toggleAutoPause();
				break;
			case '?':
				event.preventDefault();
				show_help = !show_help;
				break;
			case 'escape':
				if (show_help) {
					event.preventDefault();
					show_help = false;
				}
				break;
		}
	}
</script>

<svelte:head>
	<title>{video.title} | Nihao.ml</title>
	<meta name="description" content="Learn Chinese with: {video.title}" />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

{#if show_help}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="help-overlay"
		onclick={() => (show_help = false)}
		onkeydown={(e) => e.key === 'Escape' && (show_help = false)}
		role="dialog"
		aria-modal="true"
		aria-label="Keyboard shortcuts"
		tabindex="-1"
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="help-dialog"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
		>
			<div class="help-header">
				<h3>Keyboard Shortcuts</h3>
				<button class="close-btn" onclick={() => (show_help = false)} aria-label="Close">×</button>
			</div>
			<div class="help-content">
				<div class="shortcut-group">
					<h4>Playback</h4>
					<div class="shortcut"><kbd>Space</kbd><span>Play / Pause</span></div>
					<div class="shortcut"><kbd>←</kbd><span>Seek back 5s</span></div>
					<div class="shortcut"><kbd>→</kbd><span>Seek forward 5s</span></div>
				</div>
				<div class="shortcut-group">
					<h4>Navigation</h4>
					<div class="shortcut"><kbd>A</kbd><span>Previous line</span></div>
					<div class="shortcut"><kbd>S</kbd><span>Next line</span></div>
					<div class="shortcut"><kbd>R</kbd><span>Repeat current line</span></div>
				</div>
				<div class="shortcut-group">
					<h4>Speed</h4>
					<div class="shortcut"><kbd>[</kbd><span>Decrease speed</span></div>
					<div class="shortcut"><kbd>]</kbd><span>Increase speed</span></div>
				</div>
				<div class="shortcut-group">
					<h4>Modes</h4>
					<div class="shortcut"><kbd>L</kbd><span>Toggle loop mode</span></div>
					<div class="shortcut"><kbd>P</kbd><span>Toggle auto-pause</span></div>
					<div class="shortcut"><kbd>?</kbd><span>Show/hide help</span></div>
				</div>
			</div>
		</div>
	</div>
{/if}

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
				<div class="header-row">
					<h2>Transcript</h2>
					<button class="help-btn" onclick={() => (show_help = true)} title="Keyboard shortcuts (?)"
						>?</button
					>
				</div>
				<div class="controls-row">
					<div class="speed-controls">
						{#each SPEED_OPTIONS as speed}
							<button
								class="speed-btn"
								class:active={playback_speed === speed}
								onclick={() => setSpeed(speed)}
							>
								{speed}x
							</button>
						{/each}
					</div>
					<div class="mode-toggles">
						<button
							class="mode-btn"
							class:active={loop_mode}
							onclick={toggleLoopMode}
							title="Loop current line (L)"
						>
							Loop
						</button>
						<button
							class="mode-btn"
							class:active={auto_pause_mode}
							onclick={toggleAutoPause}
							title="Auto-pause after each line (P)"
						>
							Auto-pause
						</button>
					</div>
				</div>
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
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
		position: sticky;
		top: 0;
		background: var(--bg-1);
		padding: 0.5rem 0;
		z-index: 1;
	}

	.header-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.transcript-header h2 {
		font-size: 1rem;
		margin: 0;
	}

	.help-btn {
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1px solid var(--bg-2);
		background: var(--bg-0);
		color: var(--fg-2);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.help-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.controls-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
	}

	.speed-controls {
		display: flex;
		gap: 0.25rem;
	}

	.speed-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border: 1px solid var(--bg-2);
		background: var(--bg-0);
		border-radius: 4px;
		cursor: pointer;
		color: var(--fg-2);
		transition: all 0.15s;
	}

	.speed-btn:hover {
		border-color: var(--primary);
	}

	.speed-btn.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.mode-toggles {
		display: flex;
		gap: 0.5rem;
	}

	.mode-btn {
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		border: 1px solid var(--bg-2);
		background: var(--bg-0);
		border-radius: 4px;
		cursor: pointer;
		color: var(--fg-2);
		transition: all 0.15s;
	}

	.mode-btn:hover {
		border-color: var(--primary);
	}

	.mode-btn.active {
		background: color-mix(in srgb, var(--primary) 20%, var(--bg-0));
		border-color: var(--primary);
		color: var(--primary);
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

	/* Help Dialog */
	.help-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.help-dialog {
		background: var(--bg-1);
		border-radius: 12px;
		max-width: 400px;
		width: 100%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.help-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1rem 0.5rem;
		border-bottom: 1px solid var(--bg-2);
	}

	.help-header h3 {
		margin: 0;
		font-size: 1.125rem;
	}

	.close-btn {
		width: 28px;
		height: 28px;
		border: none;
		background: transparent;
		font-size: 1.5rem;
		color: var(--fg-2);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
	}

	.close-btn:hover {
		background: var(--bg-2);
	}

	.help-content {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.shortcut-group h4 {
		margin: 0 0 0.5rem;
		font-size: 0.75rem;
		text-transform: uppercase;
		color: var(--fg-2);
		letter-spacing: 0.05em;
	}

	.shortcut {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.375rem 0;
	}

	.shortcut kbd {
		background: var(--bg-0);
		border: 1px solid var(--bg-2);
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		font-family: inherit;
		font-size: 0.75rem;
		min-width: 2rem;
		text-align: center;
	}

	.shortcut span {
		color: var(--fg-2);
		font-size: 0.875rem;
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
