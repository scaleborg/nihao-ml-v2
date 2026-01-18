<script lang="ts">
	import { clickOutside } from '$actions/click_outside';
	import StrokeAnimation from './StrokeAnimation.svelte';

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
		next_review: Date | string | null;
		[key: string]: unknown;
	}

	interface Props {
		character: CharacterData;
		user_character: UserCharacter;
		onclose: () => void;
		onfamiliaritychange: (char_id: string, level: number) => void;
	}

	let { character, user_character, onclose, onfamiliaritychange }: Props = $props();

	let is_playing_audio = $state(false);

	async function play_audio() {
		if (is_playing_audio) return;

		is_playing_audio = true;
		try {
			const response = await fetch(`/api/character/${character.id}/audio`);
			if (response.ok) {
				const blob = await response.blob();
				const url = URL.createObjectURL(blob);
				const audio = new Audio(url);
				audio.onended = () => {
					is_playing_audio = false;
					URL.revokeObjectURL(url);
				};
				audio.onerror = () => {
					is_playing_audio = false;
					URL.revokeObjectURL(url);
				};
				audio.play();
			} else {
				is_playing_audio = false;
			}
		} catch {
			is_playing_audio = false;
		}
	}

	function handle_familiarity_click(level: number) {
		onfamiliaritychange(character.id, level);
	}

	function handle_known_click() {
		onfamiliaritychange(character.id, 5);
	}

	function get_next_review_text(): string {
		if (!user_character.next_review) return 'Not scheduled';
		const date =
			user_character.next_review instanceof Date
				? user_character.next_review
				: new Date(user_character.next_review);
		const now = new Date();
		const diff = date.getTime() - now.getTime();

		if (diff <= 0) return 'Due now';
		if (diff < 60 * 60 * 1000) return `${Math.ceil(diff / (60 * 1000))}m`;
		if (diff < 24 * 60 * 60 * 1000) return `${Math.ceil(diff / (60 * 60 * 1000))}h`;
		return `${Math.ceil(diff / (24 * 60 * 60 * 1000))}d`;
	}
</script>

<div class="overlay">
	<div class="detail-panel" use:clickOutside onclick-outside={onclose}>
		<button class="close-btn" onclick={onclose}>
			<span class="close-icon">×</span>
		</button>

		<header class="detail-header">
			<span class="char-large">{character.id}</span>
			<div class="header-right">
				<span class="pinyin">{character.pinyin}</span>
				<button
					class="audio-btn"
					onclick={play_audio}
					disabled={is_playing_audio}
					title="Play pronunciation"
				>
					{is_playing_audio ? '...' : '🔊'}
				</button>
			</div>
		</header>

		<div class="stroke-section">
			<StrokeAnimation character={character.id} />
		</div>

		<div class="definition-section">
			<p class="definition">{character.definition}</p>
		</div>

		<div class="meta-section">
			{#if character.hsk_level}
				<span class="meta-tag">HSK {character.hsk_level}</span>
			{/if}
			{#if character.stroke_count}
				<span class="meta-tag">{character.stroke_count} strokes</span>
			{/if}
			{#if character.radical}
				<span class="meta-tag">Radical: {character.radical}</span>
			{/if}
		</div>

		<div class="familiarity-section">
			<div class="familiarity-header">
				<span class="section-label">Familiarity</span>
				<span class="next-review">Next: {get_next_review_text()}</span>
			</div>
			<div class="familiarity-controls">
				<div class="familiarity-dots">
					{#each [1, 2, 3, 4, 5] as level}
						<button
							class="dot-btn"
							class:filled={user_character.familiarity >= level}
							onclick={() => handle_familiarity_click(level)}
							title="Level {level}"
						>
							{user_character.familiarity >= level ? '●' : '○'}
						</button>
					{/each}
				</div>
				<button class="known-btn" onclick={handle_known_click}> Known </button>
			</div>
		</div>
	</div>
</div>

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.detail-panel {
		position: relative;
		width: 100%;
		max-width: 400px;
		max-height: 90vh;
		overflow-y: auto;
		background: var(--black-8);
		border: 1px solid var(--black-6);
		border-radius: 12px;
		padding: 1.5rem;
	}

	.close-btn {
		position: absolute;
		top: 0.75rem;
		right: 0.75rem;
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--black-4);
		cursor: pointer;
		transition: color 0.15s;
	}

	.close-btn:hover {
		color: var(--white);
	}

	.close-icon {
		font-size: 1.5rem;
		line-height: 1;
	}

	.detail-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.char-large {
		font-size: 4rem;
		line-height: 1;
		color: var(--white);
	}

	.header-right {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.pinyin {
		font-size: 1.25rem;
		color: var(--black-3);
	}

	.audio-btn {
		padding: 0.375rem 0.625rem;
		font-size: 1rem;
		background: var(--black-7);
		border: 1px solid var(--black-6);
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.audio-btn:hover:not(:disabled) {
		background: var(--black-6);
	}

	.audio-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.stroke-section {
		display: flex;
		justify-content: center;
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: var(--black-9);
		border-radius: 8px;
	}

	.definition-section {
		margin-bottom: 1rem;
	}

	.definition {
		font-size: 1rem;
		line-height: 1.5;
		color: var(--black-2);
		margin: 0;
	}

	.meta-section {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.meta-tag {
		padding: 0.25rem 0.625rem;
		font-size: 0.75rem;
		background: var(--black-7);
		color: var(--black-4);
		border-radius: 4px;
	}

	.familiarity-section {
		padding-top: 1rem;
		border-top: 1px solid var(--black-7);
	}

	.familiarity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.section-label {
		font-size: 0.75rem;
		color: var(--black-4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.next-review {
		font-size: 0.75rem;
		color: var(--black-5);
	}

	.familiarity-controls {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.familiarity-dots {
		display: flex;
		gap: 0.375rem;
	}

	.dot-btn {
		background: transparent;
		border: none;
		color: var(--black-5);
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0.25rem;
		transition: color 0.15s;
	}

	.dot-btn:hover {
		color: var(--primary);
	}

	.dot-btn.filled {
		color: var(--primary);
	}

	.known-btn {
		padding: 0.375rem 1rem;
		font-size: 0.875rem;
		font-family: var(--body-font-family);
		background: #22c55e;
		color: white;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.known-btn:hover {
		background: #16a34a;
	}
</style>
