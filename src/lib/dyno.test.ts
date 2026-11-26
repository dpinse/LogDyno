import { expect, test } from 'vitest';
import { airDensity, dyno, resample, saeFactor, tireDiameterM, type RunParams } from './dyno';
import { guessMapping, parseLog, toSamples } from './parse';
import { synthLog, testPower, testVehicle } from './synth';

const params: RunParams = { vehicle: testVehicle, gearRatio: 1.36, tempC: 25, pressurePa: 99000, sae: false, level: 2 };
const run = (csv: string, p = params) => {
	const table = parseLog(csv);
	return dyno(toSamples(table, guessMapping(table.headers)), p);
};

test('recovers the power curve the log was simulated from', () => {
	const r = run(synthLog());
	expect(r.rpm.length).toBeGreaterThan(50);
	// The cruise before the pull and the lift after it are excluded.
	expect(r.rpm[0]).toBeGreaterThan(1990);
	expect(Math.max(...r.rpm)).toBeLessThan(6900);
	r.rpm.forEach((rpm, i) => {
		if (rpm > 2600 && rpm < 6400) expect(Math.abs(r.powerW[i] / testPower(rpm) - 1)).toBeLessThan(0.03);
	});
	expect(r.afr[0]).toBeCloseTo(12.27, 1);
});

test('millisecond timestamps give the same answer as seconds', () => {
	const s = run(synthLog());
	const ms = run(synthLog(testVehicle, 1.36, testPower, 20, 1000));
	expect(Math.abs(ms.peakPower.value / s.peakPower.value - 1)).toBeLessThan(0.005);
	expect(ms.rpm.length).toBe(s.rpm.length);
});

test('RPM trim, SAE correction and bad input', () => {
	const r = run(synthLog(), { ...params, rpmMin: 3000, rpmMax: 5000 });
	expect(Math.min(...r.rpm)).toBeGreaterThanOrEqual(3000);
	expect(Math.max(...r.rpm)).toBeLessThanOrEqual(5000);

	const hot = { ...params, tempC: 40, pressurePa: 95000 };
	expect(run(synthLog(), { ...hot, sae: true }).peakPower.value).toBeGreaterThan(run(synthLog(), hot).peakPower.value);

	expect(() => run(synthLog(), { ...params, vehicle: { ...testVehicle, cd: NaN } })).toThrow(/invalid/);
	expect(() => run('Time,RPM\n0,3000\n1,3000\n2,3000\n3,3000')).toThrow(/pull/);
});

test('reference constants', () => {
	expect(saeFactor(25, 99000)).toBeCloseTo(1, 6);
	expect(airDensity(15, 101325)).toBeCloseTo(1.225, 3);
	expect(tireDiameterM(225, 40, 18)).toBeCloseTo(0.6372, 4);
});

test('resample interpolates and leaves gaps outside the data', () => {
	expect(resample([3000, 1000, 2000], [30, 10, 20], [500, 1000, 1500, 3000, 3500])).toEqual([null, 10, 15, 30, null]);
});

test('more smoothing does not raise the power', () => {
	const table = parseLog(synthLog());
	const samples = toSamples(table, guessMapping(table.headers));
	let truePeak = 0;
	for (let rpm = 2000; rpm <= 6800; rpm += 5) truePeak = Math.max(truePeak, testPower(rpm));
	for (const level of [1, 3, 5]) {
		const r = dyno(samples, { ...params, level });
		expect(Math.abs(r.peakPower.value / truePeak - 1)).toBeLessThan(0.01);
		// The top of the rev range is where a one-sided smoothing window used to read high.
		const last = r.rpm.length - 1;
		expect(Math.abs(r.powerW[last] / testPower(r.rpm[last]) - 1)).toBeLessThan(0.02);
	}
});

test('a brief RPM dip mid-pull does not end the pull', () => {
	// 3000 to 8000 rpm in 10 s, with the clutch letting go and gripping again around 5 s.
	const t = Array.from({ length: 301 }, (_, i) => i / 30);
	const rpm = t.map((x) => 3000 + 500 * x + (x > 4.5 && x < 5.5 ? 250 * Math.sin((x - 4.5) * Math.PI) ** 2 : 0));
	const r = dyno({ t, rpm, tps: t.map(() => 100), afr: null, boost: null }, params);
	expect(Math.max(...r.rpm)).toBeGreaterThan(7900);
	expect(Math.min(...r.rpm)).toBeLessThan(3100);
});

