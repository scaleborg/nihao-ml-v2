<script lang="ts">
	import { clickOutside } from '$actions/click_outside';

	interface CharacterData {
		id: string;
		pinyin: string;
		definition: string;
		hsk_level: number | null;
		radical: string | null;
		stroke_count: number | null;
	}

	interface Props {
		character: string;
		data: CharacterData | null;
		loading: boolean;
		error: string | null;
		position: { x: number; y: number };
		onclose: () => void;
	}

	let { character, data, loading, error, position, onclose }: Props = $props();

	function getHskColor(level: number): string {
		const colors: Record<number, string> = {
			1: '#22c55e',
			2: '#84cc16',
			3: '#eab308',
			4: '#f97316',
			5: '#ef4444',
			6: '#dc2626'
		};
		return colors[level] || '#6b7280';
	}
</script>

<div
	class="popup"
	style="left: {position.x}px; top: {position.y}px;"
	use:clickOutside
	onclick-outside={onclose}
>
	<div class="popup-content">
		{#if loading}
			<div class="loading">
				<span class="char">{character}</span>
				<span class="loading-text">Loading...</span>
			</div>
		{:else if error}
			<div class="error">
				<span class="char">{character}</span>
				<span class="error-text">{error}</span>
			</div>
		{:else if data}
			<div class="success">
				<div class="header">
					<span class="char">{data.id}</span>
					{#if data.hsk_level}
						<span class="hsk-badge" style="background: {getHskColor(data.hsk_level)}">
							HSK {data.hsk_level}
						</span>
					{/if}
				</div>
				<div class="pinyin">{data.pinyin}</div>
				<div class="definition">{data.definition}</div>
				{#if data.radical || data.stroke_count}
					<div class="meta">
						{#if data.radical}
							<span>Radical: {data.radical}</span>
						{/if}
						{#if data.stroke_count}
							<span>Strokes: {data.stroke_count}</span>
						{/if}
					</div>
				{/if}
			</div>
		{:else}
			<div class="not-found">
				<span class="char">{character}</span>
				<span class="not-found-text">Character not in dictionary</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.popup {
		position: fixed;
		transform: translateX(-50%);
		z-index: 1000;
		min-width: 200px;
		max-width: 300px;
	}

	.popup-content {
		background: var(--bg-1);
		border: 1px solid var(--bg-2);
		border-radius: 8px;
		padding: 0.75rem 1rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
	}

	.char {
		font-size: 2rem;
		line-height: 1.2;
		display: block;
	}

	.loading,
	.error,
	.not-found {
		text-align: center;
	}

	.loading-text,
	.not-found-text {
		display: block;
		font-size: 0.875rem;
		color: var(--fg-2);
		margin-top: 0.25rem;
	}

	.error-text {
		display: block;
		font-size: 0.875rem;
		color: #ef4444;
		margin-top: 0.25rem;
	}

	.success {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.hsk-badge {
		font-size: 0.625rem;
		font-weight: 600;
		color: white;
		padding: 0.125rem 0.375rem;
		border-radius: 4px;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		white-space: nowrap;
	}

	.pinyin {
		font-size: 1rem;
		color: var(--primary);
	}

	.definition {
		font-size: 0.875rem;
		color: var(--fg-1);
		line-height: 1.4;
	}

	.meta {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--fg-2);
		padding-top: 0.25rem;
		border-top: 1px solid var(--bg-2);
	}
</style>
