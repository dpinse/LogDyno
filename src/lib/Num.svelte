<script lang="ts">
	import { saved } from './state.svelte';
	import { Q, type Quantity } from './units';

	let { value = $bindable(), label, q, dp = 3, min = 0 }: { value: number; label: string; q?: Quantity; dp?: number; min?: number } = $props();

	const unit = $derived(q ? Q[q][saved.settings.system] : { label: '', k: 1, off: 0, dp });
	const shown = $derived(+(value * unit.k + unit.off).toFixed(unit.dp));

	function change(e: Event & { currentTarget: HTMLInputElement }) {
		const si = (e.currentTarget.valueAsNumber - unit.off) / unit.k;
		// A blank or negative entry would poison every result and the saved data, so put the old value back.
		if (Number.isFinite(si) && (q === 'temp' || si >= min)) value = si;
		else e.currentTarget.value = String(shown);
	}
</script>

<label class="f">
	<span>{label}{#if unit.label}&nbsp;<small>{unit.label}</small>{/if}</span>
	<input type="number" step="any" value={shown} onchange={change} />
</label>
