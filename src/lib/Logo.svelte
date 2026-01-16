<script lang="ts">
	interface Props {
		height?: number | string;
	}

	let { height = '100%' }: Props = $props();
</script>

<div class="logo" style:height>
	<span class="text">ni<br />hao.</span>
</div>

<style>
	.logo {
		mask-image: url('$assets/Grit Mask@2x.png');
		mask-repeat: repeat;
		mask-size: 250px;
		height: 100%;
		display: flex;
		align-items: center;
	}

	.text {
		font-family: var(--heading-font-family);
		font-weight: 900;
		font-size: 2rem;
		line-height: 0.95;
		color: var(--logo-color, var(--primary, #fabf46));
	}
</style>
