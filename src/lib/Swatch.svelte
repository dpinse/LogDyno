<script lang="ts">
	import { markerPoints } from './run';

	let { color, shape, dash = false }: { color: string; shape: number; dash?: boolean } = $props();
	const pts = $derived(markerPoints(shape, 4));
</script>

<svg width="24" height="12" viewBox="-12 -6 24 12" aria-hidden="true">
	<line x1="-12" x2="12" stroke={color} stroke-width="2" stroke-dasharray={dash ? '5 4' : undefined} />
	{#if pts}
		<polygon points={pts.map((p) => p.join(',')).join(' ')} fill={color} />
	{:else}
		<circle r="4" fill={color} />
	{/if}
</svg>

<style>
	svg {
		flex: none;
	}
</style>
