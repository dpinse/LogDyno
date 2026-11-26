// What the browser keeps between visits, and the backup file format (the same JSON).

import type { Vehicle } from './dyno';
import { ROLES, type Mapping } from './parse';
import { POWER, TORQUE, type System } from './units';

export interface Settings {
	system: System;
	power: keyof typeof POWER;
	torque: keyof typeof TORQUE;
	theme: 'system' | 'light' | 'dark';
	/** Which kind of chassis dyno the figures are scaled to read like. */
	dyno: keyof typeof DYNOS;
	/** The multiplier used when dyno is 'custom'. */
	customScale: number;
}

// Rough conventions, not measurements. The calculation works the way an inertia dyno does (power from
// accelerating a known mass), so that is the unscaled case; load-bearing dynos commonly read about a tenth lower.
export const DYNOS = {
	dynojet: { label: 'Dynojet scale (approx.)', factor: 1 },
	mustang: { label: 'Mustang scale (approx.)', factor: 0.9 },
	custom: { label: 'Custom scale', factor: NaN }
};
export const dynoFactor = (s: Settings) => (s.dyno === 'custom' ? s.customScale : DYNOS[s.dyno].factor);

export interface Saved {
	version: 1;
	vehicles: Vehicle[];
	settings: Settings;
	/** Column mapping per header signature, so a logger's layout is only corrected once. */
	mappings: Record<string, Mapping>;
}

export const KEY = 'logdyno:v1';

export const defaults = (): Saved => ({
	version: 1,
	vehicles: [],
	settings: { system: 'imperial', power: 'hp', torque: 'lbft', theme: 'system', dyno: 'dynojet', customScale: 1 },
	mappings: {}
});

export const newVehicle = (): Vehicle => ({
	id: crypto.randomUUID(),
	name: 'New vehicle',
	massKg: 1450,
	occupantKg: 80,
	gears: [3.6, 2.1, 1.4, 1.0, 0.8],
	finalDrive: 3.7,
	tireDiameterM: 0.64,
	cd: 0.32,
	frontalAreaM2: 2.1,
	crr: 0.012
});

const BAD = 'This is not a LogDyno backup file.';
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const oneOf = <T extends string>(x: unknown, allowed: readonly T[], fallback: T): T =>
	allowed.includes(x as T) ? (x as T) : fallback;

/** Parses and validates stored or imported JSON. Throws on anything that is not a backup. */
export function parseSaved(json: string): Saved {
	let o: any;
	try {
		o = JSON.parse(json);
	} catch {
		throw new Error(BAD);
	}
	if (!o || typeof o !== 'object' || o.version !== 1 || !Array.isArray(o.vehicles)) throw new Error(BAD);
	const d = defaults();
	const vehicles: Vehicle[] = o.vehicles.map((v: any) => {
		const nums = [v?.massKg, v?.occupantKg, v?.finalDrive, v?.tireDiameterM, v?.cd, v?.frontalAreaM2, v?.crr];
		if (typeof v?.id !== 'string' || typeof v.name !== 'string' || !nums.every(isNum) || !Array.isArray(v.gears) || !v.gears.every(isNum))
			throw new Error(BAD);
		return {
			id: v.id,
			name: v.name,
			massKg: v.massKg,
			occupantKg: v.occupantKg,
			gears: v.gears,
			finalDrive: v.finalDrive,
			tireDiameterM: v.tireDiameterM,
			cd: v.cd,
			frontalAreaM2: v.frontalAreaM2,
			crr: v.crr
		};
	});
	const mappings: Record<string, Mapping> = {};
	for (const [key, m] of Object.entries<any>(o.mappings ?? {}))
		// Backups from before the wheel speed column have no `speed`.
		if (m && ROLES.every((r) => Number.isInteger(m[r] ?? -1)))
			mappings[key] = { time: m.time, rpm: m.rpm, speed: m.speed ?? -1, tps: m.tps, afr: m.afr, boost: m.boost };
	return {
		version: 1,
		vehicles,
		settings: {
			system: oneOf(o.settings?.system, ['imperial', 'metric'], d.settings.system),
			power: oneOf(o.settings?.power, ['hp', 'kW', 'PS'], d.settings.power),
			torque: oneOf(o.settings?.torque, ['lbft', 'Nm'], d.settings.torque),
			theme: oneOf(o.settings?.theme, ['system', 'light', 'dark'], d.settings.theme),
			dyno: oneOf(o.settings?.dyno, ['dynojet', 'mustang', 'custom'], d.settings.dyno),
			customScale: isNum(o.settings?.customScale) && o.settings.customScale > 0 ? o.settings.customScale : 1
		},
		mappings
	};
}
