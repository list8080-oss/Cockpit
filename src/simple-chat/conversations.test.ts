import { beforeEach, describe, expect, it } from "vitest";
import {
  loadSimpleChatConversations,
  newSimpleChatConversation,
  persistSimpleChatConversations,
  retitle,
  SIMPLE_CHAT_SCHEMA_VERSION,
} from "./conversations";

const STORAGE_KEY = "yar-cockpit.simpleChatConversations";

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

describe("loadSimpleChatConversations / persistSimpleChatConversations", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadSimpleChatConversations()).toEqual([]);
  });

  it("round-trips a conversation through the versioned envelope", () => {
    const conversation = newSimpleChatConversation("claude");
    persistSimpleChatConversations([conversation]);

    const raw = localStorage.getItem(STORAGE_KEY);
    const envelope = JSON.parse(raw!);
    expect(envelope.version).toBe(SIMPLE_CHAT_SCHEMA_VERSION);
    expect(envelope.conversations).toEqual([conversation]);

    expect(loadSimpleChatConversations()).toEqual([conversation]);
  });

  it("still loads the pre-versioning bare-array format", () => {
    const conversation = newSimpleChatConversation("codex");
    localStorage.setItem(STORAGE_KEY, JSON.stringify([conversation]));

    expect(loadSimpleChatConversations()).toEqual([conversation]);
  });

  it("returns [] for corrupt JSON instead of throwing", () => {
    localStorage.setItem(STORAGE_KEY, "{not json");
    expect(loadSimpleChatConversations()).toEqual([]);
  });

  it("returns [] for a well-formed but unrecognized shape", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ some: "object" }));
    expect(loadSimpleChatConversations()).toEqual([]);
  });
});

describe("retitle", () => {
  it("derives the title from the first user turn", () => {
    const conversation = newSimpleChatConversation("cursor");
    conversation.history = [
      { role: "assistant", text: "Hi, how can I help?" },
      { role: "user", text: "Write me a haiku about the sea" },
    ];
    expect(retitle(conversation).title).toBe("Write me a haiku about the sea");
  });

  it("leaves the title untouched when there is no user turn yet", () => {
    const conversation = newSimpleChatConversation("opencode");
    expect(retitle(conversation).title).toBe("…");
  });
});
