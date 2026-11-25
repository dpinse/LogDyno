<script lang="ts">
	import type { DynoResult } from './dyno';
	import Num from './Num.svelte';
	import { ROLES, type Role } from './parse';
	import type { Run } from './run';
	import { dynoFactor } from './saved';
	import { saved } from './state.svelte';
	import Swatch from './Swatch.svelte';
	import { POWER, TORQUE, grouped } from './units';

	let {
		run = $bindable(),
		headers,
		res,
		err,
		color,
		onremove,
		onmapping,
		onhover
	}: {
		run: Run;
		headers: string[];
		res?: DynoResult;
		err?: string;
		color: string;
		onremove: () => void;
		onmapping: () => void;
		/** Pointer or keyboard focus entered (true) or left (false) this card. */
		onhover: (on: boolean) => void;
	} = $props();

	const ROLE_LABEL: Record<Role, string> = { time: 'Time', rpm: 'RPM', tps: 'Throttle', afr: 'Air-fuel', boost: 'Boost' };
	const vehicle = $derived(saved.vehicles.find((v) => v.id === run.vehicleId));
	const factor = $derived(dynoFactor(saved.settings));
	const power = $derived({ ...POWER[saved.settings.power], k: POWER[saved.settings.power].k * factor });
	const torque = $derived({ ...TORQUE[saved.settings.torque], k: TORQUE[saved.settings.torque].k * factor });
	const ordinal = (n: number) => `${n}${['th', 'st', 'nd', 'rd'][n % 10 > 3 || (n > 10 && n < 14) ? 0 : n % 10]}`;
</script>

<article
	class="run"
	onpointerenter={() => onhover(true)}
	onpointerleave={() => onhover(false)}
	onfocusin={() => onhover(true)}
	onfocusout={() => onhover(false)}
>
	<header>
		<Swatch {color} shape={run.color} />
		<input class="title" aria-label="Run name" bind:value={run.title} />
		<label class="chk"><input type="checkbox" bind:checked={run.show} /> Show</label>
		<button class="icon" aria-label="Remove {run.title}" onclick={onremove}>
			<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
		</button>
	</header>

	{#if res}
		<div class="peaks">
			<div><b>{grouped(res.peakPower.value * power.k)}</b> {power.label}<span>@ {grouped(res.peakPower.rpm)} rpm</span></div>
			<div><b>{grouped(res.peakTorque.value * torque.k)}</b> {torque.label}<span>@ {grouped(res.peakTorque.rpm)} rpm</span></div>
		</div>
	{:else}
		<p class="err" role="status">{err}</p>
	{/if}

	<div class="grid">
		<label class="f">
			<span>Vehicle</span>
			<select bind:value={run.vehicleId}>
				{#if !vehicle}<option value="">Choose…</option>{/if}
				{#each saved.vehicles as v}<option value={v.id}>{v.name}</option>{/each}
			</select>
		</label>
		<label class="f">
			<span>Gear</span>
			<select bind:value={run.gear} disabled={!vehicle}>
				{#each vehicle?.gears ?? [] as ratio, i}<option value={i}>{ordinal(i + 1)} · {ratio}</option>{/each}
			</select>
		</label>
		<label class="f">
			<span>Smoothing <output>{run.level}</output></span>
			<input type="range" min="0" max="10" bind:value={run.level} />
		</label>
		<div class="f">
			<span>RPM trim</span>
			<div class="pair">
				<input type="number" step="100" placeholder="from" aria-label="RPM trim from" bind:value={run.rpmMin} />
				<input type="number" step="100" placeholder="to" aria-label="RPM trim to" bind:value={run.rpmMax} />
			</div>
		</div>
		<Num label="Air temperature" q="temp" bind:value={run.tempC} />
		<Num label="Air pressure" q="pressure" bind:value={run.pressurePa} />
	</div>
	<label class="chk"><input type="checkbox" bind:checked={run.sae} /> Correct to SAE standard conditions</label>

	<details>
		<summary>Columns</summary>
		<div class="grid cols">
			{#each ROLES as role}
				<label class="f">
					<span>{ROLE_LABEL[role]}</span>
					<select bind:value={run.mapping[role]} onchange={onmapping}>
						<option value={-1}>None</option>
						{#each headers as h, i}<option value={i}>{h}</option>{/each}
					</select>
				</label>
			{/each}
		</div>
	</details>
</article>

<style>
	.run {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 12px 14px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 8px;
	}
	.run:focus-within {
		border-color: var(--accent);
	}
	header {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.title {
		flex: 1;
		min-width: 0;
		height: 24px;
		padding: 0 4px;
		margin-left: -4px;
		border-color: transparent;
		background: none;
		font-size: 13px;
		font-weight: 600;
		letter-spacing: -0.01em;
	}
	.title:hover {
		border-color: var(--border);
	}
	.peaks b {
		font-size: 20px;
		font-weight: 500;
		line-height: 24px;
		letter-spacing: -0.02em;
	}
	.peaks span {
		display: block;
		font-size: 12px;
		line-height: 16px;
		color: var(--muted);
	}
	.err {
		margin: 0;
		font-size: 12px;
		line-height: 18px;
		color: var(--danger);
	}
	.peaks,
	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px 12px;
	}
	.pair {
		display: flex;
		gap: 4px;
	}
	.cols {
		margin-top: 8px;
	}
	summary {
		font-size: 12px;
		line-height: 18px;
		color: var(--muted);
		cursor: pointer;
	}
</style>
