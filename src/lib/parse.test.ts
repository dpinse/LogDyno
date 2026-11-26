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

test('HP Tuners, Holley, EcuTek, bootmod3 and RomRaider layouts', () => {
	// HP Tuners: channel ids, names and units, then a section marker before the data.
	const hpt = parseLog(
		'HP Tuners CSV Log File\nVersion: 1.0\n\n[Channel Information]\n0,6200,12,2114,6001\nOffset,Injector Pulse Width Avg. Bank 1,Engine RPM (SAE),Accelerator Pedal Position,Air-Fuel Ratio Commanded\ns,ms,rpm,%,\n\n[Channel Data]\n0.868,8.04,900,0,11.8\n0.988,8.04,950,0,11.8\n1.114,8.04,1000,0,D4\n'
	);
	expect(hpt.headers[0]).toBe('Offset');
	expect(hpt.rows.length).toBe(3);
	expect(guessMapping(hpt.headers)).toEqual({ time: 0, rpm: 2, speed: -1, tps: 3, afr: -1, boost: -1 });

	const col = (headers: string[], role: 'time' | 'rpm' | 'tps' | 'afr' | 'boost') => headers[guessMapping(headers)[role]];
	const holley = ['Point Number', 'RTC', 'RPM', 'Target AFR', 'AFR', 'MAP', 'TPS', 'Pedal Position', 'Boost Time', 'Boost PSIG'];
	expect(col(holley, 'time')).toBe('RTC');
	expect(col(holley, 'afr')).toBe('AFR');
	const ecutek = ['Time (s)', 'A/F Correction #3 (%)', 'A/F Heater Duty (%)', 'A/F Sensor #1 Voltage (V)', 'Accelerator Pedal (%)', 'AFR Actual (AFR)', 'AFR Target (AFR)', 'Engine Speed (rpm)', 'Manifold Absolute Pressure (psi)'];
	expect(col(ecutek, 'afr')).toBe('AFR Actual (AFR)');
	const bm3 = ['Time', 'Accel. Pedal[%]', 'Boost Pressure (Deviation)[psia]', 'Boost pressure (Target)[psig]', 'Boost (Pre-Throttle)[psig]', 'Engine speed[1/min]', 'Lambda[AFR]', 'Lambda Act.[AFR]', 'Throttle Angle[%]'];
	expect(col(bm3, 'afr')).toBe('Lambda Act.[AFR]');
	expect(col(bm3, 'boost')).toBe('Boost (Pre-Throttle)[psig]');
	expect(col(bm3, 'tps')).toBe('Accel. Pedal[%]');
	const romraider = ['Time (msec)', 'A/F Sensor #1 (AFR)', 'Engine Speed (rpm)', 'Manifold Absolute Pressure (psi)', 'Throttle Opening Angle (%)', 'Manifold Relative Pressure (psi)'];
	expect(col(romraider, 'boost')).toBe('Manifold Relative Pressure (psi)');
});

test('JB4, LogWorks, MHD, Crome and Bosch variable-name layouts', () => {
	// JB4: two settings tables above the real header, all padded to one width.
	const jb4 = parseLog('Firmware,Interface,Engine,,\n4,JB4 Android,F Series,,\nBoostSafety,PID Gain,FUA,,\n28,10,0,,\ntimestamp,rpm,boost,pedal,afr\n57.25,3228,0.1,17,14.1\n59.25,3198,0.1,17,14\n61.25,3300,0.2,20,14\n');
	expect(jb4.headers).toEqual(['timestamp', 'rpm', 'boost', 'pedal', 'afr']);
	expect(jb4.rows.length).toBe(3);
	// LogWorks: a title padded with commas, then names, then units.
	const logworks = parseLog('Session: Session 8,,,,,\ntime,LC1_O2WB,RPM,EGT,Oil_Press,Boost\n(sec),(AFR),(RPM),(degC),(PSI),(PSI)\n0.0,14.74,1173,440,62.0,-7.48\n0.08,14.80,1195,440,62.9,-7.48\n');
	expect(guessMapping(logworks.headers)).toEqual({ time: 0, rpm: 2, speed: -1, tps: -1, afr: 1, boost: 5 });
	// A byte-order mark in front of the first header, as MHD writes.
	expect(parseLog('\uFEFFTime,RPM (rpm)\n1,700\n2,710\n').headers[0]).toBe('Time');

	const col = (headers: string[], role: 'time' | 'rpm' | 'tps' | 'afr' | 'boost') => headers[guessMapping(headers)[role]];
	const mhd = ['Time', 'Accel Ped. Pos. (%)', 'Boost (PSI)', 'Lambda bank 1 (AFR)', 'Lambda target (AFR)', 'RPM (rpm)', 'Throttle Pos. Req (*)', 'Throttle Position (*)'];
	expect(col(mhd, 'tps')).toBe('Accel Ped. Pos. (%)');
	expect(col(mhd, 'afr')).toBe('Lambda bank 1 (AFR)');
	expect(col(['Time (sec)', 'Accel Position (%)', 'RPM (RPM)', 'Throttle Pos (%)'], 'tps')).toBe('Accel Position (%)');
	expect(col(['Time', 'Engine Speed', 'Throttle Inlet Pressure', 'Throttle Angle'], 'tps')).toBe('Throttle Angle');
	expect(col(['Duration', 'Engine Speed (RPM)', 'Injector Duration (ms)'], 'time')).toBe('Duration');
	const me7 = ['TimeStamp', 'dwkrz_0', 'lamsoni_w', 'nmot', 'pvdks_w', 'wped_w', 'wdkba'];
	expect(guessMapping(me7)).toEqual({ time: 0, rpm: 3, speed: -1, tps: 5, afr: 2, boost: 4 });
});

test('a file holding several sessions that each restart the clock keeps all of them', () => {
	const t = parseLog('Time (sec),RPM (RPM)\n0,1000\n0.1,1100\n0.2,1200\n0,2000\n0.1,2100\n0.2,2200');
	const s = toSamples(t, guessMapping(t.headers));
	expect(s.rpm).toEqual([1000, 1100, 1200, 2000, 2100, 2200]);
	expect(s.t[3]).toBeCloseTo(0.3, 6);
	expect(s.t[5]).toBeCloseTo(0.5, 6);
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
