import type { Mapping } from './parse';

/** One loaded log and its settings. Not saved between visits. */
export interface Run {
	id: string;
	title: string;
	mapping: Mapping;
	vehicleId: string;
	/** Index into the vehicle's gears. */
	gear: number;
	/** Index into COLORS and the marker shapes. */
	color: number;
	show: boolean;
	level: number;
	rpmMin: number | null;
	rpmMax: number | null;
	tempC: number;
	pressurePa: number;
	sae: boolean;
}

/** [light theme, dark theme]. The first run is ink so a single run stays monochrome. */
export const COLORS: [string, string][] = [
	['#0A0A0A', '#FAFAFA'],
	['#12A594', '#0AC5B3'],
	['#8E4EC6', '#BF7AF0'],
	['#C2570C', '#F5A524'],
	['#0E7490', '#22B8CF'],
	// Red comes last: it sits too close to the red mark in the top bar to be an early run colour.
	['#E5484D', '#FF6369']
];
export const runColor = (index: number, dark: boolean) => COLORS[index % COLORS.length][dark ? 1 : 0];

/** Marker outline around (0, 0); null means a circle. Shapes repeat after four. */
export function markerPoints(shape: number, r: number): [number, number][] | null {
	switch (shape % 4) {
		case 1:
			return [[-r, -r], [r, -r], [r, r], [-r, r]].map(([x, y]) => [x * 0.85, y * 0.85]);
		case 2:
			return [[0, -r * 1.2], [r * 1.15, r * 0.85], [-r * 1.15, r * 0.85]];
		case 3:
			return [[0, -r * 1.25], [r * 1.25, 0], [0, r * 1.25], [-r * 1.25, 0]];
		default:
			return null;
	}
}

export function drawMarker(ctx: CanvasRenderingContext2D, shape: number, x: number, y: number, r: number, fill: string, stroke: string) {
	const pts = markerPoints(shape, r);
	ctx.beginPath();
	if (pts) {
		pts.forEach(([px, py], i) => (i ? ctx.lineTo(x + px, y + py) : ctx.moveTo(x + px, y + py)));
		ctx.closePath();
	} else ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fillStyle = fill;
	ctx.strokeStyle = stroke;
	ctx.lineWidth = r / 2;
	ctx.fill();
	ctx.stroke();
}
