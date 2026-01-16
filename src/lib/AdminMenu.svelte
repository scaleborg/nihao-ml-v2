<script lang="ts">
	import { enhance } from '$app/forms';
	import { SideMenu } from '@leveluptuts/svelte-side-menu';
	import { form_action } from './form_action';
	import ThemeToggle from './theme/ThemeToggle.svelte';
</script>

<div class="admin-menu-left">
	<SideMenu
		top="40px"
		links={[
			{
				text: 'Admin'
			},
			{
				text: 'Dashboard',
				path: '/admin'
			},
			{
				text: 'Shows',
				path: '/admin/shows'
			},
			{
				text: 'Video',
				path: '/admin/videos'
			},
			{
				text: 'Video Import',
				path: '/admin/videos/import'
			},
			{
				text: 'Transcripts',
				path: '/admin/transcripts'
			},
			{
				text: 'Front End'
			},
			{
				text: 'Homepage',
				path: '/'
			},
			{
				text: 'Shows',
				path: '/podcast'
			}
		]}
	>
		<ThemeToggle />
		<div>
			<form action="/?/dump_cache" use:enhance={form_action()} method="POST">
				<button>Dump Cache</button>
			</form>
		</div>
	</SideMenu>
</div>

<style>
	.admin-menu-left :global(.side-menu) {
		right: auto;
		left: 0;
		transform: translate3d(-100%, 0, 0);
	}

	.admin-menu-left :global(.side-menu.active) {
		transform: translate3d(0, 0, 0) scale(1.05);
	}

	.admin-menu-left :global(.side-menu .nub) {
		right: auto;
		left: 100%;
		border-radius: 0 5px 5px 0;
	}

	.admin-menu-left :global(.side-menu-content) {
		border-left: none;
		border-right: solid 1px var(--toy-highlight);
		border-radius: 0 5px 5px 0;
	}
</style>
