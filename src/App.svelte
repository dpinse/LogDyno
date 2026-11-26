<script lang="ts">
	import Chart, { type Line } from './lib/Chart.svelte';
	import { dyno, resample, type DynoResult } from './lib/dyno';
	import { guessMapping, parseLog, toSamples, type Table } from './lib/parse';
	import { drawMarker, runColor, type Run } from './lib/run';
	import RunCard from './lib/RunCard.svelte';
	import { DYNOS, dynoFactor, parseSaved } from './lib/saved';
	import { synthLog, testVehicle } from './lib/synth';
	import { persist, saved } from './lib/state.svelte';
	import * as store from './lib/store';
	import Swatch from './lib/Swatch.svelte';
	import { POWER, TORQUE, grouped } from './lib/units';
	import VehicleDialog from './lib/VehicleDialog.svelte';

	let runs = $state<Run[]>([]);
	// Parsed logs stay out of reactive state: they are large and never change after loading.
	const tables = new Map<string, Table>();
	let problems = $state<string[]>([]);
	// Said once per visit: private windows and full disks refuse storage, and the work would vanish on reload without a word.
	let warned = false;
	function unsaved() {
		if (warned) return;
		warned = true;
		problems.push('This browser is not storing anything for this site (private window, storage turned off, or disk full). Runs, logs and vehicle changes will be gone when the page is closed or reloaded. Use Backup to keep your vehicles.');
	}
	let vehiclesOpen = $state(false);
	let dragging = $state(false);
	/** The run whose card or legend entry is pointed at; its lines are emphasised on every chart. */
	let focusRun = $state<string | null>(null);

	// Runs and their logs come back from the last visit. Nothing is drawn until that has been tried.
	let restored = $state(false);
	(async () => {
		try {
			for (const run of (await store.get<Run[]>('runs')) ?? []) {
				const table = await store.get<Table>(`table:${run.id}`);
				if (!table || typeof run?.id !== 'string' || !run.mapping) continue;
				run.mapping.speed ??= -1; // runs stored before the wheel speed column existed
				run.level = Math.min(5, Math.max(1, run.level)); // and before smoothing ran from 1 to 5
				tables.set(run.id, table);
				runs.push(run);
			}
		} catch {
			unsaved();
		}
		restored = true;
	})();
	$effect(() => {
		const snapshot = $state.snapshot(runs);
		if (restored) store.set('runs', snapshot).catch(unsaved);
	});
	let logPicker: HTMLInputElement | undefined = $state();
	let backupPicker: HTMLInputElement | undefined = $state();
	let mainChart: Chart | undefined = $state();
	let afrChart: Chart | undefined = $state();
	let boostChart: Chart | undefined = $state();

	const systemDark = matchMedia('(prefers-color-scheme: dark)');
	let prefersDark = $state(systemDark.matches);
	systemDark.addEventListener('change', (e) => (prefersDark = e.matches));
	const dark = $derived(saved.settings.theme === 'dark' || (saved.settings.theme === 'system' && prefersDark));

	$effect(() => {
		if (!persist()) unsaved();
	});
	$effect(() => {
		document.documentElement.dataset.theme = saved.settings.theme;
	});

	// The dyno scale is folded into the unit factors, so every figure, curve and export carries it.
	const factor = $derived(dynoFactor(saved.settings));
	const power = $derived({ ...POWER[saved.settings.power], k: POWER[saved.settings.power].k * factor });
	const torque = $derived({ ...TORQUE[saved.settings.torque], k: TORQUE[saved.settings.torque].k * factor });
	const scaleNote = $derived(factor === 1 ? '' : `${DYNOS[saved.settings.dyno].label} ×${factor.toFixed(2)}`);

	// shortcut: every run is recalculated on any change; cache per run if logs get large enough to lag.
	const results = $derived(
		runs.map((r): { res?: DynoResult; err?: string } => {
			const vehicle = saved.vehicles.find((v) => v.id === r.vehicleId);
			if (!vehicle) return { err: saved.vehicles.length ? 'Choose a vehicle for this run.' : 'Add a vehicle to calculate this run.' };
			if (!vehicle.gears[r.gear]) return { err: 'Choose a gear.' };
			try {
				const samples = toSamples(tables.get(r.id)!, r.mapping);
				return { res: dyno(samples, { vehicle, gearRatio: vehicle.gears[r.gear], tempC: r.tempC, pressurePa: r.pressurePa, sae: r.sae, level: r.level, rpmMin: r.rpmMin, rpmMax: r.rpmMax }) };
			} catch (e) {
				return { err: (e as Error).message };
			}
		})
	);

	const shown = $derived(runs.flatMap((run, i) => (run.show && results[i].res ? [{ run, res: results[i].res! }] : [])));

	/** A shared RPM axis every 25 rpm, so the readout can compare all runs at one engine speed. */
	const rpmAxis = $derived.by(() => {
		let lo = Infinity;
		let hi = -Infinity;
		for (const { res } of shown)
			for (const r of res.rpm) {
				if (r < lo) lo = r;
				if (r > hi) hi = r;
			}
		const axis: number[] = [];
		for (let r = Math.floor(lo / 25) * 25; r <= hi; r += 25) axis.push(r);
		return axis;
	});

	const mainLines = $derived(
		shown.flatMap(({ run, res }): Line[] => {
			const base = { id: run.id, label: run.title, color: runColor(run.color, dark), shape: run.color };
			return [
				{ ...base, unit: power.label, y: resample(res.rpm, res.powerW.map((w) => w * power.k), rpmAxis), peak: { x: res.peakPower.rpm, y: res.peakPower.value * power.k } },
				{ ...base, unit: torque.label, dash: true, right: true, y: resample(res.rpm, res.torqueNm.map((t) => t * torque.k), rpmAxis), peak: { x: res.peakTorque.rpm, y: res.peakTorque.value * torque.k } }
			];
		})
	);
	// Air-fuel ratio and boost get a chart each: on shared axes their lines braid together.
	const side = (pick: (res: DynoResult) => number[], unit: string) =>
		shown.flatMap(({ run, res }): Line[] => {
			const y = resample(res.rpm, pick(res), rpmAxis);
			return y.some((v) => v != null) ? [{ id: run.id, label: run.title, color: runColor(run.color, dark), shape: run.color, unit, y }] : [];
		});
	/** The boost unit as the logger wrote it, e.g. "Boost (psi)" gives "psi". */
	const boostUnit = $derived.by(() => {
		for (const { run } of shown) {
			const unit = tables.get(run.id)!.headers[run.mapping.boost]?.match(/[([]\s*([^)\]]+?)\s*[)\]]/)?.[1];
			if (unit) return unit;
		}
		return '';
	});
	const afrLines = $derived(side((res) => res.afr, 'AFR'));
	const boostLines = $derived(side((res) => res.boost, boostUnit));

	/** Axis top with headroom for the peak labels, on a round number. */
	function top(lines: Line[]) {
		const max = Math.max(1, ...lines.map((l) => l.peak?.y ?? 0));
		const step = 10 ** Math.floor(Math.log10(max)) / 4;
		return Math.ceil((max * 1.1) / step) * step;
	}
	const ranges = $derived.by((): { l: [number, number]; r: [number, number] } => {
		const p = top(mainLines.filter((l) => !l.right));
		const t = top(mainLines.filter((l) => l.right));
		// hp and lb-ft share a scale so the curves cross at 5,252 rpm, as people expect.
		const same = saved.settings.power === 'hp' && saved.settings.torque === 'lbft';
		return same ? { l: [0, Math.max(p, t)], r: [0, Math.max(p, t)] } : { l: [0, p], r: [0, t] };
	});

	async function addFiles(files: Iterable<File>) {
		problems = [];
		for (const file of files) {
			try {
				const table = parseLog(await file.text());
				const id = crypto.randomUUID();
				tables.set(id, table);
				store.set(`table:${id}`, table).catch(unsaved);
				const vehicle = saved.vehicles[0];
				runs.push({
					id,
					title: file.name.replace(/\.[^.]+$/, ''),
					mapping: { ...(saved.mappings[table.headers.join('|')] ?? guessMapping(table.headers)) },
					vehicleId: vehicle?.id ?? '',
					gear: Math.min(2, (vehicle?.gears.length ?? 1) - 1),
					color: runs.length ? Math.max(...runs.map((r) => r.color)) + 1 : 0,
					show: true,
					level: 2,
					rpmMin: null,
					rpmMax: null,
					tempC: 25,
					pressurePa: 99000,
					sae: false
				});
			} catch (e) {
				problems.push(`${file.name}: ${(e as Error).message}`);
			}
		}
	}

	function removeRun(i: number) {
		store.del(`table:${runs[i].id}`).catch(() => {});
		if (focusRun === runs[i].id) focusRun = null;
		tables.delete(runs[i].id);
		runs.splice(i, 1);
	}

	function download(blob: Blob, name: string) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		a.click();
		setTimeout(() => URL.revokeObjectURL(a.href), 1000);
	}

	async function restore(file: File | undefined) {
		if (!file) return;
		try {
			const backup = parseSaved(await file.text());
			if (saved.vehicles.length && !confirm('Replace your saved vehicles and settings with this backup?')) return;
			Object.assign(saved, backup);
			problems = [];
		} catch (e) {
			problems = [`${file.name}: ${(e as Error).message}`];
		}
	}

	/** A simulated pull, so a first-time visitor can see the screen working before finding a log. */
	function loadExample() {
		if (!saved.vehicles.length) saved.vehicles.push({ ...testVehicle, id: crypto.randomUUID(), name: 'Example car' });
		addFiles([new File([synthLog()], 'Example (synthetic data).csv')]);
	}

	/** One image that stands on its own: what it is, a line per run with its peaks and settings, then each chart with its title. */
	async function exportPng() {
		const parts = [
			{ chart: mainChart, title: 'Wheel power and torque', note: 'solid: power, dashed: torque', height: 520 },
			{ chart: afrLines.length ? afrChart : undefined, title: 'Air-fuel ratio', note: '', height: 220 },
			{ chart: boostLines.length ? boostChart : undefined, title: boostUnit ? `Boost (${boostUnit})` : 'Boost', note: '', height: 220 }
		].filter((p) => p.chart);
		if (!shown.length || !parts.length) return;
		// A fixed width, so the image is the same from a phone as from a desktop.
		const canvases = await Promise.all(parts.map((p) => p.chart!.snapshot(1200, p.height)));
		const px = devicePixelRatio;
		const style = getComputedStyle(document.body);
		const muted = getComputedStyle(document.querySelector('.quiet') ?? document.body).color;
		const text = (weight: number, size = 13) => (ctx.font = `${weight} ${size * px}px ${style.fontFamily}`);
		const header = (52 + shown.length * 22) * px;
		const out = document.createElement('canvas');
		out.width = canvases[0].width + 32 * px;
		out.height = header + canvases.reduce((h, c) => h + c.height + 44 * px, 0);
		const ctx = out.getContext('2d')!;
		ctx.fillStyle = style.backgroundColor;
		ctx.fillRect(0, 0, out.width, out.height);
		ctx.textBaseline = 'middle';
		// The same mark and wordmark as the top bar: this image is what other people see.
		ctx.fillStyle = '#e4421b';
		ctx.beginPath();
		ctx.moveTo(20 * px, 11 * px);
		ctx.lineTo(29 * px, 11 * px);
		ctx.lineTo(25 * px, 29 * px);
		ctx.lineTo(16 * px, 29 * px);
		ctx.fill();
		text(700, 16);
		ctx.fillStyle = style.color;
		ctx.fillText('LOGDYNO', 36 * px, 21 * px);
		const afterName = 46 * px + ctx.measureText('LOGDYNO').width;
		text(400);
		ctx.fillStyle = muted;
		ctx.fillText(`Wheel power and torque, estimated from data logs${scaleNote ? ` · ${scaleNote}` : ''}`, afterName, 20 * px);
		shown.forEach(({ run, res }, i) => {
			const y = (50 + i * 22) * px;
			const color = runColor(run.color, dark);
			const vehicle = saved.vehicles.find((v) => v.id === run.vehicleId)!;
			ctx.strokeStyle = color;
			ctx.lineWidth = 2 * px;
			ctx.beginPath();
			ctx.moveTo(16 * px, y);
			ctx.lineTo(40 * px, y);
			ctx.stroke();
			drawMarker(ctx, run.color, 28 * px, y, 4 * px, color, color);
			ctx.fillStyle = style.color;
			text(600);
			ctx.fillText(run.title, 48 * px, y);
			const x = 56 * px + ctx.measureText(run.title).width;
			text(400);
			ctx.fillText(
				`${grouped(res.peakPower.value * power.k)} ${power.label} @ ${grouped(res.peakPower.rpm)} rpm · ` +
					`${grouped(res.peakTorque.value * torque.k)} ${torque.label} @ ${grouped(res.peakTorque.rpm)} rpm · ` +
					`${vehicle.name}, gear ${run.gear + 1}, smoothing ${run.level}${run.sae ? ', SAE corrected' : ''}`,
				x,
				y
			);
		});
		let y = header;
		parts.forEach((part, i) => {
			text(600);
			ctx.fillStyle = style.color;
			ctx.fillText(part.title, 16 * px, y + 22 * px);
			const x = 28 * px + ctx.measureText(part.title).width;
			text(400, 12);
			ctx.fillStyle = muted;
			ctx.fillText(part.note, x, y + 22 * px);
			ctx.drawImage(canvases[i], 16 * px, y + 36 * px);
			y += canvases[i].height + 44 * px;
		});
		out.toBlob((blob) => blob && download(blob, 'logdyno.png'));
	}
