import { describe, expect, it } from "vitest";
import {
  buildSynthesisPrompt,
  canRunSynthesis,
  lastAssistantText,
  lastUserRoundText,
  type AgentReplySnapshot,
} from "./buildSynthesisPrompt";
import type { OrchestratorMessage } from "../conversations";

function userMsg(text: string): OrchestratorMessage {
  return { id: crypto.randomUUID(), role: "user", kind: "user", createdAt: Date.now(), text };
}

function otherMsg(kind: OrchestratorMessage["kind"], text = ""): OrchestratorMessage {
  return { id: crypto.randomUUID(), role: "orchestrator", kind, createdAt: Date.now(), text };
}

function snap(
  id: AgentReplySnapshot["id"],
  opts: Partial<AgentReplySnapshot> & { replyText?: string | null } = {},
): AgentReplySnapshot {
  return {
    id,
    replyText: opts.replyText ?? null,
    state: opts.state ?? { status: "idle" },
    structured: opts.structured,
  };
}

describe("canRunSynthesis", () => {
  it("is false with fewer than two successful replies", () => {
    expect(canRunSynthesis([])).toBe(false);
    expect(
      canRunSynthesis([
        snap("claude", { replyText: "a", state: { status: "done" } }),
      ]),
    ).toBe(false);
  });

  it("is true with two or more successful replies", () => {
    expect(
      canRunSynthesis([
        snap("claude", { replyText: "a", state: { status: "done" } }),
        snap("codex", { replyText: "b", state: { status: "done" } }),
      ]),
    ).toBe(true);
  });
});

describe("lastAssistantText", () => {
  it("returns the last non-empty assistant turn", () => {
    expect(
      lastAssistantText([
        { role: "user", text: "q" },
        { role: "assistant", text: "first" },
        { role: "user", text: "more" },
        { role: "assistant", text: "second" },
      ]),
    ).toBe("second");
  });

  it("skips empty assistant turns and user turns", () => {
    expect(
      lastAssistantText([
        { role: "assistant", text: "keep" },
        { role: "assistant", text: "   " },
        { role: "user", text: "ignore" },
      ]),
    ).toBe("keep");
    expect(lastAssistantText([{ role: "user", text: "only" }])).toBeNull();
  });
});

describe("lastUserRoundText", () => {
  it("returns the most recent user message's text", () => {
    const messages = [userMsg("first"), otherMsg("dispatched"), userMsg("second")];
    expect(lastUserRoundText(messages, "fallback")).toBe("second");
  });

  it("skips whitespace-only user messages", () => {
    const messages = [userMsg("real question"), userMsg("   ")];
    expect(lastUserRoundText(messages, "fallback")).toBe("real question");
  });

  it("falls back to the given prompt when there is no user message yet", () => {
    const messages = [otherMsg("dispatched"), otherMsg("completed")];
    expect(lastUserRoundText(messages, "original prompt")).toBe("original prompt");
  });

  it("falls back for an empty transcript", () => {
    expect(lastUserRoundText([], "original prompt")).toBe("original prompt");
  });
});

describe("buildSynthesisPrompt", () => {
  const missingNote =
    "Important: not every agent answered. Say clearly that your conclusion is based only on the replies you received";

  it("mentions partial coverage when some agents are missing", () => {
    const prompt = buildSynthesisPrompt({
      sourceText: "Rewrite the scene",
      agents: [
        snap("claude", { replyText: "A", state: { status: "done" } }),
        snap("codex", { replyText: "B", state: { status: "done" } }),
        snap("cursor", { state: { status: "error", message: "offline" } }),
        snap("opencode", { state: { status: "idle" } }),
      ],
    });
    expect(prompt).toContain(missingNote);
    expect(prompt).toContain("Rewrite the scene");
    expect(prompt).toContain("### Claude");
    expect(prompt).toContain("### Codex");
  });

  it("omits the missing-agents note when every agent answered", () => {
    const prompt = buildSynthesisPrompt({
      sourceText: "Rewrite the scene",
      agents: [
        snap("claude", { replyText: "A", state: { status: "done" } }),
        snap("codex", { replyText: "B", state: { status: "done" } }),
        snap("cursor", { replyText: "C", state: { status: "done" } }),
        snap("opencode", { replyText: "D", state: { status: "done" } }),
      ],
    });
    expect(prompt).not.toContain(missingNote);
  });

  it("includes a self-assessment line when structured findings are present", () => {
    const prompt = buildSynthesisPrompt({
      sourceText: "Rewrite the scene",
      agents: [
        snap("claude", {
          replyText: "A",
          state: { status: "done" },
          structured: {
            issues: ["thin ending"],
            suggestions: ["add beat"],
            confidence: "high",
            needsConfirmation: false,
          },
        }),
        snap("codex", { replyText: "B", state: { status: "done" } }),
      ],
    });
    expect(prompt).toContain("confidence=high");
    expect(prompt).toContain("needsConfirmation=false");
    expect(prompt).toContain("issues: thin ending");
    expect(prompt).toContain("suggestions: add beat");
  });

  it("does not invent a self-assessment line when structured is absent", () => {
    const prompt = buildSynthesisPrompt({
      sourceText: "Rewrite the scene",
      agents: [
        snap("claude", { replyText: "A", state: { status: "done" } }),
        snap("codex", {
          replyText: "B",
          state: { status: "done" },
          structured: null,
        }),
      ],
    });
    expect(prompt).not.toContain("confidence=");
    expect(prompt).not.toContain("needsConfirmation=");
    expect(prompt).not.toContain("self-assessment");
  });
});
