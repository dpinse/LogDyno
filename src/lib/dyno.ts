// Road-load dyno maths. Everything here is SI; unit conversion happens at the UI edge (units.ts).

export interface Vehicle {
	id: string;
	name: string;
	massKg: number;
	occupantKg: number;
	gears: number[];
	finalDrive: number;
	tireDiameterM: number;
	cd: number;
	frontalAreaM2: number;
	crr: number;
}

/** Columns of one log, aligned by index. `t` is seconds and strictly increasing. */
export interface Samples {
	t: number[];
	rpm: number[];
	/** Road or wheel speed in any unit, used to spot a slipping clutch. */
	speed?: number[] | null;
	/** Take acceleration from `speed` instead of RPM. */
	bySpeed?: boolean;
	/** Every wheel speed column in the log, when there are at least two. */
	wheels?: number[][] | null;
	tps: number[] | null;
	afr: number[] | null;
	boost: number[] | null;
}

export interface RunParams {
	vehicle: Vehicle;
	gearRatio: number;
	tempC: number;
	pressurePa: number;
	sae: boolean;
	/** 1 to 5; each step widens the fit window by ±4% of the pull's duration. 0 = raw neighbour differences. */
	level: number;
	rpmMin?: number | null;
	rpmMax?: number | null;
}

export interface Peak {
	rpm: number;
	value: number;
}

export interface DynoResult {
	rpm: number[];
	powerW: number[];
	torqueNm: number[];
	/** NaN where the log has no value. */
	afr: number[];
	boost: number[];
	peakPower: Peak;
	peakTorque: Peak;
	slips: Slip[];
}

/**
 * Something other than the engine moved RPM during the pull. `share` is the worst excess, e.g. 0.08.
 * `either` is RPM ahead of the only speed column there is; `dip` is RPM falling mid-pull in a log with no speed column.
 */
export interface Slip {
	kind: 'clutch' | 'wheelspin' | 'either' | 'dip';
	share: number;
	rpmFrom: number;
	rpmTo: number;
}

const G = 9.80665;
const R_DRY_AIR = 287.05;

export const airDensity = (tempC: number, pressurePa: number) => pressurePa / (R_DRY_AIR * (tempC + 273.15));

/** SAE J1349 correction to 99 kPa / 25 °C. */
export const saeFactor = (tempC: number, pressurePa: number) =>
	1.18 * (99000 / pressurePa) * Math.sqrt((tempC + 273.15) / 298.15) - 0.18;

/** Tyre diameter in metres from a size such as 245/40 R18. */
export const tireDiameterM = (widthMm: number, aspectPct: number, rimIn: number) =>
	(2 * widthMm * (aspectPct / 100) + rimIn * 25.4) / 1000;

/**
 * Least-squares curve through the samples within ±h seconds of each point in [lo, hi).
 * Gives smoothed y and dy/dt together, and copes with uneven sample spacing.
 *
 * The curve is a parabola, not a line. RPM against time bends during a pull, and at the two ends
 * of the pull the window only reaches one way; a straight line there reports the slope from further
 * inside the pull, which made more smoothing read as more power at the top of the rev range.
 */
function fit(t: number[], y: number[], lo: number, hi: number, h: number) {
	const val: number[] = [];
	const slope: number[] = [];
	let a = lo;
	let b = lo;
	const first = t[lo];
	const final = t[hi - 1];
	for (let i = lo; i < hi; i++) {
		// Near either end of the pull the window cannot reach ±h, so it reaches further the other way
		// and keeps its full width. A half-width window there has half the samples to steady a slope
		// that is being extrapolated, and the last few hundred rpm swung up or down with the level.
		const from = Math.min(t[i] - h, final - 2 * h);
		const to = Math.max(t[i] + h, first + 2 * h);
		const reach = Math.max(t[i] - from, to - t[i]);
		while (t[a] < from) a++;
		while (b < hi && t[b] <= to) b++;
		// Always include one neighbour each side so h = 0 still yields a slope.
		const s = Math.max(lo, Math.min(a, i - 1));
		const e = Math.min(hi, Math.max(b, i + 2));
		// Sums of powers of x = t - t[i] and of x^k * (y - y[i]); the fit is then evaluated at x = 0.
		let n = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, r0 = 0, r1 = 0, r2 = 0;
		for (let j = s; j < e; j++) {
			const x = t[j] - t[i];
			// Tricube weight: samples fade out towards the edge of the window. With equal weights the
			// result jumps each time a noisy sample enters or leaves, which drew a jagged curve.
			// The floor keeps the forced neighbours in play when the window is narrower than the sample gap.
			const u = h > 0 ? Math.min(1, Math.abs(x) / reach) : 1;
			const w = Math.max(1e-3, (1 - u * u * u) ** 3);
			const wx = w * x;
			const wx2 = wx * x;
			const d = y[j] - y[i];
			n += w;
			s1 += wx;
			s2 += wx2;
			s3 += wx2 * x;
			s4 += wx2 * x * x;
			r0 += w * d;
			r1 += wx * d;
			r2 += wx2 * d;
		}
		const det = n * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
		if (e - s >= 3 && Math.abs(det) > 1e-12 * n * s2 * s4) {
			val.push(y[i] + (r0 * (s2 * s4 - s3 * s3) - s1 * (r1 * s4 - s3 * r2) + s2 * (r1 * s3 - s2 * r2)) / det);
			slope.push((n * (r1 * s4 - r2 * s3) - r0 * (s1 * s4 - s3 * s2) + s2 * (s1 * r2 - s2 * r1)) / det);
		} else {
			// Two points: a straight line is all there is.
			const lin = n * s2 - s1 * s1;
			const m = lin > 0 ? (n * r1 - s1 * r0) / lin : 0;
			slope.push(m);
			val.push(y[i] + (r0 - m * s1) / n);
		}
	}
	return { val, slope };
}

