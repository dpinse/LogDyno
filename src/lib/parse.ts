// Reads delimited text logs from any logger and picks out the columns the maths needs.

import type { Samples } from './dyno';

export interface Table {
	headers: string[];
	rows: string[][];
	decimalComma: boolean;
}

export const ROLES = ['time', 'rpm', 'speed', 'tps', 'afr', 'boost'] as const;
export type Role = (typeof ROLES)[number];
/** Column index per role; -1 means "not in this log". */
export type Mapping = Record<Role, number>;

const DELIMS = [',', ';', '\t'];

function split(line: string, d: string): string[] {
	if (!line.includes('"')) return line.split(d).map((c) => c.trim());
	const out: string[] = [];
	let cell = '';
	let quoted = false;
	for (const ch of line) {
		if (ch === '"') quoted = !quoted;
		else if (ch === d && !quoted) {
			out.push(cell.trim());
			cell = '';
		} else cell += ch;
	}
	out.push(cell.trim());
	return out;
}

const NUMBERISH = /^[-+]?(\d+([.,]\d*)?|[.,]\d+)(e[-+]?\d+)?$|^\d+(:\d+)+([.,]\d+)?$/i;
const numericShare = (cells: string[]) => cells.filter((c) => NUMBERISH.test(c)).length / cells.length;

export function parseLog(text: string): Table {
	const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/);
	// The header is the first mostly-text line followed closely by a mostly-numeric line with the same shape.
	// This skips preambles (logger name, date, comments) and tolerates what loggers put under the header:
	// a units row, and in HP Tuners exports a blank line and a section marker as well.
	for (let i = 0; i < Math.min(lines.length, 200); i++) {
		const d = DELIMS.reduce((best, x) => (split(lines[i], x).length > split(lines[i], best).length ? x : best));
		const headers = split(lines[i], d);
		// A title padded with commas to the table's width ("Session 8,,,,,") is mostly empty cells; a header is not.
		if (headers.length < 2 || numericShare(headers) >= 0.5 || headers.filter(Boolean).length < headers.length / 2) continue;
		const fits = (l: string) => {
			const c = split(l, d);
			return c.length >= headers.length - 1 && c.length <= headers.length + 1 ? c : null;
		};
		const isData = (l: string) => numericShare(fits(l) ?? ['']) > 0.5;
		if (!lines.slice(i + 1, i + 6).some(isData)) continue;
		// JB4 puts two settings tables, each a header and one row of values, above the real header.
		// So if a further header-like line follows after only a row or two of numbers, start again from it.
		let between = 0;
		let again = false;
		for (let j = i + 1; j < Math.min(lines.length, i + 8) && between < 3; j++) {
			if (isData(lines[j])) between++;
			else if (between && lines[j].trim()) {
				const c = fits(lines[j]);
				again = !!c && numericShare(c) < 0.5 && c.filter(Boolean).length >= c.length / 2;
				break;
			}
		}
		if (again) continue;
		const rows = lines.slice(i + 1).filter(isData).map((l) => split(l, d));
		const decimalComma = d !== ',' && rows.slice(0, 50).some((r) => r.some((c) => /^-?\d+,\d+$/.test(c)));
		return { headers, rows, decimalComma };
	}
	throw new Error('This does not look like a data log: no header row followed by rows of numbers.');
}

// Earlier patterns win. A pedal column beats a throttle-plate one, because drive-by-wire
// cars close the plate at full pedal to control boost.
const PATTERNS: Record<Role, RegExp[]> = {
	// Holley calls it RTC and HP Tuners calls it Offset.
	time: [/^time\b|^rtc$|^offset$|^duration$|^secl$/, /time|seconds|elapsed|logentry/],
	// The last pattern in rpm, tps, afr and boost is the ECU's own variable name, which Bosch and
	// Siemens loggers (ME7Logger, WinLog, SWComm) write instead of a description.
	rpm: [/^(engine )?rpm\b|^engine speed/, /rpm|engine speed/, /^nmot|^n$/],
	// Only used to spot clutch slip unless the person picks a column: which wheels are undriven depends on the car.
	speed: [/^abs\b|wheel.?speed/, /^vss\b|vehicle speed|^speed\b/],
	tps: [/pedal|\bped\b|\baps\b|accel\w*\.? pos/, /throttle(?!.*press)|tps/, /^wped|^pv_av|^wdkba/],
	// "AFR" first: logs with a dozen "A/F ..." columns (heater, learning, sensor current) name the reading itself AFR.
	afr: [/afr|wideband|\bwb|o2wb/, /a\/f|air.?fuel|^af$/, /lambda/, /^lamsoni/],
	// Gauge pressure before absolute: boost is what is above atmosphere.
	boost: [/boost/, /manifold rel|relative press|\bmrp\b/, /manifold.*press|\bmap\b/, /^pvdks/]
};
const NOT_MEASURED = /target|desired|command|request|limit|correct|trim|learn|error|set ?point|deviation|heater|volt|resist|imped|admitt|duty|control|\breq\b/;
// Where a logger has both "Lambda" and "Lambda Act.", the plain one is the target.
const MEASURED = /\bact(ual)?\b|measured/;

