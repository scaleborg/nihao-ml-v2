<script lang="ts">
	import CharacterCard from './CharacterCard.svelte';
	import Pagination from '$lib/Pagination.svelte';

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	interface UserCharacter {
		id: string;
		familiarity: number;
		state: number;
		character: CharacterData;
		[key: string]: unknown;
	}

	interface Props {
		characters: UserCharacter[];
		page: number;
		total_count: number;
		perPage: number;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		onselect: (char: CharacterData, user_char: any) => void;
	}

	let { characters, page, total_count, perPage, onselect }: Props = $props();
</script>

{#if characters.length === 0}
	<div class="empty">
		<p class="empty-title">No characters yet</p>
		<p class="empty-text">
			Start studying videos and tap on characters to add them to your notebook.
		</p>
	</div>
{:else}
	<div class="grid">
		{#each characters as uc (uc.id)}
			<CharacterCard
				character={uc.character}
				familiarity={uc.familiarity}
				state={uc.state}
				onclick={() => onselect(uc.character, uc)}
			/>
		{/each}
	</div>

	<div class="pagination-wrapper">
		<Pagination {page} count={total_count} {perPage} />
	</div>
{/if}

<style>
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		text-align: center;
	}

	.empty-title {
		font-size: 1.25rem;
		color: var(--white);
		margin: 0 0 0.5rem;
	}

	.empty-text {
		font-size: 0.875rem;
		color: var(--black-4);
		margin: 0;
		max-width: 300px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
		gap: 1rem;
	}

	@media (width < 700px) {
		.grid {
			grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
			gap: 0.75rem;
		}
	}

	.pagination-wrapper {
		margin-top: 2rem;
	}
</style>
