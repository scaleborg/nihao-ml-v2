<script lang="ts">
	import './style.css';
	import 'media-chrome';
	import 'youtube-video-element';
	import { Toaster } from 'svelte-french-toast';
	import { onNavigate } from '$app/navigation';
	// import Player from '$lib/player/Player.svelte'; // Disabled - needs refactoring for Video
	import Footer from './Footer.svelte';
	import Header from './Header.svelte';
	import Loading from '$lib/Loading.svelte';
	import { browser } from '$app/environment';
	import SearchBox from '$lib/search/SearchBox.svelte';
	import Meta from '$lib/meta/Meta.svelte';
	import AdminMenu from '$lib/AdminMenu.svelte';
	import ThemeMaker from '../../params/ThemeMaker.svelte';
	import PageLoadingIndicator from '$lib/page_loading_indicator.svelte';
	import { page } from '$app/stores';

	let { data, children } = $props();
	let { user, user_theme } = $derived(data);

	onNavigate(async (navigation) => {
		if (!document.startViewTransition) return;

		return new Promise((oldStateCaptureResolve) => {
			document.startViewTransition(async () => {
				oldStateCaptureResolve();
				await navigation.complete;
			});
		});
	});
</script>

<Meta />
<a href="#main-content" class="skip-to-main-content">Skip to main content</a>
<PageLoadingIndicator />

<div class={'theme-' + user_theme + ' theme-wrapper'}>
	{#if $page.url.pathname !== '/'}
		<Header />
	{/if}

	<main
		id="main-content"
		class="page-layout layout zone"
		style:--bg="var(--bg-sheet)"
		style:--fg="var(--fg-sheet)"
	>
		{@render children?.()}
	</main>

	<Footer />

	<ThemeMaker />

	<!-- Player disabled - needs Video data to be loaded -->
	<!-- {#if browser && initialVideo}
		<Player initial_show={initialVideo} />
	{/if} -->

	<Toaster />
	<Loading />

	{#if browser}
		<SearchBox />
	{/if}

	{#if user?.roles?.includes('admin')}
		<AdminMenu />
	{/if}
</div>

<style lang="postcss">
	:global(.theme-wrapper) {
		--bg-root: var(--bg);
		--fg-root: var(--fg);
		min-height: 100vh;
		border-top: var(--border);
		border-color: var(--primary);
	}

	.page-layout {
		margin: 0 auto;
	}

	.skip-to-main-content {
		position: absolute;
		top: -1000px;
		left: -1000px;
		z-index: 1000;
		background-color: var(--primary);
		color: var(--bg);
		padding: 0.5rem;
		&:focus {
			top: 0;
			left: 0;
		}
	}

	@media (min-width: 1280px) {
		.page-layout {
			grid-auto-flow: column;
			grid-template-rows: 1fr;
		}
	}
</style>
