<script lang="ts">
	import { CURRENT_YEAR } from '$const';
	import Icon from '$lib/Icon.svelte';
</script>

<footer class="layout zone" style:--bg="var(--bg-root)" style:--fg="var(--fg-1)">
	<div>
		<div class="grid">
			<div class="links-col">
				<a href="/videos">Videos</a>
				<a href="/dashboard">Dashboard</a>
				<a href="/about">About</a>
			</div>
			<div class="links-col">
				<a href="https://github.com/subphonica/nihao-ml" target="_blank" rel="noopener"
					>Source Code ↗</a
				>
				<a href="/system/colors">Colors</a>
				<a href="/system/layout">Layout</a>
				<a href="/system/typography">Typography</a>
				<a href="/system/theme">Theme</a>
				<a href="/privacy">Privacy Policy</a>
				<a href="/terms">Terms of Service</a>
			</div>
			<div class="links-col social-links">
				<a target="_blank" rel="noopener" href="https://github.com/subphonica/nihao-ml"
					><Icon name="github" /> ↗</a
				>
			</div>
		</div>

		<div class="copyright">
			<p>&copy; {CURRENT_YEAR} - nihao.ml</p>
		</div>
	</div>
</footer>

<style lang="postcss">
	footer {
		padding: 2rem 0.5rem 5rem;
		background-image: url($assets/whitegrit.png);
		background-size: 269px;
		@media (min-width: 1280px) {
			padding: 2rem 0 5rem;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 2rem;
		margin-bottom: 2rem;
	}

	.links-col {
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.social-links {
		flex-direction: row;
		align-items: flex-start;
		a {
			display: flex;
			align-items: center;
			gap: 0.25rem;
		}
		a:after {
			content: '';
		}
		a:hover {
			color: var(--accent);
		}
	}

	a {
		color: var(--fg);
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		&:hover {
			text-decoration: underline;
			text-decoration-color: var(--primary);
		}
	}

	.copyright {
		margin-top: 2rem;
		p {
			color: var(--fg-2);
			font-size: 0.875rem;
		}
	}
</style>
