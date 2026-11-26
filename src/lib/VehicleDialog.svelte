<script lang="ts">
	import { tireDiameterM } from './dyno';
	import Num from './Num.svelte';
	import { newVehicle } from './saved';
	import { saved } from './state.svelte';
	import { Q } from './units';

	let { open = $bindable(), onadd }: { open: boolean; onadd: (id: string) => void } = $props();

	let dialog: HTMLDialogElement | undefined = $state();
	let selected = $state(saved.vehicles[0]?.id ?? '');
	let tire = $state({ width: 225, aspect: 40, rim: 18 });
	const index = $derived(saved.vehicles.findIndex((v) => v.id === selected));
	const tireUnit = $derived(Q.tire[saved.settings.system]);
	const tireSize = $derived(tireDiameterM(tire.width, tire.aspect, tire.rim));
	const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10]}`;

	$effect(() => {
		if (open) dialog?.showModal();
		else dialog?.close();
	});

	function add() {
		const v = newVehicle();
		saved.vehicles.push(v);
		selected = v.id;
		onadd(v.id);
	}

	function remove() {
		const v = saved.vehicles[index];
		if (!confirm(`Delete "${v.name}"? Runs using it will need another vehicle.`)) return;
		saved.vehicles.splice(index, 1);
		selected = saved.vehicles[0]?.id ?? '';
	}

	function gear(g: number, e: Event & { currentTarget: HTMLInputElement }) {
		const ratio = e.currentTarget.valueAsNumber;
		// A blank or zero ratio would break every run in that gear, so put the old value back.
		if (Number.isFinite(ratio) && ratio > 0) saved.vehicles[index].gears[g] = ratio;
		else e.currentTarget.value = String(saved.vehicles[index].gears[g]);
	}
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="vehicles-title">
	<header>
		<h2 id="vehicles-title">Vehicles</h2>
		<button class="btn" onclick={() => (open = false)}>Done</button>
	</header>
	<div class="body">
		<nav aria-label="Saved vehicles">
			{#each saved.vehicles as v}
				<button class="item" aria-current={v.id === selected} onclick={() => (selected = v.id)}>{v.name || 'Unnamed'}</button>
			{/each}
			<button class="btn" onclick={add}>Add vehicle</button>
		</nav>
		{#if index >= 0}
			<form onsubmit={(e) => e.preventDefault()}>
				<label class="f wide"><span>Name</span><input bind:value={saved.vehicles[index].name} /></label>
				<Num label="Weight" q="mass" min={1} bind:value={saved.vehicles[index].massKg} />
				<Num label="Driver and cargo" q="mass" bind:value={saved.vehicles[index].occupantKg} />
				<fieldset class="wide">
					<legend>Gear ratios</legend>
					<div class="gears">
						{#each saved.vehicles[index].gears as ratio, g}
							<label class="f"><span>{ordinal(g + 1)}</span><input type="number" step="any" value={ratio} onchange={(e) => gear(g, e)} /></label>
						{/each}
					</div>
					<div class="gear-count">
						<button class="btn" onclick={() => saved.vehicles[index].gears.push(1)}>Add a gear</button>
						<button class="btn" disabled={saved.vehicles[index].gears.length < 2} onclick={() => saved.vehicles[index].gears.pop()}>Remove last gear</button>
					</div>
				</fieldset>
				<Num label="Final drive ratio" min={0.01} bind:value={saved.vehicles[index].finalDrive} />
				<Num label="Tire diameter" q="tire" min={0.01} bind:value={saved.vehicles[index].tireDiameterM} />
				<fieldset class="wide">
					<legend>Or work it out from the size on the sidewall, e.g. 225/40 R18</legend>
					<div class="tire">
						<label class="f"><span>Width <small>mm</small></span><input type="number" bind:value={tire.width} /></label>
						<label class="f"><span>Aspect <small>%</small></span><input type="number" bind:value={tire.aspect} /></label>
						<label class="f"><span>Rim <small>in</small></span><input type="number" bind:value={tire.rim} /></label>
						<button class="btn" disabled={!(tireSize > 0)} onclick={() => (saved.vehicles[index].tireDiameterM = tireSize)}>
							Use {tireSize > 0 ? (tireSize * tireUnit.k).toFixed(tireUnit.dp) : '…'} {tireUnit.label}
						</button>
					</div>
				</fieldset>
				<Num label="Drag coefficient (Cd)" min={0.01} bind:value={saved.vehicles[index].cd} />
				<Num label="Frontal area" q="area" min={0.01} bind:value={saved.vehicles[index].frontalAreaM2} />
				<Num label="Rolling resistance" bind:value={saved.vehicles[index].crr} />
				<p class="hint wide">
					Weight, gearing and tire size move the result the most. Cd, frontal area and rolling resistance matter more the faster the pull.
				</p>
				<button class="btn danger" onclick={remove}>Delete vehicle</button>
			</form>
		{:else}
			<p class="hint empty">
				A vehicle holds the numbers the calculation needs: weight, gear ratios, final drive and tire size. Add one, then choose it on each run.
			</p>
		{/if}
	</div>
</dialog>

<style>
	dialog {
		width: min(720px, calc(100vw - 32px));
		max-height: calc(100dvh - 32px);
		padding: 0;
		color: var(--ink);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		box-shadow: 0 16px 48px -12px rgb(0 0 0 / 0.3);
	}
	dialog::backdrop {
		background: rgb(0 0 0 / 0.4);
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}
	h2 {
		margin: 0;
		font-size: 16px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	.body {
		display: grid;
		grid-template-columns: 200px 1fr;
	}
	nav {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 12px;
		border-right: 1px solid var(--border);
	}
	.item {
		height: 32px;
		padding: 0 10px;
		border: 0;
		border-radius: 6px;
		background: none;
		text-align: left;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		cursor: pointer;
	}
	.item:hover,
	.item[aria-current='true'] {
		background: var(--bg);
	}
	.item[aria-current='true'] {
		font-weight: 600;
	}
	nav .btn {
		margin-top: 8px;
	}
	form {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px 16px;
		align-content: start;
		padding: 20px;
	}
	.wide {
		grid-column: 1 / -1;
	}
	.gears {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
		gap: 8px;
		margin-top: 8px;
	}
	.gear-count {
		display: flex;
		gap: 8px;
		margin-top: 8px;
	}
	.tire {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr auto;
		gap: 8px;
		align-items: end;
		margin-top: 8px;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		padding: 0;
		font-size: 12px;
		color: var(--muted);
	}
	.hint {
		margin: 0;
		font-size: 12px;
		line-height: 18px;
		color: var(--muted);
		max-width: 60ch;
	}
	.empty {
		padding: 20px;
	}
	.danger {
		justify-self: start;
		color: var(--danger);
	}
	@media (max-width: 600px) {
		.body {
			grid-template-columns: 1fr;
		}
		nav {
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}
	}
</style>
