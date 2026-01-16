<script lang="ts">
	import type { Video } from '@prisma/client';
	import PlaylistVideo from './PlaylistVideo.svelte';

	interface Props {
		title: string;
		videos: Video[];
	}

	let { title, videos }: Props = $props();
</script>

<article class="card">
	<p class="date">
		{videos.length} Videos
	</p>

	<h3>{title}</h3>

	<div class="grid playlist-grid">
		{#each videos as video}
			<PlaylistVideo {video} />
		{/each}
	</div>
</article>

<style lang="postcss">
	article {
		--bg: var(--bg-1);
		container: show-card / inline-size;
		display: grid;
		padding: 20px;
		background-color: var(--bg);
		background-image: var(--bg-grit);
		position: relative;
		overflow: hidden;
		align-items: start;
		& a {
			display: flex;
			gap: 10px;
		}

		&:hover {
			background-color: color-mix(in lch, var(--fg), var(--bg) 96%);
		}
		&.card {
			border-radius: var(--brad);
			border: solid var(--border-size) var(--subtle);
		}
		.playlist-grid {
			display: grid;
			grid-gap: 20px;
			grid-template-columns: 1fr;
			@media (--above-med) {
				grid-template-columns: repeat(3, minmax(190px, 1fr));
			}
		}

		@media (--below-med) {
			padding: 10px;
		}
	}

	h3 {
		view-transition-name: var(--transition-name);
		margin: 0;
		font-size: var(--font-size-lg);
		line-height: 1.2;
		text-shadow:
			1px 0 0 var(--bg),
			0 1px 0 var(--bg),
			-1px 0 0 var(--bg),
			0 -1px 0 var(--bg);
	}

	.date {
		font-size: var(--font-size-sm);
		margin: 0;
		view-transition-name: var(--transition-name);
		width: max-content;
		@media (prefers-color-scheme: dark) {
			background: var(--bg);
		}
		text-shadow: 2px 1px 0px var(--bg);
	}
</style>
