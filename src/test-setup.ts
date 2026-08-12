import "@testing-library/jest-dom/vitest";

// In vitest's jsdom environment, the `window` global is an alias back to the
// shared `globalThis`, not the real underlying `dom.window` instance — so
// jsdom's own (correctly working, verified standalone) localStorage getter
// never reaches test code; `window.localStorage`/`globalThis.localStorage`
// both read back as `undefined`. Rather than depend on vitest/jsdom internals
// here, install a minimal in-memory Storage polyfill directly. Runs for every
// test file (node-environment ones too, where `window` doesn't exist — guard
// on that).
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

if (typeof window !== "undefined") {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    enumerable: true,
    value: storage,
  });
}
