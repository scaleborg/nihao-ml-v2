<script lang="ts">
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let { videos, users } = $derived(data);
</script>

<div class="actions">
	<a href="/admin/import" class="btn">Import Video</a>
</div>

<h2 class="h5">Recent Videos ({videos.length})</h2>

{#if videos.length === 0}
	<p>No videos imported yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Title</th>
				<th>Channel</th>
				<th>Status</th>
				<th>Added</th>
			</tr>
		</thead>
		<tbody>
			{#each videos as video}
				<tr>
					<td>
						<a href="/video/{video.slug}">{video.title}</a>
					</td>
					<td>{video.channel_name || '-'}</td>
					<td>{video.is_public ? 'Public' : 'Private'}</td>
					<td>{new Date(video.created_at).toLocaleDateString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<h2 class="h5" style="margin-top: 2rem;">Recent Users ({users.length})</h2>

{#if users.length === 0}
	<p>No users yet.</p>
{:else}
	<table>
		<thead>
			<tr>
				<th>Username</th>
				<th>Provider</th>
				<th>Joined</th>
			</tr>
		</thead>
		<tbody>
			{#each users as user}
				<tr>
					<td>{user.username || user.email || 'Unknown'}</td>
					<td>{user.github_id ? 'GitHub' : user.google_id ? 'Google' : 'OAuth'}</td>
					<td>{new Date(user.created_at).toLocaleDateString()}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}

<style>
	.actions {
		margin-bottom: 2rem;
	}

	.btn {
		display: inline-flex;
		align-items: center;
		padding: 0.75rem 1.25rem;
		background: var(--primary);
		color: white;
		text-decoration: none;
		border-radius: 8px;
		font-weight: 600;
		transition: opacity 0.2s;
	}

	.btn:hover {
		opacity: 0.9;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th,
	td {
		text-align: left;
		padding: 0.5rem;
		border-bottom: 1px solid var(--bg-1);
	}

	th {
		font-weight: 600;
	}

	a {
		color: var(--primary);
	}

	a:hover {
		text-decoration: underline;
	}
</style>