function find(lower: string[], role: Role) {
	for (const re of PATTERNS[role]) {
		const fits = (h: string) => re.test(h) && !NOT_MEASURED.test(h);
		const actual = lower.findIndex((h) => fits(h) && MEASURED.test(h));
		const i = actual >= 0 ? actual : lower.findIndex(fits);
		if (i >= 0) return i;
	}
	return -1;
}

export function guessMapping(headers: string[]): Mapping {
	const lower = headers.map((h) => h.toLowerCase());
	return { time: find(lower, 'time'), rpm: find(lower, 'rpm'), speed: -1, tps: find(lower, 'tps'), afr: find(lower, 'afr'), boost: find(lower, 'boost') };
}

export function toSamples(table: Table, m: Mapping): Samples {
	if (m.time < 0 || m.rpm < 0) throw new Error('Choose the time and RPM columns.');
	const num = (c: string | undefined) => {
		if (!c) return NaN;
		return Number(table.decimalComma ? c.replace(',', '.') : c);
	};
	// "12:34:56.7" and "2024-01-01 12:34:56.7" both become seconds.
	const time = (c: string | undefined) => {
		if (!c || !c.includes(':')) return num(c);
		return c
			.slice(c.lastIndexOf(' ') + 1)
			.split(':')
			.reduce((s, part) => s * 60 + num(part), 0);
	};

	const raw = table.rows.map((r) => time(r[m.time]));
	const steps = raw
		.slice(1, 400)
		.map((t, i) => t - raw[i])
		.filter((dt) => dt > 0)
		.sort((a, b) => a - b);
	const median = steps[steps.length >> 1] ?? 1;
	// Nobody logs a pull at one sample every 2 s, so large steps mean milliseconds or microseconds.
	const scale = median > 2000 ? 1e-6 : median > 2 ? 1e-3 : 1;

	const s: Samples = { t: [], rpm: [], speed: null, bySpeed: m.speed >= 0, tps: m.tps < 0 ? null : [], afr: m.afr < 0 ? null : [], boost: m.boost < 0 ? null : [] };
	const speedCol = m.speed >= 0 ? m.speed : find(table.headers.map((h) => h.toLowerCase()), 'speed');
	if (speedCol >= 0) s.speed = [];
	// Every wheel speed sensor, so the maths can tell clutch slip from wheelspin.
	const wheelCols = table.headers.flatMap((h, i) => (PATTERNS.speed[0].test(h.toLowerCase()) && !NOT_MEASURED.test(h.toLowerCase()) ? [i] : []));
	if (wheelCols.length > 1) s.wheels = wheelCols.map(() => []);
	let last = -Infinity;
	let before = -Infinity;
	let shift = 0;
	table.rows.forEach((r, i) => {
		const rpm = num(r[m.rpm]);
		if (!Number.isFinite(raw[i]) || !Number.isFinite(rpm)) return;
		// Some loggers put several sessions in one file, each starting again from zero. Carry on from
		// where the last one ended, or every later session would be dropped as out of order.
		if (raw[i] < before) shift = last + median * scale - raw[i] * scale;
		before = raw[i];
		const t = raw[i] * scale + shift;
		if (t <= last) return;
		last = t;
		s.t.push(t);
		s.rpm.push(rpm);
		s.speed?.push(num(r[speedCol]));
		s.wheels?.forEach((w, j) => w.push(num(r[wheelCols[j]])));
		s.tps?.push(num(r[m.tps]));
		s.afr?.push(num(r[m.afr]));
		s.boost?.push(num(r[m.boost]));
	});
	if (s.t.length < 3) throw new Error('Too few usable rows. Check the time and RPM columns.');
	return s;
}
