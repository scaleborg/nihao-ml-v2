<script lang="ts">
	import type { Video } from '@prisma/client';

	interface Props {
		video: Video;
	}

	let { video }: Props = $props();
</script>

<div>
	<a href={`/watch/${video.slug}`}>
		{#if video.thumbnail}
			<img src={video.thumbnail} class="thumbnail" alt={video.title} />
		{/if}
		<h3 class="h6">{video.title}</h3>
	</a>
</div>

<style lang="postcss">
	a {
		display: grid;
		grid-template-rows: auto 1fr;
		gap: 10px;
	}

	.h6 {
		margin-top: 0;
	}

	.thumbnail {
		overflow: hidden;
		border-radius: var(--brad);
	}

	img {
		width: 100%;
	}
</style>
