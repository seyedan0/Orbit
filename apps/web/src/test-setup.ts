// Sets up fake IndexedDB globals (indexedDB, IDBKeyRange, etc.) for all tests
// that run in the Node environment. Harmless for tests that do not use IndexedDB.
import 'fake-indexeddb/auto';

if (typeof (globalThis as Record<string, unknown>).window === 'undefined') {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, String(value));
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    }
  };

  (globalThis as Record<string, unknown>).window = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  };
}
