import { expect, test } from 'vitest';
import { guessMapping, parseLog, toSamples } from './parse';
import { parseSaved } from './saved';

test('skips a preamble and a units row, and reads quoted headers', () => {
	const t = parseLog('MyLogger 2.1\nDate: today\n"Time","Engine RPM","Throttle, plate"\ns,rpm,%\n0.0,2000,100\n0.1,2100,100\n\n0.2,2200,100\n');
	expect(t.headers).toEqual(['Time', 'Engine RPM', 'Throttle, plate']);
	expect(t.rows.length).toBe(3);
});

test('semicolon files with decimal commas and clock times', () => {
	const t = parseLog('Time;RPM;Lambda\n00:00:01,000;2000;0,85\n00:00:01,100;2100;0,86\n00:00:01,200;2200;0,87');
	const s = toSamples(t, guessMapping(t.headers));
	expect(s.t[1] - s.t[0]).toBeCloseTo(0.1, 6);
	expect(s.afr).toEqual([0.85, 0.86, 0.87]);
});

test('column guessing prefers measured values and the pedal', () => {
	const m = guessMapping(['Time (ms)', 'Target Boost', 'Boost (psi)', 'Throttle Position', 'Accel Pedal', 'RPM Limit', 'Engine Speed (RPM)', 'AFR Commanded', 'Wideband AFR']);
	expect(m).toEqual({ time: 0, rpm: 6, speed: -1, tps: 4, afr: 8, boost: 2 });
	expect(guessMapping(['time_ms', 'RPM', 'AFM', 'AF', 'AF.Corr', 'AFCMD']).afr).toBe(3);
	expect(guessMapping(['a', 'b']).rpm).toBe(-1);
});

test('reads every wheel speed column', () => {
	const t = parseLog('time,RPM,ABS.LF,ABS.RF,ABS.LR,ABS.RR,VSS\n0,3000,40,40,39,39,41\n0.1,3050,41,41,40,40,42\n0.2,3100,42,42,41,41,43');
	const s = toSamples(t, guessMapping(t.headers));
	expect(s.wheels!.length).toBe(4);
	expect(s.wheels![2]).toEqual([39, 40, 41]);
	expect(s.bySpeed).toBe(false);
});

test('rejects non-logs and non-backups', () => {
	expect(() => parseLog('hello\nworld')).toThrow(/data log/);
	expect(() => parseSaved('{"version":1,"vehicles":[{"id":"x"}]}')).toThrow(/backup/);
	expect(() => parseSaved('nope')).toThrow(/backup/);
	expect(parseSaved('{"version":1,"vehicles":[],"settings":{"power":"kW","theme":"evil"}}').settings).toEqual({
		system: 'imperial',
		power: 'kW',
		torque: 'lbft',
		theme: 'system',
		dyno: 'dynojet',
		customScale: 1
	});
});
