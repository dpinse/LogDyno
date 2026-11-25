// Loaded logs and their run settings, kept in IndexedDB so a reload does not lose them.
// localStorage is too small for logs; vehicles and settings stay there (state.svelte.ts).

let db: Promise<IDBDatabase> | undefined;
const open = () =>
	(db ??= new Promise((resolve, reject) => {
		const request = indexedDB.open('logdyno', 1);
		request.onupgradeneeded = () => request.result.createObjectStore('kv');
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	}));

const tx = async <T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>) => {
	const store = (await open()).transaction('kv', mode).objectStore('kv');
	return new Promise<T>((resolve, reject) => {
		const request = act(store);
		request.onsuccess = () => resolve(request.result);
		request.onerror = () => reject(request.error);
	});
};

export const get = <T>(key: string) => tx<T | undefined>('readonly', (s) => s.get(key));
export const set = (key: string, value: unknown) => tx('readwrite', (s) => s.put(value, key));
export const del = (key: string) => tx('readwrite', (s) => s.delete(key));