type Range = Omit<Slip, 'kind'>;

/**
 * The stretch of rising RPM at (near) full throttle with the largest RPM gain: [a, b).
 * Brief dips are kept, and the deepest one is reported.
 */
function findPull(s: Samples): { a: number; b: number; dip: Range | null } {
	const n = s.t.length;
	const rising = fit(s.t, s.rpm, 0, n, 0.4).slope;
	const tpsMin = s.tps ? 0.95 * s.tps.reduce((m, x) => (x > m ? x : m), -Infinity) : -Infinity;
	let best = { a: 0, b: 0, dip: null as Range | null };
	let gain = 0;
	let lo = -1;
	let last = 0;
	let top = 0;
	let dip: Range | null = null;
	for (let i = 0; i <= n; i++) {
		const flat = i < n && s.rpm[i] > 0 && (!s.tps || s.tps[i] >= tpsMin);
		if (flat && rising[i] > 0) {
			if (lo < 0) {
				lo = i;
				top = 0;
				dip = null;
			}
			last = i;
			top = Math.max(top, s.rpm[i]);
			continue;
		}
		// A clutch that slips and grips again drops RPM briefly mid-pull. That is not the end of the
		// pull; a gear change or a lift is, and those fall further or last longer.
		if (flat && lo >= 0 && s.t[i] - s.t[last] <= 0.5 && s.rpm[i] >= 0.9 * top) {
			// Under 1% is jitter in the logged RPM, not a dip.
			const share = 1 - s.rpm[i] / top;
			if (share > 0.01 && share > (dip?.share ?? 0)) dip = { share, rpmFrom: s.rpm[i], rpmTo: top };
			continue;
		}
		if (lo >= 0 && last + 1 - lo >= 3 && top - s.rpm[lo] > gain) {
			gain = top - s.rpm[lo];
			// A dip after the last rising sample is the lift at the end, not part of the pull.
			best = { a: lo, b: last + 1, dip: dip && dip.rpmTo < top ? dip : null };
		}
		lo = -1;
	}
	if (!gain) throw new Error('No full-throttle pull found. Check the time, RPM and throttle columns.');
	return best;
}

/** The median of num / den across [a, b), or null if den is missing for most of it. */
function usual(num: number[], den: number[], a: number, b: number): number | null {
	const ratios: number[] = [];
	for (let i = a; i < b; i++) if (den[i] > 0) ratios.push(num[i] / den[i]);
	return ratios.length >= (b - a) / 2 ? ratios.sort((p, q) => p - q)[ratios.length >> 1] : null;
}

/** The longest unbroken stretch of [a, b) where num / den is more than `margin` above its median, if it lasts 0.3 s. */
function ahead(s: Samples, num: number[], den: number[], a: number, b: number, margin: number): Range | null {
	const k = usual(num, den, a, b);
	if (k === null) return null;
	let found: Range | null = null;
	let longest = 0.3;
	let from = -1;
	for (let i = a; i <= b; i++) {
		if (i < b && num[i] / (den[i] * k) > 1 + margin) {
			if (from < 0) from = i;
			continue;
		}
		if (from >= 0 && s.t[i - 1] - s.t[from] >= longest) {
			longest = s.t[i - 1] - s.t[from];
			const rpm = s.rpm.slice(from, i);
			let share = 0;
			for (let j = from; j < i; j++) share = Math.max(share, num[j] / (den[j] * k) - 1);
			found = { share, rpmFrom: Math.min(...rpm), rpmTo: Math.max(...rpm) };
		}
		from = -1;
	}
	return found;
}

