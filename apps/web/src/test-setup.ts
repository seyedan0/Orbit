// Sets up fake IndexedDB globals (indexedDB, IDBKeyRange, etc.) for all tests
// that run in the Node environment. Harmless for tests that do not use IndexedDB.
import 'fake-indexeddb/auto';
