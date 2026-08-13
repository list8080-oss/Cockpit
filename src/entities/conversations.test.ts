import { beforeEach, describe, expect, it } from "vitest";
import {
  ENTITIES_SCHEMA_VERSION,
  loadEntitiesConversations,
  newEntitiesConversation,
  persistEntitiesConversations,
  retitleEntities,
} from "./conversations";

const STORAGE_KEY = "yar-cockpit.entitiesConversations";

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
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: Storage }).localStorage = new MemoryStorage();
});

describe("loadEntitiesConversations / persistEntitiesConversations", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadEntitiesConversations()).toEqual([]);
  });

  it("round-trips a conversation through the versioned envelope", () => {
    const conversation = newEntitiesConversation();
    persistEntitiesConversations([conversation]);

    const raw = localStorage.getItem(STORAGE_KEY);
    const envelope = JSON.parse(raw!);
    expect(envelope.version).toBe(ENTITIES_SCHEMA_VERSION);
    expect(envelope.conversations).toEqual([conversation]);

    expect(loadEntitiesConversations()).toEqual([conversation]);
  });

  it("still loads the pre-versioning bare-array format", () => {
    const conversation = newEntitiesConversation();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([conversation]));

    expect(loadEntitiesConversations()).toEqual([conversation]);
  });

  it("returns [] for corrupt JSON instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadEntitiesConversations()).toEqual([]);
  });

  it("returns [] for a well-formed but unrecognized shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ some: "object" }));
    expect(loadEntitiesConversations()).toEqual([]);
  });
});

describe("retitleEntities", () => {
  it("derives the title from the first user turn", () => {
    const conversation = newEntitiesConversation();
    conversation.history = [
      { role: "entity", entityId: "vera", text: "Hi!", createdAt: 1 },
      { role: "user", text: "Write me a haiku about the sea", createdAt: 2 },
    ];
    expect(retitleEntities(conversation).title).toBe("Write me a haiku about the sea");
  });

  it("leaves the title untouched when there is no user turn yet", () => {
    const conversation = newEntitiesConversation();
    expect(retitleEntities(conversation).title).toBe("…");
  });
});
