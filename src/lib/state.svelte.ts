import { KEY, defaults, parseSaved, type Saved } from './saved';

function load(): Saved {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(KEY);
		if (raw) return parseSaved(raw);
	} catch {
		// Keep unreadable data instead of overwriting it on the next save.
		try {
			if (raw) localStorage.setItem(`${KEY}:unreadable`, raw);
		} catch {}
	}
	return defaults();
}

export const saved = $state(load());

/** False if the browser refused to store it. */
export function persist() {
	const json = JSON.stringify(saved);
	try {
		localStorage.setItem(KEY, json);
		return true;
	} catch {
		// Private windows and full storage: the app still works for this visit.
		return false;
	}
}
