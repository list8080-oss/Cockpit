import { beforeEach, describe, expect, it } from "vitest";
import {
  CONVERSATIONS_STORAGE_KEY,
  CONVERSATIONS_SCHEMA_VERSION,
  conversationTitle,
  emptyEngineThread,
  emptyOrchestratorThread,
  loadConversations,
  persistConversations,
  type AgentConversation,
} from "./conversations";

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

function baseConversation(id: string): AgentConversation {
  return {
    id,
    title: "Hello",
    createdAt: 1,
    updatedAt: 1,
    prompt: "Hello",
    claude: emptyEngineThread(),
    codex: emptyEngineThread(),
    cursor: emptyEngineThread(),
    opencode: emptyEngineThread(),
    orchestrator: emptyOrchestratorThread(),
  };
}

describe("loadConversations / persistConversations", () => {
  it("returns [] when nothing is stored", () => {
    expect(loadConversations()).toEqual([]);
  });

  it("round-trips a conversation through the versioned envelope", () => {
    const conversation = baseConversation("a");
    persistConversations([conversation]);

    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    const envelope = JSON.parse(raw!);
    expect(envelope.version).toBe(CONVERSATIONS_SCHEMA_VERSION);
    expect(envelope.conversations).toHaveLength(1);

    expect(loadConversations()).toEqual([conversation]);
  });

  it("still loads the pre-versioning bare-array format", () => {
    const conversation = baseConversation("legacy");
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([conversation]));

    expect(loadConversations()).toEqual([conversation]);
  });

  it("backfills opencode/orchestrator on older stored shapes, both formats", () => {
    const { opencode, orchestrator, ...withoutNewFields } = baseConversation("old");

    // Legacy bare array.
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([withoutNewFields]));
    const [fromLegacy] = loadConversations();
    expect(fromLegacy.opencode).toEqual(emptyEngineThread());
    expect(fromLegacy.orchestrator).toEqual(emptyOrchestratorThread());

    // Versioned envelope with the same gap.
    localStorage.setItem(
      CONVERSATIONS_STORAGE_KEY,
      JSON.stringify({ version: CONVERSATIONS_SCHEMA_VERSION, conversations: [withoutNewFields] }),
    );
    const [fromEnvelope] = loadConversations();
    expect(fromEnvelope.opencode).toEqual(emptyEngineThread());
    expect(fromEnvelope.orchestrator).toEqual(emptyOrchestratorThread());
  });

  it("returns [] for corrupt JSON instead of throwing", () => {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, "{not json");
    expect(loadConversations()).toEqual([]);
  });

  it("returns [] for a well-formed but unrecognized shape", () => {
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify({ some: "object" }));
    expect(loadConversations()).toEqual([]);
  });

  it("caps persisted history at MAX_STORED_CONVERSATIONS", () => {
    const many = Array.from({ length: 150 }, (_, i) => baseConversation(`c${i}`));
    persistConversations(many);
    expect(loadConversations()).toHaveLength(100);
  });
});

describe("conversationTitle", () => {
  it("uses the first non-empty line, truncated to 60 chars", () => {
    const long = "x".repeat(80);
    expect(conversationTitle(`\n\n${long}\nsecond line`)).toBe(`${"x".repeat(60)}…`);
  });

  it("falls back to an ellipsis for all-whitespace text", () => {
    expect(conversationTitle("   \n  \n")).toBe("…");
  });
});
