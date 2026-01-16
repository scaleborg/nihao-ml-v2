<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	interface Props {
		form: ActionData;
	}

	let { form }: Props = $props();
	let loading = $state(false);
</script>

<svelte:head>
	<title>Import Video | Nihao.ml Admin</title>
</svelte:head>

<div class="import-page">
	<header>
		<a href="/admin" class="back-link">← Back to Admin</a>
		<h1>Import Video</h1>
		<p class="description">
			Paste a YouTube URL to import a video with Chinese captions. The system will automatically
			fetch the Chinese subtitles and generate pinyin for each line.
		</p>
	</header>

	{#if form?.error}
		<div class="error">
			{form.error}
		</div>
	{/if}

	<form
		method="POST"
		use:enhance={() => {
			loading = true;
			return async ({ update }) => {
				loading = false;
				await update();
			};
		}}
	>
		<div class="field">
			<label for="url">YouTube URL</label>
			<input
				type="url"
				id="url"
				name="url"
				placeholder="https://www.youtube.com/watch?v=..."
				value={form?.url ?? ''}
				required
				disabled={loading}
			/>
			<span class="hint">Supports youtube.com/watch, youtu.be, and embed URLs</span>
		</div>

		<div class="field checkbox">
			<label>
				<input type="checkbox" name="is_public" disabled={loading} />
				<span>Make public</span>
			</label>
			<span class="hint"
				>Public videos appear in the browse list. Leave unchecked for personal imports.</span
			>
		</div>

		<button type="submit" disabled={loading}>
			{#if loading}
				<span class="spinner"></span>
				Importing...
			{:else}
				Import Video
			{/if}
		</button>
	</form>

	<section class="tips">
		<h2>Tips for finding videos with Chinese captions</h2>
		<ul>
			<li>Look for videos from Chinese language learning channels</li>
			<li>Chinese vlogs often have community-contributed subtitles</li>
			<li>Music videos with lyrics may have Chinese captions</li>
			<li>Filter YouTube search by "Subtitles/CC" to find captioned content</li>
		</ul>
	</section>
</div>

<style>
	.import-page {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	header {
		margin-bottom: 2rem;
	}

	.back-link {
		color: var(--fg-2);
		text-decoration: none;
		font-size: 0.875rem;
	}

	.back-link:hover {
		color: var(--primary);
	}

	h1 {
		margin: 0.5rem 0;
		font-size: 1.75rem;
	}

	.description {
		color: var(--fg-2);
		line-height: 1.5;
	}

	.error {
		background: var(--error-bg, #fee2e2);
		color: var(--error-fg, #dc2626);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field.checkbox {
		flex-direction: row;
		flex-wrap: wrap;
		align-items: center;
	}

	.field.checkbox label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.field.checkbox .hint {
		width: 100%;
		margin-left: 1.5rem;
	}

	label {
		font-weight: 500;
	}

	input[type='url'] {
		padding: 0.75rem 1rem;
		border: 2px solid var(--bg-2);
		border-radius: 8px;
		font-size: 1rem;
		background: var(--bg-0);
		color: var(--fg-0);
	}

	input[type='url']:focus {
		outline: none;
		border-color: var(--primary);
	}

	input[type='url']:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	input[type='checkbox'] {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--primary);
	}

	.hint {
		font-size: 0.875rem;
		color: var(--fg-2);
	}

	button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.2s;
	}

	button:hover:not(:disabled) {
		opacity: 0.9;
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid white;
		border-top-color: transparent;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.tips {
		margin-top: 3rem;
		padding: 1.5rem;
		background: var(--bg-1);
		border-radius: 8px;
	}

	.tips h2 {
		font-size: 1rem;
		margin-bottom: 1rem;
	}

	.tips ul {
		margin: 0;
		padding-left: 1.25rem;
	}

	.tips li {
		color: var(--fg-2);
		line-height: 1.6;
	}
</style>