export function dyno(s: Samples, p: RunParams): DynoResult {
	const v = p.vehicle;
	const inputs = [v.massKg, v.finalDrive, v.tireDiameterM, v.cd, v.frontalAreaM2, p.gearRatio, p.pressurePa];
	if (!inputs.every((x) => Number.isFinite(x) && x > 0) || !(v.occupantKg >= 0) || !(v.crr >= 0) || !Number.isFinite(p.tempC))
		throw new Error(`"${v.name}" has missing or invalid values. Open Vehicles to fix them.`);

	const { a, b, dip } = findPull(s);
	// The window is a share of the pull, not a fixed time, so one level resolves the same slice of the
	// rev range in a 3 s second-gear pull as in a 12 s fourth-gear one.
	const h = 0.04 * Math.max(0, p.level || 0) * (s.t[b - 1] - s.t[a]);
	// A slipping clutch lets RPM run ahead of the car and then fall back, which reads as a power spike
	// and a hole. Wheel speed cannot do that. It is scaled to RPM by the typical ratio between the two
	// across the pull, so its unit and the tyre size it was measured with do not matter.
	let y = s.rpm;
	const slips: Slip[] = [];
	if (s.speed) {
		const k = usual(s.rpm, s.speed, a, b);
		if (k === null && s.bySpeed) throw new Error('The wheel speed column is empty for most of the pull. Choose another column or None.');
		if (k !== null && s.bySpeed) y = s.speed.map((x) => x * k);
	}
	// With several wheel speeds the two faults can be told apart: a slipping clutch puts RPM ahead of
	// even the fastest wheel, and wheelspin puts the fastest wheel ahead of the slowest. No need to
	// know which wheels are driven. The margins sit above the 1 to 3% that driven tyres creep under power.
	if (s.wheels && s.wheels.length > 1) {
		const fast = s.t.map((_, i) => Math.max(...s.wheels!.map((w) => w[i])));
		const slow = s.t.map((_, i) => Math.min(...s.wheels!.map((w) => w[i])));
		const clutch = ahead(s, s.rpm, fast, a, b, 0.025);
		const spin = ahead(s, fast, slow, a, b, 0.05);
		if (clutch) slips.push({ kind: 'clutch', ...clutch });
		if (spin) slips.push({ kind: 'wheelspin', ...spin });
	} else if (s.speed) {
		const either = ahead(s, s.rpm, s.speed, a, b, 0.025);
		if (either) slips.push({ kind: 'either', ...either });
	} else if (dip) slips.push({ kind: 'dip', ...dip });
	const f = fit(s.t, y, a, b, h);

	const mass = v.massKg + v.occupantKg;
	const speedPerRpm = (Math.PI * v.tireDiameterM) / (60 * p.gearRatio * v.finalDrive); // m/s per rpm
	const rho = airDensity(p.tempC, p.pressurePa);
	const correction = p.sae ? saeFactor(p.tempC, p.pressurePa) : 1;
	const min = p.rpmMin ?? -Infinity;
	const max = p.rpmMax ?? Infinity;

	const r: DynoResult = {
		rpm: [],
		powerW: [],
		torqueNm: [],
		afr: [],
		boost: [],
		peakPower: { rpm: 0, value: -Infinity },
		peakTorque: { rpm: 0, value: -Infinity },
		slips
	};
	for (let i = 0; i < f.val.length; i++) {
		const rpm = f.val[i];
		if (rpm < min || rpm > max) continue;
		const speed = rpm * speedPerRpm;
		const force =
			mass * f.slope[i] * speedPerRpm + // acceleration
			0.5 * rho * v.cd * v.frontalAreaM2 * speed * speed + // aero drag
			v.crr * mass * G; // rolling resistance
		const power = force * speed * correction;
		const torque = power / ((rpm * Math.PI) / 30);
		r.rpm.push(rpm);
		r.powerW.push(power);
		r.torqueNm.push(torque);
		const afr = s.afr ? s.afr[a + i] : NaN;
		// Loggers report either AFR or lambda; nothing burns at an AFR of 4, so small values are lambda.
		r.afr.push(afr > 0 ? (afr <= 4 ? afr * 14.7 : afr) : NaN);
		r.boost.push(s.boost ? s.boost[a + i] : NaN);
		if (power > r.peakPower.value) r.peakPower = { rpm, value: power };
		if (torque > r.peakTorque.value) r.peakTorque = { rpm, value: torque };
	}
	if (!r.rpm.length) throw new Error('No data inside the RPM trim range.');
	return r;
}

/** Linear interpolation of (x, y) onto `grid`; null outside the data. Lets runs share one x axis. */
export function resample(x: number[], y: number[], grid: number[]): (number | null)[] {
	const pts = x
		.map((v, i) => [v, y[i]] as const)
		.filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))
		.sort((p, q) => p[0] - q[0]);
	let j = 0;
	return grid.map((g) => {
		if (!pts.length || g < pts[0][0] || g > pts[pts.length - 1][0]) return null;
		while (j < pts.length - 2 && pts[j + 1][0] < g) j++;
		const [x0, y0] = pts[j];
		const [x1, y1] = pts[j + 1] ?? pts[j];
		return x1 === x0 ? y0 : y0 + ((y1 - y0) * (g - x0)) / (x1 - x0);
	});
}
