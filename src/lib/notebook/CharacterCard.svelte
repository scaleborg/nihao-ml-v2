<script lang="ts">
	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	interface Props {
		character: CharacterData;
		familiarity: number;
		state: number;
		onclick: () => void;
	}

	let { character, familiarity, state, onclick }: Props = $props();

	function get_status(): 'new' | 'learning' | 'known' {
		if (familiarity === 5) return 'known';
		if (state === 0) return 'new';
		return 'learning';
	}

	let status = $derived(get_status());
</script>

<button
	class="card"
	class:new={status === 'new'}
	class:learning={status === 'learning'}
	class:known={status === 'known'}
	{onclick}
>
	<div class="char">{character.id}</div>
	<div class="pinyin">{character.pinyin}</div>
	<div class="dots">
		{#each [1, 2, 3, 4, 5] as level}
			<span class="dot" class:filled={familiarity >= level}></span>
		{/each}
	</div>
	{#if character.hsk_level}
		<div class="hsk">HSK {character.hsk_level}</div>
	{/if}
</button>

<style>
	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--black-8);
		border: 1px solid var(--black-7);
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.card:hover {
		transform: translateY(-2px);
		border-color: var(--black-6);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.card.new {
		border-left: 3px solid #3b82f6;
	}

	.card.learning {
		border-left: 3px solid var(--primary);
	}

	.card.known {
		border-left: 3px solid #22c55e;
	}

	.char {
		font-size: 2.5rem;
		line-height: 1;
		color: var(--white);
	}

	.pinyin {
		font-size: 0.875rem;
		color: var(--black-3);
		font-family: var(--body-font-family);
	}

	.dots {
		display: flex;
		gap: 0.25rem;
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--black-6);
		transition: background 0.15s ease;
	}

	.dot.filled {
		background: var(--primary);
	}

	.hsk {
		font-size: 0.625rem;
		font-family: var(--body-font-family);
		color: var(--black-5);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
