import { expect, test } from 'vitest';
import { airDensity, dyno, resample, saeFactor, tireDiameterM, type RunParams } from './dyno';
import { guessMapping, parseLog, toSamples } from './parse';
import { synthLog, testPower, testVehicle } from './synth';

const params: RunParams = { vehicle: testVehicle, gearRatio: 1.36, tempC: 25, pressurePa: 99000, sae: false, level: 3 };
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
	for (const level of [2, 5, 10]) {
		const r = dyno(samples, { ...params, level });
		expect(Math.abs(r.peakPower.value / truePeak - 1)).toBeLessThan(0.01);
		// The top of the rev range is where a one-sided smoothing window used to read high.
		const last = r.rpm.length - 1;
		expect(Math.abs(r.powerW[last] / testPower(r.rpm[last]) - 1)).toBeLessThan(0.02);
	}
});
