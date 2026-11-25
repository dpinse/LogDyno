<script lang="ts" module>
	export interface Line {
		/** The run this line belongs to; lines of one run share it. */
		id: string;
		label: string;
		unit: string;
		color: string;
		shape: number;
		dash?: boolean;
		right?: boolean;
		y: (number | null)[];
		peak?: { x: number; y: number };
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import uPlot from 'uplot';
	import 'uplot/dist/uPlot.min.css';
	import { drawMarker } from './run';
	import Swatch from './Swatch.svelte';
	import { grouped } from './units';

	let {
		x,
		lines,
		left,
		right = '',
		lRange,
		rRange,
		height,
		dark,
		dp = 0,
		hint = false,
		focus = null,
		label
	}: {
		x: number[];
		lines: Line[];
		left: string;
		right?: string;
		lRange?: [number, number];
		rRange?: [number, number];
		height: number;
		dark: boolean;
		dp?: number;
		/** Show how-to text while nothing is pointed at. One chart on the page is enough. */
		hint?: boolean;
		/** A run id to emphasise; every other run is dimmed. */
		focus?: string | null;
		label: string;
	} = $props();

	// Canvas cannot read CSS variables; keep these in step with the tokens in app.css.
	const LIGHT = { ink: '#0A0A0A', muted: '#71717A', grid: '#EDEDF0', bg: '#FAFAFA' };
	const DARK = { ink: '#FAFAFA', muted: '#A1A1AA', grid: '#1F1F23', bg: '#0A0A0B' };
	const FONT = '"Geist Variable", system-ui, sans-serif';

	let el: HTMLDivElement | undefined = $state();
	let width = $state(0);
	let hover = $state<number | null>(null);
	let plot: uPlot | undefined;
	const alpha = (l: Line, f: string | null) => (!f || l.id === f ? 1 : 0.18);

	function decorate(u: uPlot, bg: string, ink: string) {
		const { ctx } = u;
		const px = devicePixelRatio;
		ctx.save();
		ctx.font = `500 ${11 * px}px ${FONT}`;
		ctx.textAlign = 'center';
		ctx.lineJoin = 'round';
		const peaks: { l: Line; X: number; Y: number }[] = [];
		const f = untrack(() => focus);
		for (const l of lines) {
			ctx.globalAlpha = alpha(l, f);
			const scale = l.right ? 'r' : 'l';
			let last = l.y.length - 1;
			while (last >= 0 && l.y[last] == null) last--;
			// A filled marker ends each line and a hollow one sits on its peak, so runs differ by shape as well as colour.
			if (last >= 0) drawMarker(ctx, l.shape, u.valToPos(x[last], 'x', true), u.valToPos(l.y[last]!, scale, true), 4 * px, l.color, l.color);
			if (!l.peak) continue;
			const X = u.valToPos(l.peak.x, 'x', true);
			const Y = u.valToPos(l.peak.y, scale, true);
			drawMarker(ctx, l.shape, X, Y, 4 * px, bg, l.color);
			peaks.push({ l, X, Y });
		}
		// Figures go on last, over every line and marker, each on an opaque plate.
		const placed: { x: number; y: number; half: number }[] = [];
		ctx.globalAlpha = 1;
		for (const { l, X, Y } of peaks) {
			if (alpha(l, f) < 1) continue; // a dimmed run keeps its line but drops its figure
			const text = `${grouped(l.peak!.y)} ${l.unit}`;
			// The run's marker rides in the plate, since the figure itself is ink.
			const half = ctx.measureText(text).width / 2 + 11 * px;
			// Close runs peak close together: lift a label until it clears the ones already drawn.
			let ty = Y - 10 * px;
			while (placed.some((b) => Math.abs(b.x - X) < b.half + half && Math.abs(b.y - ty) < 14 * px)) ty -= 14 * px;
			placed.push({ x: X, y: ty, half });
			ctx.fillStyle = bg;
			ctx.fillRect(X - half, ty - 11 * px, half * 2, 14 * px);
			ctx.textBaseline = 'middle';
			drawMarker(ctx, l.shape, X - half + 7 * px, ty - 4 * px, 3 * px, l.color, l.color);
			ctx.fillStyle = ink;
			ctx.fillText(text, X + 7 * px, ty - 4 * px);
		}
		ctx.restore();
	}

	function build(target: HTMLElement, w: number, h: number, live: boolean) {
		const c = dark ? DARK : LIGHT;
		const font = `11px ${FONT}`;
		const axis = (o: uPlot.Axis): uPlot.Axis => ({
			stroke: c.muted,
			font,
			labelFont: font,
			labelSize: 20,
			size: 48,
			grid: { stroke: c.grid, width: 1 },
			ticks: { show: false },
			values: (_u, ticks) => ticks.map((n) => n.toLocaleString('en-US')),
			...o
		});
		const hasRight = lines.some((l) => l.right);
		return new uPlot(
			{
				width: w,
				height: h,
				legend: { show: false },
				cursor: live ? { y: false, drag: { x: true, y: false }, sync: { key: 'rpm' } } : { show: false },
				scales: { x: { time: false }, l: lRange ? { range: lRange } : {}, ...(hasRight ? { r: rRange ? { range: rRange } : {} } : {}) },
				axes: [
					axis({ size: 32 }),
					axis({ scale: 'l', label: left }),
					hasRight
						? axis({ scale: 'r', side: 1, label: right, grid: { show: false } })
						: // An empty axis keeps the same right gutter, so RPM lines up down the page.
							axis({ scale: 'l', side: 1, label: ' ', grid: { show: false }, values: (_u, ticks) => ticks.map(() => '') })
				],
				series: [
					{},
					...lines.map((l) => ({ scale: l.right ? 'r' : 'l', stroke: l.color, width: 2, alpha: alpha(l, untrack(() => focus)), dash: l.dash ? [5, 4] : undefined, points: { show: false } }))
				],
				hooks: { draw: [(u) => decorate(u, c.bg, c.ink)], ...(live ? { setCursor: [(u: uPlot) => (hover = u.cursor.idx ?? null)] } : {}) }
			},
			[x, ...lines.map((l) => l.y)],
			target
		);
	}

	$effect(() => {
		if (!el || !width || !x.length) return;
		const p = build(el, width, height, true);
		plot = p;
		return () => {
			plot = undefined;
			p.destroy();
			hover = null;
		};
	});

	// Emphasising a run only changes line opacity and redraws; rebuilding would lose the zoom.
	$effect(() => {
		const f = focus;
		if (!plot) return;
		plot.series.forEach((series, i) => i && (series.alpha = alpha(lines[i - 1], f)));
		plot.redraw(false);
	});

	/** The chart redrawn at a fixed size, so an exported image does not depend on the window. */
	export async function snapshot(w: number, h: number) {
		const host = document.createElement('div');
		host.style.cssText = 'position:fixed;left:-99999px;top:0';
		document.body.append(host);
		const p = build(host, w, h, false);
		await new Promise((done) => requestAnimationFrame(done));
		const copy = document.createElement('canvas');
		copy.width = p.ctx.canvas.width;
		copy.height = p.ctx.canvas.height;
		copy.getContext('2d')!.drawImage(p.ctx.canvas, 0, 0);
		p.destroy();
		host.remove();
		return copy;
	}

	/** Readout rows: one per run, with each value's difference from the first run. */
	const groups = $derived.by(() => {
		const map = new Map<string, Line[]>();
		for (const l of lines) map.set(l.id, [...(map.get(l.id) ?? []), l]);
		return [...map.values()];
	});
	const signed = (n: number) => {
		const r = +n.toFixed(dp); // sign of the rounded value, so a tiny difference is not shown as −0.0
		return `${r > 0 ? '+' : r < 0 ? '−' : '±'}${Math.abs(r).toFixed(dp)}`;
	};
</script>

<div class="wrap" bind:clientWidth={width}>
	<div bind:this={el} role="img" aria-label={label} style:height="{height}px"></div>
</div>
<p class="readout" aria-hidden="true">
	{#if hover != null && x[hover] != null}
		<b>{grouped(x[hover])} rpm</b>
		{#each groups as group, g}
			{#if group.some((l) => l.y[hover!] != null)}
				<span class="row">
					<Swatch color={group[0].color} shape={group[0].shape} />
					{group[0].label}
					{#each group as l, i}
						{@const v = l.y[hover]}
						{@const base = groups[0][i]?.y[hover]}
						{#if v != null}<span>{v.toFixed(dp)} {l.unit}{#if g > 0 && base != null}&nbsp;<small>{signed(v - base)}</small>{/if}</span>{/if}
					{/each}
				</span>
			{/if}
		{/each}
	{:else if hint}
		<span class="mouse">Point at the chart to read every run at one RPM. Drag to zoom, double-click to reset.</span>
		<span class="touch">Tap the chart to read every run at one RPM.</span>
	{/if}
</p>

<style>
	.wrap {
		overflow: hidden;
	}
	.readout {
		display: flex;
		flex-wrap: wrap;
		align-content: flex-start;
		gap: 2px 20px;
		/* Room for two rows, so the chart below does not jump as the readout wraps. */
		min-height: 42px;
		margin: 4px 0 0;
		padding-left: 48px;
		font-size: 12px;
		line-height: 20px;
		color: var(--muted);
	}
	.readout b,
	.row {
		font-weight: 600;
		color: var(--ink);
	}
	.row {
		display: flex;
		align-items: center;
		gap: 6px;
		font-weight: 500;
	}
	.row span {
		font-weight: 400;
	}
	.row small {
		font-size: inherit;
		color: var(--muted);
	}
	.touch {
		display: none;
	}
	@media (hover: none) {
		.mouse {
			display: none;
		}
		.touch {
			display: inline;
		}
	}
</style>