</script>

<svelte:window
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={(e) => {
		if (!e.relatedTarget) dragging = false;
	}}
	ondrop={(e) => {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files.length) addFiles(e.dataTransfer.files);
	}}
/>

<header class="bar">
	<h1>LogDyno</h1>
	<div class="group">
		<select aria-label="Unit system" bind:value={saved.settings.system}>
			<option value="imperial">Imperial</option>
			<option value="metric">Metric</option>
		</select>
		<select aria-label="Power unit" bind:value={saved.settings.power}>
			{#each Object.entries(POWER) as [key, u]}<option value={key}>{u.label}</option>{/each}
		</select>
		<select aria-label="Torque unit" bind:value={saved.settings.torque}>
			{#each Object.entries(TORQUE) as [key, u]}<option value={key}>{u.label}</option>{/each}
		</select>
		<span class="scale">
			<select aria-label="Dyno scale" bind:value={saved.settings.dyno}>
			{#each Object.entries(DYNOS) as [key, d]}<option value={key}>{d.label}</option>{/each}
		</select>
		{#if saved.settings.dyno === 'custom'}
			<span aria-hidden="true">×</span>
			<input
				class="factor"
				type="number"
				step="0.01"
				min="0.5"
				max="1.5"
				aria-label="Custom scale factor"
				value={saved.settings.customScale.toFixed(2)}
				onchange={(e) => {
					const x = e.currentTarget.valueAsNumber;
					if (x >= 0.5 && x <= 1.5) saved.settings.customScale = x;
					else e.currentTarget.value = saved.settings.customScale.toFixed(2);
				}}
			/>
		{/if}
		</span>
	</div>
	<!-- A choice that differs from the system is kept; switching back to match it follows the system again. -->
	<button class="switch" role="switch" aria-checked={dark} onclick={() => (saved.settings.theme = !dark === prefersDark ? 'system' : dark ? 'light' : 'dark')}>
		<span class="track" aria-hidden="true"></span>
		Dark
	</button>
	<div class="group tools">
		<button class="btn" onclick={() => (vehiclesOpen = true)}>Vehicles</button>
		<button class="btn" disabled={!shown.length} onclick={exportPng}>Export PNG</button>
		<button class="btn" onclick={() => download(new Blob([JSON.stringify(saved, null, 2)], { type: 'application/json' }), 'logdyno-backup.json')}>Backup</button>
		<button class="btn" onclick={() => backupPicker?.click()}>Restore</button>
	</div>
	<button class="btn primary" onclick={() => logPicker?.click()}>Load logs</button>
	<input
		type="file"
		hidden
		multiple
		accept=".csv,.txt,.log,.tsv"
		bind:this={logPicker}
		onchange={(e) => {
			addFiles([...(e.currentTarget.files ?? [])]);
			e.currentTarget.value = '';
		}}
	/>
	<input
		type="file"
		hidden
		accept=".json,application/json"
		bind:this={backupPicker}
		onchange={(e) => {
			restore(e.currentTarget.files?.[0]);
			e.currentTarget.value = '';
		}}
	/>
</header>

{#if problems.length}
	<div class="problems" role="alert">
		<ul>
			{#each problems as p}<li>{p}</li>{/each}
		</ul>
		<button class="btn" onclick={() => (problems = [])}>Dismiss</button>
	</div>
{/if}

{#if !restored}
	<main></main>
{:else if runs.length}
	<main>
		<aside class="rail" aria-label="Runs">
			{#each runs as run, i (run.id)}
				<RunCard
					bind:run={runs[i]}
					headers={tables.get(run.id)!.headers}
					res={results[i].res}
					err={results[i].err}
					color={runColor(run.color, dark)}
					onremove={() => removeRun(i)}
					onmapping={() => (saved.mappings[tables.get(run.id)!.headers.join('|')] = { ...run.mapping })}
					onhover={(on) => (focusRun = on ? run.id : null)}
				/>
			{/each}
		</aside>
		<section class="charts">
			{#if shown.length}
				<div class="head">
					<h2>Wheel power and torque <small>estimated from the log{scaleNote ? ` · ${scaleNote}` : ''}</small></h2>
					{#each shown as { run }}
						<span class="key" role="presentation" onpointerenter={() => (focusRun = run.id)} onpointerleave={() => (focusRun = null)}>
							<Swatch color={runColor(run.color, dark)} shape={run.color} />{run.title}
						</span>
					{/each}
					<span class="key quiet"><svg width="20" height="12" aria-hidden="true"><line y1="6" y2="6" x2="20" stroke="currentColor" stroke-width="2" /></svg>Power</span>
					<span class="key quiet"><svg width="20" height="12" aria-hidden="true"><line y1="6" y2="6" x2="20" stroke="currentColor" stroke-width="2" stroke-dasharray="5 4" /></svg>Torque</span>
				</div>
				<Chart
					bind:this={mainChart}
					x={rpmAxis}
					lines={mainLines}
					left="Wheel power ({power.label})"
					right="Torque ({torque.label})"
					lRange={ranges.l}
					rRange={ranges.r}
					height={440}
					hint
					focus={focusRun}
					{dark}
					label="Wheel power and torque against RPM for {shown.length} run{shown.length === 1 ? '' : 's'}"
				/>
				<details class="values">
					<summary>Values as a table</summary>
					<table>
						<thead>
							<tr>
								<th scope="col">RPM</th>
								{#each mainLines as l}<th scope="col">{l.label} <small>{l.unit}</small></th>{/each}
							</tr>
						</thead>
						<tbody>
							{#each rpmAxis as rpm, i}
								{#if rpm % 250 === 0 && mainLines.some((l) => l.y[i] != null)}
									<tr>
										<th scope="row">{grouped(rpm)}</th>
										{#each mainLines as l}<td>{l.y[i] == null ? '' : grouped(l.y[i]!)}</td>{/each}
									</tr>
								{/if}
							{/each}
						</tbody>
					</table>
				</details>
				{#if afrLines.length}
					<div class="head sub"><h2>Air-fuel ratio</h2></div>
					<Chart bind:this={afrChart} x={rpmAxis} lines={afrLines} left="Air-fuel ratio" height={180} {dark} focus={focusRun} dp={1} label="Air-fuel ratio against RPM" />
				{/if}
				{#if boostLines.length}
					<div class="head sub"><h2>Boost{boostUnit ? ` (${boostUnit})` : ''}</h2></div>
					<Chart bind:this={boostChart} x={rpmAxis} lines={boostLines} left="Boost{boostUnit ? ` (${boostUnit})` : ''}" height={180} {dark} focus={focusRun} dp={1} label="Boost against RPM" />
				{/if}
			{:else}
				<p class="nothing">No run to draw yet. Each run on the left says what it still needs.</p>
			{/if}
		</section>
	</main>
{:else}
	<main class="empty">
		<div class="zone">
			<h2>Estimate wheel power from a data log</h2>
			<p>LogDyno reads a full-throttle pull in one gear and works out power and torque from how fast the engine speed rises. Your logs stay in this browser.</p>
			<ol>
				<li><b>Add your vehicle.</b> Weight, gear ratios, final drive and tire size.</li>
				<li><b>Load one or more logs.</b> CSV or text exports from any logger. Drop them here or anywhere on this page.</li>
				<li><b>Compare and export.</b> Overlay runs, then save the chart as an image.</li>
			</ol>
			<div class="actions">
				{#if saved.vehicles.length}
					<button class="btn primary" onclick={() => logPicker?.click()}>Load logs</button>
					<button class="btn" onclick={() => (vehiclesOpen = true)}>Edit vehicles</button>
				{:else}
					<button class="btn primary" onclick={() => (vehiclesOpen = true)}>Add a vehicle</button>
					<button class="btn" onclick={() => logPicker?.click()}>Load logs</button>
				{/if}
				<button class="btn" onclick={loadExample}>Try an example</button>
			</div>
		</div>
	</main>
{/if}

{#if dragging}<div class="drop" aria-hidden="true">Drop logs to load them</div>{/if}

<VehicleDialog bind:open={vehiclesOpen} onadd={(id) => runs.forEach((r) => (r.vehicleId ||= id))} />

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		min-height: 56px;
		padding: 12px 24px;
		/* The bar is the one fixed-colour surface: dark ink in both themes, so the red mark always sits on the same ground. */
		color-scheme: dark;
		--surface: #1b222c;
		--border: rgb(255 255 255 / 0.28);
		--muted: #aebbc5;
		--ink: #ffffff;
		--bg: #10151c;
		color: var(--ink);
		background: var(--bg);
		border-bottom: 1px solid #27272a;
	}
	.bar :global(.btn.primary) {
		color: #10151c;
		background: #ffffff;
		border-color: #ffffff;
	}
	h1 {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 auto 0 0;
		font-size: 20px;
		font-weight: 700;
		line-height: 24px;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}
	.switch {
		display: flex;
		flex: none;
		align-items: center;
		gap: 8px;
		height: 32px;
		padding: 0 4px;
		font-size: 13px;
		font-weight: 500;
		background: none;
		border: 0;
		border-radius: 6px;
		cursor: pointer;
	}
	.track {
		position: relative;
		width: 32px;
		height: 18px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 9px;
		transition: background-color 150ms;
	}
	.track::after {
		content: '';
		position: absolute;
		top: 2px;
		left: 2px;
		width: 12px;
		height: 12px;
		background: var(--ink);
		border-radius: 50%;
		transition: translate 150ms cubic-bezier(0.16, 1, 0.3, 1);
	}
	.switch[aria-checked='true'] .track {
		background: #ffffff;
		border-color: #ffffff;
	}
	.switch[aria-checked='true'] .track::after {
		translate: 14px;
		background: #10151c;
	}
	/* The mark: one red stroke leaning forward. */
	h1::before {
		content: '';
		width: 12px;
		height: 22px;
		background: #e4421b;
		transform: skewX(-12deg);
	}
	.bar .factor {
		width: 72px;
		height: 32px;
		font-size: 13px;
	}
	.bar select {
		width: auto;
		height: 32px;
		font-size: 13px;
	}
	.group {
		display: flex;
		gap: 8px;
	}
	.tools {
		padding-left: 16px;
		border-left: 1px solid var(--border);
	}
	/* The dyno scale and its custom factor stay together as one control. */
	.scale {
		display: flex;
		flex: none;
		align-items: center;
		gap: 6px;
	}
	.problems {
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 8px 24px;
		color: var(--danger);
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
	.problems ul {
		flex: 1;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	main {
		display: flex;
		align-items: flex-start;
	}
	.rail {
		display: flex;
		flex: none;
		flex-direction: column;
		gap: 10px;
		width: 360px;
		padding: 12px;
	}
	.charts {
		flex: 1;
		min-width: 0;
		padding: 20px 28px;
		position: sticky;
		top: 0;
	}
	.head {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px 16px;
		min-height: 32px;
		margin-bottom: 8px;
	}
	.head.sub {
		margin-top: 24px;
	}
	h2 {
		margin: 0 auto 0 0;
		font-size: 14px;
		font-weight: 600;
		letter-spacing: -0.02em;
	}
	h2 small {
		margin-left: 8px;
		font-size: 12px;
		font-weight: 400;
		letter-spacing: 0;
		color: var(--muted);
	}
	.key {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 12px;
	}
	.values {
		margin: 4px 0 0 48px;
		font-size: 12px;
		overflow-x: auto; /* several runs make the table wider than a phone */
	}
	.values summary {
		color: var(--muted);
		cursor: pointer;
	}
	.values table {
		margin-top: 8px;
		border-collapse: collapse;
	}
	.values th,
	.values td {
		padding: 2px 16px 2px 0;
		font-weight: 400;
		text-align: right;
		white-space: nowrap;
		border-bottom: 1px solid var(--border);
	}
	.values thead th {
		font-weight: 600;
	}
	.values small {
		font-size: inherit;
		color: var(--muted);
	}
	.quiet,
	.nothing {
		color: var(--muted);
	}
	.empty {
		justify-content: center;
		padding: 24px;
	}
	/* The whole first screen is the drop target, and looks like one. */
	.zone {
		width: min(100%, 720px);
		margin-top: 6vh;
		padding: 40px 48px;
		border: 1px dashed var(--muted);
		border-radius: 12px;
	}
	.empty h2 {
		font-size: 22px;
		line-height: 28px;
		text-wrap: balance;
	}
	.empty p,
	.empty ol {
		font-size: 14px;
		line-height: 22px;
		color: var(--muted);
	}
	.empty ol {
		padding-left: 20px;
	}
	.empty li {
		margin-top: 8px;
	}
	.empty b {
		font-weight: 600;
		color: var(--ink);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 24px;
	}
	.drop {
		position: fixed;
		inset: 12px;
		display: grid;
		place-items: center;
		font-size: 16px;
		font-weight: 600;
		background: color-mix(in srgb, var(--bg) 88%, transparent);
		border: 2px dashed var(--accent);
		border-radius: 12px;
		pointer-events: none;
	}
	@media (max-width: 900px) {
		/* Name and the main action on the first row; settings and tools as two full-width rows beneath. */
		.bar {
			display: grid;
			grid-template-columns: 1fr auto;
			padding: 12px;
		}
		.bar {
			grid-template-columns: 1fr auto auto;
		}
		.switch {
			grid-area: 1 / 2;
		}
		.bar .primary {
			grid-area: 1 / 3;
		}
		.group {
			grid-column: 1 / -1;
			flex-wrap: wrap;
		}
		.tools {
			padding-left: 0;
			border-left: 0;
		}
		.group > * {
			flex: 1;
			min-width: 0;
			padding-inline: 6px;
		}
		/* Selects size to their text so no option is cut off; the unit system takes the slack. */
		.group > select {
			flex: 1 0 auto; /* grow to fill the row, never shrink below the text, wrap instead */
		}
		.group > .scale {
			flex: 1 0 auto;
			padding-inline: 0;
		}
		.scale > select {
			flex: 1;
		}
		.values {
			margin-left: 0;
		}
		.zone {
			margin-top: 0;
			padding: 24px 20px;
		}
		main {
			flex-direction: column;
			align-items: stretch;
		}
		.rail {
			width: auto;
		}
		.charts {
			order: -1;
			position: static;
			padding: 12px;
		}
	}
</style>
