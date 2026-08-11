import { describe, expect, it } from "vitest";
import {
  appendStructuredResultInstruction,
  composePromptWithRole,
  summarizeFanoutResults,
  type FanoutAgentResult,
} from "./runFanout";
import { STRUCTURED_RESULT_MARKER } from "./structuredResult";

describe("composePromptWithRole", () => {
  it("returns the prompt unchanged when there is no role instruction", () => {
    expect(composePromptWithRole("hello", null)).toBe("hello");
    expect(composePromptWithRole("hello", undefined)).toBe("hello");
    expect(composePromptWithRole("hello", "")).toBe("hello");
  });

  it("prepends the instruction, a blank line, then the prompt", () => {
    expect(composePromptWithRole("User request", "You are Style Editor.")).toBe(
      "You are Style Editor.\n\nUser request",
    );
  });
});

describe("appendStructuredResultInstruction", () => {
  it("returns the prompt unchanged when disabled or unset", () => {
    expect(appendStructuredResultInstruction("hello", false)).toBe("hello");
    expect(appendStructuredResultInstruction("hello", undefined)).toBe("hello");
  });

  it("appends the structured-result instruction containing the marker", () => {
    const out = appendStructuredResultInstruction("hello", true);
    expect(out.startsWith("hello\n\n")).toBe(true);
    expect(out).toContain(STRUCTURED_RESULT_MARKER);
  });
});

describe("summarizeFanoutResults", () => {
  it("buckets answered / failed / unavailable", () => {
    const results: FanoutAgentResult[] = [
      { id: "claude", ok: true, reply: { text: "ok", sessionId: null } },
      { id: "codex", ok: false, error: "rate limited" },
      { id: "cursor", ok: false, error: "CLI not installed" },
      { id: "opencode", ok: false, error: "No project connected — choose a folder" },
    ];
    expect(summarizeFanoutResults(results)).toEqual({
      answered: ["claude"],
      failed: ["codex"],
      unavailable: ["cursor", "opencode"],
    });
  });

  it("treats ENOENT / Not Found case-insensitively as unavailable", () => {
    const results: FanoutAgentResult[] = [
      { id: "claude", ok: false, error: "Failed: ENOENT" },
      { id: "codex", ok: false, error: "Binary Not Found in PATH" },
      { id: "cursor", ok: false, error: "something MISSING here" },
    ];
    expect(summarizeFanoutResults(results)).toEqual({
      answered: [],
      failed: [],
      unavailable: ["claude", "codex", "cursor"],
    });
  });
});
