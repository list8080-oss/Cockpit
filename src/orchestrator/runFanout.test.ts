import { describe, expect, it } from "vitest";
import { summarizeFanoutResults, type FanoutAgentResult } from "./runFanout";

// Prompt-composition coverage (role instruction, structured-result suffix,
// working files, history) lives in contextPackage.test.ts now — runOne()
// delegates entirely to composeContextPackage().

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
