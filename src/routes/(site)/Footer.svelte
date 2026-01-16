<script lang="ts">
	import { CURRENT_YEAR } from '$const';
	import Icon from '$lib/Icon.svelte';
</script>

<footer class="layout zone" style:--bg="var(--bg-root)" style:--fg="var(--fg-1)">
	<div>
		<div class="grid">
			<div class="links-col">
				<a href="/videos">Videos</a>
				<a href="/about">About</a>
			</div>
			<div class="links-col">
				<a href="/privacy">Privacy Policy</a>
				<a href="/terms">Terms of Service</a>
			</div>
			<div class="links-col social-links">
				<a target="_blank" rel="noopener" href="https://x.com/nihaomL"><Icon name="x" /></a>
				<a target="_blank" rel="noopener" href="https://github.com/subphonica/nihao-ml"
					><Icon name="github" /></a
				>
				<a target="_blank" rel="noopener" href="https://discord.gg/nihaoml"
					><Icon name="discord" /></a
				>
				<a target="_blank" rel="noopener" href="https://www.youtube.com/@nihaoml"
					><Icon name="youtube" /></a
				>
				<a target="_blank" rel="noopener" href="https://www.tiktok.com/@nihaoml"
					><Icon name="tiktok" /></a
				>
				<a target="_blank" rel="noopener" href="https://www.instagram.com/nihaoml/"
					><Icon name="instagram" /></a
				>
			</div>
		</div>

		<div>
			<p>©️ {CURRENT_YEAR} - nihao.ml</p>
		</div>
	</div>
</footer>

<style lang="postcss">
	footer {
		padding: 2rem 0.5rem 5rem;
		@media (min-width: 1280px) {
			padding: 2rem 0 5rem;
		}
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 2rem;
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
			display: block;
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
		&:hover {
			text-decoration: underline;
			text-decoration-color: var(--primary);
		}
	}

	a[target='_blank']:after {
		content: ' ↗';
	}
</style>
