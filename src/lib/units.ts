// Display units. Stored values are always SI; shown = si * k + off.

export type System = 'imperial' | 'metric';

interface Unit {
	label: string;
	k: number;
	off: number;
	dp: number;
}
const u = (label: string, k: number, dp: number, off = 0): Unit => ({ label, k, off, dp });

export const Q = {
	mass: { imperial: u('lb', 2.2046226218, 0), metric: u('kg', 1, 0) },
	tire: { imperial: u('in', 39.37007874, 2), metric: u('mm', 1000, 0) },
	area: { imperial: u('ft²', 10.7639104, 2), metric: u('m²', 1, 2) },
	temp: { imperial: u('°F', 1.8, 0, 32), metric: u('°C', 1, 0) },
	pressure: { imperial: u('inHg', 1 / 3386.389, 2), metric: u('bar', 1e-5, 3) }
} satisfies Record<string, Record<System, Unit>>;
export type Quantity = keyof typeof Q;

/** Multiply watts by k. */
export const POWER = {
	hp: { label: 'hp', k: 1 / 745.699872 },
	kW: { label: 'kW', k: 1 / 1000 },
	PS: { label: 'PS', k: 1 / 735.49875 }
};
/** Multiply newton-metres by k. */
export const TORQUE = {
	lbft: { label: 'lb-ft', k: 1 / 1.3558179483 },
	Nm: { label: 'Nm', k: 1 }
};

export const grouped = (n: number) => Math.round(n).toLocaleString('en-US');
