import { describe, expect, it } from "vitest";
import {
  createAgentFullAccessErrorMessage,
  createAgentPlanErrorMessage,
  createAgentProposalErrorMessage,
  createAgentProposalMessage,
  createCompletedMessage,
  createDelegationMessage,
  createDispatchedMessage,
  createSynthesisErrorMessage,
  createUserMessage,
  delegatedAgentLabel,
  formatOrchestratorMessage,
  legacyMessagesFromConversation,
} from "./messages";

const locale = "en" as const;

describe("createAgentProposalMessage", () => {
  it("carries the profile id when context is project", () => {
    const message = createAgentProposalMessage("summary", [], "project", "manuscript");
    expect(message.proposalContext).toBe("project");
    expect(message.proposalProfileId).toBe("manuscript");
  });

  it("forces profileId to null when context is free, even if one is passed", () => {
    const message = createAgentProposalMessage("summary", [], "free", "manuscript");
    expect(message.proposalProfileId).toBeNull();
  });

  it("defaults profileId to null when omitted", () => {
    const message = createAgentProposalMessage("summary", [], "project");
    expect(message.proposalProfileId).toBeNull();
  });
});

describe("createUserMessage", () => {
  it("omits attachedFiles when none are given", () => {
    const message = createUserMessage("Hi");
    expect(message.attachedFiles).toBeUndefined();
  });

  it("omits attachedFiles when given an empty array", () => {
    const message = createUserMessage("Hi", []);
    expect(message.attachedFiles).toBeUndefined();
  });

  it("carries attachedFiles labels when given files", () => {
    const message = createUserMessage("Hi", [{ label: "Chapter 3" }]);
    expect(message.attachedFiles).toEqual([{ label: "Chapter 3" }]);
  });
});

describe("formatOrchestratorMessage", () => {
  it("includes agent names for dispatched", () => {
    const text = formatOrchestratorMessage(
      createDispatchedMessage(["claude", "cursor"]),
      locale,
    );
    expect(text).toContain("Claude");
    expect(text).toContain("Cursor");
    expect(text).toContain("Started:");
  });

  it("only mentions non-empty completed buckets", () => {
    const answeredOnly = formatOrchestratorMessage(
      createCompletedMessage({
        answered: ["claude"],
        failed: [],
        unavailable: [],
      }),
      locale,
    );
    expect(answeredOnly).toContain("Answered: Claude");
    expect(answeredOnly).not.toContain("Failed:");
    expect(answeredOnly).not.toContain("Unavailable:");

    const allBuckets = formatOrchestratorMessage(
      createCompletedMessage({
        answered: ["claude"],
        failed: ["codex"],
        unavailable: ["opencode"],
      }),
      locale,
    );
    expect(allBuckets).toContain("Answered: Claude");
    expect(allBuckets).toContain("Failed: Codex");
    expect(allBuckets).toContain("Unavailable: OpenCode");
  });

  it("substitutes error text for synthesis / full-access / plan / propose errors", () => {
    expect(
      formatOrchestratorMessage(
        createSynthesisErrorMessage("boom synthesis"),
        locale,
      ),
    ).toContain("boom synthesis");
    expect(
      formatOrchestratorMessage(
        createAgentFullAccessErrorMessage("boom full"),
        locale,
      ),
    ).toContain("boom full");
    expect(
      formatOrchestratorMessage(createAgentPlanErrorMessage("boom plan"), locale),
    ).toContain("boom plan");
    expect(
      formatOrchestratorMessage(
        createAgentProposalErrorMessage("boom propose"),
        locale,
      ),
    ).toContain("boom propose");
  });

  it("renders delegated command and output", () => {
    const text = formatOrchestratorMessage(
      createDelegationMessage({
        agent: "codex",
        command: "codex exec 'review this'",
        output: "Looks good",
        isError: false,
      }),
      locale,
    );
    expect(text).toContain("$ codex exec 'review this'");
    expect(text).toContain("Looks good");
  });
});

describe("delegatedAgentLabel", () => {
  it("maps known binaries to display names", () => {
    expect(delegatedAgentLabel("cursor-agent")).toBe("Cursor");
    expect(delegatedAgentLabel("codex")).toBe("Codex");
  });

  it("returns unknown binary names as-is", () => {
    expect(delegatedAgentLabel("weird-cli")).toBe("weird-cli");
  });
});

describe("legacyMessagesFromConversation", () => {
  it("returns empty array for blank prompt", () => {
    expect(legacyMessagesFromConversation("")).toEqual([]);
    expect(legacyMessagesFromConversation("   ")).toEqual([]);
  });

  it("wraps non-empty prompt as a single user message", () => {
    const msgs = legacyMessagesFromConversation("hello world");
    expect(msgs).toHaveLength(1);
    expect(msgs[0].kind).toBe("user");
    expect(msgs[0].role).toBe("user");
    expect(msgs[0].text).toBe("hello world");
  });
});
