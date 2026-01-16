<script lang="ts">
	// This component needs to be rebuilt for the new Video/TranscriptLine schema
	// The old Syntax.fm transcript system has been removed
	import type { Video } from '@prisma/client';

	interface Props {
		video?: Video;
	}

	let { video }: Props = $props();
</script>

<div class="transcript-placeholder">
	{#if video}
		<p>Transcript for: {video.title}</p>
		<p class="note">Transcript viewer coming soon</p>
	{:else}
		<p class="note">No video selected</p>
	{/if}
</div>

<style>
	.transcript-placeholder {
		padding: 2rem;
		text-align: center;
		color: var(--fg, #666);
	}
	.note {
		opacity: 0.6;
		font-size: 0.9rem;
	}
</style>