test('wheel speed removes clutch slip from the result', () => {
	const table = parseLog(synthLog());
	const clean = toSamples(table, guessMapping(table.headers));
	// Speed in an arbitrary unit; RPM runs up to 6% ahead of it for a second, as with a slipping clutch.
	const slipping = {
		...clean,
		speed: clean.rpm.map((x) => x * 0.0123),
		bySpeed: true,
		rpm: clean.rpm.map((x, i) => x * (1 + (clean.t[i] > 4 && clean.t[i] < 5 ? 0.06 * Math.sin((clean.t[i] - 4) * Math.PI) ** 2 : 0)))
	};
	const want = dyno(clean, params);
	const got = dyno(slipping, params);
	expect(Math.abs(got.peakPower.value / want.peakPower.value - 1)).toBeLessThan(0.01);
	expect(want.slips).toEqual([]);
	expect(dyno({ ...clean, speed: slipping.speed }, params).slips).toEqual([]);
	expect(got.slips.map((x) => x.kind)).toEqual(['either']);
	expect(got.slips[0].share).toBeCloseTo(0.06, 2);
	// Without wheel speed for power the slip is still reported, and the result is off.
	expect(dyno({ ...slipping, bySpeed: false }, params).slips.length).toBe(1);
	expect(Math.abs(dyno({ ...slipping, bySpeed: false }, params).peakPower.value / want.peakPower.value - 1)).toBeGreaterThan(0.01);
});

test('a noisy log does not swing the top of the curve', () => {
	const table = parseLog(synthLog());
	const clean = toSamples(table, guessMapping(table.headers));
	// ±16 rpm of jitter, as real loggers have, from fixed sequences so the test is repeatable.
	let sum = 0;
	let n = 0;
	for (let seed = 1; seed <= 20; seed++) {
		let x = seed;
		const noisy = { ...clean, rpm: clean.rpm.map((rpm) => rpm + ((x = (x * 1103515245 + 12345) % 2147483648) / 2147483648 - 0.5) * 32) };
		for (const level of [2, 3]) {
			const r = dyno(noisy, { ...params, level });
			const last = r.rpm.length - 1;
			sum += (r.powerW[last] / testPower(r.rpm[last]) - 1) ** 2;
			n++;
		}
	}
	// A window that halves at the end of the pull scores about 0.17 here.
	expect(Math.sqrt(sum / n)).toBeLessThan(0.08);
});

test('tells clutch slip from wheelspin when the log has several wheel speeds', () => {
	const table = parseLog(synthLog());
	const clean = toSamples(table, guessMapping(table.headers));
	const bump = (from: number, size: number) => clean.t.map((t) => 1 + (t > from && t < from + 1 ? size * Math.sin((t - from) * Math.PI) ** 2 : 0));
	const car = clean.rpm.map((x) => x * 0.0123);
	const spin = bump(3, 0.12);
	const slip = bump(5, 0.06);
	// Rear wheels follow the car; fronts spin at 3 s; the clutch slips at 5 s.
	const fronts = car.map((x, i) => x * 1.01 * spin[i]);
	const r = dyno({ ...clean, rpm: clean.rpm.map((x, i) => x * spin[i] * slip[i]), wheels: [fronts, fronts, car, car] }, params);
	expect(r.slips.map((x) => x.kind)).toEqual(['clutch', 'wheelspin']);
	expect(r.slips[0].share).toBeCloseTo(0.06, 2);
	expect(r.slips[1].share).toBeCloseTo(0.12, 2);
	expect(r.slips[1].rpmTo).toBeLessThan(r.slips[0].rpmFrom);
	expect(dyno({ ...clean, wheels: [fronts.map((x, i) => x / spin[i]), car] }, params).slips).toEqual([]);
});

test('a log with no speed column reports an RPM dip, and a gear change ends the pull', () => {
	const t = Array.from({ length: 301 }, (_, i) => i / 30);
	const flat = { t, tps: null, afr: null, boost: null };
	const dip = dyno({ ...flat, rpm: t.map((x) => 3000 + 500 * x + (x > 4.5 && x < 5.5 ? 500 * Math.sin((x - 4.5) * Math.PI) ** 2 : 0)) }, params);
	expect(dip.slips.map((x) => x.kind)).toEqual(['dip']);
	expect(dyno({ ...flat, rpm: t.map((x) => 3000 + 500 * x) }, params).slips).toEqual([]);
	// Up to 6000, then a shift drops it to 4200 and it climbs again to 6700: only the first stretch is the pull.
	const shifted = dyno({ ...flat, rpm: t.map((x) => (x < 6 ? 3000 + 500 * x : 4200 + 625 * (x - 6))) }, params);
	expect(Math.max(...shifted.rpm)).toBeLessThan(6050);
	expect(shifted.slips).toEqual([]);
});
