// Test helper: simulates a pull from a known wheel-power curve and writes it as a logger-style CSV.
// The dyno maths should recover the curve it was given.

import { airDensity, type Vehicle } from './dyno';

export const testVehicle: Vehicle = {
	id: 'test',
	name: 'Test car',
	massKg: 1400,
	occupantKg: 80,
	gears: [3.6, 2.1, 1.36, 1.0, 0.8],
	finalDrive: 3.7,
	tireDiameterM: 0.64,
	cd: 0.32,
	frontalAreaM2: 2.1,
	crr: 0.012
};

/** Wheel power in watts: a torque curve peaking at 4,000 rpm. */
export const testPower = (rpm: number) => 400 * (1 - ((rpm - 4000) / 5000) ** 2) * ((rpm * Math.PI) / 30);

export function synthLog(v = testVehicle, gearRatio = 1.36, power = testPower, hz = 20, timeScale = 1): string {
	const mass = v.massKg + v.occupantKg;
	const k = (Math.PI * v.tireDiameterM) / (60 * gearRatio * v.finalDrive);
	const rho = airDensity(25, 99000);
	const rows = ['Logger export v1', '', 'Time (sec),Engine Speed (RPM),Accelerator Pedal (%),AFR,Boost (psi)'];
	const row = (t: number, rpm: number, pedal: number) =>
		rows.push([(t * timeScale).toFixed(3), rpm.toFixed(0), pedal, (12.6 - rpm / 6000).toFixed(2), pedal === 100 ? (18 - rpm / 2000).toFixed(1) : '0.0'].join(','));

	let t = 0;
	for (; t < 1; t += 1 / hz) row(t, 2000, 20); // cruise before the pull
	let rpm = 2000;
	for (let step = 0, every = Math.round(1000 / hz); rpm < 6800; step++, t += 0.001) {
		const speed = rpm * k;
		const force = power(rpm) / speed - 0.5 * rho * v.cd * v.frontalAreaM2 * speed * speed - v.crr * mass * 9.80665;
		rpm += (force / mass / k) * 0.001;
		if (step % every === 0) row(t, rpm, 100);
	}
	for (let i = 0; i < hz; i++, t += 1 / hz) row(t, (rpm -= 60), 0); // lift
	return rows.join('\n');
}
