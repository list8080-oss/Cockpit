import { describe, expect, it } from "vitest";
import { buildFullAccessContext } from "./fullAccessContext";
import type { AgentReplySnapshot } from "./buildSynthesisPrompt";
import type { OrchestratorMessage } from "../conversations";

function userMsg(text: string): OrchestratorMessage {
  return { id: crypto.randomUUID(), role: "user", kind: "user", createdAt: Date.now(), text };
}

function snap(
  id: AgentReplySnapshot["id"],
  opts: Partial<AgentReplySnapshot> = {},
): AgentReplySnapshot {
  return {
    id,
    replyText: opts.replyText ?? null,
    state: opts.state ?? { status: "idle" },
    structured: opts.structured,
  };
}

describe("buildFullAccessContext", () => {
  it("returns an empty string for a brand-new conversation with no prior replies", () => {
    expect(buildFullAccessContext({ orchestratorMessages: [], locale: "en", agents: [] })).toBe("");
  });

  it("includes the transcript when there are prior messages", () => {
    const result = buildFullAccessContext({
      orchestratorMessages: [userMsg("Rewrite chapter 3")],
      locale: "en",
      agents: [],
    });
    expect(result).toContain("Context — this Orchestrator conversation so far:");
    expect(result).toContain("[User]");
    expect(result).toContain("Rewrite chapter 3");
    expect(result).toContain("## New request");
  });

  it("includes only agents that finished successfully with reply text", () => {
    const result = buildFullAccessContext({
      orchestratorMessages: [],
      locale: "en",
      agents: [
        snap("claude", { replyText: "Claude's full answer", state: { status: "done" } }),
        snap("codex", { state: { status: "error", message: "offline" } }),
        snap("cursor", { replyText: "unfinished", state: { status: "running" } }),
        snap("opencode", { state: { status: "idle" } }),
      ],
    });
    expect(result).toContain("Full text of each agent's reply");
    expect(result).toContain("### Claude");
    expect(result).toContain("Claude's full answer");
    expect(result).not.toContain("### Codex");
    expect(result).not.toContain("### Cursor");
    expect(result).not.toContain("### OpenCode");
  });

  it("lists agents in the fixed ORCHESTRATOR_AGENT_IDS order, not input order", () => {
    const result = buildFullAccessContext({
      orchestratorMessages: [],
      locale: "en",
      agents: [
        snap("opencode", { replyText: "O", state: { status: "done" } }),
        snap("claude", { replyText: "C", state: { status: "done" } }),
      ],
    });
    expect(result.indexOf("### Claude")).toBeLessThan(result.indexOf("### OpenCode"));
  });

  it("omits both sections and returns '' when nothing to prepend at all", () => {
    const result = buildFullAccessContext({
      orchestratorMessages: [],
      locale: "en",
      agents: [snap("claude", { state: { status: "idle" } })],
    });
    expect(result).toBe("");
  });
});
