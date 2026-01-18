<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';

	interface Props {
		character: string;
		size?: number;
	}

	let { character, size = 150 }: Props = $props();

	let container: HTMLDivElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let writer: any = null;
	let is_animating = $state(false);

	onMount(async () => {
		if (!browser) return;

		// Load hanzi-writer from CDN
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const win = window as any;
		if (!win.HanziWriter) {
			await new Promise<void>((resolve, reject) => {
				const script = document.createElement('script');
				script.src = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js';
				script.onload = () => resolve();
				script.onerror = reject;
				document.head.appendChild(script);
			});
		}

		writer = win.HanziWriter.create(container, character, {
			width: size,
			height: size,
			padding: 5,
			strokeAnimationSpeed: 1,
			delayBetweenStrokes: 200,
			strokeColor: '#ffffff',
			radicalColor: '#cdff5c',
			outlineColor: '#333333',
			drawingColor: '#cdff5c'
		});
	});

	onDestroy(() => {
		writer = null;
	});

	function animate() {
		if (writer && !is_animating) {
			is_animating = true;
			writer.animateCharacter();
			// Reset after animation completes (rough estimate)
			setTimeout(() => {
				is_animating = false;
			}, 2000);
		}
	}

	// Re-create writer when character changes
	$effect(() => {
		if (writer && character) {
			writer.setCharacter(character);
		}
	});
</script>

<div class="stroke-container">
	<div bind:this={container} class="hanzi-canvas"></div>
	<button class="animate-btn" onclick={animate} disabled={is_animating}>
		{is_animating ? 'Playing...' : 'Animate'}
	</button>
</div>

<style>
	.stroke-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
	}

	.hanzi-canvas {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.animate-btn {
		padding: 0.375rem 1rem;
		font-size: 0.75rem;
		font-family: var(--body-font-family);
		background: var(--black-7);
		color: var(--black-3);
		border: 1px solid var(--black-6);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.animate-btn:hover:not(:disabled) {
		background: var(--black-6);
		color: var(--white);
	}

	.animate-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
