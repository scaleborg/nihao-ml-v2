<script lang="ts">
	import { onMount, tick, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import WordPool from '$lib/chinese/WordPool.svelte';
	import 'plyr/dist/plyr.css';

	// Plyr instance (dynamically imported to avoid SSR issues)
	let plyr_instance: any = null;
	let player_element: HTMLDivElement | HTMLVideoElement;

	interface Props {
		data: PageData;
	}

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	let { data }: Props = $props();
	let { video, is_authenticated } = $derived(data);

	const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

	let user_characters = $state<Record<string, { familiarity: number; state: number }>>({});
	$effect(() => {
		user_characters = { ...data.user_characters };
	});

	// Playback state
	let show_pinyin = $state(true);
	let current_line_index = $state(-1);
	let player_ready = $state(false);
	let is_playing = $state(false);
	let line_progress = $state(0);
	let playback_speed = $state(1);
	let loop_mode = $state(false);
	let auto_pause_mode = $state(false);
	let has_paused_for_line = $state(false);

	// Word pool state
	let pool_characters = $state<Map<string, CharacterData | null>>(new Map());
	let expanded_pool_char = $state<string | null>(null);
	let character_cache = new Map<string, CharacterData | null>();
	let flying_char = $state<{ char: string; startX: number; startY: number } | null>(null);

	onMount(async () => {
		const Plyr = (await import('plyr')).default;
		const storage_key = `nihao_video_${video.id}_time`;

		if (player_element) {
			plyr_instance = new Plyr(player_element, {
				autoplay: false,
				controls: [
					'play-large',
					'play',
					'progress',
					'current-time',
					'mute',
					'volume',
					'fullscreen'
				],
				youtube: {
					noCookie: true,
					rel: 0,
					showinfo: 0,
					modestbranding: 1,
					iv_load_policy: 3,
					autoplay: 0
				}
			});

			plyr_instance.on('ready', () => {
				player_ready = true;
				// Restore saved position
				const saved_time = localStorage.getItem(storage_key);
				if (saved_time) {
					plyr_instance.currentTime = parseFloat(saved_time);
					updateCurrentLine(parseFloat(saved_time));
				}
			});
			plyr_instance.on('play', () => (is_playing = true));
			plyr_instance.on('pause', () => (is_playing = false));
			plyr_instance.on('timeupdate', () => {
				if (plyr_instance) {
					updateCurrentLine(plyr_instance.currentTime);
					// Save position to localStorage
					localStorage.setItem(storage_key, plyr_instance.currentTime.toString());
				}
			});
		}
	});

	onDestroy(() => plyr_instance?.destroy());

	function get_character_status(char: string): 'new' | 'learning' | 'known' {
		const uc = user_characters[char];
		if (!uc) return 'new';
		if (uc.familiarity === 5) return 'known';
		return 'learning';
	}

	const SPEED_OPTIONS = [0.8, 0.85, 0.9, 0.95, 1, 1.1, 1.2, 1.3];
	let transcript_container: HTMLDivElement | undefined;

	// Count unique Chinese characters in transcript
	let unique_char_count = $derived(() => {
		const chars = new Set<string>();
		if (video.transcript?.lines) {
			for (const line of video.transcript.lines) {
				for (const char of line.text) {
					if (CHINESE_CHAR_REGEX.test(char)) {
						chars.add(char);
					}
				}
			}
		}
		return chars.size;
	});

	function updateCurrentLine(currentTime: number) {
		if (!video.transcript?.lines) return;
		const lines = video.transcript.lines;
		let newIndex = -1;

		for (let i = 0; i < lines.length; i++) {
			if (currentTime >= lines[i].start_time && currentTime < lines[i].end_time) {
				newIndex = i;
				break;
			}
			if (
				currentTime >= lines[i].start_time &&
				(i === lines.length - 1 || currentTime < lines[i + 1].start_time)
			) {
				newIndex = i;
				break;
			}
		}

		if (newIndex >= 0) {
			const line = lines[newIndex];
			const duration = line.end_time - line.start_time;
			const elapsed = currentTime - line.start_time;
			line_progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));
		} else {
			line_progress = 0;
		}

		if (current_line_index >= 0 && current_line_index < lines.length) {
			const currentLine = lines[current_line_index];
			const lineEndBuffer = 0.15;

			if (loop_mode && currentTime >= currentLine.end_time - lineEndBuffer) {
				if (plyr_instance) plyr_instance.currentTime = currentLine.start_time;
				line_progress = 0;
				return;
			}

			if (
				auto_pause_mode &&
				!has_paused_for_line &&
				currentTime >= currentLine.end_time - lineEndBuffer
			) {
				plyr_instance?.pause();
				has_paused_for_line = true;
				return;
			}
		}

		if (newIndex !== current_line_index) {
			current_line_index = newIndex;
			has_paused_for_line = false;
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
		if (!plyr_instance || !video.transcript?.lines[index]) return;
		const line = video.transcript.lines[index];
		plyr_instance.currentTime = line.start_time;
		plyr_instance.play();
		current_line_index = index;
	}

	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}

	function togglePlayPause() {
		if (!plyr_instance || !player_ready) return;
		is_playing ? plyr_instance.pause() : plyr_instance.play();
	}

	function goToPreviousLine() {
		if (current_line_index > 0) seekToLine(current_line_index - 1);
		else if (current_line_index === 0) seekToLine(0);
	}

	function goToNextLine() {
		if (!video.transcript?.lines) return;
		if (current_line_index < video.transcript.lines.length - 1) seekToLine(current_line_index + 1);
	}

	function repeatCurrentLine() {
		if (current_line_index >= 0) seekToLine(current_line_index);
	}

	function seekRelative(seconds: number) {
		if (!plyr_instance || !player_ready) return;
		plyr_instance.currentTime = Math.max(0, plyr_instance.currentTime + seconds);
	}

	function setSpeed(speed: number) {
		if (!plyr_instance || !player_ready) return;
		playback_speed = speed;
		plyr_instance.speed = speed;
	}

	function adjustSpeed(delta: number) {
		const currentIndex = SPEED_OPTIONS.indexOf(playback_speed);
		let newIndex = Math.max(0, Math.min(SPEED_OPTIONS.length - 1, currentIndex + delta));
		setSpeed(SPEED_OPTIONS[newIndex]);
	}

	function toggleLoopMode() {
		loop_mode = !loop_mode;
	}

	function toggleAutoPause() {
		auto_pause_mode = !auto_pause_mode;
		has_paused_for_line = false;
	}

	function splitChineseText(text: string) {
		return [...text].map((char) => ({
			char,
			isClickable: CHINESE_CHAR_REGEX.test(char)
		}));
	}

	async function handleCharacterClick(event: MouseEvent | KeyboardEvent, char: string) {
		event.stopPropagation();
		event.preventDefault();
		const status = get_character_status(char);

		if (status === 'known') {
			if (pool_characters.has(char)) expanded_pool_char = char;
			return;
		}

		const target = event.target as HTMLElement;
		if (target) {
			const rect = target.getBoundingClientRect();
			flying_char = {
				char,
				startX: rect.left + rect.width / 2,
				startY: rect.top + rect.height / 2
			};
		}

		if (!pool_characters.has(char)) {
			if (character_cache.has(char)) {
				pool_characters.set(char, character_cache.get(char) ?? null);
				pool_characters = pool_characters;
			} else {
				pool_characters.set(char, null);
				pool_characters = pool_characters;
				try {
					const res = await fetch(`/api/character/${encodeURIComponent(char)}`);
					if (res.ok) {
						const data = await res.json();
						character_cache.set(char, data);
						pool_characters.set(char, data);
						pool_characters = pool_characters;
					} else {
						character_cache.set(char, null);
					}
				} catch {}
			}
		}

		setTimeout(() => {
			flying_char = null;
			expanded_pool_char = char;
		}, 400);
	}

	async function handleSaveFamiliarity(char: string, level: number) {
		if (!is_authenticated) return;
		user_characters[char] = {
			...user_characters[char],
			familiarity: level,
			state: user_characters[char]?.state ?? 0
		};
		try {
			await fetch('/api/user-character', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ character: char, familiarity: level })
			});
		} catch (err) {
			console.error('Error saving familiarity:', err);
		}
	}

	function handleGraduate(char: string) {
		pool_characters.delete(char);
		pool_characters = pool_characters;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement)
			return;

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
			case '-':
				event.preventDefault();
				adjustSpeed(-1);
				break;
			case '=':
			case '+':
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
			case 'y':
				event.preventDefault();
				show_pinyin = !show_pinyin;
				break;
			case 'escape':
				if (expanded_pool_char) {
					event.preventDefault();
					expanded_pool_char = null;
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

{#if flying_char}
	<div
		class="flying-char"
		style="--start-x: {flying_char.startX}px; --start-y: {flying_char.startY}px;"
	>
		{flying_char.char}
	</div>
{/if}

<div class="video-page">
	<!-- Page Header -->
	<header class="page-header">
		<div class="header-content">
			<div class="header-meta">
				<span class="meta-divider">/</span>
				{#if video.created_at}
					<span class="date"
						>{new Date(video.created_at).toLocaleDateString('en-US', {
							year: 'numeric',
							month: 'short',
							day: 'numeric'
						})}</span
					>
				{/if}
				<span class="meta-divider">/</span>
				<span class="char-count">{unique_char_count()} characters</span>
			</div>
			{#if video.channel_name}
				<span class="channel-name">{video.channel_name}</span>
			{/if}
			<h1 class="video-title">{video.title}</h1>
		</div>
	</header>

	<!-- Top Section: Video + Pool -->
	<div class="top-section">
		<div class="video-area">
			<div class="player-wrapper">
				{#if video.video_url}
					<!-- Native video from R2 -->
					<video bind:this={player_element} playsinline>
						<source src={video.video_url} type="video/mp4" />
					</video>
				{:else}
					<!-- YouTube fallback via Plyr -->
					<div
						bind:this={player_element}
						data-plyr-provider="youtube"
						data-plyr-embed-id={video.id}
					></div>
				{/if}
			</div>
		</div>
		<div class="pool-area">
			<WordPool
				characters={pool_characters}
				{user_characters}
				expanded_char={expanded_pool_char}
				{is_authenticated}
				onexpand={(char) => (expanded_pool_char = char)}
				onsave={handleSaveFamiliarity}
				ongraduate={handleGraduate}
			/>
		</div>
	</div>

	<!-- Controls Bar -->
	<div class="controls-bar">
		<div class="controls-left">
			<span class="play-state" class:playing={is_playing}>{is_playing ? '▶' : '⏸'}</span>
			<div class="speed-control">
				<input
					type="range"
					min="0"
					max={SPEED_OPTIONS.length - 1}
					value={SPEED_OPTIONS.indexOf(playback_speed)}
					oninput={(e) => setSpeed(SPEED_OPTIONS[parseInt(e.currentTarget.value)])}
					class="speed-slider"
				/>
				<span class="speed-value">{playback_speed}x</span>
			</div>
		</div>
		<div class="controls-right">
			<button class="toggle-btn" class:active={loop_mode} onclick={toggleLoopMode} title="Loop (L)"
				>Loop</button
			>
			<button
				class="toggle-btn"
				class:active={auto_pause_mode}
				onclick={toggleAutoPause}
				title="Auto-pause (P)">Auto-pause</button
			>
			<button
				class="toggle-btn"
				class:active={show_pinyin}
				onclick={() => (show_pinyin = !show_pinyin)}
				title="Pinyin">Pinyin</button
			>
		</div>
	</div>

	<!-- Transcript Section: 3 lines only -->
	<div class="transcript-section">
		{#if video.transcript?.lines && video.transcript.lines.length > 0}
			{@const lines = video.transcript.lines}
			{@const prev_index = current_line_index > 0 ? current_line_index - 1 : null}
			{@const next_index = current_line_index < lines.length - 1 ? current_line_index + 1 : null}
			<div class="transcript-3-lines">
				<!-- Previous line (dimmed) -->
				{#if prev_index !== null}
					{@const line = lines[prev_index]}
					<button class="line prev" onclick={() => seekToLine(prev_index)}>
						<span class="time">{formatTime(line.start_time)}</span>
						<div class="text-content">
							{#if show_pinyin && line.pinyin}
								<span class="pinyin">{line.pinyin}</span>
							{/if}
							<span class="chinese">{line.text}</span>
						</div>
					</button>
				{:else}
					<div class="line placeholder"></div>
				{/if}

				<!-- Current line (bright, interactive) -->
				{#if current_line_index >= 0}
					{@const line = lines[current_line_index]}
					<button
						class="line current"
						style="--progress: {line_progress}%"
						onclick={() => seekToLine(current_line_index)}
					>
						<span class="time">{formatTime(line.start_time)}</span>
						<div class="text-content">
							{#if show_pinyin && line.pinyin}
								<span class="pinyin">{line.pinyin}</span>
							{/if}
							<span class="chinese">
								{#each splitChineseText(line.text) as { char, isClickable }}
									{#if isClickable}
										{@const status = get_character_status(char)}
										<span
											class="char"
											class:char-new={status === 'new'}
											class:char-learning={status === 'learning'}
											role="button"
											tabindex="-1"
											onclick={(e) => handleCharacterClick(e, char)}
											onkeydown={(e) => e.key === 'Enter' && handleCharacterClick(e, char)}
											>{char}</span
										>
									{:else}<span class="char">{char}</span>{/if}
								{/each}
							</span>
						</div>
					</button>
				{:else}
					<div class="line placeholder current-placeholder">
						<span class="hint">Press play to start</span>
					</div>
				{/if}

				<!-- Next line (dimmed) -->
				{#if next_index !== null}
					{@const line = lines[next_index]}
					<button class="line next" onclick={() => seekToLine(next_index)}>
						<span class="time">{formatTime(line.start_time)}</span>
						<div class="text-content">
							{#if show_pinyin && line.pinyin}
								<span class="pinyin">{line.pinyin}</span>
							{/if}
							<span class="chinese">{line.text}</span>
						</div>
					</button>
				{:else}
					<div class="line placeholder"></div>
				{/if}
			</div>
		{:else}
			<p class="no-transcript">No transcript available.</p>
		{/if}
	</div>

	<!-- Keyboard Shortcuts Reference -->
	<div class="shortcuts-reference">
		<div class="shortcuts-grid">
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
				<div class="shortcut"><kbd>R</kbd><span>Repeat line</span></div>
			</div>
			<div class="shortcut-group">
				<h4>Speed</h4>
				<div class="shortcut"><kbd>-</kbd><span>Slower</span></div>
				<div class="shortcut"><kbd>+</kbd><span>Faster</span></div>
			</div>
			<div class="shortcut-group">
				<h4>Modes</h4>
				<div class="shortcut"><kbd>L</kbd><span>Loop line</span></div>
				<div class="shortcut"><kbd>P</kbd><span>Auto-pause</span></div>
				<div class="shortcut"><kbd>Y</kbd><span>Pinyin</span></div>
			</div>
		</div>
	</div>
</div>

<style>
	.video-page {
		display: flex;
		flex-direction: column;
		background: var(--black-9);
		max-width: 100%;
		overflow-x: hidden;
	}

	/* Top Section: Video + Pool side by side */
	.top-section {
		display: grid;
		grid-template-columns: 1fr 280px;
		gap: 0;
		background: var(--black-10);
		border-bottom: 1px solid var(--black-7);
		position: relative;
	}

	.top-section::before {
		content: '';
		position: absolute;
		right: 280px;
		top: 0;
		bottom: 0;
		width: 1px;
		background: var(--black-7);
	}

	.video-area {
		padding: 2rem 2rem 3.5rem;
		display: grid;
		place-items: center;
	}

	.player-wrapper {
		width: 100%;
		max-width: min(640px, 100%);
		margin: 0 auto;
		border-radius: 8px;
		overflow: hidden;
	}

	.player-wrapper :global(.plyr) {
		--plyr-color-main: var(--primary);
		--plyr-focus-visible-color: transparent;
		aspect-ratio: 16/9;
		width: 100%;
		border-radius: 8px;
	}

	.player-wrapper :global(.plyr button:focus-visible) {
		outline: none;
	}

	.player-wrapper video {
		width: 100%;
		aspect-ratio: 16/9;
		border-radius: 8px;
		background: var(--black-10);
	}

	/* Hide YouTube's paid promotion disclosure */
	.player-wrapper :global(.ytp-paid-content-overlay),
	.player-wrapper :global(.ytp-impression-link),
	.player-wrapper :global(.ytp-paid-content-overlay-container) {
		display: none !important;
	}

	.pool-area {
		overflow-y: auto;
		padding: 2rem 1rem;
		align-self: start;
		max-height: 400px;
	}

	/* Controls Bar */
	.controls-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.5rem;
		margin-top: 1rem;
		background: var(--black-9);
		border-bottom: 1px solid var(--black-7);
		flex-wrap: wrap;
	}

	.controls-left {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.play-state {
		font-size: 0.875rem;
		color: var(--black-5);
		transition: color 0.15s;
	}

	.play-state.playing {
		color: var(--primary);
	}

	.speed-control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.speed-slider {
		width: 100px;
		height: 4px;
		appearance: none;
		background: var(--black-7);
		border-radius: 2px;
		cursor: pointer;
	}

	.speed-slider::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		background: var(--primary);
		border-radius: 50%;
		cursor: pointer;
		transition: transform 0.15s;
	}

	.speed-slider::-webkit-slider-thumb:hover {
		transform: scale(1.2);
	}

	.speed-slider::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: var(--primary);
		border: none;
		border-radius: 50%;
		cursor: pointer;
	}

	.speed-value {
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		color: var(--black-3);
		min-width: 2.5rem;
		font-variant-numeric: tabular-nums;
	}

	.controls-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.toggle-btn {
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		border: 1px solid var(--black-7);
		background: transparent;
		border-radius: 4px;
		cursor: pointer;
		color: var(--black-4);
		transition: all 0.15s;
	}

	.toggle-btn:hover {
		border-color: var(--black-5);
		color: var(--black-3);
	}

	.toggle-btn.active {
		background: color-mix(in srgb, var(--primary) 15%, transparent);
		border-color: var(--primary);
		color: var(--primary);
	}

	/* Transcript Section: 3 Lines Only */
	.transcript-section {
		display: flex;
		justify-content: center;
		padding: 1.5rem 2rem;
		background: var(--black-9);
	}

	.transcript-3-lines {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 700px;
		width: 100%;
		min-width: 0;
	}

	.line {
		position: relative;
		display: flex;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: transparent;
		border: none;
		border-left: 3px solid transparent;
		border-radius: 0 6px 6px 0;
		cursor: pointer;
		text-align: left;
		width: 100%;
		min-width: 0;
		transition: all 0.2s ease;
	}

	.line.placeholder {
		min-height: 60px;
		cursor: default;
	}

	.line.current-placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.hint {
		color: var(--black-5);
		font-family: var(--body-font-family);
		font-size: 0.875rem;
	}

	/* Previous/Next lines: dimmed */
	.line.prev,
	.line.next {
		opacity: 0.4;
	}

	.line.prev:hover,
	.line.next:hover {
		opacity: 0.7;
		background: var(--black-8);
	}

	.line.prev .chinese,
	.line.next .chinese {
		font-size: 2rem;
		color: var(--black-3);
		letter-spacing: 0.1em;
	}

	.line.prev .pinyin,
	.line.next .pinyin {
		font-size: 1rem;
	}

	/* Current line: bright, prominent */
	.line.current {
		border-left-color: var(--primary);
		background: color-mix(in srgb, var(--primary) 8%, var(--black-8));
		opacity: 1;
	}

	.line.current::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		height: 2px;
		width: var(--progress, 0%);
		background: var(--primary);
		transition: width 100ms linear;
	}

	.line.current .chinese {
		font-size: 2rem;
		color: var(--white);
		letter-spacing: 0.1em;
	}

	.line.current .pinyin {
		font-size: 1rem;
		color: var(--black-3);
	}

	.time {
		flex-shrink: 0;
		font-size: 0.75rem;
		color: var(--black-5);
		font-variant-numeric: tabular-nums;
		font-family: var(--body-font-family);
		padding-top: 0.25rem;
		min-width: 2.5rem;
	}

	.line.current .time {
		color: var(--primary);
	}

	.text-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		overflow: hidden;
	}

	.pinyin {
		color: var(--black-4);
		line-height: 1.4;
		letter-spacing: 0.03em;
		font-family: var(--body-font-family);
	}

	.chinese {
		line-height: 1.6;
		letter-spacing: 0.08em;
		word-break: break-word;
		overflow-wrap: break-word;
	}

	.char {
		transition: all 0.2s ease;
		padding: 2px 6px;
		margin: -2px;
		border-radius: 3px;
	}

	.char.char-new {
		background: linear-gradient(135deg, #0ff3 0%, #f0f3 100%);
		color: #0ff;
		text-shadow: 0 0 8px #0ff8;
		border: 1px solid #0ff4;
	}

	.char.char-learning {
		background: linear-gradient(135deg, #f0f3 0%, #ff06 100%);
		color: #ff0;
		text-shadow: 0 0 8px #ff08;
		border: 1px solid #f0f4;
	}

	.char.char-new:hover {
		background: linear-gradient(135deg, #0ff5 0%, #f0f5 100%);
		transform: scale(1.15);
		cursor: pointer;
		box-shadow: 0 0 12px #0ff6;
	}

	.char.char-learning:hover {
		background: linear-gradient(135deg, #f0f5 0%, #ff08 100%);
		transform: scale(1.15);
		cursor: pointer;
		box-shadow: 0 0 12px #f0f6;
	}

	.no-transcript {
		color: var(--black-4);
		text-align: center;
		padding: 3rem;
		font-family: var(--body-font-family);
	}

	/* Inline Shortcuts Reference */
	.shortcuts-reference {
		margin-top: 2rem;
		padding: 2rem;
		background: var(--black-10);
		border-top: 1px solid var(--black-7);
	}

	.shortcuts-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 2rem;
		max-width: 800px;
		margin: 0 auto;
	}

	.shortcuts-reference .shortcut-group h4 {
		margin: 0 0 0.75rem;
		font-size: 0.625rem;
		text-transform: uppercase;
		color: var(--black-5);
		letter-spacing: 0.1em;
		font-weight: 600;
	}

	.shortcuts-reference .shortcut {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem 0;
		font-size: 0.75rem;
	}

	.shortcuts-reference .shortcut kbd {
		background: var(--black-8);
		border: 1px solid var(--black-7);
		border-radius: 4px;
		padding: 0.2rem 0.5rem;
		font-family: var(--body-font-family);
		font-size: 0.625rem;
		color: var(--black-3);
		min-width: 1.5rem;
		text-align: center;
	}

	.shortcuts-reference .shortcut span {
		color: var(--black-4);
	}

	/* Page Header */
	.page-header {
		padding: 3rem 2rem 2rem;
		border-bottom: 1px solid var(--black-7);
		background: linear-gradient(to bottom, var(--black-10), var(--black-9));
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-family: var(--body-font-family);
		font-size: 0.8125rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.channel-name {
		display: block;
		font-family: var(--body-font-family);
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--primary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.meta-divider {
		color: var(--black-6);
	}

	.date,
	.char-count {
		color: var(--black-4);
	}

	.video-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--white);
		margin: 0;
		line-height: 1.35;
	}

	/* Flying Character */
	.flying-char {
		position: fixed;
		font-size: 1.5rem;
		color: var(--primary);
		z-index: 1000;
		pointer-events: none;
		animation: fly-to-pool 0.4s ease-out forwards;
		left: var(--start-x);
		top: var(--start-y);
		transform: translate(-50%, -50%);
	}

	@keyframes fly-to-pool {
		0% {
			transform: translate(-50%, -50%) scale(1);
			opacity: 1;
		}
		50% {
			transform: translate(-50%, -50%) scale(1.2);
			opacity: 1;
		}
		100% {
			transform: translate(calc(-50% + 100px), calc(-50% - 150px)) scale(0.6);
			opacity: 0;
		}
	}

	/* Responsive - using syntax.fm breakpoints */
	@media (max-width: 900px) {
		.top-section {
			grid-template-columns: 1fr;
		}

		.top-section::before {
			display: none;
		}

		.pool-area {
			border-left: none;
			border-top: 1px solid var(--black-7);
			max-height: 200px;
		}

		.chinese {
			font-size: 1.375rem;
		}
	}

	@media (max-width: 700px) {
		.page-header {
			padding: 2rem 1rem 1.5rem;
		}

		.video-title {
			font-size: 1.25rem;
		}

		.controls-bar {
			flex-direction: column;
			align-items: stretch;
			gap: 0.75rem;
			padding: 0.75rem 1rem;
		}

		.controls-left,
		.controls-right {
			justify-content: center;
		}

		.speed-slider {
			width: 80px;
		}

		.toggle-btn {
			padding: 0.375rem 0.5rem;
			font-size: 0.7rem;
		}

		.video-area {
			padding: 1rem 0.5rem 2rem;
		}

		.transcript-section {
			padding: 1rem 0.5rem;
		}

		.line {
			padding: 0.5rem 0.75rem;
			gap: 0.5rem;
		}

		.line.current .chinese,
		.line.prev .chinese,
		.line.next .chinese {
			font-size: 1.5rem;
		}

		.shortcuts-grid {
			grid-template-columns: repeat(2, 1fr);
			gap: 1.5rem;
		}

		.shortcuts-reference {
			padding: 1.5rem 1rem;
		}
	}

	@media (max-width: 400px) {
		.video-title {
			font-size: 1.1rem;
		}

		.controls-right {
			flex-wrap: wrap;
			gap: 0.5rem;
		}

		.line.current .chinese,
		.line.prev .chinese,
		.line.next .chinese {
			font-size: 1.25rem;
			letter-spacing: 0.04em;
		}

		.shortcuts-grid {
			grid-template-columns: 1fr 1fr;
			gap: 1rem;
		}

		.shortcuts-reference .shortcut {
			font-size: 0.7rem;
		}

		.shortcuts-reference .shortcut kbd {
			font-size: 0.6rem;
			padding: 0.15rem 0.35rem;
		}
	}
</style>
