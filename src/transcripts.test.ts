import { describe, expect, it, vi, beforeEach } from "vitest";

const invokeMock = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}));

import {
  saveTranscript,
  serializeOrchestratorTranscript,
  serializeSimpleChatTranscript,
  transcriptFileId,
} from "./transcripts";
import type { AgentConversation } from "./conversations";
import { emptyEngineThread } from "./conversations";
import type { SimpleChatConversation } from "./simple-chat/types";

beforeEach(() => {
  invokeMock.mockReset();
});

describe("transcriptFileId", () => {
  it("prefixes the id with the conversation's creation date", () => {
    expect(transcriptFileId("abc-123", Date.UTC(2026, 7, 11, 13, 29, 0))).toBe("2026-08-11_abc-123");
  });

  it("stays anchored to createdAt regardless of when it's called", () => {
    // Same conversation, "saved" at two different later moments — the file
    // id must not change, or every resave would orphan the previous file.
    const createdAt = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(transcriptFileId("id-1", createdAt)).toBe(transcriptFileId("id-1", createdAt));
  });
});

describe("serializeSimpleChatTranscript", () => {
  function conversation(): SimpleChatConversation {
    return {
      id: "sc-1",
      engine: "claude",
      title: "Beach scene ideas",
      createdAt: Date.UTC(2026, 0, 1, 12, 0, 0),
      updatedAt: Date.UTC(2026, 0, 1, 12, 5, 0),
      history: [
        { role: "user", text: "Give me a beach scene opener" },
        { role: "assistant", text: "The tide pulled back like a held breath." },
      ],
      sessionId: "sess-1",
    };
  }

  it("includes title, engine, timestamps and every turn under a role heading", () => {
    const markdown = serializeSimpleChatTranscript(conversation());
    expect(markdown).toContain("# Beach scene ideas");
    expect(markdown).toContain("<!-- engine: claude -->");
    expect(markdown).toContain("<!-- created: 2026-01-01T12:00:00.000Z -->");
    expect(markdown).toContain("## You");
    expect(markdown).toContain("Give me a beach scene opener");
    expect(markdown).toContain("## Claude");
    expect(markdown).toContain("The tide pulled back like a held breath.");
  });

  it("produces just the header for an empty conversation", () => {
    const markdown = serializeSimpleChatTranscript({ ...conversation(), history: [] });
    expect(markdown).not.toContain("## You");
    expect(markdown).toContain("# Beach scene ideas");
  });

  it("stamps each turn's heading with its time when createdAt is present", () => {
    const c = conversation();
    c.history = [{ role: "user", text: "Hi", createdAt: Date.UTC(2026, 0, 1, 12, 34, 0) }];
    const markdown = serializeSimpleChatTranscript(c);
    expect(markdown).toContain("## You (2026-01-01 12:34)");
  });

  it("omits the timestamp for turns saved before the field existed", () => {
    const c = conversation();
    c.history = [{ role: "user", text: "Hi" }];
    const markdown = serializeSimpleChatTranscript(c);
    expect(markdown).toContain("## You\n");
    expect(markdown).not.toMatch(/## You \(/);
  });
});

describe("serializeOrchestratorTranscript", () => {
  function conversation(): AgentConversation {
    return {
      id: "oc-1",
      title: "Chapter 3 revision",
      createdAt: Date.UTC(2026, 0, 1, 9, 0, 0),
      updatedAt: Date.UTC(2026, 0, 1, 9, 10, 0),
      prompt: "Chapter 3 revision",
      claude: emptyEngineThread(),
      codex: emptyEngineThread(),
      cursor: emptyEngineThread(),
      opencode: emptyEngineThread(),
      orchestrator: {
        messages: [
          { id: "m1", role: "user", kind: "user", createdAt: 1, text: "Tighten the ending" },
          {
            id: "m2",
            role: "orchestrator",
            kind: "synthesis",
            createdAt: 2,
            text: "Cut the last paragraph, it repeats the theme.",
          },
        ],
      },
    };
  }

  it("renders each message under a You/Orchestrator heading via formatOrchestratorMessage", () => {
    const markdown = serializeOrchestratorTranscript(conversation(), "en", null);
    expect(markdown).toContain("# Chapter 3 revision");
    expect(markdown).toContain("## You");
    expect(markdown).toContain("Tighten the ending");
    expect(markdown).toContain("## Orchestrator");
    expect(markdown).toContain("Cut the last paragraph, it repeats the theme.");
  });

  it("includes a project provenance comment only when a path is given", () => {
    const withPath = serializeOrchestratorTranscript(conversation(), "en", "/Users/x/Documents/Novel");
    expect(withPath).toContain("<!-- project: /Users/x/Documents/Novel -->");

    const withoutPath = serializeOrchestratorTranscript(conversation(), "en", null);
    expect(withoutPath).not.toContain("<!-- project:");
  });

  it("handles a conversation with no orchestrator messages yet", () => {
    const c = conversation();
    c.orchestrator = undefined;
    const markdown = serializeOrchestratorTranscript(c, "en", null);
    expect(markdown).toContain("# Chapter 3 revision");
    expect(markdown).not.toContain("## You");
  });

  it("includes each agent's full reply text for regular fan-out conversations", () => {
    const c = conversation();
    c.claude = { history: [{ role: "assistant", text: "Claude's full take" }], sessionId: "s1" };
    c.codex = { history: [{ role: "assistant", text: "Codex's full take" }], sessionId: "s2" };
    const markdown = serializeOrchestratorTranscript(c, "en", null);
    expect(markdown).toContain("## Claude — full replies");
    expect(markdown).toContain("Claude's full take");
    expect(markdown).toContain("## Codex — full replies");
    expect(markdown).toContain("Codex's full take");
    expect(markdown).not.toContain("Cursor — full replies");
    expect(markdown).not.toContain("OpenCode — full replies");
  });

  it("stamps message and per-agent reply headings with their time", () => {
    const c = conversation();
    c.orchestrator!.messages[0].createdAt = Date.UTC(2026, 0, 1, 9, 0, 0);
    c.claude = {
      history: [{ role: "assistant", text: "Full text", createdAt: Date.UTC(2026, 0, 1, 9, 1, 0) }],
      sessionId: "s1",
    };
    const markdown = serializeOrchestratorTranscript(c, "en", null);
    expect(markdown).toContain("## You (2026-01-01 09:00)");
    expect(markdown).toContain("### Claude (2026-01-01 09:01)");
  });
});

describe("saveTranscript", () => {
  it("invokes save_conversation_transcript with the right args", async () => {
    invokeMock.mockResolvedValueOnce(undefined);
    await saveTranscript("free", "claude", "conv-1", "# Hello\n");
    expect(invokeMock).toHaveBeenCalledWith("save_conversation_transcript", {
      bucket: "free",
      engine: "claude",
      conversationId: "conv-1",
      markdown: "# Hello\n",
    });
  });

  it("swallows errors instead of throwing", async () => {
    invokeMock.mockRejectedValueOnce(new Error("disk full"));
    await expect(saveTranscript("project", "orchestrator", "conv-2", "x")).resolves.toBeUndefined();
  });
});
