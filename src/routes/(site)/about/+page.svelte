<script lang="ts">
	let { data } = $props();
</script>

<main style:margin-bottom="2rem">
	<div style:margin-bottom="2rem">
		<h1 class="h3 lines">About nihao.ml</h1>
		<p>
			nihao.ml is a Chinese learning platform that helps you learn Mandarin from real content like
			YouTube videos.
		</p>

		<h2 class="h4" style="margin-top: 2rem;">How it works</h2>

		<ol>
			<li>
				<strong>Import videos</strong> - Paste a YouTube URL with Chinese captions
			</li>
			<li>
				<strong>Study with synced transcripts</strong> - Watch videos with pinyin and character breakdowns
			</li>
			<li>
				<strong>Review with spaced repetition</strong> - Master characters using the FSRS algorithm
			</li>
		</ol>

		<h2 class="h4" style="margin-top: 2rem;">Features</h2>

		<ul>
			<li>Automatic pinyin generation</li>
			<li>Character deep-dive with stroke order</li>
			<li>Vocabulary tracking</li>
			<li>Spaced repetition flashcards</li>
			<li>Import your own YouTube videos</li>
		</ul>

		<p style="margin-top: 2rem;">Built with SvelteKit, Prisma, and powered by Claude AI.</p>
	</div>
</main>

<style>
	ol,
	ul {
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	li {
		margin-bottom: 0.5rem;
	}
</style>
