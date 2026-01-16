<script lang="ts">
	interface Props {
		unique_chars: string[];
		user_characters: Record<string, { familiarity: number; state: number }>;
		is_authenticated: boolean;
		on_mark_all_known: () => void;
	}

	let { unique_chars, user_characters, is_authenticated, on_mark_all_known }: Props = $props();

	let stats = $derived.by(() => {
		let new_count = 0;
		let learning_count = 0;
		let known_count = 0;

		for (const char of unique_chars) {
			const uc = user_characters[char];
			if (!uc) {
				new_count++;
			} else if (uc.familiarity === 5) {
				known_count++;
			} else {
				learning_count++;
			}
		}

		return { new_count, learning_count, known_count };
	});

	let show_confirm = $state(false);

	function handle_mark_all() {
		if (show_confirm) {
			on_mark_all_known();
			show_confirm = false;
		} else {
			show_confirm = true;
		}
	}

	function cancel_confirm() {
		show_confirm = false;
	}
</script>

<div class="word-stats">
	<div class="stats-row">
		<span class="stat stat-new">
			<span class="dot"></span>
			New: {stats.new_count}
		</span>
		<span class="divider">|</span>
		<span class="stat stat-learning">
			<span class="dot"></span>
			Learning: {stats.learning_count}
		</span>
		<span class="divider">|</span>
		<span class="stat stat-known">
			<span class="dot"></span>
			Known: {stats.known_count}
		</span>
	</div>

	{#if is_authenticated && stats.new_count + stats.learning_count > 0}
		<div class="actions">
			{#if show_confirm}
				<span class="confirm-text">Mark all as known?</span>
				<button class="confirm-btn yes" onclick={handle_mark_all}>Yes</button>
				<button class="confirm-btn no" onclick={cancel_confirm}>No</button>
			{:else}
				<button class="mark-all-btn" onclick={handle_mark_all}>Mark all as known</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	.word-stats {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.75rem;
		background: var(--bg-0);
		border-radius: 8px;
		margin-bottom: 0.75rem;
		font-size: 0.8125rem;
	}

	.stats-row {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		flex-wrap: wrap;
	}

	.stat {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--fg-2);
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
	}

	.stat-new .dot {
		background: #3b82f6;
	}

	.stat-learning .dot {
		background: var(--yellow-3, #fbbf24);
	}

	.stat-known .dot {
		background: #22c55e;
	}

	.divider {
		color: var(--bg-2);
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.mark-all-btn {
		padding: 0.375rem 0.75rem;
		font-size: 0.75rem;
		background: transparent;
		border: 1px solid var(--bg-2);
		border-radius: 4px;
		color: var(--fg-2);
		cursor: pointer;
		transition: all 0.15s;
	}

	.mark-all-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.confirm-text {
		font-size: 0.75rem;
		color: var(--fg-2);
	}

	.confirm-btn {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
	}

	.confirm-btn.yes {
		background: #22c55e;
		color: white;
	}

	.confirm-btn.no {
		background: var(--bg-2);
		color: var(--fg-2);
	}
</style>
