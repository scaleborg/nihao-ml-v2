<script lang="ts">
	import { CURRENT_YEAR } from '$const';
	import Icon from '$lib/Icon.svelte';
</script>

<footer class="layout zone" style:--bg="var(--bg-root)" style:--fg="var(--fg-1)">
	<div>
		<div class="grid">
			<div class="links-col">
				<a href="/dashboard">Dashboard</a>
				<a href="/about">About</a>
			</div>
			<div class="links-col">
				<a href="/system/colors">Colors</a>
				<a href="/system/layout">Layout</a>
				<a href="/system/typography">Typography</a>
				<a href="/system/theme">Theme</a>
			</div>
			<div class="links-col social-links">
				<a target="_blank" rel="noopener" href="https://github.com/subphonica/nihao-ml"
					><Icon name="github" /></a
				>
			</div>
		</div>

		<div>
			<p>&copy; {CURRENT_YEAR} nihao.ml</p>
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
</style>
