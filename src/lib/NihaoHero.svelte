<script lang="ts">
	import Header from '../routes/(site)/Header.svelte';

	interface Props {
		user?: { roles?: string[] } | null;
	}

	let { user }: Props = $props();
</script>

<section
	aria-label="Hero Section"
	style:--bg="var(--black)"
	style:--fg="var(--fg-1)"
	class="zone full layout"
>
	<Header transparent={true} />
	<div class="hero">
		<div class="logo">
			<a href="/">
				<span class="logo-text">nihao<span class="dot">.ml</span></span>
			</a>
		</div>
		<h2 class="text-center">Learn Chinese from Real Content</h2>
		<p class="subtitle">Watch videos, study characters, track your progress</p>
		<div class="cta-buttons">
			{#if user}
				<a href="/admin/import" class="button primary">Import Video</a>
				<a href="/dashboard" class="button secondary">Dashboard</a>
			{:else}
				<a href="/login" class="button primary">Get Started</a>
				<a href="/about" class="button secondary">Learn More</a>
			{/if}
		</div>
		<div class="features-row">
			<div class="feature-pill">
				<span class="icon">📺</span>
				<span>YouTube Videos</span>
			</div>
			<div class="feature-pill">
				<span class="icon">📝</span>
				<span>Synced Transcripts</span>
			</div>
			<div class="feature-pill">
				<span class="icon">🀄</span>
				<span>Character Learning</span>
			</div>
		</div>
	</div>
</section>

<style lang="postcss">
	section {
		background-image:
			url($assets/whitegrit.png),
			radial-gradient(
				farthest-side circle at 50% 0%,
				var(--hero-gradient-1, hsl(240, 10%, 12%)) 4%,
				var(--hero-gradient-2, hsl(240, 10%, 4%)) 100%
			);
		background-size: 269px, 30%;
	}

	.hero {
		display: grid;
		place-items: center;
		gap: 20px;
		padding-top: 20px;
		align-content: space-around;
	}

	.logo {
		margin: 0 auto;
	}

	.logo a {
		text-decoration: none;
	}

	.logo-text {
		font-family: var(--font-family-heading, system-ui);
		font-size: clamp(3rem, 10vw, 5rem);
		font-weight: 900;
		color: var(--primary, #fabf46);
		display: block;
		line-height: 1;
		text-align: center;
		mask-image: url('$assets/Grit Mask@2x.png');
		mask-repeat: repeat;
		mask-size: 250px;
		-webkit-mask-image: url('$assets/Grit Mask@2x.png');
		-webkit-mask-repeat: repeat;
		-webkit-mask-size: 250px;
	}

	.dot {
		color: var(--primary, #fabf46);
	}

	h2 {
		text-wrap: balance;
		max-width: 850px;
		margin: 0 auto;
	}

	.highlight {
		color: var(--primary, #fabf46);
	}

	.subtitle {
		font-size: 1.125rem;
		color: var(--fg-2, rgba(255, 255, 255, 0.7));
		margin: 0;
		text-align: center;
	}

	.cta-buttons {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.button {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.75rem;
		border-radius: 50px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
	}

	.button.primary {
		background: var(--primary, #fabf46);
		color: var(--black, #000);
	}

	.button.primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 20px rgba(250, 191, 70, 0.4);
	}

	.button.secondary {
		background: rgba(255, 255, 255, 0.1);
		color: var(--fg-1, white);
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.button.secondary:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.features-row {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.feature-pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1rem;
		background: rgba(255, 255, 255, 0.06);
		border-radius: 50px;
		font-size: 0.875rem;
		color: var(--fg-2, rgba(255, 255, 255, 0.8));
	}

	.icon {
		font-size: 1rem;
	}

	.zone {
		padding-bottom: 2rem;
	}
</style>
