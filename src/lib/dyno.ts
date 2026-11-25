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
	/** 0 = raw neighbour differences; each step widens the fit window by ±0.1 s. */
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
	for (let i = lo; i < hi; i++) {
		while (t[a] < t[i] - h) a++;
		while (b < hi && t[b] <= t[i] + h) b++;
		// Always include one neighbour each side so h = 0 still yields a slope.
		const s = Math.max(lo, Math.min(a, i - 1));
		const e = Math.min(hi, Math.max(b, i + 2));
		// Sums of powers of x = t - t[i] and of x^k * (y - y[i]); the fit is then evaluated at x = 0.
		let s1 = 0, s2 = 0, s3 = 0, s4 = 0, r0 = 0, r1 = 0, r2 = 0;
		for (let j = s; j < e; j++) {
			const x = t[j] - t[i];
			const x2 = x * x;
			const d = y[j] - y[i];
			s1 += x;
			s2 += x2;
			s3 += x2 * x;
			s4 += x2 * x2;
			r0 += d;
			r1 += x * d;
			r2 += x2 * d;
		}
		const n = e - s;
		const det = n * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
		if (n >= 3 && Math.abs(det) > 1e-12 * n * s2 * s4) {
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

/** The stretch of rising RPM at (near) full throttle with the largest RPM gain: [lo, hi). */
function findPull(s: Samples, h: number): [number, number] {
	const n = s.t.length;
	const rising = fit(s.t, s.rpm, 0, n, Math.max(h, 0.25)).slope;
	const tpsMin = s.tps ? 0.95 * s.tps.reduce((m, x) => (x > m ? x : m), -Infinity) : -Infinity;
	let best: [number, number] = [0, 0];
	let gain = 0;
	let lo = 0;
	for (let i = 0; i <= n; i++) {
		if (i < n && rising[i] > 0 && s.rpm[i] > 0 && (!s.tps || s.tps[i] >= tpsMin)) continue;
		if (i - lo >= 3 && s.rpm[i - 1] - s.rpm[lo] > gain) {
			gain = s.rpm[i - 1] - s.rpm[lo];
			best = [lo, i];
		}
		lo = i + 1;
	}
	if (!gain) throw new Error('No full-throttle pull found. Check the time, RPM and throttle columns.');
	return best;
}

export function dyno(s: Samples, p: RunParams): DynoResult {
	const v = p.vehicle;
	const inputs = [v.massKg, v.finalDrive, v.tireDiameterM, v.cd, v.frontalAreaM2, p.gearRatio, p.pressurePa];
	if (!inputs.every((x) => Number.isFinite(x) && x > 0) || !(v.occupantKg >= 0) || !(v.crr >= 0) || !Number.isFinite(p.tempC))
		throw new Error(`"${v.name}" has missing or invalid values. Open Vehicles to fix them.`);

	const h = 0.1 * Math.max(0, p.level || 0);
	const [a, b] = findPull(s, h);
	const f = fit(s.t, s.rpm, a, b, h);

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
		peakTorque: { rpm: 0, value: -Infinity }
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
