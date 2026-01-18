<script lang="ts">
	interface Stats {
		total: number;
		new: number;
		learning: number;
		known: number;
	}

	interface Props {
		stats: Stats;
	}

	let { stats }: Props = $props();

	let known_percentage = $derived(
		stats.total > 0 ? Math.round((stats.known / stats.total) * 100) : 0
	);
	let learning_percentage = $derived(
		stats.total > 0 ? Math.round((stats.learning / stats.total) * 100) : 0
	);
	let new_percentage = $derived(stats.total > 0 ? Math.round((stats.new / stats.total) * 100) : 0);
</script>

<div class="stats-container">
	<div class="stats-header">
		<h2 class="stats-title">Your Progress</h2>
	</div>

	<div class="stats-overview">
		<div class="stat-card total">
			<span class="stat-number">{stats.total}</span>
			<span class="stat-name">Total Characters</span>
		</div>
		<div class="stat-card known">
			<span class="stat-number">{stats.known}</span>
			<span class="stat-name">Known</span>
		</div>
		<div class="stat-card learning">
			<span class="stat-number">{stats.learning}</span>
			<span class="stat-name">Learning</span>
		</div>
		<div class="stat-card new">
			<span class="stat-number">{stats.new}</span>
			<span class="stat-name">New</span>
		</div>
	</div>

	<div class="progress-section">
		<h3 class="section-title">Status Breakdown</h3>
		<div class="progress-bar">
			{#if known_percentage > 0}
				<div class="progress-segment known" style="width: {known_percentage}%">
					{#if known_percentage >= 10}
						<span class="segment-label">{known_percentage}%</span>
					{/if}
				</div>
			{/if}
			{#if learning_percentage > 0}
				<div class="progress-segment learning" style="width: {learning_percentage}%">
					{#if learning_percentage >= 10}
						<span class="segment-label">{learning_percentage}%</span>
					{/if}
				</div>
			{/if}
			{#if new_percentage > 0}
				<div class="progress-segment new" style="width: {new_percentage}%">
					{#if new_percentage >= 10}
						<span class="segment-label">{new_percentage}%</span>
					{/if}
				</div>
			{/if}
		</div>
		<div class="progress-legend">
			<span class="legend-item"><span class="legend-dot known"></span> Known</span>
			<span class="legend-item"><span class="legend-dot learning"></span> Learning</span>
			<span class="legend-item"><span class="legend-dot new"></span> New</span>
		</div>
	</div>
</div>

<style>
	.stats-container {
		max-width: 600px;
	}

	.stats-header {
		margin-bottom: 1.5rem;
	}

	.stats-title {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 1.25rem;
		font-weight: 500;
		color: var(--white);
		margin: 0;
	}

	.stats-overview {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1rem;
		margin-bottom: 2rem;
	}

	@media (width < 700px) {
		.stats-overview {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 1.25rem 1rem;
		background: var(--black-8);
		border-radius: 8px;
		border-left: 3px solid;
	}

	.stat-card.total {
		border-left-color: var(--white);
	}

	.stat-card.known {
		border-left-color: #22c55e;
	}

	.stat-card.learning {
		border-left-color: var(--primary);
	}

	.stat-card.new {
		border-left-color: #3b82f6;
	}

	.stat-number {
		font-family: 'Space Grotesk', system-ui, sans-serif;
		font-size: 2rem;
		font-weight: 700;
		color: var(--white);
	}

	.stat-name {
		font-size: 0.75rem;
		color: var(--black-4);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-top: 0.25rem;
	}

	.progress-section {
		background: var(--black-8);
		border-radius: 8px;
		padding: 1.5rem;
	}

	.section-title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--black-3);
		margin: 0 0 1rem;
	}

	.progress-bar {
		display: flex;
		height: 24px;
		background: var(--black-7);
		border-radius: 4px;
		overflow: hidden;
	}

	.progress-segment {
		display: flex;
		align-items: center;
		justify-content: center;
		transition: width 0.3s ease;
	}

	.progress-segment.known {
		background: #22c55e;
	}

	.progress-segment.learning {
		background: var(--primary);
	}

	.progress-segment.new {
		background: #3b82f6;
	}

	.segment-label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--black-10);
	}

	.progress-legend {
		display: flex;
		gap: 1.5rem;
		margin-top: 1rem;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--black-4);
	}

	.legend-dot {
		width: 10px;
		height: 10px;
		border-radius: 2px;
	}

	.legend-dot.known {
		background: #22c55e;
	}

	.legend-dot.learning {
		background: var(--primary);
	}

	.legend-dot.new {
		background: #3b82f6;
	}
</style>
